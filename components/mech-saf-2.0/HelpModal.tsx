import React, { useState } from 'react';
import { X, Keyboard, HelpCircle, Book, Zap } from 'lucide-react';

interface HelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState<'shortcuts' | 'formulas' | 'about'>('shortcuts');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-[600px] max-h-[80vh] overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800/50">
                    <div className="flex items-center gap-3">
                        <HelpCircle className="w-5 h-5 text-cyan-400" />
                        <h2 className="text-lg font-semibold text-white">Help & Reference</h2>
                    </div>
                    <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-700">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-700 bg-slate-900/50">
                    <button
                        onClick={() => setActiveTab('shortcuts')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'shortcuts' ? 'text-white border-b-2 border-cyan-500' : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        <Keyboard className="w-4 h-4 inline mr-2" />
                        Keyboard Shortcuts
                    </button>
                    <button
                        onClick={() => setActiveTab('formulas')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'formulas' ? 'text-white border-b-2 border-cyan-500' : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        <Zap className="w-4 h-4 inline mr-2" />
                        Key Formulas
                    </button>
                    <button
                        onClick={() => setActiveTab('about')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'about' ? 'text-white border-b-2 border-cyan-500' : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        <Book className="w-4 h-4 inline mr-2" />
                        About
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                    {activeTab === 'shortcuts' && <ShortcutsContent />}
                    {activeTab === 'formulas' && <FormulasContent />}
                    {activeTab === 'about' && <AboutContent />}
                </div>
            </div>
        </div>
    );
};

const ShortcutsContent: React.FC = () => (
    <div className="space-y-4">
        <ShortcutGroup title="General">
            <Shortcut keys={['Ctrl', 'S']} description="Save project" />
            <Shortcut keys={['Ctrl', 'O']} description="Open project" />
            <Shortcut keys={['Ctrl', 'E']} description="Export as JSON" />
            <Shortcut keys={['F1']} description="Open help" />
        </ShortcutGroup>

        <ShortcutGroup title="Edit">
            <Shortcut keys={['Ctrl', 'Z']} description="Undo" />
            <Shortcut keys={['Ctrl', 'Y']} description="Redo" />
            <Shortcut keys={['Ctrl', 'C']} description="Copy component" />
            <Shortcut keys={['Ctrl', 'V']} description="Paste component" />
            <Shortcut keys={['Ctrl', 'D']} description="Duplicate component" />
            <Shortcut keys={['Delete']} description="Delete selected" />
        </ShortcutGroup>

        <ShortcutGroup title="View">
            <Shortcut keys={['Ctrl', 'F']} description="Fit view" />
            <Shortcut keys={['Ctrl', '+']} description="Zoom in" />
            <Shortcut keys={['Ctrl', '-']} description="Zoom out" />
            <Shortcut keys={['Ctrl', 'P']} description="Toggle properties panel" />
        </ShortcutGroup>

        <ShortcutGroup title="Simulation">
            <Shortcut keys={['Ctrl', 'Enter']} description="Run simulation" />
        </ShortcutGroup>
    </div>
);

const FormulasContent: React.FC = () => (
    <div className="space-y-4">
        <FormulaGroup title="Fluid Mechanics">
            <Formula name="Pump Power" equation="P = ρgQH/η" description="Hydraulic power for centrifugal pump" />
            <Formula name="Darcy-Weisbach" equation="h_f = f(L/D)(v²/2g)" description="Head loss in pipe flow" />
            <Formula name="Reynolds Number" equation="Re = ρvD/μ" description="Flow regime indicator" />
        </FormulaGroup>

        <FormulaGroup title="Heat Transfer">
            <Formula name="Heat Exchange" equation="Q = UAΔT_lm" description="Heat transfer rate in HX" />
            <Formula name="LMTD" equation="ΔT_lm = (ΔT₁-ΔT₂)/ln(ΔT₁/ΔT₂)" description="Log mean temperature diff" />
        </FormulaGroup>

        <FormulaGroup title="Mechanical">
            <Formula name="Gear Ratio" equation="i = z₂/z₁" description="Speed reduction ratio" />
            <Formula name="Bearing Life" equation="L₁₀ = (C/P)³ × 10⁶/60n" description="Basic rating life (hours)" />
            <Formula name="Spring Rate" equation="k = Gd⁴/8D³n" description="Compression spring stiffness" />
            <Formula name="Motor Torque" equation="T = 9550P/n" description="Rated torque from power" />
        </FormulaGroup>

        <FormulaGroup title="Control">
            <Formula name="4-20mA" equation="I = 4 + 16(x-x_min)/(x_max-x_min)" description="Transmitter output signal" />
            <Formula name="PID" equation="CV = Kp(e + ∫e/Ti + Td·de/dt)" description="PID controller equation" />
        </FormulaGroup>
    </div>
);

const AboutContent: React.FC = () => (
    <div className="space-y-4 text-slate-300">
        <div>
            <h3 className="text-lg font-semibold text-white mb-2">Mech SAF Lab v2.0</h3>
            <p className="text-sm">
                A professional-grade mechanical engineering workbench for system design,
                simulation, and analysis. Built with React, ReactFlow, and Zustand.
            </p>
        </div>

        <div>
            <h4 className="font-medium text-white mb-1">Features</h4>
            <ul className="text-sm space-y-1 list-disc list-inside text-slate-400">
                <li>16 components across 4 domains (Fluid, Thermal, Mechanical, Control)</li>
                <li>Real-time physics calculations</li>
                <li>Drag-and-drop schematic editor</li>
                <li>Export to JSON, Modelica, CSV</li>
                <li>Undo/Redo with 50-step history</li>
                <li>Auto-save to browser storage</li>
            </ul>
        </div>

        <div>
            <h4 className="font-medium text-white mb-1">Credits</h4>
            <p className="text-sm text-slate-400">
                Part of the Eldoria AI IDE. Physics formulas reference ASHRAE,
                ISO 6336, TEMA, ISA, and other engineering standards.
            </p>
        </div>
    </div>
);

const ShortcutGroup: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{title}</h3>
        <div className="space-y-1">{children}</div>
    </div>
);

const Shortcut: React.FC<{ keys: string[]; description: string }> = ({ keys, description }) => (
    <div className="flex items-center justify-between py-1">
        <span className="text-sm text-slate-300">{description}</span>
        <div className="flex items-center gap-1">
            {keys.map((key, idx) => (
                <React.Fragment key={key}>
                    <kbd className="px-2 py-0.5 text-xs font-mono bg-slate-700 border border-slate-600 rounded text-slate-200">
                        {key}
                    </kbd>
                    {idx < keys.length - 1 && <span className="text-slate-500">+</span>}
                </React.Fragment>
            ))}
        </div>
    </div>
);

const FormulaGroup: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{title}</h3>
        <div className="space-y-2">{children}</div>
    </div>
);

const Formula: React.FC<{ name: string; equation: string; description: string }> = ({ name, equation, description }) => (
    <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/50">
        <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-white font-medium">{name}</span>
            <span className="font-mono text-cyan-400 text-sm">{equation}</span>
        </div>
        <p className="text-xs text-slate-500">{description}</p>
    </div>
);
