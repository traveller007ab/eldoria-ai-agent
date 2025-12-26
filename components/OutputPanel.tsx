
import React, { useState, lazy, Suspense } from 'react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { TaskPanel } from './TaskPanel';
import { ChatPanel } from './ChatPanel';
const InsightsPanel = lazy(() => import('./InsightsPanel').then(m => ({ default: m.InsightsPanel })));
import { useWorkspace } from '../context/WorkspaceContext';
import { Source } from '../types';
import { ChevronDown, Send, Printer, FileText, Loader2 } from 'lucide-react';
import { bridgeClient } from '../services/bridgeClient';

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
    const [isExporting, setIsExporting] = useState(false);

    const handleExportDocx = async () => {
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
        if (!activeCanvas?.output) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert("Please allow popups to print output.");
            return;
        }

        // Generate a professional print document with the output content
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Eldoria Hub - Strategic Brief</title>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap');
                    body { 
                        font-family: 'Inter', sans-serif; 
                        line-height: 1.6; 
                        color: #1a202c; 
                        max-width: 800px; 
                        margin: 40px auto; 
                        padding: 0 40px;
                        background: white;
                    }
                    .header { text-align: left; margin-bottom: 30px; border-bottom: 2px solid #06b6d4; padding-bottom: 15px; display: flex; justify-content: space-between; align-items: flex-end; }
                    .header h1 { margin: 0; font-size: 24px; color: #0891b2; letter-spacing: -0.025em; }
                    .header .meta { font-size: 11px; color: #718096; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; }
                    
                    #content { font-size: 14px; }
                    h1, h2, h3 { color: #0e7490; margin-top: 1.5em; margin-bottom: 0.5em; }
                    h1 { font-size: 22px; }
                    h2 { font-size: 18px; border-bottom: 1px solid #edf2f7; padding-bottom: 5px; }
                    h3 { font-size: 16px; }
                    
                    p { margin-bottom: 1.25em; }
                    ul, ol { margin-bottom: 1.25em; padding-left: 1.5em; }
                    li { margin-bottom: 0.5em; }
                    
                    pre { background: #f8fafc; padding: 1.25em; border-radius: 8px; font-size: 12px; overflow-x: auto; border: 1px solid #e2e8f0; margin: 1.5em 0; }
                    code { background: #f1f5f9; padding: 0.2em 0.4em; border-radius: 4px; font-size: 0.9em; font-family: monospace; }
                    
                    blockquote { border-left: 4px solid #06b6d4; padding-left: 1.25em; font-style: italic; color: #475569; margin: 1.5em 0; background: #f0f9ff; padding-top: 0.5em; padding-bottom: 0.5em; }
                    
                    table { border-collapse: collapse; width: 100%; margin: 2em 0; font-size: 12px; }
                    th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; }
                    th { background: #f8fafc; font-weight: 700; color: #334155; }
                    
                    .footer { text-align: center; margin-top: 60px; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; }
                    
                    @media print {
                        body { margin: 0; padding: 20mm; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <div class="meta">Strategic Output Document</div>
                        <h1>ELDORIA HUB BRIEF</h1>
                    </div>
                    <div style="text-align: right;">
                        <div class="meta">Timestamp</div>
                        <div style="font-size: 12px; color: #475569;">${new Date().toLocaleString()}</div>
                    </div>
                </div>
                <div id="content"></div>
                <div class="footer">
                    Generated via Eldoria AI IDE &bull; Strategic Academic Framework
                </div>
                <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
                <script>
                    const rawContent = \`${activeCanvas.output.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`;
                    document.getElementById('content').innerHTML = marked.parse(rawContent);
                    
                    // Trigger print after a short delay to ensure assets/fonts load
                    window.onload = () => {
                        setTimeout(() => {
                            window.print();
                            // Optional: window.close(); // Some users prefer to keep it open to verify
                        }, 500);
                    };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

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
                            onClick={handlePrint}
                            className="p-1.5 text-cyan-400/60 hover:text-cyan-300 hover:bg-cyan-500/10 rounded-md transition-all mr-1"
                            title="Print output alone"
                        >
                            <Printer className="w-4 h-4" />
                        </button>
                        <button
                            onClick={handleExportDocx}
                            disabled={isExporting}
                            className="p-1.5 text-blue-400/60 hover:text-blue-300 hover:bg-blue-500/10 rounded-md transition-all mr-2 disabled:opacity-50"
                            title="Export to Microsoft Word (.docx)"
                        >
                            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                        </button>
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