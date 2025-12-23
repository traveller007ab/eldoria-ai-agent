import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Layout, Monitor, MonitorPlay, Palette, RefreshCw, X, Download, Presentation } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface DefenseDeckUIProps {
    markdown: string;
    onClose: () => void;
}

export const DefenseDeckUI: React.FC<DefenseDeckUIProps> = ({ markdown, onClose }) => {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [theme, setTheme] = useState<'holographic' | 'academic' | 'midnight'>('holographic');

    const slides = useMemo(() => {
        return markdown.split(/(?=## )/).filter(s => s.trim().length > 0);
    }, [markdown]);

    const themes = {
        holographic: {
            bg: "bg-[#06b6d4]/5",
            border: "border-cyan-500/20",
            text: "text-cyan-100",
            accent: "text-cyan-400",
            pattern: "radial-gradient(circle, rgba(34,211,238,0.1) 1px, transparent 1px)",
            patternSize: "20px 20px"
        },
        academic: {
            bg: "bg-white/[0.02]",
            border: "border-white/10",
            text: "text-slate-100",
            accent: "text-emerald-400",
            pattern: "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px)",
            patternSize: "100% 40px"
        },
        midnight: {
            bg: "bg-black/60",
            border: "border-purple-500/20",
            text: "text-purple-100",
            accent: "text-purple-400",
            pattern: "none",
            patternSize: "auto"
        }
    };

    const currentTheme = themes[theme];

    return (
        <div className="fixed inset-0 z-[100] bg-[#0c1a3e]/95 backdrop-blur-xl flex flex-col items-center justify-center p-12 animate-in fade-in duration-500">
            {/* Header / Controls */}
            <div className="absolute top-8 left-8 right-8 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-cyan-500/10 rounded-xl">
                        <MonitorPlay className="w-6 h-6 text-cyan-400" />
                    </div>
                    <div>
                        <h2 className="text-sm font-black text-cyan-100 uppercase tracking-[0.3em]">Holographic Defense Console</h2>
                        <p className="text-[10px] text-cyan-500/40 uppercase font-bold">Slide {currentSlide + 1} / {slides.length} • Synthesis Active</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex bg-black/40 border border-white/5 p-1 rounded-xl">
                        {(['holographic', 'academic', 'midnight'] as const).map(t => (
                            <button
                                key={t}
                                onClick={() => setTheme(t)}
                                className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${theme === t ? 'bg-cyan-500/20 text-cyan-100' : 'text-white/20 hover:text-white/40'}`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                    <button className="p-3 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-xl transition-all border border-white/5"><Download className="w-5 h-5" /></button>
                    <button onClick={onClose} className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-all border border-red-500/20"><X className="w-5 h-5" /></button>
                </div>
            </div>

            {/* Slide Stage */}
            <div className="w-full max-w-5xl aspect-video relative group">
                <div
                    className={`absolute inset-0 rounded-[2.5rem] border ${currentTheme.border} ${currentTheme.bg} shadow-[0_0_100px_rgba(34,211,238,0.05)] overflow-hidden flex flex-col p-20 transition-all duration-700`}
                    style={{ backgroundImage: currentTheme.pattern, backgroundSize: currentTheme.patternSize }}
                >
                    {/* Decorative Elements */}
                    <div className="absolute top-0 left-0 w-32 h-32 bg-cyan-500/10 blur-[100px] pointer-events-none"></div>
                    <div className="absolute bottom-0 right-0 w-48 h-48 bg-purple-500/10 blur-[120px] pointer-events-none"></div>

                    <div className={`prose prose-invert max-w-none transition-all duration-500 ${currentTheme.text}`}>
                        <ReactMarkdown
                            components={{
                                h2: ({ node, ...props }) => <h2 className={`text-4xl font-black uppercase tracking-widest mb-12 flex items-center gap-6 ${currentTheme.accent}`} {...props} />,
                                li: ({ node, ...props }) => <li className="text-xl leading-relaxed mb-4 list-none flex items-start gap-4 before:content-[''] before:block before:w-2 before:h-2 before:bg-cyan-400 before:mt-3 before:rounded-full before:shrink-0" {...props} />,
                                p: ({ node, ...props }) => <p className="text-lg opacity-60 italic mb-8" {...props} />
                            }}
                        >
                            {slides[currentSlide]}
                        </ReactMarkdown>
                    </div>

                    {/* Navigation Overlays */}
                    <button
                        onClick={() => setCurrentSlide(prev => Math.max(0, prev - 1))}
                        className={`absolute left-8 top-1/2 -translate-y-1/2 p-4 bg-white/5 hover:bg-cyan-500/10 rounded-full text-white/10 hover:text-cyan-400 transition-all ${currentSlide === 0 ? 'opacity-0' : 'opacity-100'}`}
                    >
                        <ChevronLeft className="w-8 h-8" />
                    </button>
                    <button
                        onClick={() => setCurrentSlide(prev => Math.min(slides.length - 1, prev + 1))}
                        className={`absolute right-8 top-1/2 -translate-y-1/2 p-4 bg-white/5 hover:bg-cyan-500/10 rounded-full text-white/10 hover:text-cyan-400 transition-all ${currentSlide === slides.length - 1 ? 'opacity-0' : 'opacity-100'}`}
                    >
                        <ChevronRight className="w-8 h-8" />
                    </button>
                </div>
            </div>

            {/* Slide Sorter / Thumbnails */}
            <div className="absolute bottom-12 left-8 right-8 flex justify-center gap-3 overflow-x-auto p-4 custom-scrollbar">
                {slides.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => setCurrentSlide(i)}
                        className={`w-12 h-8 rounded-md border transition-all shrink-0 ${currentSlide === i ? 'bg-cyan-500/20 border-cyan-500/40' : 'bg-black/20 border-white/5 hover:border-white/20'}`}
                    >
                        <div className={`text-[10px] font-black ${currentSlide === i ? 'text-cyan-400' : 'text-white/20'}`}>{i + 1}</div>
                    </button>
                ))}
            </div>

            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 text-[8px] font-bold text-white/10 uppercase tracking-[0.5em]">
                <Presentation className="w-3 h-3" />
                Inference Protocol v4.0.2
            </div>
        </div>
    );
};
