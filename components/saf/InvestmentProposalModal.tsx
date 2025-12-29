import React, { useState } from 'react';
import { DeepSAFBlueprint } from './types';
import { X, DollarSign, PieChart, Users, Send, CheckCircle2, FileText, Globe } from 'lucide-react';
import { bridgeClient } from '../../services/bridgeClient';

interface InvestmentProposalModalProps {
    onClose: () => void;
    blueprint: DeepSAFBlueprint;
}

export const InvestmentProposalModal: React.FC<InvestmentProposalModalProps> = ({ onClose, blueprint }) => {
    const [step, setStep] = useState(1);
    const [fundingGoal, setFundingGoal] = useState('100000');
    const [equityOffer, setEquityOffer] = useState('10');
    const [tokenTicker, setTokenTicker] = useState('ELDR');
    const [useOfFunds, setUseOfFunds] = useState('Research & Development');
    const [isPublishing, setIsPublishing] = useState(false);
    const [publishedUrl, setPublishedUrl] = useState<string | null>(null);

    const handlePublish = async () => {
        setIsPublishing(true);
        // Simulate network delay for "blockchain transaction"
        await new Promise(resolve => setTimeout(resolve, 2000));

        // In a real app, this would POST to a backend
        // For now, we simulate a successful deployment to the "Eldoria Network"
        setIsPublishing(false);
        setStep(3);
        setPublishedUrl(`https://eldoria.network/proposals/${blueprint.project_name.toLowerCase().replace(/\s+/g, '-')}-${Date.now().toString().slice(-4)}`);
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in">
            <div className="bg-[#0a0a0f] border border-emerald-500/30 rounded-2xl w-[600px] shadow-2xl shadow-emerald-500/10 overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-white/10 flex items-center justify-between bg-emerald-500/5">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Globe className="w-5 h-5 text-emerald-400" />
                            Launch Proposal
                        </h2>
                        <p className="text-white/50 text-sm mt-1">Publish {blueprint.project_name} to Eldoria DAO</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg text-white/50 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto">
                    {step === 1 && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Funding Goal (USDC)</label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
                                        <input
                                            type="number"
                                            value={fundingGoal}
                                            onChange={e => setFundingGoal(e.target.value)}
                                            className="w-full bg-gray-900 border border-white/10 rounded-lg py-2 pl-9 pr-3 text-white focus:border-emerald-500 focus:outline-none transition-colors"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Equity / Token Offer (%)</label>
                                    <div className="relative">
                                        <PieChart className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400" />
                                        <input
                                            type="number"
                                            value={equityOffer}
                                            onChange={e => setEquityOffer(e.target.value)}
                                            className="w-full bg-gray-900 border border-white/10 rounded-lg py-2 pl-9 pr-3 text-white focus:border-emerald-500 focus:outline-none transition-colors"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Token Ticker</label>
                                <input
                                    type="text"
                                    value={tokenTicker}
                                    onChange={e => setTokenTicker(e.target.value.toUpperCase())}
                                    className="w-full bg-gray-900 border border-white/10 rounded-lg py-2 px-3 text-white font-mono focus:border-emerald-500 focus:outline-none transition-colors"
                                    placeholder="e.g. SOLR"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Use of Funds</label>
                                <textarea
                                    value={useOfFunds}
                                    onChange={e => setUseOfFunds(e.target.value)}
                                    className="w-full h-24 bg-gray-900 border border-white/10 rounded-lg py-2 px-3 text-white focus:border-emerald-500 focus:outline-none transition-colors resize-none"
                                />
                            </div>

                            <div className="bg-gray-900/50 p-4 rounded-xl border border-white/5 space-y-3">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block border-b border-white/5 pb-2 mb-2">Included Assets</label>
                                <div className="flex items-center gap-3 text-sm text-gray-300">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                    <span>Detailed SAF Blueprint ({blueprint.components.length} components)</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-gray-300">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                    <span>Simulation Data & Physics Validation</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-gray-300">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                    <span>Research Notes & Citations</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                            <div className="bg-white p-8 rounded-xl shadow-lg text-black">
                                {/* Mock Investment Memo Preview */}
                                <div className="flex justify-between items-start border-b border-gray-200 pb-4 mb-4">
                                    <div>
                                        <h1 className="text-2xl font-bold text-gray-900">{blueprint.project_name}</h1>
                                        <p className="text-gray-500 text-sm mt-1">Investment Opportunity on Eldoria Network</p>
                                    </div>
                                    <div className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-bold font-mono">
                                        {tokenTicker}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6 mb-6">
                                    <div>
                                        <p className="text-xs font-bold text-gray-500 uppercase">Target Raise</p>
                                        <p className="text-xl font-bold font-mono">${parseInt(fundingGoal).toLocaleString()} USDC</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-gray-500 uppercase">Equity / Token Split</p>
                                        <p className="text-xl font-bold font-mono">{equityOffer}%</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <h4 className="font-bold text-gray-900 text-sm">System Architecture</h4>
                                        <p className="text-gray-600 text-sm mt-1">
                                            A sophisticated {blueprint.domain} system comprising {blueprint.components.length} core components
                                            including {blueprint.components.slice(0, 3).map(c => c.name).join(', ')}.
                                        </p>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 text-sm">Use of Funds</h4>
                                        <p className="text-gray-600 text-sm mt-1">{useOfFunds}</p>
                                    </div>
                                </div>

                                <div className="mt-8 pt-4 border-t border-gray-200 flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-gray-100" />
                                        <div className="w-8 h-8 rounded-full bg-gray-100 -ml-4 border-2 border-white" />
                                        <div className="w-8 h-8 rounded-full bg-gray-100 -ml-4 border-2 border-white" />
                                        <span className="text-xs text-gray-500 ml-2">Verified by 3 Physics Agents</span>
                                    </div>
                                    <span className="text-xs font-mono text-gray-400">ID: {blueprint.created_at?.slice(0, 10)}-REF-8392</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="flex flex-col items-center justify-center py-10 space-y-6 animate-in zoom-in-95">
                            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                            </div>
                            <div className="text-center">
                                <h3 className="text-2xl font-bold text-white mb-2">Proposal Live!</h3>
                                <p className="text-white/60 max-w-sm mx-auto">
                                    Your system has been successfully broadcast to the Eldoria investor network.
                                </p>
                            </div>

                            <a
                                href="#"
                                className="px-4 py-2 bg-gray-900 rounded-lg border border-white/10 text-emerald-400 font-mono text-sm hover:bg-gray-800 transition-colors flex items-center gap-2"
                                onClick={(e) => e.preventDefault()}
                            >
                                <Globe className="w-4 h-4" />
                                {publishedUrl}
                            </a>

                            <div className="flex gap-4 w-full pt-6">
                                <button className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-white font-medium transition-colors">
                                    Share Link
                                </button>
                                <button className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-white font-medium transition-colors">
                                    View Analytics
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {step < 3 && (
                    <div className="p-6 border-t border-white/10 flex justify-end gap-3 bg-black/40">
                        {step === 2 && (
                            <button
                                onClick={() => setStep(1)}
                                className="px-4 py-2 rounded-lg text-white/50 hover:text-white transition-colors"
                            >
                                Back
                            </button>
                        )}
                        <button
                            onClick={() => {
                                if (step === 1) setStep(2);
                                else handlePublish();
                            }}
                            disabled={isPublishing}
                            className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-lg shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
                        >
                            {isPublishing ? (
                                <>Processing...</>
                            ) : step === 1 ? (
                                <>Review Memo <FileText className="w-4 h-4" /></>
                            ) : (
                                <>Publish Proposal <Send className="w-4 h-4" /></>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
