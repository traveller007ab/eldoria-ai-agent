
import React, { useState, useEffect, useMemo } from 'react';
import { ChevronRight, ChevronLeft, X, Sparkles, BookOpen, Database, MessageSquare, Zap, Target, Layout, CheckCircle2 } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { EldoriaLogo } from '../Icons';

interface Slide {
    title: string;
    content: string;
    icon: React.ReactNode;
    highlightId?: string;
    tip?: string;
}

export const OnboardingTour: React.FC = () => {
    const { completeOnboarding } = useWorkspace();
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isComplete, setIsComplete] = useState(false);

    const slides: Slide[] = useMemo(() => [
        {
            title: "Welcome to Eldoria AI IDE",
            content: "Eldoria is your sentient AI co-pilot for coding and academic mastery — built for engineering students to code, research, and generate publication-ready theses seamlessly.",
            icon: <EldoriaLogo className="w-12 h-12 text-cyan-400" />,
            tip: "Eldoria is more than an IDE; it's a strategic partner."
        },
        {
            title: "Core Purpose",
            content: "Combine high-performance coding (React/TS/Python) with intelligent thesis tools (RSU Mech format starter) — from brainstorming to 100+ page .docx exports.",
            icon: <BookOpen className="w-12 h-12 text-emerald-400" />,
            tip: "Perfect for complex engineering designs and simulations."
        },
        {
            title: "EmeraldMind Knowledge Index",
            content: "Your project's brain — indexes all files for psychic chatbot awareness. Every file you add is automatically ingested into our RAG architecture.",
            icon: <Database className="w-12 h-12 text-cyan-400" />,
            highlightId: "nav-knowledge-index", // We'll add this ID to the sidebar icon
            tip: "Psst! Check the Database icon in the sidebar."
        },
        {
            title: "Context-Aware Chatbot",
            content: "Ask anything — it knows your code, thesis objectives, and uploaded research. It doesn't just guess; it reasons based on your unique project structure.",
            icon: <MessageSquare className="w-12 h-12 text-cyan-400" />,
            highlightId: "panel-chat",
            tip: "Try asking: 'How does this simulation relate to Chapter 3?'"
        },
        {
            title: "Academic Hub",
            content: "Dedicated section for thesis projects: Wizard, generation, volume control, resource uploads, and compliance checks. It's your research command center.",
            icon: <Target className="w-12 h-12 text-emerald-400" />,
            highlightId: "nav-academic-hub",
            tip: "Teaser: Try the 'Solar Fish Dryer' demo in the Hub!"
        },
        {
            title: "Strategic Workspace",
            content: "Code and experiment here in a distraction-free environment. Use the 'Publish to Hub' button to send simulations or scripts directly to your thesis chapters.",
            icon: <Layout className="w-12 h-12 text-cyan-400" />,
            tip: "Flow: Code -> Simulate -> Publish to Chapter 3."
        },
        {
            title: "Personality & Performance",
            content: "Tune Eldoria's wit, reverence, and autonomy. Want a formal academic advisor or a creative engineering peer? You decide.",
            icon: <Zap className="w-12 h-12 text-yellow-400" />,
            highlightId: "nav-settings",
            tip: "Settings > Personality to tune the sentient core."
        },
        {
            title: "Proactive Tools",
            content: "The Auditor, Timeline Insights, and Formula Editor (KaTeX) work in the background to ensure your research stays on track and consistent.",
            icon: <Sparkles className="w-12 h-12 text-cyan-400" />,
            tip: "The Auditor catches inconsistencies before you do."
        },
        {
            title: "Navigation Mastery",
            content: "Master the command palette (Ctrl+Shift+P) and holographic focus mode. Navigation is instant, intuitive, and designed for power users.",
            icon: <Zap className="w-12 h-12 text-cyan-400" />,
            tip: "Pro Tip: Alt+Shift+W (Workspace) or Alt+Shift+A (Hub) for instant transit."
        },
        {
            title: "Ready to Master?",
            content: "You're now initiated into the Eldoria ecosystem. Start a new project or dive into the Academic Hub. Your sentient co-pilot is standing by.",
            icon: <CheckCircle2 className="w-12 h-12 text-emerald-400" />,
            tip: "Final Tip: The more you index, the smarter Eldoria becomes."
        }
    ], []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') nextSlide();
            if (e.key === 'ArrowLeft') prevSlide();
            if (e.key === 'Escape') finishTour();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentSlide]);

    const nextSlide = () => {
        if (currentSlide < slides.length - 1) {
            setCurrentSlide(currentSlide + 1);
        } else {
            finishTour();
        }
    };

    const prevSlide = () => {
        if (currentSlide > 0) setCurrentSlide(currentSlide - 1);
    };

    const finishTour = () => {
        setIsComplete(true);
        setTimeout(() => {
            completeOnboarding();
        }, 2000);
    };

    const spotlightTarget = slides[currentSlide].highlightId;

    return (
        <div className="fixed inset-0 z-[11000] pointer-events-none">
            {/* Dark Overlay with Hole (Spotlight) */}
            <div className={`absolute inset-0 bg-black/60 backdrop-blur-[2px] transition-all duration-500 ${isComplete ? 'pointer-events-none opacity-0' : 'pointer-events-auto opacity-100'}`}>
                {spotlightTarget && <Spotlight targetId={spotlightTarget} />}
            </div>

            {/* Tour Card */}
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] bg-[#0c1a3e]/90 border border-cyan-500/20 backdrop-blur-2xl rounded-[2.5rem] p-10 shadow-[0_0_100px_rgba(34,211,238,0.1)] transition-all duration-500 transform ${isComplete ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100 pointer-events-auto'}`}>

                {/* Close Button */}
                <button onClick={finishTour} className="absolute top-6 right-6 p-2 text-white/20 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                </button>

                {/* Progress Bar */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-white/5 rounded-t-[2.5rem] overflow-hidden">
                    <div
                        className="h-full bg-cyan-500 shadow-[0_0_15px_rgba(34,211,238,0.6)] transition-all duration-500"
                        style={{ width: `${((currentSlide + 1) / slides.length) * 100}%` }}
                    ></div>
                </div>

                <div className="flex flex-col items-center text-center">
                    <div className="mb-8 animate-in zoom-in-50 duration-500 bg-cyan-500/5 p-6 rounded-3xl border border-cyan-500/10">
                        {slides[currentSlide].icon}
                    </div>

                    <h3 className="text-xl font-black text-white uppercase tracking-widest mb-4">
                        {slides[currentSlide].title}
                    </h3>

                    <p className="text-sm text-cyan-100/60 leading-relaxed mb-10 min-h-[80px]">
                        {slides[currentSlide].content}
                    </p>

                    {slides[currentSlide].tip && (
                        <div className="mb-10 p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex items-center gap-3 w-full">
                            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                            <p className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest text-left">
                                {slides[currentSlide].tip}
                            </p>
                        </div>
                    )}

                    <div className="flex items-center justify-between w-full pt-6 border-t border-white/5">
                        <button
                            disabled={currentSlide === 0}
                            onClick={prevSlide}
                            className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/20 hover:text-white transition-all disabled:opacity-0"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            Back
                        </button>

                        <div className="flex gap-1.5">
                            {slides.map((_, i) => (
                                <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${i === currentSlide ? 'bg-cyan-400 scale-125' : 'bg-white/10'}`}></div>
                            ))}
                        </div>

                        <button
                            onClick={nextSlide}
                            className="flex items-center gap-2 px-6 py-2.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 rounded-xl transition-all font-bold uppercase tracking-widest text-[10px] active:scale-95 shadow-lg group"
                        >
                            {currentSlide === slides.length - 1 ? "Initiate" : "Next Module"}
                            <ChevronRight className={`w-4 h-4 transition-transform group-hover:translate-x-1`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Confetti (only on completion) */}
            {isComplete && <Confetti />}
        </div>
    );
};

const Spotlight: React.FC<{ targetId: string }> = ({ targetId }) => {
    const [rect, setRect] = useState<DOMRect | null>(null);

    useEffect(() => {
        const updateRect = () => {
            const el = document.getElementById(targetId);
            if (el) {
                setRect(el.getBoundingClientRect());
            } else {
                setRect(null);
            }
        };

        updateRect();
        const interval = setInterval(updateRect, 500); // Periodic check if UI shifts
        window.addEventListener('resize', updateRect);
        return () => {
            clearInterval(interval);
            window.removeEventListener('resize', updateRect);
        };
    }, [targetId]);

    if (!rect) return null;

    return (
        <div
            className="absolute transition-all duration-500 border-2 border-cyan-400 rounded-lg shadow-[0_0_30px_rgba(34,211,238,0.5)] animate-pulse pointer-events-none"
            style={{
                top: rect.top - 4,
                left: rect.left - 4,
                width: rect.width + 8,
                height: rect.height + 8,
            }}
        >
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-cyan-400 text-black text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded flex items-center gap-1">
                <Target className="w-3 h-3" />
                Target Hub
            </div>
        </div>
    );
};

const Confetti: React.FC = () => {
    return (
        <div className="fixed inset-0 z-[12000] pointer-events-none flex items-center justify-center overflow-hidden">
            {[...Array(50)].map((_, i) => (
                <div
                    key={i}
                    className="absolute bg-cyan-400 animate-confetti opacity-0"
                    style={{
                        width: Math.random() * 8 + 4 + 'px',
                        height: Math.random() * 8 + 4 + 'px',
                        left: '50%',
                        top: '50%',
                        borderRadius: i % 2 === 0 ? '50%' : '2px',
                        animationDelay: Math.random() * 0.5 + 's',
                        transform: `rotate(${Math.random() * 360}deg)`
                    }}
                ></div>
            ))}
            <div className="animate-in zoom-in-50 fade-in duration-700 text-center">
                <h2 className="text-5xl font-black text-white uppercase tracking-[0.5em] mb-4 text-glow italic">
                    WELCOME ABOARD
                </h2>
                <p className="text-cyan-400 font-bold uppercase tracking-widest">Eldoria Master Initiate</p>
            </div>
            <style>{`
                @keyframes confetti {
                    0% { transform: translate(0, 0) rotate(0); opacity: 1; }
                    100% { transform: translate(${(Math.random() - 0.5) * 1000}px, ${(Math.random() - 0.5) * 1000}px) rotate(${Math.random() * 720}deg); opacity: 0; }
                }
                .animate-confetti {
                    animation: confetti 2s cubic-bezier(0, .5, .5, 1) forwards;
                }
                .text-glow {
                    text-shadow: 0 0 30px rgba(34,211,238,0.8);
                }
            `}</style>
        </div>
    );
};
