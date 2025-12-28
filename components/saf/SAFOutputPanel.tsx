import React, { useState, useMemo, useEffect, useRef } from 'react';
import { DeepSAFBlueprint } from './types';
import { blueprintToMermaid, blueprintToTypeScript, blueprintToThesisSection } from './render';
import { ExportStyleModal, ExportStyleConfig } from './ExportStyleModal';
import mermaid from 'mermaid';
import {
    FileCode2, FileText, GitBranch, Copy, Check,
    Download, Printer, X, Maximize2, Minimize2, Settings, Eye, Code
} from 'lucide-react';

interface SAFOutputPanelProps {
    blueprint: DeepSAFBlueprint;
    isExpanded: boolean;
    onToggleExpand: () => void;
    onClose: () => void;
}

type OutputTab = 'diagram' | 'code' | 'thesis';

const FONT_FAMILIES: Record<string, string> = {
    inter: "'Inter', -apple-system, sans-serif",
    roboto: "'Roboto', sans-serif",
    georgia: "Georgia, serif",
    times: "'Times New Roman', Times, serif",
    arial: "Arial, Helvetica, sans-serif",
};

const FONT_SIZES: Record<string, string> = {
    small: '10pt',
    medium: '12pt',
    large: '14pt',
};

const COLOR_SCHEMES: Record<string, { bg: string; text: string; accent: string }> = {
    light: { bg: '#ffffff', text: '#1a1a1a', accent: '#0891b2' },
    dark: { bg: '#1a1a1a', text: '#f5f5f5', accent: '#22d3ee' },
    sepia: { bg: '#f5f0e6', text: '#5c4a32', accent: '#b45309' },
    'high-contrast': { bg: '#000000', text: '#ffffff', accent: '#00ff00' },
};

const MARGINS: Record<string, string> = {
    narrow: '0.5in',
    normal: '1in',
    wide: '1.5in',
};

