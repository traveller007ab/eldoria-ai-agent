import React, { useState, useCallback } from 'react';
import { DeepSAFComponent, SAFParameter, SAFOutput, COMPONENT_STYLES } from './types';
import { Sliders, ChevronDown, ChevronUp, Zap, AlertTriangle, Info } from 'lucide-react';

/**
 * SAFParameterEditor - Real-time parameter editing with sliders and inputs
 * Updates propagate immediately to parent state
 */

interface SAFParameterEditorProps {
    component: DeepSAFComponent;
    onParameterChange: (componentId: string, paramName: string, newValue: number | string) => void;
    /**
     * Optional callback to update the component's custom equations. Equations are
     * provided as an array of raw SymPy/Python expressions or "lhs = rhs" strings.
     */
    onEquationsChange?: (componentId: string, equations: string[]) => void;
    onAddParameter?: (componentId: string, param: { name: string; value: string | number; unit?: string }) => void;
    onClose?: () => void;
}

export const SAFParameterEditor: React.FC<SAFParameterEditorProps> = ({
    component,
    onParameterChange,
    onEquationsChange,
    onAddParameter,
    onClose,
}) => {
    const [expandedSections, setExpandedSections] = useState<string[]>(['parameters', 'outputs']);
    const [newParamName, setNewParamName] = useState('');
    const [newParamValue, setNewParamValue] = useState('');
    const style = COMPONENT_STYLES[component.type];

    const toggleSection = (section: string) => {
        setExpandedSections(prev =>
            prev.includes(section)
                ? prev.filter(s => s !== section)
                : [...prev, section]
        );
    };

    const handleSliderChange = useCallback((paramName: string, value: number) => {
        onParameterChange(component.id, paramName, value);
    }, [component.id, onParameterChange]);

    const handleInputChange = useCallback((paramName: string, value: string) => {
        // Try to parse as number
        const numValue = parseFloat(value);

        // If it's a valid number AND the string representation matches (avoids "1." being parsed as 1 immediately)
        // or if it's empty string (process as 0 or empty)
        if (!isNaN(numValue) && value.trim() === numValue.toString()) {
            onParameterChange(component.id, paramName, numValue);
        } else {
            // Otherwise, treat as formula string
            onParameterChange(component.id, paramName, value);
        }
    }, [component.id, onParameterChange]);

    return (
        <div className="bg-gray-900/95 backdrop-blur-md border border-cyan-900/30 rounded-xl overflow-hidden shadow-2xl">
            {/* Header */}
            <div
                className="px-4 py-3 flex items-center justify-between border-b border-cyan-900/20"
                style={{ backgroundColor: `${style.borderColor}15` }}
            >
                <div className="flex items-center gap-3">
                    <Sliders className="w-5 h-5" style={{ color: style.borderColor }} />
                    <div>
                        <h3 className="font-bold text-white">{component.name}</h3>
                        <span className="text-xs text-gray-500">{component.id}</span>
                    </div>
                </div>
                <span
                    className="text-xs px-2 py-1 rounded-full uppercase font-bold"
                    style={{ backgroundColor: `${style.borderColor}30`, color: style.borderColor }}
                >
                    {component.type}
                </span>
            </div>

            {/* Description */}
            {component.description && (
                <div className="px-4 py-2 border-b border-cyan-900/10 flex items-start gap-2">
                    <Info className="w-4 h-4 text-cyan-500/50 shrink-0 mt-0.5" />
                    <p className="text-xs text-gray-400">{component.description}</p>
                </div>
            )}

            {/* Parameters Section */}
            {component.parameters && component.parameters.length > 0 && (
                <div className="border-b border-cyan-900/10">
                    <button
                        onClick={() => toggleSection('parameters')}
                        className="w-full px-4 py-2 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
                    >
                        <span className="text-sm font-bold text-cyan-400 uppercase tracking-wider">
                            Parameters ({component.parameters.length})
                        </span>
                        {expandedSections.includes('parameters') ? (
                            <ChevronUp className="w-4 h-4 text-gray-500" />
                        ) : (
                            <ChevronDown className="w-4 h-4 text-gray-500" />
                        )}
                    </button>

                    {expandedSections.includes('parameters') && (
                        <div className="px-4 pb-4 space-y-4">
                            {component.parameters.map((param) => (
                                <ParameterSlider
                                    key={param.name}
                                    param={param}
                                    onValueChange={(value) => handleSliderChange(param.name, value)}
                                    onInputChange={(value) => handleInputChange(param.name, value)}
                                />
                            ))}

                            {/* Add Custom Parameter Form */}
                            <div className="pt-3 border-t border-white/5 animate-fade-in">
                                <h4 className="text-[10px] font-bold text-gray-500 uppercase mb-2">Add New Parameter</h4>
                                <div className="flex gap-2 mb-2">
                                    <input
                                        value={newParamName}
                                        onChange={(e) => setNewParamName(e.target.value)}
                                        placeholder="Name"
                                        className="bg-black/40 text-white text-xs px-2 py-1 rounded border border-white/10 flex-1 focus:border-cyan-500/50 outline-none"
                                    />
                                    <input
                                        value={newParamValue}
                                        onChange={(e) => setNewParamValue(e.target.value)}
                                        placeholder="Value"
                                        className="bg-black/40 text-white text-xs px-2 py-1 rounded border border-white/10 w-16 focus:border-cyan-500/50 outline-none"
                                    />
                                </div>
                                <button
                                    onClick={() => {
                                        if (newParamName && newParamValue && onAddParameter) {
                                            const num = parseFloat(newParamValue);
                                            const val = isNaN(num) ? newParamValue : num;
                                            onAddParameter(component.id, { name: newParamName, value: val });
                                            setNewParamName('');
                                            setNewParamValue('');
                                        }
                                    }}
                                    disabled={!newParamName || !newParamValue}
                                    className="w-full bg-white/5 hover:bg-cyan-500/10 text-gray-300 hover:text-cyan-400 text-xs py-1.5 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    + Add
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Outputs Section */}
            {component.outputs && component.outputs.length > 0 && (
                <div className="border-b border-cyan-900/10">
                    <button
                        onClick={() => toggleSection('outputs')}
                        className="w-full px-4 py-2 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
                    >
                        <span className="text-sm font-bold text-emerald-400 uppercase tracking-wider">
                            Outputs ({component.outputs.length})
                        </span>
                        {expandedSections.includes('outputs') ? (
                            <ChevronUp className="w-4 h-4 text-gray-500" />
                        ) : (
                            <ChevronDown className="w-4 h-4 text-gray-500" />
                        )}
                    </button>

                    {expandedSections.includes('outputs') && (
                        <div className="px-4 pb-4 space-y-2">
                            {component.outputs.map((output) => (
                                <OutputDisplay key={output.name} output={output} />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Custom Equations Section (optional) */}
            {onEquationsChange && (
                <div className="border-b border-cyan-900/10">
                    <button
                        onClick={() => toggleSection('equations')}
                        className="w-full px-4 py-2 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
                    >
                        <span className="text-sm font-bold text-amber-400 uppercase tracking-wider">
                            Equations {component.equations && component.equations.length > 0 ? `(${component.equations.length})` : ''}
                        </span>
                        {expandedSections.includes('equations') ? (
                            <ChevronUp className="w-4 h-4 text-gray-500" />
                        ) : (
                            <ChevronDown className="w-4 h-4 text-gray-500" />
                        )}
                    </button>

                    {expandedSections.includes('equations') && (
                        <div className="px-4 pb-4 space-y-2">
                            <p className="text-[11px] text-gray-500">
                                Define custom symbolic equations for this component. Use SymPy syntax and
                                reference connection variables like <code className="text-cyan-400">f1.P</code>,{' '}
                                <code className="text-cyan-400">f1.T</code>, <code className="text-cyan-400">f1.m</code>, and parameters by name.
                            </p>
                            <textarea
                                className="w-full h-32 bg-black/40 border border-amber-900/40 rounded-lg p-2 text-[11px] font-mono text-amber-100 focus:outline-none focus:border-amber-400 resize-none"
                                placeholder="Example:&#10;f2.P = f1.P - k * f1.m**2&#10;f2.T - 600"
                                value={(component.equations || []).join('\n')}
                                onChange={(e) => {
                                    const lines = e.target.value
                                        .split('\n')
                                        .map(l => l.trim())
                                        .filter(l => l.length > 0);
                                    onEquationsChange(component.id, lines);
                                }}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Dependencies */}
            {component.dependencies && component.dependencies.length > 0 && (
                <div className="px-4 py-3 bg-black/20">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Depends on: {component.dependencies.join(', ')}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

/**
 * Individual Parameter Slider with Input
 */
interface ParameterSliderProps {
    param: SAFParameter;
    onValueChange: (value: number) => void;
    onInputChange: (value: string) => void;
}

const ParameterSlider: React.FC<ParameterSliderProps> = ({
    param,
    onValueChange,
    onInputChange,
}) => {
    // Determine if value is a number or formula string
    const isFormula = typeof param.value === 'string' && isNaN(parseFloat(param.value));
    const rawValue = param.value;
    const numValue = typeof param.value === 'number' ? param.value : parseFloat(param.value as string) || 0;

    const min = param.min ?? 0;
    const max = param.max ?? (numValue * 2 || 100);
    const hasRange = param.min !== undefined || param.max !== undefined;

    // Calculate percentage for gradient
    const percentage = ((numValue - min) / (max - min)) * 100;

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <label className="text-sm text-gray-300 font-medium">{param.name}</label>
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={rawValue}
                        onChange={(e) => onInputChange(e.target.value)}
                        className={`w-24 px-2 py-1 bg-black/40 border rounded text-right text-sm font-mono focus:outline-none focus:border-cyan-500 ${isFormula ? 'text-amber-400 border-amber-500/50' : 'text-cyan-400 border-cyan-900/30'}`}
                        placeholder="Value or f(x)"
                    />
                    {param.unit && (
                        <span className="text-xs text-gray-500 w-8">{param.unit}</span>
                    )}
                </div>
            </div>

            {hasRange && !isFormula && (
                <div className="relative">
                    <input
                        type="range"
                        min={min}
                        max={max}
                        value={numValue}
                        onChange={(e) => onValueChange(parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer slider-thumb"
                        style={{
                            background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${percentage}%, #1f2937 ${percentage}%, #1f2937 100%)`,
                        }}
                    />
                    <div className="flex justify-between text-[10px] text-gray-600 mt-1">
                        <span>{min}{param.unit || ''}</span>
                        <span>{max}{param.unit || ''}</span>
                    </div>
                </div>
            )}

            {param.formula && (
                <div className="text-[10px] text-gray-600 italic">
                    Formula: {param.formula}
                </div>
            )}

            {param.description && (
                <div className="text-xs text-gray-500">{param.description}</div>
            )}
        </div>
    );
};

/**
 * Output Display (Read-only calculated values)
 */
interface OutputDisplayProps {
    output: SAFOutput;
}

const OutputDisplay: React.FC<OutputDisplayProps> = ({ output }) => {
    return (
        <div className="flex items-center justify-between p-2 bg-black/20 rounded-lg border border-emerald-900/20">
            <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-500/50" />
                <span className="text-sm text-gray-300">{output.name}</span>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-sm text-emerald-400 font-mono font-bold">
                    {typeof output.value === 'number' ? output.value.toFixed(2) : output.value}
                </span>
                {output.unit && (
                    <span className="text-xs text-gray-500">{output.unit}</span>
                )}
            </div>
        </div>
    );
};

export default SAFParameterEditor;
