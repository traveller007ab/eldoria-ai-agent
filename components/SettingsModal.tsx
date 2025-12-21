import React, { useState, useEffect } from 'react';
import { X, Settings, Zap, Coffee, ShieldCheck, Cpu, Key, Save, Check } from 'lucide-react';

interface SettingsModalProps {
    onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
    const [settings, setSettings] = useState({
        witLevel: 50,
        reverence: 70,
        autonomousMode: true,
        proactiveAudit: true,
        personalityMode: 'jarvis' as 'jarvis' | 'concise' | 'friendly'
    });
    const [isSaving, setIsSaving] = useState(false);
    const [showSavedFeedback, setShowSavedFeedback] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('eldoria_settings');
        if (saved) {
            try { setSettings(JSON.parse(saved)); } catch (e) { }
        }
    }, []);

    const handleSave = () => {
        setIsSaving(true);
        localStorage.setItem('eldoria_settings', JSON.stringify(settings));
        setTimeout(() => {
            setIsSaving(false);
            setShowSavedFeedback(true);
            setTimeout(() => setShowSavedFeedback(false), 2000);
        }, 800);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-lg bg-[#0a0a0a] border border-cyan-500/20 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(34,211,238,0.1)] flex flex-col">
                <div className="p-6 border-b border-cyan-500/10 flex items-center justify-between bg-cyan-500/5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-cyan-500/10 rounded-xl">
                            <Settings className="w-5 h-5 text-cyan-400" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-cyan-100 uppercase tracking-widest leading-none">Settings</h2>
                            <p className="text-[10px] text-cyan-500/60 mt-1 uppercase font-medium">Core Configuration & Personality</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-cyan-500/40 hover:text-cyan-100">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar max-h-[60vh]">
                    {/* Personality Section */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-cyan-400 uppercase tracking-[0.2em] mb-4">
                            <Cpu className="w-3.5 h-3.5" />
                            Personality Core
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex justify-between text-[10px] text-cyan-100 font-bold uppercase tracking-widest">
                                    <span>Wit Level</span>
                                    <span className="text-cyan-400">{settings.witLevel}%</span>
                                </div>
                                <input
                                    type="range"
                                    className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                                    value={settings.witLevel}
                                    onChange={(e) => setSettings({ ...settings, witLevel: parseInt(e.target.value) })}
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-[10px] text-cyan-100 font-bold uppercase tracking-widest">
                                    <span>Reverence Level</span>
                                    <span className="text-cyan-400">{settings.reverence}%</span>
                                </div>
                                <input
                                    type="range"
                                    className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                    value={settings.reverence}
                                    onChange={(e) => setSettings({ ...settings, reverence: parseInt(e.target.value) })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3 pt-2">
                            {(['jarvis', 'concise', 'friendly'] as const).map(mode => (
                                <button
                                    key={mode}
                                    onClick={() => setSettings({ ...settings, personalityMode: mode })}
                                    className={`p-3 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-all ${settings.personalityMode === mode ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-100' : 'bg-black/40 border-cyan-500/10 text-cyan-500/40 hover:border-cyan-500/20'}`}
                                >
                                    {mode}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Operational Section */}
                    <div className="space-y-4 pt-4 border-t border-cyan-500/10">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-cyan-400 uppercase tracking-[0.2em] mb-4">
                            <Zap className="w-3.5 h-3.5" />
                            Operations
                        </div>

                        <div className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-cyan-500/5">
                            <div>
                                <h4 className="text-[11px] font-bold text-cyan-100">Autonomous Bridge</h4>
                                <p className="text-[9px] text-cyan-500/40">Allow Eldoria to execute terminal commands</p>
                            </div>
                            <button
                                onClick={() => setSettings({ ...settings, autonomousMode: !settings.autonomousMode })}
                                className={`w-10 h-5 rounded-full transition-all relative ${settings.autonomousMode ? 'bg-emerald-500/40' : 'bg-white/5'}`}
                            >
                                <div className={`absolute top-1 w-3 h-3 rounded-full transition-all ${settings.autonomousMode ? 'right-1 bg-emerald-400' : 'left-1 bg-white/20'}`}></div>
                            </button>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-cyan-500/5">
                            <div>
                                <h4 className="text-[11px] font-bold text-cyan-100">Proactive Auditing</h4>
                                <p className="text-[9px] text-cyan-500/40">Enable background intelligence scans</p>
                            </div>
                            <button
                                onClick={() => setSettings({ ...settings, proactiveAudit: !settings.proactiveAudit })}
                                className={`w-10 h-5 rounded-full transition-all relative ${settings.proactiveAudit ? 'bg-cyan-500/40' : 'bg-white/5'}`}
                            >
                                <div className={`absolute top-1 w-3 h-3 rounded-full transition-all ${settings.proactiveAudit ? 'right-1 bg-cyan-400' : 'left-1 bg-white/20'}`}></div>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-cyan-500/5 border-t border-cyan-500/10 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[9px] text-cyan-500/40 uppercase font-black tracking-widest">
                        <Key className="w-3 h-3" />
                        API Encryption: AES-256
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${showSavedFeedback ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-100 border border-cyan-500/40'}`}
                    >
                        {isSaving ? <Coffee className="w-3.5 h-3.5 animate-pulse" /> : showSavedFeedback ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                        {isSaving ? 'Synching...' : showSavedFeedback ? 'Changes Persisted' : 'Commit Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};
