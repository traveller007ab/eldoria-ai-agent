import React, { useState, useMemo } from 'react';
import { DeepSAFBlueprint } from './types';
import { FileText, Download, Settings, X, Check } from 'lucide-react';

interface ReportGeneratorProps {
    blueprint: DeepSAFBlueprint;
    isOpen: boolean;
    onClose: () => void;
}

/**
 * Professional Report Generator
 * Creates publication-ready reports with methodology, results, and analysis
 */
export const ReportGenerator: React.FC<ReportGeneratorProps> = ({
    blueprint,
    isOpen,
    onClose,
}) => {
    const [includeMethodology, setIncludeMethodology] = useState(true);
    const [includeAssumptions, setIncludeAssumptions] = useState(true);
    const [includeSimulationResults, setIncludeSimulationResults] = useState(true);
    const [includeSweeps, setIncludeSweeps] = useState(true);
    const [includeEquations, setIncludeEquations] = useState(true);
    const [includeCitations, setIncludeCitations] = useState(true);
    const [format, setFormat] = useState<'latex' | 'markdown' | 'html'>('latex');

    const generateReport = () => {
        const sections: string[] = [];

        // Title Page
        sections.push(`\\documentclass[11pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath}
\\usepackage{graphicx}
\\usepackage{booktabs}
\\usepackage{hyperref}
\\usepackage{geometry}
\\geometry{margin=1in}

\\title{${blueprint.project_name}}
\\author{Research Report}
\\date{\\today}

\\begin{document}
\\maketitle

\\begin{abstract}
This report presents the simulation results and analysis for the ${blueprint.project_name} system.
The study employs the Strategic Analysis Framework (SAF) to model and analyze system behavior
under various operating conditions.
\\end{abstract}

\\tableofcontents
\\newpage`);

        // Methodology Section
        if (includeMethodology && blueprint.research_notes?.methodology) {
            sections.push(`\\section{Methodology}

${blueprint.research_notes.methodology.split('\n').map(line => line.trim()).filter(line => line).join('\n\n')}

The simulation framework utilizes symbolic equation solving through SymPy, enabling
precise analysis of system dynamics and parameter interactions.`);
        }

        // Assumptions Section
        if (includeAssumptions && blueprint.research_notes?.assumptions) {
            sections.push(`\\section{Assumptions and Simplifications}

${blueprint.research_notes.assumptions.split('\n').map(line => line.trim()).filter(line => line).join('\n\n')}`);
        }

        // System Description
        sections.push(`\\section{System Description}

The ${blueprint.project_name} system consists of ${blueprint.components.length} primary components:

\\begin{itemize}
${blueprint.components.map(comp => `\\item \\textbf{${comp.name}}: ${comp.type} component`).join('\n')}
\\end{itemize}

The system topology includes ${blueprint.flows.length} flow connections representing
energy, material, and control interactions between components.`);

        // Equations Section
        if (includeEquations) {
            const componentsWithEquations = blueprint.components.filter(c => c.equations && c.equations.length > 0);
            if (componentsWithEquations.length > 0) {
                const equationsSection = componentsWithEquations.map(comp => {
                    const equationsText = comp.equations!.map((eq, idx) => {
                        const latexEq = eq
                            .replace(/\*\*/g, '^')
                            .replace(/\*/g, ' \\cdot ')
                            .replace(/=/g, ' &= ');
                        return idx < comp.equations!.length - 1 ? `${latexEq} \\\\` : latexEq;
                    }).join('\n');
                    return `\\subsection{${comp.name}}

\\begin{align}
${equationsText}
\\end{align}`;
                }).join('\n\n');
                
                sections.push(`\\section{Governing Equations}

The system behavior is governed by the following equations:

${equationsSection}`);
            }
        }

        // Simulation Results
        if (includeSimulationResults && blueprint.last_simulation) {
            const vars = blueprint.last_simulation.system_vars;
            const varEntries = Object.entries(vars);

            sections.push(`\\section{Simulation Results}

The simulation was executed on ${new Date(blueprint.last_simulation.timestamp).toLocaleString()}.
The following system variables were computed:

\\begin{table}[h]
\\centering
\\caption{System Variables}
\\label{tab:system_vars}
\\begin{tabular}{l r}
\\toprule
\\textbf{Variable} & \\textbf{Value} \\\\
\\midrule
${varEntries.map(([key, val]) => `${key.replace(/_/g, '\\_')} & ${val.toFixed(6)}`).join(' \\\\\n')} \\\\
\\bottomrule
\\end{tabular}
\\end{table}`);

            if (blueprint.last_simulation.logs && blueprint.last_simulation.logs.length > 0) {
                sections.push(`\\subsection{Simulation Logs}

\\begin{verbatim}
${blueprint.last_simulation.logs.join('\n')}
\\end{verbatim}`);
            }
        }

        // Parameter Sweeps
        if (includeSweeps && blueprint.sweeps && blueprint.sweeps.length > 0) {
            const sweepsSection = blueprint.sweeps.map((sweep, idx) => {
                const colSpec = `c ${Object.keys(sweep.points[0].system_vars).map(() => 'c').join(' ')}`;
                const headers = Object.keys(sweep.points[0].system_vars).map(k => `\\textbf{${k.replace(/_/g, '\\_')}}`).join(' & ');
                const filteredPoints = sweep.points.filter((_, i) => i % Math.ceil(sweep.points.length / 10) === 0);
                const rows = filteredPoints.map(point => {
                    const values = Object.values(point.system_vars).map(v => v.toFixed(4)).join(' & ');
                    return `${point.value.toFixed(4)} & ${values}`;
                }).join(' \\\\\n');
                
                return `\\subsection{Sweep ${idx + 1}: ${sweep.parameterPath}}

Parameter range: ${sweep.min} to ${sweep.max} (${sweep.steps} steps)

\\begin{table}[h]
\\centering
\\caption{Selected Sweep Points}
\\label{tab:sweep_${idx}}
\\begin{tabular}{${colSpec}}
\\toprule
\\textbf{Parameter} & ${headers} \\\\
\\midrule
${rows} \\\\
\\bottomrule
\\end{tabular}
\\end{table}`;
            }).join('\n\n');
            
            sections.push(`\\section{Parameter Sweep Analysis}

${sweepsSection}`);
        }

        // Observations
        if (blueprint.research_notes?.observations) {
            sections.push(`\\section{Observations and Findings}

${blueprint.research_notes.observations.split('\n').map(line => line.trim()).filter(line => line).join('\n\n')}`);
        }

        // Citations
        if (includeCitations && blueprint.research_notes?.citations && blueprint.research_notes.citations.length > 0) {
            sections.push(`\\section{References}

\\begin{enumerate}
${blueprint.research_notes.citations.map(cite => `\\item ${cite}`).join('\n')}
\\end{enumerate}`);
        }

        // Next Steps
        if (blueprint.research_notes?.nextSteps) {
            sections.push(`\\section{Future Work}

${blueprint.research_notes.nextSteps.split('\n').map(line => line.trim()).filter(line => line).join('\n\n')}`);
        }

        sections.push(`\\end{document}`);

        return sections.join('\n\n');
    };

    const handleGenerate = () => {
        const report = generateReport();
        const extension = format === 'latex' ? 'tex' : format === 'markdown' ? 'md' : 'html';
        const blob = new Blob([report], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${blueprint.project_name}_report_${new Date().toISOString().split('T')[0]}.${extension}`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-8">
            <div className="w-full max-w-2xl bg-gray-900 border border-cyan-500/30 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="shrink-0 p-6 border-b border-cyan-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <FileText className="w-6 h-6 text-cyan-400" />
                        <div>
                            <h2 className="text-xl font-bold text-white">Report Generator</h2>
                            <p className="text-xs text-gray-500 mt-1">Generate publication-ready research report</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-grow overflow-y-auto p-6 space-y-6">
                    {/* Format Selection */}
                    <div>
                        <label className="block text-sm font-bold text-cyan-400 mb-3 uppercase tracking-wider">
                            Output Format
                        </label>
                        <div className="flex gap-3">
                            {(['latex', 'markdown', 'html'] as const).map(fmt => (
                                <button
                                    key={fmt}
                                    onClick={() => setFormat(fmt)}
                                    className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                                        format === fmt
                                            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                                            : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800 border border-gray-700'
                                    }`}
                                >
                                    {format === fmt && <Check className="w-4 h-4" />}
                                    <span className="text-sm font-bold uppercase">{fmt}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Section Selection */}
                    <div>
                        <label className="block text-sm font-bold text-cyan-400 mb-3 uppercase tracking-wider">
                            Include Sections
                        </label>
                        <div className="space-y-2">
                            {[
                                { key: 'includeMethodology', label: 'Methodology', state: includeMethodology, setter: setIncludeMethodology },
                                { key: 'includeAssumptions', label: 'Assumptions', state: includeAssumptions, setter: setIncludeAssumptions },
                                { key: 'includeSimulationResults', label: 'Simulation Results', state: includeSimulationResults, setter: setIncludeSimulationResults },
                                { key: 'includeSweeps', label: 'Parameter Sweeps', state: includeSweeps, setter: setIncludeSweeps },
                                { key: 'includeEquations', label: 'Governing Equations', state: includeEquations, setter: setIncludeEquations },
                                { key: 'includeCitations', label: 'References', state: includeCitations, setter: setIncludeCitations },
                            ].map(item => (
                                <label key={item.key} className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 cursor-pointer transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={item.state}
                                        onChange={(e) => item.setter(e.target.checked)}
                                        className="w-4 h-4 text-cyan-500 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500"
                                    />
                                    <span className="text-sm text-white">{item.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Preview Info */}
                    <div className="bg-black/30 rounded-lg p-4 border border-cyan-500/10">
                        <h4 className="text-xs font-bold text-cyan-400 mb-2 uppercase tracking-wider">Report Preview</h4>
                        <div className="text-xs text-gray-400 space-y-1">
                            <p>• Title: {blueprint.project_name}</p>
                            <p>• Components: {blueprint.components.length}</p>
                            <p>• Flows: {blueprint.flows.length}</p>
                            {blueprint.last_simulation && (
                                <p>• Simulation Variables: {Object.keys(blueprint.last_simulation.system_vars).length}</p>
                            )}
                            {blueprint.sweeps && blueprint.sweeps.length > 0 && (
                                <p>• Parameter Sweeps: {blueprint.sweeps.length}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="shrink-0 p-4 border-t border-cyan-500/20 flex items-center justify-between bg-gray-900/50">
                    <div className="text-xs text-gray-500">
                        Report will be generated in {format.toUpperCase()} format
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors text-sm font-bold"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleGenerate}
                            className="px-6 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors text-sm font-bold flex items-center gap-2"
                        >
                            <Download className="w-4 h-4" />
                            Generate Report
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

