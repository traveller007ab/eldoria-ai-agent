import React, { useState } from 'react';
import { Network, Cpu, ArrowRight, Activity, Zap, BookOpen, Check } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';


interface SAFComponent {
    id: string;
    name: string;
    type: 'core' | 'subcore' | 'micro';
    dependencies: string[];
}

interface SAFFlow {
    from: string;
    to: string;
    type: string;
}

interface SAFBlueprintProps {
    data: {
        project_name: string;
        components: SAFComponent[];
        flows: SAFFlow[];
    };
}

export const SAFBlueprint: React.FC<SAFBlueprintProps> = ({ data }) => {
    const { academicProjects, updateAcademicProject } = useWorkspace();
    const [selectedLevel, setSelectedLevel] = useState<'all' | 'core' | 'subcore' | 'micro'>('all');
    const [isExported, setIsExported] = useState(false);

    const handleExportToThesis = () => {
        if (academicProjects.length === 0) {
            alert("No active Academic Project found. Create one in the Academic Hub first.");
            return;
        }

        const project = academicProjects[academicProjects.length - 1];
        let feedbackMsg = "";
        let updates: Record<string, string> = { ...project.draft_content };

        // --- INTELLIGENT PARSER ---
        // 1. Identification: Separate Structural Units from Metric/Data Units
        const metricKeywords = ['efficiency', 'rate', 'temperature', 'temp', 'speed', 'cost', 'output', 'throughput', 'capacity', '%', '$', '°', 'ratio', 'score'];

        const structuralComponents = data.components.filter(c => !metricKeywords.some(mw => c.name.toLowerCase().includes(mw)));
        const metricComponents = data.components.filter(c => metricKeywords.some(mw => c.name.toLowerCase().includes(mw)));

        const hasStructure = structuralComponents.length > 0;
        const hasMetrics = metricComponents.length > 0;

        // 2. Action: Chapter 3 (Materials & Methods / System Design)
        if (hasStructure || (!hasStructure && !hasMetrics)) {
            // Default to Ch3 if everything is unclear, or if valid structure exists
            const ch3Title = 'System Architecture & Component Design';
            const ch3Content = `
### ${ch3Title}: ${data.project_name}
The system architecture was modeled using a hierarchical block decomposition method. The principal functional units are defined as follows:

**Core Architecture**
${structuralComponents.filter(c => c.type === 'core').map(c => `- **${c.name}**: Primary operational unit.`).join('\n')}

**Subsystems & Integration**
${structuralComponents.filter(c => c.type === 'subcore').map(c => `- **${c.name}**: Integrative module (Dependencies: ${c.dependencies.length ? c.dependencies.join(', ') : 'None'}).`).join('\n')}
${structuralComponents.filter(c => c.type === 'micro').map(c => `- **${c.name}**: Atomic component.`).join('\n')}

**Operational Flow**
${data.flows.map(f => `1. ${f.from} interacts with ${f.to} via ${f.type} mechanism.`).join('\n')}
            `;

            updates['Chapter 3: Materials & Methods'] = (updates['Chapter 3: Materials & Methods'] || "") + "\n\n" + ch3Content;
            feedbackMsg += "Architecture → Ch 3. ";
        }

        // 3. Action: Chapter 4 (Results / Performance Data)
        if (hasMetrics) {
            const ch4Content = `
### System Performance Metrics: ${data.project_name}
Analysis of the system's operational parameters derived the following quantitative data points:

| Parameter / Metric | Value / Status | Component Type |
| :--- | :--- | :--- |
${metricComponents.map(c => `| **${c.name.split(':')[0]}** | ${c.name.includes(':') ? c.name.split(':')[1] : 'Measured'} | ${c.type.toUpperCase()} |`).join('\n')}

*Table 4.x: Computed System Parameters derived from SAF Analysis.*
            `;

            updates['Chapter 4: Results & Discussion'] = (updates['Chapter 4: Results & Discussion'] || "") + "\n\n" + ch4Content;
            feedbackMsg += "Metrics → Ch 4.";
        }

        updateAcademicProject({
            ...project,
            draft_content: updates
        });

        setIsExported(true);
        setTimeout(() => setIsExported(false), 3000);
        console.log(`[AI-SMART-EXPORT] ${feedbackMsg}`);
    };

    // Group components by type for the visual columns

    const coreComponents = data.components.filter(c => c.type === 'core');
    const subComponents = data.components.filter(c => c.type === 'subcore');
    const microComponents = data.components.filter(c => c.type === 'micro');

    const getBorderColor = (type: string) => {
        switch (type) {
            case 'core': return 'border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.5)]';
            case 'subcore': return 'border-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.3)]';
            case 'micro': return 'border-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.2)]';
            default: return 'border-gray-700';
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'core': return <Cpu className="w-5 h-5 text-cyan-400" />;
            case 'subcore': return <Network className="w-4 h-4 text-purple-400" />;
            case 'micro': return <Activity className="w-3 h-3 text-emerald-400" />;
            default: return <Zap className="w-3 h-3 text-gray-400" />;
        }
    };

    return (
        <div className="w-full mt-4 bg-[#0a0a0f] border border-cyan-900/30 rounded-xl overflow-hidden font-mono">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-black/40 border-b border-cyan-900/30">
                <div className="flex items-center gap-2">
                    <span className="text-cyan-400 text-xs uppercase tracking-widest">SAF Blueprint // v1.0</span>
                    <span className="text-gray-500 text-xs">|</span>
                    <span className="text-white font-bold">{data.project_name}</span>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleExportToThesis}
                        className={`flex items-center gap-2 px-3 py-1 text-[10px] uppercase font-bold rounded border transition-all ${isExported
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                            : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/20'
                            }`}
                        title="Append Architecture to Thesis (Chapter 3)"
                    >
                        {isExported ? <Check className="w-3 h-3" /> : <BookOpen className="w-3 h-3" />}
                        {isExported ? 'Added to Thesis' : 'Export to Thesis'}
                    </button>
                    <span className="w-px h-4 bg-gray-700 self-center mx-1"></span>
                    {['all', 'core', 'subcore'].map((level) => (
                        <button
                            key={level}
                            onClick={() => setSelectedLevel(level as any)}
                            className={`px-2 py-1 text-[10px] uppercase rounded border transition-colors ${selectedLevel === level
                                ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400'
                                : 'bg-transparent border-gray-800 text-gray-500 hover:border-gray-600'
                                }`}
                        >
                            {level}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid Canvas */}
            <div className="p-6 relative min-h-[300px] flex gap-8 justify-center items-start overflow-x-auto">

                {/* Core Column */}
                {(selectedLevel === 'all' || selectedLevel === 'core') && (
                    <div className="flex flex-col gap-4 min-w-[200px]">
                        <div className="text-center text-xs text-cyan-400 mb-2 uppercase tracking-widest">Core Architecture</div>
                        {coreComponents.map(comp => (
                            <BlockNode key={comp.id} comp={comp} getBorderColor={getBorderColor} getIcon={getIcon} />
                        ))}
                        {coreComponents.length === 0 && <EmptySlot label="No Core Defined" />}
                    </div>
                )}

                {/* Connector Arrows (Only if showing both) */}
                {selectedLevel === 'all' && (
                    <div className="flex flex-col justify-center opacity-30">
                        <ArrowRight className="w-6 h-6 text-gray-600 animate-pulse" />
                    </div>
                )}

                {/* Subcore Column */}
                {(selectedLevel === 'all' || selectedLevel === 'subcore') && (
                    <div className="flex flex-col gap-4 min-w-[200px]">
                        <div className="text-center text-xs text-purple-400 mb-2 uppercase tracking-widest">Subsystems</div>
                        {subComponents.map(comp => (
                            <BlockNode key={comp.id} comp={comp} getBorderColor={getBorderColor} getIcon={getIcon} />
                        ))}
                        {subComponents.length === 0 && <EmptySlot label="No Subsystems" />}
                    </div>
                )}

                {/* Connector Arrows */}
                {selectedLevel === 'all' && (
                    <div className="flex flex-col justify-center opacity-30">
                        <ArrowRight className="w-6 h-6 text-gray-600 animate-pulse" />
                    </div>
                )}

                {/* Micro Column (Optional) */}
                {(selectedLevel === 'all' || selectedLevel === 'micro') && (
                    <div className="flex flex-col gap-4 min-w-[180px]">
                        <div className="text-center text-xs text-emerald-400 mb-2 uppercase tracking-widest">Atomic Units</div>
                        {microComponents.map(comp => (
                            <BlockNode key={comp.id} comp={comp} getBorderColor={getBorderColor} getIcon={getIcon} />
                        ))}
                        {microComponents.length === 0 && <EmptySlot label="No Atomic Units" />}
                    </div>
                )}
            </div>

            {/* Status Footer */}
            <div className="px-4 py-2 bg-black/40 border-t border-cyan-900/30 flex justify-between text-[10px] text-gray-500">
                <span>Components: {data.components.length}</span>
                <span>Flows: {data.flows.length}</span>
                <span className="text-emerald-500">SYSTEM: ONLINE</span>
            </div>
        </div>
    );
};

const BlockNode = ({ comp, getBorderColor, getIcon }: any) => (
    <div className={`
        relative p-3 bg-gray-900/80 backdrop-blur border rounded-lg 
        transition-all duration-300 hover:scale-[1.02] cursor-default
        ${getBorderColor(comp.type)}
    `}>
        <div className="flex items-center gap-2 mb-1">
            {getIcon(comp.type)}
            <span className="font-bold text-white text-sm">{comp.name}</span>
        </div>
        <div className="text-[10px] text-gray-400 truncate">ID: {comp.id}</div>
        {comp.dependencies.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
                {comp.dependencies.map((dep: string) => (
                    <span key={dep} className="px-1.5 py-0.5 bg-gray-800 rounded text-[9px] text-gray-300">
                        ← {dep}
                    </span>
                ))}
            </div>
        )}
    </div>
);

const EmptySlot = ({ label }: { label: string }) => (
    <div className="py-8 border-2 border-dashed border-gray-800 rounded-lg flex items-center justify-center text-gray-600 text-xs uppercase">
        {label}
    </div>
);
