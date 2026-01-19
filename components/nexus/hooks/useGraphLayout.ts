/**
 * useGraphLayout - Force-Directed Layout Hook
 * 
 * Provides physics-based auto-layout for the canvas nodes using
 * a simplified force simulation (repulsion between nodes, attraction along edges).
 */

import { useCallback, useRef } from 'react';
import type { Node, Edge } from 'reactflow';

interface ForceNode extends Node {
    vx?: number;
    vy?: number;
    fx?: number | null;
    fy?: number | null;
}

interface LayoutConfig {
    repulsionStrength: number;  // How strongly nodes push each other away
    attractionStrength: number; // How strongly connected nodes pull together
    centerGravity: number;      // Pull toward center
    damping: number;            // Velocity decay
    iterations: number;         // Steps per layout call
}

const DEFAULT_CONFIG: LayoutConfig = {
    repulsionStrength: 5000,
    attractionStrength: 0.1,
    centerGravity: 0.01,
    damping: 0.9,
    iterations: 50,
};

export function useGraphLayout(config: Partial<LayoutConfig> = {}) {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    const isSimulating = useRef(false);

    /**
     * Calculate forces and update positions
     */
    const runLayout = useCallback((
        nodes: Node[],
        edges: Edge[],
        onUpdate: (nodes: Node[]) => void
    ) => {
        if (nodes.length === 0 || isSimulating.current) return;

        isSimulating.current = true;

        // Initialize velocity
        const forceNodes: ForceNode[] = nodes.map(n => ({
            ...n,
            vx: 0,
            vy: 0,
            fx: null,
            fy: null,
        }));

        // Create node lookup
        const nodeMap = new Map<string, ForceNode>();
        forceNodes.forEach(n => nodeMap.set(n.id, n));

        // Calculate center
        const centerX = 400;
        const centerY = 300;

        // Simulation loop
        for (let i = 0; i < cfg.iterations; i++) {
            // Apply repulsion between all node pairs
            for (let a = 0; a < forceNodes.length; a++) {
                for (let b = a + 1; b < forceNodes.length; b++) {
                    const nodeA = forceNodes[a];
                    const nodeB = forceNodes[b];

                    const dx = nodeB.position.x - nodeA.position.x;
                    const dy = nodeB.position.y - nodeA.position.y;
                    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

                    // Repulsion force (inverse square law)
                    const force = cfg.repulsionStrength / (dist * dist);
                    const fx = (dx / dist) * force;
                    const fy = (dy / dist) * force;

                    nodeA.vx! -= fx;
                    nodeA.vy! -= fy;
                    nodeB.vx! += fx;
                    nodeB.vy! += fy;
                }
            }

            // Apply attraction along edges
            edges.forEach(edge => {
                const source = nodeMap.get(edge.source);
                const target = nodeMap.get(edge.target);

                if (source && target) {
                    const dx = target.position.x - source.position.x;
                    const dy = target.position.y - source.position.y;
                    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

                    // Spring force
                    const idealDist = 250;
                    const force = (dist - idealDist) * cfg.attractionStrength;
                    const fx = (dx / dist) * force;
                    const fy = (dy / dist) * force;

                    source.vx! += fx;
                    source.vy! += fy;
                    target.vx! -= fx;
                    target.vy! -= fy;
                }
            });

            // Apply center gravity
            forceNodes.forEach(node => {
                const dx = centerX - node.position.x;
                const dy = centerY - node.position.y;
                node.vx! += dx * cfg.centerGravity;
                node.vy! += dy * cfg.centerGravity;
            });

            // Update positions with velocity and damping
            forceNodes.forEach(node => {
                if (node.fx !== null) {
                    node.position.x = node.fx;
                    node.vx = 0;
                } else {
                    node.vx! *= cfg.damping;
                    node.position.x += node.vx!;
                }

                if (node.fy !== null) {
                    node.position.y = node.fy;
                    node.vy = 0;
                } else {
                    node.vy! *= cfg.damping;
                    node.position.y += node.vy!;
                }
            });
        }

        // Return updated nodes
        const updatedNodes = forceNodes.map(({ vx, vy, fx, fy, ...node }) => node);
        onUpdate(updatedNodes);

        isSimulating.current = false;
    }, [cfg]);

    /**
     * Auto-arrange nodes in a grid pattern (quick layout)
     */
    const gridLayout = useCallback((
        nodes: Node[],
        onUpdate: (nodes: Node[]) => void
    ) => {
        const cols = Math.ceil(Math.sqrt(nodes.length));
        const spacing = 300;

        const arranged = nodes.map((node, i) => ({
            ...node,
            position: {
                x: 100 + (i % cols) * spacing,
                y: 100 + Math.floor(i / cols) * spacing,
            },
        }));

        onUpdate(arranged);
    }, []);

    /**
     * Radial layout around a center node
     */
    const radialLayout = useCallback((
        nodes: Node[],
        centerId: string | null,
        onUpdate: (nodes: Node[]) => void
    ) => {
        if (nodes.length === 0) return;

        const centerNode = centerId
            ? nodes.find(n => n.id === centerId)
            : nodes[0];

        if (!centerNode) return;

        const otherNodes = nodes.filter(n => n.id !== centerNode.id);
        const radius = 300;
        const angleStep = (2 * Math.PI) / otherNodes.length;

        const arranged = [
            { ...centerNode, position: { x: 400, y: 300 } },
            ...otherNodes.map((node, i) => ({
                ...node,
                position: {
                    x: 400 + radius * Math.cos(i * angleStep - Math.PI / 2),
                    y: 300 + radius * Math.sin(i * angleStep - Math.PI / 2),
                },
            })),
        ];

        onUpdate(arranged);
    }, []);

    /**
     * Group nodes by type in separate regions
     */
    const clusterLayout = useCallback((
        nodes: Node[],
        onUpdate: (nodes: Node[]) => void
    ) => {
        const types = Array.from(new Set(nodes.map(n => (n.data as any).type)));
        const clusters: Record<string, Node[]> = {};
        types.forEach(t => clusters[t || 'other'] = nodes.filter(n => (n.data as any).type === t));

        const clusterSpacing = 800;
        const nodeSpacing = 300;

        const arranged: Node[] = [];

        types.forEach((type, clusterIdx) => {
            const clusterNodes = clusters[type || 'other'];
            const cols = Math.ceil(Math.sqrt(clusterNodes.length));
            const baseX = (clusterIdx % 2) * clusterSpacing;
            const baseY = Math.floor(clusterIdx / 2) * clusterSpacing;

            clusterNodes.forEach((node, i) => {
                arranged.push({
                    ...node,
                    position: {
                        x: baseX + (i % cols) * nodeSpacing,
                        y: baseY + Math.floor(i / cols) * nodeSpacing,
                    }
                });
            });
        });

        onUpdate(arranged);
    }, []);

    return {
        runLayout,
        gridLayout,
        radialLayout,
        clusterLayout,
        isSimulating: isSimulating.current,
    };
}

export default useGraphLayout;
