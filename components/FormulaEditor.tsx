import React, { useState, useEffect, useRef } from 'react';
import { Sigma, Copy, Check, Calculator, RefreshCw, Send, BookOpen } from 'lucide-react';
import katex from 'katex';

export const FormulaEditor: React.FC = () => {
    const [formula, setFormula] = useState('\\sigma = E \\cdot \\epsilon');
    const [isCopied, setIsCopied] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (containerRef.current && formula) {
            try {
                katex.render(formula, containerRef.current, {
                    throwOnError: false,
                    displayMode: true
                });
            } catch (err) {
                console.error("KaTeX error:", err);
            }
        }
    }, [formula]);

    const standardFormulas = [
        { name: "Bernoulli's Principle", tex: 'P + \\frac{1}{2}\\rho v^2 + \\rho gh = \\text{constant}' },
        { name: "First Law of Thermo", tex: 'Q - W = \\Delta U' },
        { name: "Stress-Strain (Hooke)", tex: '\\sigma = E \\cdot \\epsilon' },
        { name: "Heat Transfer (Fourier)", tex: 'q = -k \\nabla T' },
        { name: "Euler Equation", tex: 'e^{i\\pi} + 1 = 0' }
    ];

    const handleCopy = () => {
        navigator.clipboard.writeText(formula);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <div className="bg-black/40 border border-cyan-500/10 rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(34,211,238,0.05)]">
            <div className="p-4 border-b border-cyan-500/10 bg-cyan-500/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-cyan-500/10 rounded-lg">
                        <Sigma className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div>
                        <h4 className="text-[10px] font-bold text-cyan-100 uppercase tracking-widest">Engineering Formula Bridge</h4>
                        <p className="text-[8px] text-cyan-500/40 uppercase font-medium">KaTeX Synthesis v2.0</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button className="p-1.5 hover:bg-white/5 rounded-md text-cyan-500/40 hover:text-cyan-100 transition-colors">
                        <Calculator className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            <div className="p-6 space-y-6">
                <div className="space-y-3">
                    <label className="text-[9px] font-bold text-cyan-500/40 uppercase tracking-widest px-1">LaTeX Input Buffer</label>
                    <div className="relative group">
                        <textarea
                            className="w-full bg-black/60 border border-cyan-500/20 rounded-xl p-4 text-xs font-mono text-cyan-100 focus:outline-none focus:border-cyan-400/30 transition-all min-h-[80px]"
                            placeholder="\sigma = \frac{F}{A}..."
                            value={formula}
                            onChange={(e) => setFormula(e.target.value)}
                        />
                        <button
                            onClick={handleCopy}
                            className="absolute bottom-3 right-3 p-2 bg-black/40 hover:bg-black/60 border border-cyan-500/10 rounded-lg transition-all text-cyan-400 opacity-0 group-hover:opacity-100"
                        >
                            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                    </div>
                </div>

                <div className="space-y-3">
                    <label className="text-[9px] font-bold text-cyan-500/40 uppercase tracking-widest px-1">Neural Preview</label>
                    <div className="p-8 bg-cyan-500/[0.02] border border-cyan-500/10 rounded-2xl flex items-center justify-center min-h-[100px] group relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-transparent"></div>
                        <div
                            ref={containerRef}
                            className="text-xl text-cyan-100 transition-all group-hover:scale-110"
                        >
                            {!formula && <span className="text-cyan-500/20 italic text-sm">Waiting for valid LaTeX structure...</span>}
                        </div>
                    </div>
                </div>

                <div className="pt-4 border-t border-cyan-500/10">
                    <div className="flex items-center gap-2 mb-3 px-1">
                        <BookOpen className="w-3 h-3 text-cyan-500/40" />
                        <span className="text-[9px] font-bold text-cyan-500/40 uppercase tracking-widest">Mechanical Library</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {standardFormulas.map((f, i) => (
                            <button
                                key={i}
                                onClick={() => setFormula(f.tex)}
                                className="p-2 bg-black/20 hover:bg-cyan-500/5 border border-white/5 hover:border-cyan-500/20 rounded-lg text-left transition-all group"
                            >
                                <div className="text-[9px] font-black text-cyan-400 truncate group-hover:text-cyan-200">{f.name}</div>
                                <div className="text-[8px] text-cyan-500/30 font-mono mt-0.5 truncate">{f.tex}</div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="p-4 bg-cyan-500/5 border-t border-cyan-500/10 flex items-center justify-between text-[8px] uppercase font-bold tracking-widest">
                <span className="text-cyan-500/40">Powered by Eldoria LaTeX-Core</span>
                <span className="text-emerald-400">Syntax: OK</span>
            </div>
        </div>
    );
};
