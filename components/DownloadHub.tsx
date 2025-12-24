import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Monitor, Smartphone, Globe, Download, ArrowRight, ShieldCheck, Zap, Signal, SignalLow } from 'lucide-react';
import { EldoriaLogo } from './Icons';
import { bridgeClient } from '../services/bridgeClient';

export const DownloadHub: React.FC = () => {
    const navigate = useNavigate();
    const [bridgeStatus, setBridgeStatus] = useState<'checking' | 'connected' | 'offline'>('checking');
    const [isRestarting, setIsRestarting] = useState(false);

    const handleRestart = async () => {
        setIsRestarting(true);
        const result = await bridgeClient.restartBridge();
        if (result.success) {
            // Wait a bit for restart before checking again
            setTimeout(() => {
                setIsRestarting(false);
            }, 3000);
        } else {
            setIsRestarting(false);
            alert("Bridge restart failed. Please check your terminal.");
        }
    };

    useEffect(() => {
        const checkHealth = async () => {
            const isAlive = await bridgeClient.checkBridgeHealth();
            setBridgeStatus(isAlive ? 'connected' : 'offline');
        };

        checkHealth();
        const interval = setInterval(checkHealth, 5000);
        return () => clearInterval(interval);
    }, []);

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
                    <div className="flex justify-between items-start mb-6">
                        <div className="p-4 bg-cyan-500/10 rounded-2xl group-hover:bg-cyan-500/20 transition-colors">
                            <Monitor className="w-8 h-8 text-cyan-400" />
                        </div>
                        {bridgeStatus === 'connected' ? (
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30 animate-pulse">
                                <Signal className="w-3 h-3" />
                                <span className="text-[8px] font-black uppercase tracking-widest">Connected</span>
                            </div>
                        ) : bridgeStatus === 'offline' ? (
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-red-500/20 text-red-400 rounded-full border border-red-500/30">
                                <SignalLow className="w-3 h-3" />
                                <span className="text-[8px] font-black uppercase tracking-widest">Offline</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-cyan-500/10 text-cyan-400 rounded-full border border-cyan-500/20">
                                <Zap className="w-3 h-3 animate-spin" />
                                <span className="text-[8px] font-black uppercase tracking-widest">Syncing</span>
                            </div>
                        )}
                        {bridgeStatus === 'connected' && (
                            <button
                                onClick={handleRestart}
                                disabled={isRestarting}
                                className={`p-2 rounded-xl border border-cyan-500/20 transition-all ${isRestarting ? 'bg-amber-500/20' : 'bg-cyan-500/5 hover:bg-cyan-500/20 hover:border-cyan-500/40'}`}
                                title="Restart Neural Bridge"
                            >
                                <Zap className={`w-3.5 h-3.5 text-cyan-400 ${isRestarting ? 'animate-spin' : ''}`} />
                            </button>
                        )}
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2 uppercase tracking-tighter">Universal Bridge</h3>
                    <p className="text-[11px] text-cyan-500/50 leading-relaxed mb-6 h-12">
                        Neural Bridge (Python). Required for local terminal and scientific library execution.
                    </p>
                    {bridgeStatus === 'offline' && (
                        <div className="mb-4 p-3 bg-red-500/5 border border-red-500/20 rounded-xl">
                            <div className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-1">Critical Recovery</div>
                            <div className="text-[10px] text-red-500/70 leading-tight">
                                Run <code className="bg-red-500/10 px-1 rounded text-red-400">npm run bridge</code> in your terminal to revive the link.
                            </div>
                        </div>
                    )}
                    {import.meta.env.DEV ? (
                        <div className="flex items-center justify-between w-full p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 font-bold uppercase tracking-widest text-[10px]">
                            <span>Dev Mode: Run `npm run bridge`</span>
                            <Zap className="w-4 h-4" />
                        </div>
                    ) : (
                        <a
                            href="/downloads/eldoria-bridge-win.exe"
                            className="flex items-center justify-between w-full p-4 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 rounded-xl text-cyan-300 transition-all font-bold uppercase tracking-widest text-[10px]"
                        >
                            <span>Download Bridge</span>
                            <Download className="w-4 h-4" />
                        </a>
                    )}
                </div>

                {/* Tablet/Mobile Version */}
                <div className="panel p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-3xl hover:border-emerald-500/40 transition-all group scale-105 shadow-[0_20px_40px_rgba(16,185,129,0.1)]">
                    <div className="mb-6 p-4 bg-emerald-500/20 rounded-2xl w-fit">
                        <Smartphone className="w-8 h-8 text-emerald-400" />
                    </div>
                    <div className="absolute top-4 right-4 bg-emerald-400 text-black text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">Recommended</div>
                    <h3 className="text-lg font-bold text-white mb-2 uppercase tracking-tighter">Standalone PWA</h3>
                    <p className="text-[11px] text-emerald-500/50 leading-relaxed mb-6 h-12">
                        Tablet-optimized experience. install via "Add to Home Screen" for a native academic feel.
                    </p>
                    <button
                        onClick={() => alert('Tap Settings > Install Eldoria on your home screen!')}
                        className="flex items-center justify-between w-full p-4 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-xl text-emerald-300 transition-all font-bold uppercase tracking-widest text-[10px]"
                    >
                        <span>Install on Tablet</span>
                        <ArrowRight className="w-4 h-4" />
                    </button>
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
                        onClick={() => navigate('/')}
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
                    <span className="text-[9px] font-bold uppercase tracking-widest">PWA Powered</span>
                </div>
            </div>
        </div>
    );
};
