import React, { useState, useMemo } from 'react';
import { DeepSAFBlueprint } from './types';
import { blueprintToMermaid, blueprintToTypeScript, blueprintToThesisSection } from './render';
import { ExportStyleModal, ExportStyleConfig } from './ExportStyleModal';
import {
    FileCode2, FileText, GitBranch, Copy, Check,
    Download, Printer, X, Maximize2, Minimize2, Settings
} from 'lucide-react';

/**
 * SAFOutputPanel - VS Code-style bottom panel for viewing rendered outputs
 * Shows: Mermaid Diagram | TypeScript Code | Thesis Section
 * Includes ExportStyleModal for customizing fonts, colors, margins before printing/export
 */

interface SAFOutputPanelProps {
    blueprint: DeepSAFBlueprint;
    isExpanded: boolean;
    onToggleExpand: () => void;
    onClose: () => void;
}

type OutputTab = 'diagram' | 'code' | 'thesis';

// Font family mapping
const FONT_FAMILIES: Record<string, string> = {
    inter: "'Inter', -apple-system, sans-serif",
    roboto: "'Roboto', sans-serif",
    georgia: "Georgia, serif",
    times: "'Times New Roman', Times, serif",
    arial: "Arial, Helvetica, sans-serif",
};

// Font size mapping
const FONT_SIZES: Record<string, string> = {
    small: '10pt',
    medium: '12pt',
    large: '14pt',
};

// Color scheme mapping
const COLOR_SCHEMES: Record<string, { bg: string; text: string; accent: string }> = {
    light: { bg: '#ffffff', text: '#1a1a1a', accent: '#0891b2' },
    dark: { bg: '#1a1a1a', text: '#f5f5f5', accent: '#22d3ee' },
    sepia: { bg: '#f5f0e6', text: '#5c4a32', accent: '#b45309' },
    'high-contrast': { bg: '#000000', text: '#ffffff', accent: '#00ff00' },
};

