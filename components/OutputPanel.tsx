
import React, { useState, lazy, Suspense } from 'react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { TaskPanel } from './TaskPanel';
import { ChatPanel } from './ChatPanel';
const InsightsPanel = lazy(() => import('./InsightsPanel').then(m => ({ default: m.InsightsPanel })));
import { useWorkspace } from '../context/WorkspaceContext';
import { Source } from '../types';
import { ChevronDown, Send, Printer, FileText, Loader2, Search, FileEdit, Cog } from 'lucide-react';
import { bridgeClient } from '../services/bridgeClient';
import { generatePrintDocument } from '../utils/printUtils';
import { SourcesGrid } from './research/SourcesGrid';
import { ResearchAnswer } from './research/ResearchAnswer';


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

type Tab = 'research' | 'draft' | 'process';

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
        publishToAcademicHub,
        addCanvasPart
    } = useWorkspace();
    const [activeTab, setActiveTab] = useState<Tab>('research');
    const [isPublishDropdownOpen, setIsPublishDropdownOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    const [isPrintMenuOpen, setIsPrintMenuOpen] = useState(false);


    const handleExportDocx = async () => {
        setIsPrintMenuOpen(false);
        if (!activeCanvas?.output) return;
        setIsExporting(true);
        try {
            const title = "Strategic Brief - " + (activeCanvas.name || "Eldoria Output");
            const blob = await bridgeClient.exportToDocx(title, activeCanvas.output);

            if (blob) {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Eldoria_${activeCanvas.name || 'Output'}_${Date.now()}.docx`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } else {
                alert("Word Export failed. Ensure the Python Bridge is running.");
            }
        } catch (e) {
            console.error('Export failed:', e);
            alert("Export error occurred.");
        } finally {
            setIsExporting(false);
        }
    };

    const handlePrint = () => {
        setIsPrintMenuOpen(false);
        if (!activeCanvas?.output) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert("Please allow popups to print output.");
            return;
        }

        const html = generatePrintDocument(
            activeCanvas.name || "Strategic Brief",
            activeCanvas.output,
            activeCanvas.id
        );
        printWindow.document.write(html);
        printWindow.document.close();
    };



    const hasOutput = !!activeCanvas?.output?.trim();
    const hasSources = !!activeCanvas?.output_sources && activeCanvas.output_sources.length > 0;

    return (
        <div className="panel w-full md:w-1/2 flex flex-col overflow-hidden">
            {/* Header with Tabs */}
            <div className="flex justify-between items-center border-b border-cyan-500/20 shrink-0 px-4">
                <div className="flex items-center gap-1">
                    <TabButton
                        id="panel-research"
                        label="🔍 Research"
                        isActive={activeTab === 'research'}
                        onClick={() => setActiveTab('research')}
                    />
                    <TabButton
                        label="📝 Draft"
                        isActive={activeTab === 'draft'}
                        onClick={() => setActiveTab('draft')}
                    />
                    <TabButton
                        label="⚙️ Process"
                        isActive={activeTab === 'process'}
                        onClick={() => setActiveTab('process')}
                    />
                </div>
                {hasOutput && !isLoading && activeTab === 'draft' && (
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <button
                                onClick={() => setIsPrintMenuOpen(!isPrintMenuOpen)}
                                className="p-1.5 text-cyan-400/60 hover:text-cyan-300 hover:bg-cyan-500/10 rounded-md transition-all mr-1 flex items-center gap-1"
                                title="Print or Export Options"
                            >
                                <Printer className="w-4 h-4" />
                                <ChevronDown className={`w-3 h-3 transition-transform ${isPrintMenuOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isPrintMenuOpen && (
                                <div className="absolute top-full right-0 mt-2 w-48 bg-[#0a0a0a] border border-cyan-500/30 rounded-xl shadow-[0_10px_30px_rgba(6,182,212,0.2)] z-[60] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                    <button
                                        onClick={handlePrint}
                                        className="w-full text-left px-4 py-3 hover:bg-cyan-500/10 transition-colors flex items-center gap-3 border-b border-cyan-500/10"
                                    >
                                        <Printer className="w-4 h-4 text-cyan-400" />
                                        <span className="text-[11px] font-bold text-cyan-200 uppercase tracking-wider">Print to PDF</span>
                                    </button>
                                    <button
                                        onClick={handleExportDocx}
                                        disabled={isExporting}
                                        className="w-full text-left px-4 py-3 hover:bg-blue-500/10 transition-colors flex items-center gap-3 border-b border-cyan-500/10"
                                    >
                                        {isExporting ? <Loader2 className="w-4 h-4 animate-spin text-blue-400" /> : <FileText className="w-4 h-4 text-blue-400" />}
                                        <span className="text-[11px] font-bold text-blue-200 uppercase tracking-wider">Download Word</span>
                                    </button>

                                </div>
                            )}
                        </div>
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
            <div className="flex-grow p-4 overflow-hidden flex flex-col">
                {/* Research Tab - Perplexity Style */}
                {activeTab === 'research' && (
                    <div className="h-full flex flex-col overflow-hidden">
                        {/* Sources Grid at top */}
                        {hasSources && (
                            <SourcesGrid
                                sources={activeCanvas.output_sources!.map(s => ({
                                    title: s.title,
                                    uri: s.uri
                                }))}
                                isLoading={isLoading}
                            />
                        )}

                        {/* Answer Area */}
                        <div className="flex-grow overflow-y-auto custom-scrollbar pr-2 mb-4">
                            {isLoading && !activeCanvas?.output ? (
                                <ResearchAnswer content="" isLoading={true} />
                            ) : activeCanvas?.output ? (
                                <ResearchAnswer
                                    content={activeCanvas.output}
                                    onInsertToEditor={(content) => {
                                        if (activeCanvas) {
                                            addCanvasPart(activeCanvas.id, { type: 'text', content });
                                        }
                                    }}
                                    onInsertParagraph={(paragraph) => {
                                        if (activeCanvas) {
                                            addCanvasPart(activeCanvas.id, { type: 'text', content: paragraph + '\n\n' });
                                        }
                                    }}
                                />
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-500">
                                    <Search className="w-12 h-12 mb-4 opacity-30" />
                                    <p className="text-sm">Ask a question to start researching</p>
                                </div>
                            )}
                        </div>

                        {/* Chat Input at bottom */}
                        <div className="shrink-0">
                            <ChatPanel />
                        </div>
                    </div>
                )}

                {/* Draft Tab - Clean output view */}
                {activeTab === 'draft' && (
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

                {/* Process Tab - Task log and insights */}
                {activeTab === 'process' && (
                    <div className="h-full overflow-y-auto custom-scrollbar">
                        <div className="mb-4">
                            <h3 className="text-xs font-bold text-cyan-500/60 uppercase tracking-widest mb-3">Task Log</h3>
                            <TaskPanel
                                log={activeCanvas?.task_log || []}
                                isLoading={isLoading}
                            />
                        </div>
                        <div>
                            <h3 className="text-xs font-bold text-cyan-500/60 uppercase tracking-widest mb-3">Insights</h3>
                            <Suspense fallback={<div className="text-[10px] text-cyan-500/20 uppercase tracking-widest animate-pulse font-bold">Loading...</div>}>
                                <InsightsPanel />
                            </Suspense>
                        </div>
                    </div>
                )}
            </div>

            {/* Export Style Modal */}

        </div >
    );
};