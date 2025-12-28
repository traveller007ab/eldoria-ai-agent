import React, { useState } from 'react';
import { X, Download, Printer, FileText, Settings, Palette, Type, Layout } from 'lucide-react';

/**
 * Export Style Configuration
 */
export interface ExportStyleConfig {
    // Font Settings
    fontFamily: 'inter' | 'roboto' | 'georgia' | 'times' | 'arial';
    fontSize: 'small' | 'medium' | 'large';
    lineHeight: 'compact' | 'normal' | 'relaxed';

    // Color Scheme
    colorScheme: 'light' | 'dark' | 'sepia' | 'high-contrast';
    accentColor: 'cyan' | 'blue' | 'purple' | 'emerald' | 'amber';

    // Layout
    marginSize: 'narrow' | 'normal' | 'wide';
    headerStyle: 'minimal' | 'standard' | 'detailed';

    // Content Options
    includeHeader: boolean;
    includeFooter: boolean;
    includePageNumbers: boolean;
    includeTOC: boolean;
    includeDiagrams: boolean;
}

const DEFAULT_STYLE_CONFIG: ExportStyleConfig = {
    fontFamily: 'inter',
    fontSize: 'medium',
    lineHeight: 'normal',
    colorScheme: 'light',
    accentColor: 'cyan',
    marginSize: 'normal',
    headerStyle: 'standard',
    includeHeader: true,
    includeFooter: true,
    includePageNumbers: true,
    includeTOC: false,
    includeDiagrams: true,
};

interface ExportStyleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onExport: (config: ExportStyleConfig, format: 'pdf' | 'docx' | 'html') => void;
    title?: string;
}

