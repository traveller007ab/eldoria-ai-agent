/**
 * Explain Tooltip Component
 * 
 * A tooltip that shows the derivation chain for any calculated value.
 * Click any number in the results panel to see exactly how it was calculated.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
    X, ChevronRight, BookOpen, AlertTriangle,
    TrendingUp, TrendingDown, Info, Copy, Check
} from 'lucide-react';
import type { DerivationChain, DerivationStep } from '../../src/components/saf/mechanical/SemanticComponent';

interface ExplainTooltipProps {
    derivation: DerivationChain;
    position: { x: number; y: number };
    onClose: () => void;
}

export const ExplainTooltip: React.FC<ExplainTooltipProps> = ({
    derivation,
    position,
    onClose
}) => {
    const [activeStep, setActiveStep] = useState<number | null>(null);
    const [copied, setCopied] = useState(false);
    const tooltipRef = useRef<HTMLDivElement>(null);

    // Adjust position to stay in viewport
    const [adjustedPosition, setAdjustedPosition] = useState(position);

    useEffect(() => {
        if (tooltipRef.current) {
            const rect = tooltipRef.current.getBoundingClientRect();
            const newPos = { ...position };

            if (rect.right > window.innerWidth - 20) {
                newPos.x = window.innerWidth - rect.width - 20;
            }
            if (rect.bottom > window.innerHeight - 20) {
                newPos.y = window.innerHeight - rect.height - 20;
            }

            setAdjustedPosition(newPos);
        }
    }, [position]);

    const handleCopyEquation = () => {
        const text = derivation.steps.map(s => s.equation.expression).join('\n');
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div
            ref={tooltipRef}
            className="fixed z-[100] bg-slate-800 border border-cyan-500/30 rounded-xl shadow-2xl w-96 overflow-hidden"
            style={{ left: adjustedPosition.x, top: adjustedPosition.y }}
        >
            {/* Header */}
            <div className="p-3 border-b border-slate-700 bg-gradient-to-r from-cyan-900/30 to-purple-900/30">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-cyan-400" />
                        <span className="text-sm font-bold text-white">How was this calculated?</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-white/10 rounded transition-colors"
                    >
                        <X className="w-4 h-4 text-slate-400" />
                    </button>
                </div>

                {/* Result */}
                <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-xs text-slate-400">{derivation.result.name}</span>
                    <span className="text-xl font-mono font-bold text-cyan-300">
                        {derivation.result.value.toPrecision(5)}
                    </span>
                    <span className="text-sm text-slate-400">{derivation.result.unit}</span>
                </div>
            </div>

            {/* Summary */}
            <div className="p-3 border-b border-slate-700/50">
                <p className="text-xs text-slate-300">{derivation.summary}</p>
            </div>

            {/* Steps */}
            <div className="max-h-60 overflow-y-auto p-2">
                {derivation.steps.length === 0 ? (
                    <p className="text-xs text-slate-400 p-2">
                        This is a user-specified input value (not calculated).
                    </p>
                ) : (
                    <div className="space-y-1">
                        {derivation.steps.map((step, index) => (
                            <StepItem
                                key={index}
                                step={step}
                                stepNumber={index + 1}
                                isExpanded={activeStep === index}
                                onToggle={() => setActiveStep(activeStep === index ? null : index)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Sensitivity */}
            {derivation.sensitiveTo && derivation.sensitiveTo.length > 0 && (
                <div className="p-3 border-t border-slate-700/50 bg-slate-900/50">
                    <div className="flex items-center gap-1 mb-2">
                        <TrendingUp className="w-3 h-3 text-orange-400" />
                        <span className="text-xs font-bold text-orange-300">Most Sensitive To</span>
                    </div>
                    <div className="space-y-1">
                        {derivation.sensitiveTo.slice(0, 3).map((s, i) => (
                            <div key={i} className="flex items-center justify-between text-xs">
                                <span className="text-slate-400">{s.parameter}</span>
                                <span className={`font-mono ${s.elasticity > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {s.elasticity > 0 ? '+' : ''}{(s.elasticity * 100).toFixed(1)}%/1%
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Assumptions */}
            {derivation.assumptions && derivation.assumptions.length > 0 && (
                <div className="p-3 border-t border-slate-700/50">
                    <div className="flex items-center gap-1 mb-2">
                        <AlertTriangle className="w-3 h-3 text-amber-400" />
                        <span className="text-xs font-bold text-amber-300">Assumptions</span>
                    </div>
                    <ul className="text-xs text-slate-400 space-y-1">
                        {derivation.assumptions.map((a, i) => (
                            <li key={i} className="flex items-start gap-1">
                                <span className="text-slate-500">•</span>
                                <span>{a}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Footer */}
            <div className="p-2 border-t border-slate-700 flex justify-end">
                <button
                    onClick={handleCopyEquation}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                >
                    {copied ? (
                        <>
                            <Check className="w-3 h-3 text-green-400" />
                            <span className="text-green-400">Copied!</span>
                        </>
                    ) : (
                        <>
                            <Copy className="w-3 h-3" />
                            <span>Copy Equations</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════
// STEP ITEM COMPONENT
// ═══════════════════════════════════════════════════════════════

interface StepItemProps {
    step: DerivationStep;
    stepNumber: number;
    isExpanded: boolean;
    onToggle: () => void;
}

const StepItem: React.FC<StepItemProps> = ({ step, stepNumber, isExpanded, onToggle }) => {
    return (
        <div className="bg-slate-900/50 rounded-lg overflow-hidden">
            {/* Header */}
            <button
                onClick={onToggle}
                className="w-full flex items-center gap-2 p-2 hover:bg-white/5 transition-colors text-left"
            >
                <div className="w-5 h-5 bg-cyan-500/20 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-cyan-400">{stepNumber}</span>
                </div>
                <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-white truncate block">
                        {step.equation.name}
                    </span>
                    <span className="text-xs text-slate-500 font-mono truncate block">
                        {step.equation.expression}
                    </span>
                </div>
                <ChevronRight
                    className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                />
            </button>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="px-2 pb-2 pt-0">
                    {/* Inputs */}
                    <div className="bg-slate-800 rounded p-2 mb-2">
                        <span className="text-xs font-bold text-slate-400">Inputs:</span>
                        <div className="mt-1 space-y-0.5">
                            {step.inputs.map((input, i) => (
                                <div key={i} className="flex items-center justify-between text-xs">
                                    <span className="text-slate-300 font-mono">{input.symbol}</span>
                                    <span className="text-white font-mono">
                                        {input.value.toPrecision(4)} {input.unit}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Output */}
                    <div className="bg-cyan-900/20 border border-cyan-500/30 rounded p-2">
                        <span className="text-xs font-bold text-cyan-400">Result:</span>
                        <div className="flex items-center justify-between mt-1">
                            <span className="text-xs text-cyan-200 font-mono">{step.output.symbol}</span>
                            <span className="text-sm text-white font-mono font-bold">
                                {step.output.value.toPrecision(5)} {step.output.unit}
                            </span>
                        </div>
                    </div>

                    {/* Explanation */}
                    {step.explanation && (
                        <div className="mt-2 flex items-start gap-1">
                            <Info className="w-3 h-3 text-blue-400 shrink-0 mt-0.5" />
                            <p className="text-xs text-blue-200">{step.explanation}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════
// EXPLAINABLE VALUE WRAPPER
// ═══════════════════════════════════════════════════════════════

interface ExplainableValueProps {
    value: number;
    unit: string;
    derivation?: DerivationChain;
    className?: string;
}

export const ExplainableValue: React.FC<ExplainableValueProps> = ({
    value,
    unit,
    derivation,
    className = ''
}) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
    const ref = useRef<HTMLSpanElement>(null);

    const handleClick = (e: React.MouseEvent) => {
        if (!derivation) return;

        const rect = ref.current?.getBoundingClientRect();
        if (rect) {
            setTooltipPos({
                x: Math.min(rect.left, window.innerWidth - 420),
                y: rect.bottom + 8
            });
            setShowTooltip(true);
        }
    };

    return (
        <>
            <span
                ref={ref}
                onClick={handleClick}
                className={`
          ${derivation ? 'cursor-pointer hover:text-cyan-400 hover:underline decoration-dotted' : ''}
          ${className}
        `}
                title={derivation ? 'Click to see how this was calculated' : undefined}
            >
                {value.toPrecision(4)} {unit}
            </span>

            {showTooltip && derivation && (
                <ExplainTooltip
                    derivation={derivation}
                    position={tooltipPos}
                    onClose={() => setShowTooltip(false)}
                />
            )}
        </>
    );
};

export default ExplainTooltip;
