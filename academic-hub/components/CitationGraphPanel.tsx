import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Network, Target, TrendingUp } from 'lucide-react';
import ReactFlow, { Background, Controls, Edge, MiniMap, Node } from 'reactflow';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import 'reactflow/dist/style.css';
import type { Reference } from '../../types';
import { citationGraphEngine } from '../../services/agentic/CitationGraphEngine';
import type { CitationMetrics } from '../../services/agentic/CitationGraphEngine';
import './CitationGraphPanel.css';

interface CitationGraphPanelProps {
    references: Reference[];
}

const CLUSTER_COLORS = ['#58a6ff', '#3fb950', '#d29922', '#bc8cff', '#f778ba', '#39c5cf'];

export const CitationGraphPanel: React.FC<CitationGraphPanelProps> = ({ references }) => {
    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);
    const [metrics, setMetrics] = useState<CitationMetrics>({
        hIndex: 0,
        i10Index: 0,
        citationVelocity: 0,
        fieldWeightedCitationImpact: 0,
        topCitedPapers: [],
        citationTrends: []
    });
    const [opportunities, setOpportunities] = useState<{ paperId: string; missingCitations: string[] }[]>([]);
    const [addedOpportunities, setAddedOpportunities] = useState<Record<string, boolean>>({});
    const [paperLookup, setPaperLookup] = useState<Map<string, string>>(new Map());

    useEffect(() => {
        if (!references?.length) {
            setNodes([]);
            setEdges([]);
            setMetrics({
                hIndex: 0,
                i10Index: 0,
                citationVelocity: 0,
                fieldWeightedCitationImpact: 0,
                topCitedPapers: [],
                citationTrends: []
            });
            setOpportunities([]);
            setPaperLookup(new Map());
            return;
        }

        const graph = citationGraphEngine.buildGraph(references);
        const nextMetrics = citationGraphEngine.getMetrics();
        const nextOpportunities = citationGraphEngine.findCitationOpportunities();

        const clusterByPaper = new Map<string, number>();
        graph.researchClusters.forEach((cluster, clusterIndex) => {
            cluster.paperIds.forEach((paperId) => {
                clusterByPaper.set(paperId, clusterIndex);
            });
        });

        const nodeEntries = Array.from(graph.nodes.values());
        const cols = Math.max(1, Math.ceil(Math.sqrt(nodeEntries.length)));
        const xSpacing = 210;
        const ySpacing = 150;

        const flowNodes: Node[] = nodeEntries.map((node, index) => {
            const clusterIndex = clusterByPaper.get(node.paperId) ?? 0;
            const color = CLUSTER_COLORS[clusterIndex % CLUSTER_COLORS.length];
            const inferredCitationCount = Math.max(node.citations, node.referencedBy.length, node.references.length);
            const size = 56 + Math.min(42, inferredCitationCount * 6);

            return {
                id: node.paperId,
                position: {
                    x: (index % cols) * xSpacing + ((Math.floor(index / cols) % 2) * 30),
                    y: Math.floor(index / cols) * ySpacing
                },
                data: {
                    label: (
                        <div className="cg-node-label">
                            <div className="cg-node-title">{node.title}</div>
                            <div className="cg-node-meta">{node.year}</div>
                        </div>
                    )
                },
                style: {
                    width: size,
                    height: size,
                    background: color,
                    border: '1px solid rgba(255,255,255,0.25)',
                    borderRadius: '50%',
                    color: '#0d1117',
                    fontSize: '9px',
                    padding: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center'
                },
                draggable: true
            };
        });

        const flowEdges: Edge[] = graph.edges.map((edge, index) => ({
            id: `${edge.source}-${edge.target}-${index}`,
            source: edge.source,
            target: edge.target,
            animated: true,
            label: edge.strength.toFixed(2),
            style: {
                stroke: '#58a6ff',
                opacity: Math.max(0.35, edge.strength)
            },
            labelStyle: {
                fill: '#c9d1d9',
                fontSize: 10
            }
        }));

        const lookup = new Map<string, string>();
        nodeEntries.forEach((node) => lookup.set(node.paperId, node.title));

        setNodes(flowNodes);
        setEdges(flowEdges);
        setMetrics(nextMetrics);
        setOpportunities(nextOpportunities);
        setPaperLookup(lookup);
    }, [references]);

    const trendData = useMemo(() => {
        if (metrics.citationTrends.length > 0) {
            return metrics.citationTrends;
        }

        const byYear = new Map<number, number>();
        references.forEach((ref) => {
            const year = ref.year || new Date().getFullYear();
            byYear.set(year, (byYear.get(year) || 0) + 1);
        });

        return Array.from(byYear.entries())
            .map(([year, citations]) => ({ year, citations }))
            .sort((a, b) => a.year - b.year);
    }, [metrics.citationTrends, references]);

    const topPapers = useMemo(() => {
        if (metrics.topCitedPapers.length > 0) {
            return metrics.topCitedPapers;
        }

        return references.slice(0, 5).map((ref) => ({
            id: ref.id,
            title: ref.title,
            citations: 0
        }));
    }, [metrics.topCitedPapers, references]);

    const handleAddOpportunity = (paperId: string, missingCitationIds: string[]) => {
        const selectedTitles = missingCitationIds
            .map((id) => paperLookup.get(id))
            .filter(Boolean)
            .join('; ');

        if (selectedTitles && navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(selectedTitles).catch(() => undefined);
        }

        setAddedOpportunities((prev) => ({ ...prev, [paperId]: true }));
    };

    if (!references?.length) {
        return (
            <div className="citation-graph-panel citation-graph-panel--empty">
                <Network className="cg-empty-icon" />
                <p>No references yet. Add papers to generate a citation network.</p>
            </div>
        );
    }

    return (
        <motion.div
            className="citation-graph-panel"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
        >
            <section className="cg-section">
                <div className="cg-section__header">
                    <Network className="w-4 h-4" />
                    <h3>Citation Network</h3>
                </div>
                <div className="cg-graph-canvas">
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        fitView
                        minZoom={0.2}
                        maxZoom={1.6}
                        attributionPosition="bottom-right"
                    >
                        <MiniMap
                            pannable
                            zoomable
                            nodeColor={(node) => (node.style?.background as string) || '#58a6ff'}
                            maskColor="rgba(13, 17, 23, 0.6)"
                        />
                        <Controls />
                        <Background color="#30363d" gap={20} />
                    </ReactFlow>
                </div>
            </section>

            <section className="cg-section">
                <div className="cg-section__header">
                    <BarChart3 className="w-4 h-4" />
                    <h3>Metrics Dashboard</h3>
                </div>

                <div className="cg-stats-grid">
                    <div className="cg-stat-card">
                        <div className="cg-stat-label">h-index</div>
                        <div className="cg-stat-value">{metrics.hIndex}</div>
                    </div>
                    <div className="cg-stat-card">
                        <div className="cg-stat-label">i10-index</div>
                        <div className="cg-stat-value">{metrics.i10Index}</div>
                    </div>
                    <div className="cg-stat-card">
                        <div className="cg-stat-label">Citation Velocity</div>
                        <div className="cg-stat-value">{metrics.citationVelocity.toFixed(2)}</div>
                    </div>
                </div>

                <div className="cg-metrics-layout">
                    <div className="cg-card">
                        <div className="cg-card__title">Top Cited Papers</div>
                        <ol className="cg-ranked-list">
                            {topPapers.map((paper) => (
                                <li key={paper.id}>
                                    <span className="cg-ranked-title">{paper.title}</span>
                                    <span className="cg-ranked-count">{paper.citations}</span>
                                </li>
                            ))}
                        </ol>
                    </div>

                    <div className="cg-card">
                        <div className="cg-card__title">
                            <TrendingUp className="w-3.5 h-3.5" />
                            Citation Trends
                        </div>
                        <div className="cg-trend-chart">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={trendData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                                    <XAxis dataKey="year" stroke="#8b949e" fontSize={10} />
                                    <YAxis stroke="#8b949e" fontSize={10} />
                                    <Tooltip
                                        contentStyle={{
                                            background: '#161b22',
                                            border: '1px solid #30363d',
                                            borderRadius: 8,
                                            color: '#c9d1d9'
                                        }}
                                    />
                                    <Line type="monotone" dataKey="citations" stroke="#58a6ff" strokeWidth={2} dot={{ r: 2 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </section>

            <section className="cg-section">
                <div className="cg-section__header">
                    <Target className="w-4 h-4" />
                    <h3>Opportunity Finder</h3>
                </div>
                <div className="cg-opportunities">
                    {opportunities.length === 0 && (
                        <div className="cg-empty-opportunity">No citation opportunities detected yet.</div>
                    )}

                    {opportunities.map((opportunity) => {
                        const paperTitle = paperLookup.get(opportunity.paperId) || opportunity.paperId;
                        const missingTitles = opportunity.missingCitations
                            .map((id) => paperLookup.get(id) || id)
                            .slice(0, 3);
                        const isAdded = Boolean(addedOpportunities[opportunity.paperId]);

                        return (
                            <div key={opportunity.paperId} className="cg-opportunity-card">
                                <div className="cg-opportunity-text">
                                    <strong>{paperTitle}</strong> is missing citations from{' '}
                                    <span>{missingTitles.join(', ')}</span>.
                                </div>
                                <button
                                    type="button"
                                    className={`cg-opportunity-btn ${isAdded ? 'cg-opportunity-btn--added' : ''}`}
                                    onClick={() => handleAddOpportunity(opportunity.paperId, opportunity.missingCitations)}
                                >
                                    {isAdded ? 'Added' : 'Add to References'}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </section>
        </motion.div>
    );
};

export default CitationGraphPanel;