// Margin mapping
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

    // Generate outputs using render utilities
    const mermaidCode = useMemo(() => blueprintToMermaid(blueprint), [blueprint]);
    const typeScriptCode = useMemo(() => blueprintToTypeScript(blueprint), [blueprint]);
    const thesisMarkdown = useMemo(() => blueprintToThesisSection(blueprint), [blueprint]);

    const currentOutput = activeTab === 'diagram' ? mermaidCode
        : activeTab === 'code' ? typeScriptCode
            : thesisMarkdown;

    const handleCopy = async () => {
        await navigator.clipboard.writeText(currentOutput);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownload = () => {
        const extension = activeTab === 'diagram' ? 'mmd'
            : activeTab === 'code' ? 'ts'
                : 'md';
        const filename = `${blueprint.project_name.replace(/\s+/g, '_').toLowerCase()}_${activeTab}.${extension}`;
        const blob = new Blob([currentOutput], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Styled print using ExportStyleConfig
    const handleStyledPrint = (config: ExportStyleConfig, format: 'pdf' | 'docx' | 'html') => {
        const scheme = COLOR_SCHEMES[config.colorScheme];
        const fontFamily = FONT_FAMILIES[config.fontFamily];
        const fontSize = FONT_SIZES[config.fontSize];
        const margin = MARGINS[config.marginSize];
        const lineHeight = config.lineHeight === 'compact' ? '1.2'
            : config.lineHeight === 'relaxed' ? '1.8' : '1.5';

        const printWindow = window.open('', '_blank');
        if (printWindow) {
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
                        h1, h2, h3 {
                            color: ${scheme.accent};
                            margin-top: 1.5em;
                            margin-bottom: 0.5em;
                        }
                        h1 { font-size: 2em; border-bottom: 2px solid ${scheme.accent}; padding-bottom: 0.3em; }
                        h2 { font-size: 1.5em; }
                        h3 { font-size: 1.25em; }
                        pre, code {
                            font-family: 'Consolas', 'Monaco', monospace;
                            background: ${config.colorScheme === 'light' ? '#f5f5f5' : '#2a2a2a'};
                            padding: 1em;
                            border-radius: 8px;
                            overflow-x: auto;
                            white-space: pre-wrap;
                            word-wrap: break-word;
                        }
                        table { width: 100%; border-collapse: collapse; margin: 1em 0; }
                        th, td { border: 1px solid ${scheme.accent}40; padding: 0.5em; text-align: left; }
                        th { background: ${scheme.accent}20; font-weight: 600; }
                        ${config.includeHeader ? `
                            .header {
                                border-bottom: 3px solid ${scheme.accent};
                                padding-bottom: 1em;
                                margin-bottom: 2em;
                            }
                            .header-title { font-size: 1.5em; font-weight: 700; color: ${scheme.accent}; }
                            .header-meta { font-size: 0.8em; color: ${scheme.text}80; margin-top: 0.5em; }
                        ` : ''}
                        ${config.includeFooter ? `
                            .footer {
                                position: fixed;
                                bottom: ${margin};
                                left: ${margin};
                                right: ${margin};
                                text-align: center;
                                font-size: 0.75em;
                                color: ${scheme.text}60;
                                border-top: 1px solid ${scheme.accent}30;
                                padding-top: 0.5em;
                            }
                        ` : ''}
                        @media print {
                            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        }
                    </style>
                </head>
                <body>
                    ${config.includeHeader ? `
                        <div class="header">
                            <div class="header-title">${blueprint.project_name}</div>
                            <div class="header-meta">
                                ${config.headerStyle !== 'minimal' ? `Generated: ${new Date().toLocaleDateString()} • ` : ''}
                                ${config.headerStyle === 'detailed' ? `Domain: ${blueprint.domain} • Version: ${blueprint.version}` : ''}
                            </div>
                        </div>
                    ` : ''}
                    
                    <h1>${activeTab === 'diagram' ? 'System Diagram' : activeTab === 'code' ? 'Code Scaffold' : 'Thesis Section'}</h1>
                    
                    <pre>${currentOutput.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
                    
                    ${config.includeFooter ? `
                        <div class="footer">
                            ${config.includePageNumbers ? 'Page 1 of 1 • ' : ''}
                            Generated by Eldoria SAF Lab
                        </div>
                    ` : ''}
                </body>
                </html>
            `);
            printWindow.document.close();

            // For PDF/Print
            if (format === 'pdf' || format === 'html') {
                setTimeout(() => printWindow.print(), 500);
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
            <div
                className={`shrink-0 bg-gray-950 border-t border-cyan-900/30 flex flex-col transition-all duration-300 ${isExpanded ? 'h-[50vh]' : 'h-64'
                    }`}
            >
                {/* Header Bar */}
                <div className="shrink-0 h-10 flex items-center justify-between px-4 bg-black/40 border-b border-cyan-900/20">
                    {/* Tabs */}
                    <div className="flex items-center gap-1">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-t transition-colors flex items-center gap-2 ${activeTab === tab.id
                                    ? 'bg-gray-900 text-cyan-400 border-t-2 border-cyan-400'
                                    : 'text-gray-500 hover:text-gray-300 hover:bg-gray-900/50'
                                    }`}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleCopy}
                            className="p-1.5 text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/10 rounded transition-colors"
                            title="Copy to clipboard"
                        >
                            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                        <button
                            onClick={handleDownload}
                            className="p-1.5 text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/10 rounded transition-colors"
                            title="Download file"
                        >
                            <Download className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setShowStyleModal(true)}
                            className="px-2 py-1 text-xs bg-purple-500/20 text-purple-400 rounded hover:bg-purple-500/30 transition-colors flex items-center gap-1.5"
                            title="Export with styling options"
                        >
                            <Printer className="w-3.5 h-3.5" />
                            <Settings className="w-3 h-3" />
                            Print
                        </button>
                        <div className="w-px h-5 bg-gray-700 mx-1" />
                        <button
                            onClick={onToggleExpand}
                            className="p-1.5 text-gray-500 hover:text-white hover:bg-white/10 rounded transition-colors"
                            title={isExpanded ? 'Shrink' : 'Expand'}
                        >
                            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                            title="Close panel"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-grow overflow-auto p-4 font-mono text-sm">
                    <pre className="text-gray-300 whitespace-pre-wrap leading-relaxed">
                        {currentOutput}
                    </pre>
                </div>

                {/* Footer Status */}
                <div className="shrink-0 h-6 px-4 flex items-center justify-between text-[10px] text-gray-600 bg-black/30 border-t border-gray-800/50">
                    <span>
                        {activeTab === 'diagram' && 'Mermaid Diagram • Paste into mermaid.live'}
                        {activeTab === 'code' && 'TypeScript • Scaffold for your codebase'}
                        {activeTab === 'thesis' && 'Markdown • Academic thesis section'}
                    </span>
                    <span>{currentOutput.split('\n').length} lines</span>
                </div>
            </div>

            {/* Export Style Modal */}
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