export const SAFOutputPanel: React.FC<SAFOutputPanelProps> = ({
    blueprint,
    isExpanded,
    onToggleExpand,
    onClose,
}) => {
    const [activeTab, setActiveTab] = useState<OutputTab>('diagram');
    const [copied, setCopied] = useState(false);
    const [showStyleModal, setShowStyleModal] = useState(false);
    const [showVisual, setShowVisual] = useState(true);
    const mermaidRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        mermaid.initialize({
            startOnLoad: false,
            theme: 'dark',
            themeVariables: {
                primaryColor: '#0891b2',
                primaryTextColor: '#f5f5f5',
                primaryBorderColor: '#22d3ee',
                lineColor: '#22d3ee',
                secondaryColor: '#1a1a2e',
                tertiaryColor: '#16213e',
                background: '#0a0a0a',
            },
            flowchart: { curve: 'basis', padding: 20 },
        });
    }, []);

    const mermaidCode = useMemo(() => blueprintToMermaid(blueprint), [blueprint]);
    const typeScriptCode = useMemo(() => blueprintToTypeScript(blueprint), [blueprint]);
    const thesisMarkdown = useMemo(() => blueprintToThesisSection(blueprint), [blueprint]);

    const currentOutput = activeTab === 'diagram' ? mermaidCode
        : activeTab === 'code' ? typeScriptCode
            : thesisMarkdown;

    useEffect(() => {
        if (mermaidRef.current) {
            mermaidRef.current.innerHTML = '';
            const id = `mermaid-${Date.now()}`;
            mermaid.render(id, mermaidCode)
                .then(({ svg }) => {
                    if (mermaidRef.current) mermaidRef.current.innerHTML = svg;
                })
                .catch((err) => {
                    console.error('Mermaid render error:', err);
                    if (mermaidRef.current) {
                        mermaidRef.current.innerHTML = `<div class="text-red-400 p-4">Diagram render error: ${err.message}</div>`;
                    }
                });
        }
    }, [mermaidCode]);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(currentOutput);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownload = () => {
        const extension = activeTab === 'diagram' ? 'mmd' : activeTab === 'code' ? 'ts' : 'md';
        const filename = `${blueprint.project_name.replace(/\s+/g, '_').toLowerCase()}_${activeTab}.${extension}`;
        const blob = new Blob([currentOutput], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleStyledPrint = (config: ExportStyleConfig, format: 'pdf' | 'docx' | 'html') => {
        const margin = MARGINS[config.marginSize] || MARGINS.normal;
        const fontFamily = FONT_FAMILIES[config.fontFamily] || FONT_FAMILIES.inter;
        const fontSize = FONT_SIZES[config.fontSize] || FONT_SIZES.medium;
        const lineHeight = config.lineHeight === 'compact' ? 1.2 : config.lineHeight === 'relaxed' ? 1.8 : 1.5;
        const schemeId = config.colorScheme || 'light';
        const scheme = COLOR_SCHEMES[schemeId] || COLOR_SCHEMES.light;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            const visualContent = (config.includeDiagrams && mermaidRef.current)
                ? mermaidRef.current.innerHTML
                : null;

            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>${blueprint.project_name} - ${activeTab}</title>
                    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
                    <style>
                        @page { margin: ${margin}; size: A4; }
                        * { box-sizing: border-box; }
                        body {
                            font-family: ${fontFamily};
                            font-size: ${fontSize};
                            line-height: ${lineHeight};
                            background: ${scheme.bg};
                            color: ${scheme.text};
                            padding: ${margin};
                            margin: 0;
                        }
                        .accent-bar {
                            height: 6px;
                            background: linear-gradient(to right, ${scheme.accent}, ${scheme.accent}44);
                            margin-bottom: 24px;
                            border-radius: 3px;
                        }
                        h1, h2, h3 {
                            color: ${scheme.accent};
                            margin-top: 1.5em;
                            margin-bottom: 0.5em;
                            font-weight: 700;
                        }
                        h1 { font-size: 2.5em; letter-spacing: -0.02em; }
                        h2 { font-size: 1.75em; border-left: 4px solid ${scheme.accent}; padding-left: 12px; }
                        
                        .content-area { margin-top: 2em; }
                        
                        svg {
                            max-width: 100%;
                            height: auto;
                            display: block;
                            margin: 2em auto;
                            filter: ${schemeId === 'dark' ? 'none' : 'invert(1) hue-rotate(180deg) brightness(0.8) contrast(1.2)'};
                        }
                        
                        ${schemeId === 'light' ? `
                            svg g rect, svg g polygon, svg g circle, svg g path { stroke: #1a1a1a !important; }
                            svg .edgeLabel, svg .nodeLabel { color: #1a1a1a !important; fill: #1a1a1a !important; }
                        ` : ''}

                        pre, code {
                            font-family: 'Consolas', 'Monaco', monospace;
                            background: ${schemeId === 'light' ? '#f8fafc' : '#1e293b'};
                            color: ${schemeId === 'light' ? '#1e293b' : '#f8fafc'};
                            padding: 1.5em;
                            border-radius: 12px;
                            border: 1px solid ${scheme.accent}30;
                            overflow-x: auto;
                            white-space: pre-wrap;
                            word-wrap: break-word;
                            font-size: 0.9em;
                            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
                        }
                        
                        ${config.includeHeader ? `
                            .header {
                                padding-bottom: 1.5em;
                                margin-bottom: 2em;
                                display: flex;
                                justify-content: space-between;
                                align-items: flex-end;
                            }
                            .header-title { font-size: 1.8em; font-weight: 800; color: ${scheme.accent}; text-transform: uppercase; letter-spacing: 0.05em; }
                            .header-meta { font-size: 0.9em; color: ${scheme.text}90; text-align: right; }
                        ` : ''}
                        
                        ${config.includeFooter ? `
                            .footer {
                                position: fixed;
                                bottom: 0.5in;
                                left: ${margin};
                                right: ${margin};
                                text-align: center;
                                font-size: 0.8em;
                                color: ${scheme.text}70;
                                border-top: 1px solid ${scheme.accent}20;
                                padding-top: 1em;
                            }
                        ` : ''}
                        
                        @media print {
                            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                            .no-print { display: none; }
                        }
                    </style>
                </head>
                <body>
                    <div class="accent-bar"></div>
                    
                    ${config.includeHeader ? `
                        <div class="header">
                            <div class="header-title">${blueprint.project_name}</div>
                            <div class="header-meta">
                                <div>Strategic Analysis Framework (SAF)</div>
                                ${config.headerStyle !== 'minimal' ? `<div>${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>` : ''}
                                ${config.headerStyle === 'detailed' ? `<div style="opacity: 0.7">Domain: ${blueprint.domain.toUpperCase()} • v${blueprint.version}</div>` : ''}
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="content-area">
                        <h2>${activeTab === 'diagram' ? 'Structural Deconstruction' : activeTab === 'code' ? 'Technical Implementation' : 'Academic Integration'}</h2>
                        
                        ${visualContent ? `
                            <div style="background: ${schemeId === 'dark' ? '#0f172a' : '#f8fafc'}; padding: 2em; border-radius: 16px; border: 1px solid ${scheme.accent}20; margin: 2em 0;">
                                ${visualContent}
                            </div>
                        ` : `
                            <pre>${currentOutput.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
                        `}
                    </div>
                    
                    ${config.includeFooter ? `
                        <div class="footer">
                            ${config.includePageNumbers ? 'Confidential Strategic Intel • ' : ''}
                            Generated by Eldoria AI - Project Explorer
                        </div>
                    ` : ''}
                </body>
                </html>
            `);
            printWindow.document.close();

            if (format === 'pdf' || format === 'html') {
                setTimeout(() => {
                    printWindow.focus();
                    printWindow.print();
                }, 800);
            }
        }
        setShowStyleModal(false);
    };

    const tabs: { id: OutputTab; label: string; icon: React.ReactNode }[] = [
        { id: 'diagram', label: 'Diagram', icon: <GitBranch className="w-4 h-4" /> },
        { id: 'code', label: 'Code', icon: <FileCode2 className="w-4 h-4" /> },
        { id: 'thesis', label: 'Thesis', icon: <FileText className="w-4 h-4" /> },
    ];

    return (
        <>
            <div className={`shrink-0 bg-gray-950 border-t border-cyan-900/30 flex flex-col transition-all duration-300 ${isExpanded ? 'h-[50vh]' : 'h-64'}`}>
                <div className="shrink-0 h-10 flex items-center justify-between px-4 bg-black/40 border-b border-cyan-900/20">
                    <div className="flex items-center gap-1">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-t transition-colors flex items-center gap-2 ${activeTab === tab.id ? 'bg-gray-900 text-cyan-400 border-t-2 border-cyan-400' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-900/50'}`}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2">
                        <button onClick={handleCopy} className="p-1.5 text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/10 rounded transition-colors" title="Copy to clipboard">
                            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                        <button onClick={handleDownload} className="p-1.5 text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/10 rounded transition-colors" title="Download file">
                            <Download className="w-4 h-4" />
                        </button>
                        <button onClick={() => setShowStyleModal(true)} className="px-2 py-1 text-xs bg-purple-500/20 text-purple-400 rounded hover:bg-purple-500/30 transition-colors flex items-center gap-1.5" title="Export with styling options">
                            <Printer className="w-3.5 h-3.5" />
                            <Settings className="w-3 h-3" />
                            Print
                        </button>
                        <div className="w-px h-5 bg-gray-700 mx-1" />
                        <button onClick={onToggleExpand} className="p-1.5 text-gray-500 hover:text-white hover:bg-white/10 rounded transition-colors" title={isExpanded ? 'Shrink' : 'Expand'}>
                            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                        </button>
                        <button onClick={onClose} className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors" title="Close panel">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="flex-grow overflow-auto p-4 font-mono text-sm relative">
                    {/* Always keep Mermaid in DOM for exports, hide when not active */}
                    <div
                        ref={mermaidRef}
                        className={`flex items-center justify-center min-h-[200px] bg-gray-900/50 rounded-lg p-4 ${activeTab === 'diagram' && showVisual ? '' : 'hidden'}`}
                    />

                    {!(activeTab === 'diagram' && showVisual) && (
                        <pre className="text-gray-300 whitespace-pre-wrap leading-relaxed">{currentOutput}</pre>
                    )}
                </div>

                <div className="shrink-0 h-8 px-4 flex items-center justify-between text-[10px] text-gray-600 bg-black/30 border-t border-gray-800/50">
                    <div className="flex items-center gap-3">
                        <span>
                            {activeTab === 'diagram' && (showVisual ? 'Visual Diagram • Click Code to copy' : 'Mermaid Code • Paste into mermaid.live')}
                            {activeTab === 'code' && 'TypeScript • Scaffold for your codebase'}
                            {activeTab === 'thesis' && 'Markdown • Academic thesis section'}
                        </span>
                        {activeTab === 'diagram' && (
                            <button
                                onClick={() => setShowVisual(!showVisual)}
                                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors flex items-center gap-1 ${showVisual ? 'bg-cyan-500/20 text-cyan-400' : 'bg-gray-700 text-gray-400 hover:text-white'}`}
                            >
                                {showVisual ? <><Code className="w-3 h-3" /> Code</> : <><Eye className="w-3 h-3" /> Visual</>}
                            </button>
                        )}
                    </div>
                    <span>{currentOutput.split('\n').length} lines</span>
                </div>
            </div>

            <ExportStyleModal
                isOpen={showStyleModal}
                onClose={() => setShowStyleModal(false)}
                onExport={handleStyledPrint}
                title={`Export ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`}
            />
        </>
    );
};

export default SAFOutputPanel;
