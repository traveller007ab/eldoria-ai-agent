
import React, { useState, lazy, Suspense } from 'react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { TaskPanel } from './TaskPanel';
import { ChatPanel } from './ChatPanel';
const InsightsPanel = lazy(() => import('./InsightsPanel').then(m => ({ default: m.InsightsPanel })));
import { useWorkspace } from '../context/WorkspaceContext';
import { Source } from '../types';
import { ChevronDown, Send } from 'lucide-react';

const LoadingIndicator = () => (
    <div className="flex items-center justify-center h-full text-cyan-400">
        <div className="flex flex-col items-center gap-4 w-full max-w-sm">
            <div className="w-full h-16 bg-cyan-900/50 rounded-lg relative overflow-hidden border border-cyan-500/30">
                <div className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent animate-[scanner_3s_infinite_ease-in-out]"></div>
            </div>
            <p className="text-glow animate-pulse">Engaging SAF Core...</p>
        </div>
        <style>{`
            @keyframes scanner {
                0% { transform: translateX(-100%); }
                50% { transform: translateX(100%); }
                100% { transform: translateX(100%); }
            }
        `}</style>
    </div>
);

const Sources: React.FC<{ sources: Source[] }> = ({ sources }) => (
    <div className="mt-6 pt-4 border-t border-cyan-500/20">
        <h4 className="text-sm font-semibold text-cyan-300 mb-2">Sources Consulted</h4>
        <div className="flex flex-col gap-2">
            {sources.map((source, index) => (
                <a
                    key={index}
                    href={source.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-cyan-400/80 hover:text-cyan-300 hover:underline truncate transition-colors"
                    title={source.uri}
                >
                    {`[${index + 1}] ${source.title}`}
                </a>
            ))}
        </div>
    </div>
);

type Tab = 'output' | 'task' | 'chat' | 'insights';

const TabButton: React.FC<{
    label: string;
    isActive: boolean;
    onClick: () => void;
    id?: string;
}> = ({ label, isActive, onClick, id }) => {
    return (
        <button
            id={id}
            onClick={onClick}
            className={`px-4 py-2 text-sm font-medium transition-all duration-300 border-b-2 ${isActive
                ? 'text-cyan-300 border-cyan-400 text-glow'
                : 'text-cyan-400/60 border-transparent hover:bg-cyan-500/10 hover:text-cyan-300'
                }`}
        >
            {label}
        </button>
    );
};


export const OutputPanel: React.FC = () => {
    const {
        activeCanvas,
        isLoading,
        acceptOutput,
        appendOutput,
        academicProjects,
        publishToAcademicHub
    } = useWorkspace();

    const [activeTab, setActiveTab] = useState<Tab>('output');
    const [isPublishDropdownOpen, setIsPublishDropdownOpen] = useState(false);

    const hasOutput = !!activeCanvas?.output?.trim();
    const hasSources = !!activeCanvas?.output_sources && activeCanvas.output_sources.length > 0;

    return (
        <div className="panel w-full md:w-1/2 flex flex-col overflow-hidden">
            {/* Header with Tabs */}
            <div className="flex justify-between items-center border-b border-cyan-500/20 shrink-0 px-4">
                <div className="flex items-center gap-2">
                    <TabButton label="Output" isActive={activeTab === 'output'} onClick={() => setActiveTab('output')} />
                    <TabButton label="Task Log" isActive={activeTab === 'task'} onClick={() => setActiveTab('task')} />
                    <TabButton id="panel-chat" label="Chat" isActive={activeTab === 'chat'} onClick={() => setActiveTab('chat')} />
                    <TabButton label="Insights" isActive={activeTab === 'insights'} onClick={() => setActiveTab('insights')} />
                </div>
                {hasOutput && !isLoading && activeTab === 'output' && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={appendOutput}
                            className="text-xs bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 px-2 py-1 rounded-md transition-colors"
                            title="Append output to the end of the editor content"
                        >
                            Append
                        </button>
                        <button
                            onClick={acceptOutput}
                            className="text-xs bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 px-2 py-1 rounded-md transition-colors"
                            title="Replace editor content with this output"
                        >
                            Accept & Replace
                        </button>
                        {academicProjects.length > 0 && (
                            <div className="relative">
                                <button
                                    onClick={() => setIsPublishDropdownOpen(!isPublishDropdownOpen)}
                                    className="text-xs bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 px-3 py-1 rounded-md transition-all border border-emerald-500/30 flex items-center gap-2"
                                    title="Publish this strategic output to the Academic Hub"
                                >
                                    Publish to Hub
                                    <ChevronDown className={`w-3 h-3 transition-transform ${isPublishDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {isPublishDropdownOpen && (
                                    <div className="absolute top-full right-0 mt-2 w-64 bg-[#0a0a0a] border border-emerald-500/30 rounded-xl shadow-[0_10px_30px_rgba(16,185,129,0.2)] z-[60] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="p-2 border-b border-emerald-500/10 text-[10px] uppercase font-bold text-emerald-500/60 transition-all tracking-widest px-4">Select Target Project</div>
                                        <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                            {academicProjects.map(proj => (
                                                <button
                                                    key={proj.id}
                                                    onClick={() => {
                                                        const timestamp = new Date().toISOString().split('T')[0];
                                                        publishToAcademicHub(proj.id, `Strategic_Brief_${timestamp}.md`, activeCanvas?.output || '');
                                                        setIsPublishDropdownOpen(false);
                                                    }}
                                                    className="w-full text-left px-4 py-2 hover:bg-emerald-500/10 transition-colors group flex items-center justify-between"
                                                >
                                                    <span className="text-[11px] text-emerald-100/60 group-hover:text-emerald-300 truncate font-sans">
                                                        {proj.name || proj.wizard_state.basics.title || "Untitled Project"}
                                                    </span>
                                                    <Send className="w-3 h-3 text-emerald-500/20 group-hover:text-emerald-400 opacity-0 group-hover:opacity-100 transition-all" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div className="flex-grow p-4 overflow-hidden">
                {activeTab === 'output' && (
                    <div className="h-full overflow-y-auto custom-scrollbar pr-2">
                        {isLoading && !activeCanvas?.output ? (
                            <LoadingIndicator />
                        ) : (
                            <>
                                <MarkdownRenderer>
                                    {activeCanvas?.output || ''}
                                </MarkdownRenderer>
                                {hasSources && <Sources sources={activeCanvas.output_sources!} />}
                            </>
                        )}
                    </div>
                )}
                {activeTab === 'task' && (
                    <TaskPanel
                        log={activeCanvas?.task_log || []}
                        isLoading={isLoading}
                    />
                )}
                {activeTab === 'chat' && <ChatPanel />}
                {activeTab === 'insights' && (
                    <Suspense fallback={<div className="h-full flex items-center justify-center text-[10px] text-cyan-500/20 uppercase tracking-widest animate-pulse font-bold">Awakening Insights Panel...</div>}>
                        <InsightsPanel />
                    </Suspense>
                )}
            </div>
        </div>
    );
};