
import React, { useState, lazy, Suspense } from 'react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { TaskPanel } from './TaskPanel';
import { ChatPanel } from './ChatPanel';
const InsightsPanel = lazy(() => import('./InsightsPanel').then(m => ({ default: m.InsightsPanel })));
import { useWorkspace } from '../context/WorkspaceContext';
import { Source } from '../types';
import { ChevronDown, Send, Printer, FileText, Loader2 } from 'lucide-react';
import { bridgeClient } from '../services/bridgeClient';
import { SourceCards } from './SourceCards';
import { generatePrintDocument } from '../utils/printUtils';


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

        // --- Content Assembly & Robust Sanitization ---
        let content = activeCanvas.output.trim();

        // 1. Aggressive preamble removal (strips multiple AI planning sentences at the start)
        // Updated to handle Markdown prefixes (e.g. **Here is...) and colons, AND newlines ([\s\S])
        const preambleRegex = /^([\s\*\-_>]*)(To perform|I will|Sure|I'll|Certainly|Here is|Then, I'll proceed|In order to|Okay|I've|I can|I've noticed|First|I will first|Secondly|Let me)[\s\S]+?(\.|:|\n)/gim;

        let lastContent = "";

        // Loop to catch consecutive sentences (e.g. "To perform... I will... Then I'll...")
        while (content !== lastContent) {
            lastContent = content;
            const match = content.match(preambleRegex);
            if (match) {
                content = content.replace(preambleRegex, '').trim();
            }
        }

        // 2. Clean up SAF_ISO tags but keep JSON
        content = content.replace(/```json\n<SAF_ISO>/g, '```json');
        content = content.replace(/<\/SAF_ISO>\n```/g, '```');
        content = content.replace(/<SAF_ISO>/g, '\n\n### Technical Specification (SAF-ISO)\n```json\n');
        content = content.replace(/<\/SAF_ISO>/g, '\n```\n');

        // 3. Normalize headers if they are too deep
        if (!content.includes('# ')) {
            content = content.replace(/^### /gm, '## '); // Shift H3 to H2 if no H1
        }

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Eldoria Hub - Strategic Brief</title>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;600&family=IBM+Plex+Mono&display=swap');
                    body { 
                        font-family: 'IBM Plex Sans', sans-serif; 
                        line-height: 1.7; 
                        color: #1a202c; 
                        max-width: 850px; 
                        margin: 50px auto; 
                        padding: 0 50px;
                        background: white;
                    }
                    .header { 
                        text-align: left; 
                        margin-bottom: 40px; 
                        border-bottom: 2px solid #06b6d4; 
                        padding-bottom: 20px; 
                        display: flex; 
                        justify-content: space-between; 
                        align-items: flex-end; 
                    }
                    .header h1 { margin: 0; font-size: 26px; color: #0e7490; font-weight: 600; letter-spacing: -0.01em; }
                    .header .meta { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700; }
                    
                    #content { font-size: 15px; color: #334155; }
                    h1 { font-size: 24px; color: #0f172a; margin-top: 1.5em; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; }
                    h2 { font-size: 20px; color: #1e293b; margin-top: 1.5em; }
                    h3 { font-size: 17px; color: #334155; margin-top: 1.25em; text-transform: uppercase; letter-spacing: 0.05em; border-left: 3px solid #06b6d4; padding-left: 12px; }
                    
                    p { margin-bottom: 1.5em; text-align: justify; }
                    ul, ol { margin-bottom: 1.5em; padding-left: 1.75em; }
                    li { margin-bottom: 0.75em; }
                    
                    pre { 
                        background: #f8fafc; 
                        padding: 20px; 
                        border-radius: 10px; 
                        font-family: 'IBM Plex Mono', monospace;
                        font-size: 13px; 
                        overflow-x: auto; 
                        border: 1px solid #e2e8f0; 
                        margin: 2em 0;
                        color: #475569;
                    }
                    code { background: #f1f5f9; padding: 0.2em 0.4em; border-radius: 4px; font-size: 0.9em; font-family: 'IBM Plex Mono', monospace; }
                    
                    blockquote { border-left: 4px solid #06b6d4; padding: 15px 25px; font-style: italic; color: #475569; margin: 2em 0; background: #f0f9ff; border-radius: 0 10px 10px 0; }
                    
                    table { border-collapse: collapse; width: 100%; margin: 2.5em 0; font-size: 13px; }
                    th, td { border: 1px solid #e2e8f0; padding: 14px; text-align: left; }
                    th { background: #f8fafc; font-weight: 700; color: #1e293b; text-transform: uppercase; font-size: 11px; }
                    
                    .footer { text-align: center; margin-top: 80px; font-size: 10px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 25px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.15em; }
                    
                    @media print {
                        body { margin: 0; padding: 15mm; }
                        .no-print { display: none; }
                        h1, h2 { page-break-after: avoid; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <div class="meta">Eldoria Strategic Analysis</div>
                        <h1>${activeCanvas.name || "STRATEGIC BRIEF"}</h1>
                    </div>
                    <div style="text-align: right;">
                        <div class="meta">Timestamp</div>
                        <div style="font-size: 12px; color: #475569;">${new Date().toLocaleDateString(undefined, { dateStyle: 'long' })}</div>
                    </div>
                </div>
                <div id="content"></div>
                <div class="footer">
                    Generated via Eldoria AI IDE &bull; Neural Context Layer v1.2 &bull; Project ID: ${activeCanvas.id}
                </div>
                <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
                <script>
                    const rawContent = ${JSON.stringify(content)};
                    document.getElementById('content').innerHTML = marked.parse(rawContent);
                    
                    window.onload = () => {
                        setTimeout(() => {
                            window.print();
                        }, 1200); 
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
                                {hasSources && <SourceCards sources={activeCanvas.output_sources!} compact />}
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

            {/* Export Style Modal */}

        </div >
    );
};