export const ExportStyleModal: React.FC<ExportStyleModalProps> = ({
    isOpen,
    onClose,
    onExport,
    title = 'Export Document',
}) => {
    const [config, setConfig] = useState<ExportStyleConfig>(DEFAULT_STYLE_CONFIG);
    const [activeTab, setActiveTab] = useState<'fonts' | 'colors' | 'layout' | 'content'>('fonts');

    if (!isOpen) return null;

    const updateConfig = <K extends keyof ExportStyleConfig>(
        key: K,
        value: ExportStyleConfig[K]
    ) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    };

    const handleExport = (format: 'pdf' | 'docx' | 'html') => {
        onExport(config, format);
    };

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-gray-900 border border-cyan-900/30 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="shrink-0 px-6 py-4 border-b border-cyan-900/20 flex items-center justify-between bg-gradient-to-r from-cyan-500/10 to-purple-500/10">
                    <div className="flex items-center gap-3">
                        <Settings className="w-5 h-5 text-cyan-400" />
                        <h2 className="text-lg font-bold text-white">{title}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="shrink-0 flex border-b border-cyan-900/20">
                    {[
                        { id: 'fonts', label: 'Typography', icon: Type },
                        { id: 'colors', label: 'Colors', icon: Palette },
                        { id: 'layout', label: 'Layout', icon: Layout },
                        { id: 'content', label: 'Content', icon: FileText },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === tab.id
                                    ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/5'
                                    : 'text-gray-500 hover:text-gray-300'
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-grow overflow-y-auto p-6">
                    {/* Typography Tab */}
                    {activeTab === 'fonts' && (
                        <div className="space-y-6">
                            <OptionGroup label="Font Family">
                                <RadioGroup
                                    options={[
                                        { value: 'inter', label: 'Inter (Modern)' },
                                        { value: 'roboto', label: 'Roboto (Clean)' },
                                        { value: 'georgia', label: 'Georgia (Serif)' },
                                        { value: 'times', label: 'Times (Classic)' },
                                        { value: 'arial', label: 'Arial (Universal)' },
                                    ]}
                                    value={config.fontFamily}
                                    onChange={(v) => updateConfig('fontFamily', v as any)}
                                />
                            </OptionGroup>

                            <OptionGroup label="Font Size">
                                <RadioGroup
                                    options={[
                                        { value: 'small', label: 'Small (10pt)' },
                                        { value: 'medium', label: 'Medium (12pt)' },
                                        { value: 'large', label: 'Large (14pt)' },
                                    ]}
                                    value={config.fontSize}
                                    onChange={(v) => updateConfig('fontSize', v as any)}
                                />
                            </OptionGroup>

                            <OptionGroup label="Line Height">
                                <RadioGroup
                                    options={[
                                        { value: 'compact', label: 'Compact (1.2)' },
                                        { value: 'normal', label: 'Normal (1.5)' },
                                        { value: 'relaxed', label: 'Relaxed (1.8)' },
                                    ]}
                                    value={config.lineHeight}
                                    onChange={(v) => updateConfig('lineHeight', v as any)}
                                />
                            </OptionGroup>
                        </div>
                    )}

                    {/* Colors Tab */}
                    {activeTab === 'colors' && (
                        <div className="space-y-6">
                            <OptionGroup label="Color Scheme">
                                <RadioGroup
                                    options={[
                                        { value: 'light', label: 'Light' },
                                        { value: 'dark', label: 'Dark' },
                                        { value: 'sepia', label: 'Sepia (Warm)' },
                                        { value: 'high-contrast', label: 'High Contrast' },
                                    ]}
                                    value={config.colorScheme}
                                    onChange={(v) => updateConfig('colorScheme', v as any)}
                                />
                            </OptionGroup>

                            <OptionGroup label="Accent Color">
                                <div className="flex gap-3">
                                    {['cyan', 'blue', 'purple', 'emerald', 'amber'].map((color) => (
                                        <button
                                            key={color}
                                            onClick={() => updateConfig('accentColor', color as any)}
                                            className={`w-10 h-10 rounded-lg transition-transform ${config.accentColor === color
                                                    ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900 scale-110'
                                                    : 'opacity-70 hover:opacity-100'
                                                }`}
                                            style={{
                                                backgroundColor:
                                                    color === 'cyan' ? '#22d3ee' :
                                                        color === 'blue' ? '#3b82f6' :
                                                            color === 'purple' ? '#a855f7' :
                                                                color === 'emerald' ? '#10b981' :
                                                                    '#f59e0b',
                                            }}
                                        />
                                    ))}
                                </div>
                            </OptionGroup>
                        </div>
                    )}

                    {/* Layout Tab */}
                    {activeTab === 'layout' && (
                        <div className="space-y-6">
                            <OptionGroup label="Margins">
                                <RadioGroup
                                    options={[
                                        { value: 'narrow', label: 'Narrow (0.5in)' },
                                        { value: 'normal', label: 'Normal (1in)' },
                                        { value: 'wide', label: 'Wide (1.5in)' },
                                    ]}
                                    value={config.marginSize}
                                    onChange={(v) => updateConfig('marginSize', v as any)}
                                />
                            </OptionGroup>

                            <OptionGroup label="Header Style">
                                <RadioGroup
                                    options={[
                                        { value: 'minimal', label: 'Minimal (Title only)' },
                                        { value: 'standard', label: 'Standard (Title + Date)' },
                                        { value: 'detailed', label: 'Detailed (Full header)' },
                                    ]}
                                    value={config.headerStyle}
                                    onChange={(v) => updateConfig('headerStyle', v as any)}
                                />
                            </OptionGroup>
                        </div>
                    )}

                    {/* Content Tab */}
                    {activeTab === 'content' && (
                        <div className="space-y-4">
                            <ToggleOption
                                label="Include Header"
                                checked={config.includeHeader}
                                onChange={(v) => updateConfig('includeHeader', v)}
                            />
                            <ToggleOption
                                label="Include Footer"
                                checked={config.includeFooter}
                                onChange={(v) => updateConfig('includeFooter', v)}
                            />
                            <ToggleOption
                                label="Include Page Numbers"
                                checked={config.includePageNumbers}
                                onChange={(v) => updateConfig('includePageNumbers', v)}
                            />
                            <ToggleOption
                                label="Include Table of Contents"
                                checked={config.includeTOC}
                                onChange={(v) => updateConfig('includeTOC', v)}
                            />
                            <ToggleOption
                                label="Include Diagrams"
                                checked={config.includeDiagrams}
                                onChange={(v) => updateConfig('includeDiagrams', v)}
                            />
                        </div>
                    )}
                </div>

                {/* Footer - Export Buttons */}
                <div className="shrink-0 px-6 py-4 border-t border-cyan-900/20 flex items-center justify-between bg-black/20">
                    <span className="text-xs text-gray-500">Choose export format</span>
                    <div className="flex gap-3">
                        <button
                            onClick={() => handleExport('html')}
                            className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2 text-sm"
                        >
                            <FileText className="w-4 h-4" />
                            HTML
                        </button>
                        <button
                            onClick={() => handleExport('docx')}
                            className="px-4 py-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30 transition-colors flex items-center gap-2 text-sm"
                        >
                            <Download className="w-4 h-4" />
                            DOCX
                        </button>
                        <button
                            onClick={() => handleExport('pdf')}
                            className="px-4 py-2 bg-cyan-600/20 text-cyan-400 rounded-lg hover:bg-cyan-600/30 transition-colors flex items-center gap-2 text-sm"
                        >
                            <Printer className="w-4 h-4" />
                            PDF
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ============================================
// HELPER COMPONENTS
// ============================================

const OptionGroup: React.FC<{ label: string; children: React.ReactNode }> = ({
    label,
    children,
}) => (
    <div>
        <label className="block text-sm font-medium text-gray-400 mb-3">{label}</label>
        {children}
    </div>
);

interface RadioOption {
    value: string;
    label: string;
}

const RadioGroup: React.FC<{
    options: RadioOption[];
    value: string;
    onChange: (value: string) => void;
}> = ({ options, value, onChange }) => (
    <div className="flex flex-wrap gap-2">
        {options.map((option) => (
            <button
                key={option.value}
                onClick={() => onChange(option.value)}
                className={`px-4 py-2 rounded-lg text-sm transition-colors ${value === option.value
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                        : 'bg-gray-800/50 text-gray-400 border border-gray-700/50 hover:bg-gray-800 hover:text-white'
                    }`}
            >
                {option.label}
            </button>
        ))}
    </div>
);

const ToggleOption: React.FC<{
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}> = ({ label, checked, onChange }) => (
    <label className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg cursor-pointer hover:bg-gray-800/50 transition-colors">
        <span className="text-sm text-gray-300">{label}</span>
        <div
            onClick={() => onChange(!checked)}
            className={`w-10 h-6 rounded-full transition-colors relative ${checked ? 'bg-cyan-500' : 'bg-gray-700'
                }`}
        >
            <div
                className={`absolute w-4 h-4 bg-white rounded-full top-1 transition-transform ${checked ? 'translate-x-5' : 'translate-x-1'
                    }`}
            />
        </div>
    </label>
);

export default ExportStyleModal;
