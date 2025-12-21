import React from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { EmeraldMindIcon } from './Icons';
import { MarkdownRenderer } from './MarkdownRenderer';

export const InsightsPanel: React.FC = () => {
    const { activeCanvas, runManualCommand } = useWorkspace();
    const insights = activeCanvas?.insights || [];
    const metadataList = activeCanvas?.insight_metadata || [];

    const handleApply = (metadata: any) => {
        if (!metadata) return;
        if (metadata.type === 'terminal' && metadata.command) {
            runManualCommand(metadata.command);
        }
    };

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <div className="flex-grow overflow-y-auto custom-scrollbar pr-2 space-y-4">
                {insights.length > 0 ? (
                    insights.map((insight, index) => {
                        const metadata = metadataList[index];
                        return (
                            <div
                                key={index}
                                className="p-4 bg-cyan-950/20 border border-cyan-500/10 rounded-lg group hover:border-cyan-500/30 transition-all duration-300"
                            >
                                <div className="flex items-center gap-2 mb-2 text-cyan-300">
                                    <EmeraldMindIcon className="w-4 h-4 text-glow" />
                                    <span className="text-xs font-bold uppercase tracking-wider">Strategic Optimization</span>
                                    <span className="text-[10px] text-cyan-500/50 italic ml-auto">{index === 0 ? 'LATEST' : `#${insights.length - index}`}</span>
                                </div>
                                <div className="text-sm prose-invert prose-cyan max-w-none mb-4">
                                    <MarkdownRenderer>
                                        {insight}
                                    </MarkdownRenderer>
                                </div>
                                {metadata && (
                                    <div className="pt-3 border-t border-cyan-500/10 flex justify-end">
                                        <button
                                            onClick={() => handleApply(metadata)}
                                            className="text-[10px] font-bold uppercase tracking-widest bg-cyan-500/10 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/30 px-3 py-1.5 rounded transition-all active:scale-95"
                                        >
                                            Apply: {metadata.label || 'Fix'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-cyan-900 select-none animate-pulse">
                        <EmeraldMindIcon className="w-12 h-12 mb-4 opacity-10" />
                        <span className="text-xs uppercase tracking-widest opacity-20 italic text-center px-8">
                            Standing by for strategic analysis... <br />
                            Insights will appear as you develop.
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};
