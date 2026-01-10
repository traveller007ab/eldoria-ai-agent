/**
 * Export Panel Component
 * 
 * Modern UI for multi-format thesis export with preview.
 */

import React, { useState } from 'react';
import { Download, FileText, FileType, FileCode, File, Loader2, Check, AlertCircle, HardDrive, Wifi, WifiOff } from 'lucide-react';
import { AcademicProject } from '../types';
import { ExportService, ExportFormat, ExportOptions } from '../services/ExportService';

interface ExportPanelProps {
    project: AcademicProject;
    onClose: () => void;
}

interface FormatOption {
    id: ExportFormat;
    name: string;
    description: string;
    icon: React.ReactNode;
    requiresBridge: boolean;
    extension: string;
}

const FORMAT_OPTIONS: FormatOption[] = [
    {
        id: 'pdf',
        name: 'PDF Document',
        description: 'Universal format, ready to print',
        icon: <FileText className="w-5 h-5" />,
        requiresBridge: false,
        extension: '.pdf'
    },
    {
        id: 'docx',
        name: 'Word Document',
        description: 'Editable DOCX for Microsoft Word',
        icon: <FileType className="w-5 h-5" />,
        requiresBridge: true,
        extension: '.docx'
    },
    {
        id: 'latex',
        name: 'LaTeX Source',
        description: 'For academic typesetting',
        icon: <FileCode className="w-5 h-5" />,
        requiresBridge: false,
        extension: '.tex'
    },
    {
        id: 'markdown',
        name: 'Markdown',
        description: 'Plain text with formatting',
        icon: <File className="w-5 h-5" />,
        requiresBridge: false,
        extension: '.md'
    },
    {
        id: 'html',
        name: 'HTML Page',
        description: 'View in any browser',
        icon: <FileCode className="w-5 h-5" />,
        requiresBridge: false,
        extension: '.html'
    }
];

