import React from 'react';
import { Monitor, Smartphone, Globe, Download, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { EldoriaLogo } from './Icons';

export const DownloadHub: React.FC = () => {
    return (
        <div className="flex-grow flex flex-col items-center justify-center p-8 bg-[#0c1a3e]/50 backdrop-blur-xl rounded-[2.5rem] border border-cyan-500/20 overflow-hidden relative">
            {/* Animated Background Accents */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 blur-[100px] rounded-full animate-pulse-slow"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 blur-[80px] rounded-full animate-pulse"></div>

            <div className="relative text-center max-w-2xl mb-12">
                <EldoriaLogo className="w-16 h-16 text-cyan-400 mx-auto mb-6 drop-shadow-[0_0_15px_rgba(34,211,238,0.4)]" />
                <h2 className="text-3xl font-black text-white uppercase tracking-[0.3em] mb-4 text-glow">
                    Strategic Distribution Hub
                </h2>
                <p className="text-cyan-400/60 text-sm font-medium uppercase tracking-widest italic">
                    Universal AI Intelligence • Multi-Platform Synchronization
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl relative z-10">
                {/* Desktop Version */}
                <div className="panel p-6 bg-black/40 border border-cyan-500/10 rounded-3xl hover:border-cyan-500/40 transition-all group">
                    <div className="mb-6 p-4 bg-cyan-500/10 rounded-2xl w-fit group-hover:bg-cyan-500/20 transition-colors">
                        <Monitor className="w-8 h-8 text-cyan-400" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2 uppercase tracking-tighter">Windows Desktop</h3>
                    <p className="text-[11px] text-cyan-500/50 leading-relaxed mb-6 h-12">
                        Full Node.js bridge. Optimized for heavy research and complex shell operations.
                    </p>
                    <a
                        href="https://github.com/traveller007ab/eldoria-ai-agent/releases/latest"
                        target="_blank"
                        className="flex items-center justify-between w-full p-4 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 rounded-xl text-cyan-300 transition-all font-bold uppercase tracking-widest text-[10px]"
                    >
                        <span>Download .exe</span>
                        <Download className="w-4 h-4" />
                    </a>
                </div>

                {/* Tablet/Mobile Version */}
                <div className="panel p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-3xl hover:border-emerald-500/40 transition-all group scale-105 shadow-[0_20px_40px_rgba(16,185,129,0.1)]">
                    <div className="mb-6 p-4 bg-emerald-500/20 rounded-2xl w-fit">
                        <Smartphone className="w-8 h-8 text-emerald-400" />
                    </div>
                    <div className="absolute top-4 right-4 bg-emerald-400 text-black text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">Recommended</div>
                    <h3 className="text-lg font-bold text-white mb-2 uppercase tracking-tighter">Android Tablet</h3>
                    <p className="text-[11px] text-emerald-500/50 leading-relaxed mb-6 h-12">
                        Touch-native experience. Includes Low-Performance Mode for long-duration synthesis.
                    </p>
                    <a
                        href="/downloads/eldoria-android-latest.apk"
                        className="flex items-center justify-between w-full p-4 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-xl text-emerald-300 transition-all font-bold uppercase tracking-widest text-[10px]"
                    >
                        <span>Download APK</span>
                        <ArrowRight className="w-4 h-4" />
                    </a>
                </div>

                {/* PWA Version */}
                <div className="panel p-6 bg-black/40 border border-cyan-500/10 rounded-3xl hover:border-cyan-500/40 transition-all group">
                    <div className="mb-6 p-4 bg-purple-500/10 rounded-2xl w-fit group-hover:bg-purple-500/20 transition-colors">
                        <Globe className="w-8 h-8 text-purple-400" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2 uppercase tracking-tighter">Holographic PWA</h3>
                    <p className="text-[11px] text-purple-500/50 leading-relaxed mb-6 h-12">
                        Instant access via browser. Cloud-synced research vault and core AI chat.
                    </p>
                    <button
                        className="flex items-center justify-between w-full p-4 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-xl text-purple-300 transition-all font-bold uppercase tracking-widest text-[10px]"
                    >
                        <span>Launch in Browser</span>
                        <Zap className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="mt-12 flex items-center gap-8 text-cyan-500/40">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" />
                    <span className="text-[9px] font-bold uppercase tracking-widest">Local-First Storage</span>
                </div>
                <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    <span className="text-[9px] font-bold uppercase tracking-widest">Capacitor Powered</span>
                </div>
            </div>
        </div>
    );
};