export const ExportPanel: React.FC<ExportPanelProps> = ({ project, onClose }) => {
    const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('pdf');
    const [isExporting, setIsExporting] = useState(false);
    const [exportResult, setExportResult] = useState<'success' | 'error' | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [bridgeAvailable, setBridgeAvailable] = useState<boolean | null>(null);

    // Export options
    const [options, setOptions] = useState<ExportOptions>({
        format: 'pdf',
        includeTableOfContents: true,
        includeReferences: true,
        includeCoverPage: true,
        citationStyle: 'APA',
        pageSize: 'A4',
        fontSize: 12,
        lineSpacing: 2.0
    });

    // Check bridge on mount
    React.useEffect(() => {
        ExportService.checkBridgeAvailability().then(setBridgeAvailable);
    }, []);

    const handleExport = async () => {
        setIsExporting(true);
        setExportResult(null);
        setErrorMessage(null);

        try {
            const result = await ExportService.export(project, { ...options, format: selectedFormat });

            if (result.success) {
                ExportService.download(result);
                setExportResult('success');
                setTimeout(() => setExportResult(null), 3000);
            } else {
                setExportResult('error');
                setErrorMessage(result.error || 'Export failed');
            }
        } catch (e: any) {
            setExportResult('error');
            setErrorMessage(e.message || 'Export failed');
        } finally {
            setIsExporting(false);
        }
    };

    const selectedFormatInfo = FORMAT_OPTIONS.find(f => f.id === selectedFormat);

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-8 animate-in fade-in duration-300">
            <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-900/20 rounded-3xl border border-emerald-500/20 w-full max-w-2xl overflow-hidden shadow-2xl shadow-emerald-500/10">
                {/* Header */}
                <div className="p-6 border-b border-emerald-500/20 bg-emerald-500/5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-emerald-500/20 rounded-2xl">
                                <Download className="w-6 h-6 text-emerald-400" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-emerald-100">Export Thesis</h2>
                                <p className="text-xs text-emerald-400/60">
                                    {project.wizard_state.basics.title || 'Untitled Project'}
                                </p>
                            </div>
                        </div>

                        {/* Bridge Status */}
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${bridgeAvailable
                                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                            }`}>
                            {bridgeAvailable ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                            {bridgeAvailable ? 'Bridge Connected' : 'Bridge Offline'}
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* Format Selection */}
                    <div>
                        <div className="text-[10px] font-bold text-emerald-500/60 uppercase tracking-widest mb-3">
                            Export Format
                        </div>
                        <div className="grid grid-cols-5 gap-2">
                            {FORMAT_OPTIONS.map((format) => (
                                <button
                                    key={format.id}
                                    onClick={() => setSelectedFormat(format.id)}
                                    disabled={format.requiresBridge && !bridgeAvailable}
                                    className={`relative p-4 rounded-xl border transition-all text-center ${selectedFormat === format.id
                                            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200'
                                            : format.requiresBridge && !bridgeAvailable
                                                ? 'bg-slate-800/20 border-slate-700/30 text-slate-600 cursor-not-allowed'
                                                : 'bg-slate-800/30 border-slate-700/50 text-slate-400 hover:bg-slate-800/50 hover:border-slate-600'
                                        }`}
                                >
                                    <div className={`mx-auto mb-2 ${selectedFormat === format.id ? 'text-emerald-400' : ''}`}>
                                        {format.icon}
                                    </div>
                                    <div className="text-[10px] font-bold uppercase">{format.extension}</div>
                                    {format.requiresBridge && !bridgeAvailable && (
                                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                                            <HardDrive className="w-2.5 h-2.5 text-white" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                        {selectedFormatInfo && (
                            <p className="text-xs text-slate-500 mt-2">{selectedFormatInfo.description}</p>
                        )}
                    </div>

                    {/* Options */}
                    <div className="grid grid-cols-2 gap-4">
                        <label className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-xl cursor-pointer hover:bg-slate-800/50 transition-colors">
                            <input
                                type="checkbox"
                                checked={options.includeCoverPage}
                                onChange={(e) => setOptions(prev => ({ ...prev, includeCoverPage: e.target.checked }))}
                                className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500"
                            />
                            <span className="text-xs text-slate-300">Include Cover Page</span>
                        </label>

                        <label className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-xl cursor-pointer hover:bg-slate-800/50 transition-colors">
                            <input
                                type="checkbox"
                                checked={options.includeTableOfContents}
                                onChange={(e) => setOptions(prev => ({ ...prev, includeTableOfContents: e.target.checked }))}
                                className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500"
                            />
                            <span className="text-xs text-slate-300">Include Table of Contents</span>
                        </label>

                        <label className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-xl cursor-pointer hover:bg-slate-800/50 transition-colors">
                            <input
                                type="checkbox"
                                checked={options.includeReferences}
                                onChange={(e) => setOptions(prev => ({ ...prev, includeReferences: e.target.checked }))}
                                className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500"
                            />
                            <span className="text-xs text-slate-300">Include References</span>
                        </label>

                        <div className="p-3 bg-slate-800/30 rounded-xl">
                            <div className="text-[10px] text-slate-500 uppercase mb-1">Citation Style</div>
                            <select
                                value={options.citationStyle}
                                onChange={(e) => setOptions(prev => ({ ...prev, citationStyle: e.target.value as any }))}
                                className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-emerald-500/50"
                            >
                                <option value="APA">APA</option>
                                <option value="IEEE">IEEE</option>
                                <option value="Harvard">Harvard</option>
                                <option value="MLA">MLA</option>
                                <option value="Chicago">Chicago</option>
                            </select>
                        </div>
                    </div>

                    {/* Bridge Download Prompt */}
                    {!bridgeAvailable && selectedFormatInfo?.requiresBridge && (
                        <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
                                <div>
                                    <div className="text-sm font-medium text-orange-200">Bridge Required</div>
                                    <p className="text-xs text-orange-300/70 mt-1">
                                        {selectedFormatInfo.name} export requires the Eldoria Bridge for processing.
                                    </p>
                                    <a
                                        href={ExportService.getBridgeDownloadUrl()}
                                        download
                                        className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 rounded-lg text-xs font-medium transition-colors"
                                    >
                                        <HardDrive className="w-3.5 h-3.5" />
                                        Download Bridge for Offline Use
                                    </a>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Error Message */}
                    {exportResult === 'error' && errorMessage && (
                        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                            <div className="flex items-center gap-3">
                                <AlertCircle className="w-5 h-5 text-red-400" />
                                <span className="text-sm text-red-200">{errorMessage}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-emerald-500/10 bg-slate-900/50 flex items-center justify-between">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 bg-slate-800/50 hover:bg-slate-700/50 text-slate-400 rounded-xl text-xs font-bold uppercase tracking-widest border border-slate-700/50 transition-all"
                    >
                        Cancel
                    </button>

                    <button
                        onClick={handleExport}
                        disabled={isExporting || (selectedFormatInfo?.requiresBridge && !bridgeAvailable)}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${exportResult === 'success'
                                ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                                : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 disabled:opacity-50 disabled:cursor-not-allowed'
                            }`}
                    >
                        {isExporting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Exporting...
                            </>
                        ) : exportResult === 'success' ? (
                            <>
                                <Check className="w-4 h-4" />
                                Downloaded!
                            </>
                        ) : (
                            <>
                                <Download className="w-4 h-4" />
                                Export {selectedFormatInfo?.extension?.toUpperCase()}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExportPanel;
