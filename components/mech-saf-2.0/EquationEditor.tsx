/**
 * Equation Editor Component
 * 
 * First-Principles Foundation: Every equation is inspectable and editable.
 * Users can add custom physics, modify existing equations, and see live effects.
 */

import React, { useState, useCallback } from 'react';
import {
    Edit3, Plus, Trash2, Save, X, Play,
    AlertTriangle, CheckCircle2, Info, Atom
} from 'lucide-react';

interface Equation {
    id: string;
    name: string;
    symbol: string;
    latex?: string;
    plain: string;
    description: string;
    category: 'conservation' | 'constitutive' | 'empirical' | 'custom';
    isEditable: boolean;
    isActive: boolean;
    variables: {
        symbol: string;
        name: string;
        unit: string;
    }[];
}

interface EquationEditorProps {
    componentId: string;
    componentName: string;
    equations: Equation[];
    onEquationChange?: (equations: Equation[]) => void;
    onTestEquation?: (equation: Equation) => { valid: boolean; error?: string; result?: number };
}

const PREDEFINED_EQUATIONS: Equation[] = [
    {
        id: 'bernoulli',
        name: "Bernoulli's Equation",
        symbol: 'P + ½ρv² + ρgh = const',
        plain: 'P1 + 0.5 * rho * v1^2 + rho * g * h1 = P2 + 0.5 * rho * v2^2 + rho * g * h2',
        description: 'Conservation of energy for ideal fluid flow',
        category: 'conservation',
        isEditable: false,
        isActive: true,
        variables: [
            { symbol: 'P', name: 'Pressure', unit: 'Pa' },
            { symbol: 'ρ', name: 'Density', unit: 'kg/m³' },
            { symbol: 'v', name: 'Velocity', unit: 'm/s' },
            { symbol: 'h', name: 'Height', unit: 'm' }
        ]
    },
    {
        id: 'darcy_weisbach',
        name: 'Darcy-Weisbach',
        symbol: 'ΔP = f·(L/D)·(ρv²/2)',
        plain: 'deltaP = f * (L / D) * (rho * v^2 / 2)',
        description: 'Pressure drop due to friction in pipes',
        category: 'constitutive',
        isEditable: true,
        isActive: true,
        variables: [
            { symbol: 'ΔP', name: 'Pressure Drop', unit: 'Pa' },
            { symbol: 'f', name: 'Friction Factor', unit: '-' },
            { symbol: 'L', name: 'Pipe Length', unit: 'm' },
            { symbol: 'D', name: 'Pipe Diameter', unit: 'm' }
        ]
    },
    {
        id: 'npsh',
        name: 'NPSH Available',
        symbol: 'NPSHa = (P₀-Pv)/(ρg) + z - hL',
        plain: 'NPSHa = (P0 - Pv) / (rho * g) + z - hL',
        description: 'Net Positive Suction Head available at pump inlet',
        category: 'empirical',
        isEditable: true,
        isActive: true,
        variables: [
            { symbol: 'NPSHa', name: 'NPSH Available', unit: 'm' },
            { symbol: 'P₀', name: 'Static Pressure', unit: 'Pa' },
            { symbol: 'Pv', name: 'Vapor Pressure', unit: 'Pa' },
            { symbol: 'z', name: 'Suction Head', unit: 'm' }
        ]
    }
];

export const EquationEditor: React.FC<EquationEditorProps> = ({
    componentId,
    componentName,
    equations: initialEquations,
    onEquationChange,
    onTestEquation
}) => {
    const [equations, setEquations] = useState<Equation[]>(
        initialEquations.length > 0 ? initialEquations : PREDEFINED_EQUATIONS
    );
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editBuffer, setEditBuffer] = useState<Partial<Equation>>({});
    const [testResult, setTestResult] = useState<{ id: string; valid: boolean; message: string } | null>(null);

    const handleToggleActive = useCallback((id: string) => {
        const updated = equations.map(eq =>
            eq.id === id ? { ...eq, isActive: !eq.isActive } : eq
        );
        setEquations(updated);
        onEquationChange?.(updated);
    }, [equations, onEquationChange]);

    const handleEdit = useCallback((eq: Equation) => {
        setEditingId(eq.id);
        setEditBuffer({ ...eq });
    }, []);

    const handleSaveEdit = useCallback(() => {
        if (!editingId || !editBuffer) return;

        const updated = equations.map(eq =>
            eq.id === editingId ? { ...eq, ...editBuffer } : eq
        );
        setEquations(updated);
        setEditingId(null);
        setEditBuffer({});
        onEquationChange?.(updated);
    }, [editingId, editBuffer, equations, onEquationChange]);

    const handleCancelEdit = useCallback(() => {
        setEditingId(null);
        setEditBuffer({});
    }, []);

    const handleAddCustom = useCallback(() => {
        const newEquation: Equation = {
            id: `custom_${Date.now()}`,
            name: 'Custom Equation',
            symbol: 'y = f(x)',
            plain: 'y = x',
            description: 'Add your custom physics equation',
            category: 'custom',
            isEditable: true,
            isActive: true,
            variables: []
        };
        const updated = [...equations, newEquation];
        setEquations(updated);
        setEditingId(newEquation.id);
        setEditBuffer(newEquation);
        onEquationChange?.(updated);
    }, [equations, onEquationChange]);

    const handleDelete = useCallback((id: string) => {
        const updated = equations.filter(eq => eq.id !== id);
        setEquations(updated);
        onEquationChange?.(updated);
    }, [equations, onEquationChange]);

    const handleTest = useCallback((eq: Equation) => {
        if (onTestEquation) {
            const result = onTestEquation(eq);
            setTestResult({
                id: eq.id,
                valid: result.valid,
                message: result.valid
                    ? `✓ Valid! Result: ${result.result?.toFixed(4)}`
                    : `✗ Error: ${result.error}`
            });
            setTimeout(() => setTestResult(null), 3000);
        }
    }, [onTestEquation]);

    const getCategoryColor = (category: Equation['category']) => {
        switch (category) {
            case 'conservation': return 'text-blue-400 bg-blue-500/10';
            case 'constitutive': return 'text-green-400 bg-green-500/10';
            case 'empirical': return 'text-amber-400 bg-amber-500/10';
            case 'custom': return 'text-purple-400 bg-purple-500/10';
        }
    };

    return (
        <div className="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">
            {/* Header */}
            <div className="p-3 border-b border-slate-700 bg-gradient-to-r from-indigo-900/30 to-purple-900/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg">
                        <Atom className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white">Equation Editor</h3>
                        <p className="text-xs text-slate-400">{componentName}</p>
                    </div>
                </div>
                <button
                    onClick={handleAddCustom}
                    className="flex items-center gap-1.5 px-2 py-1 bg-purple-600 hover:bg-purple-500 text-white text-xs rounded-lg transition-colors"
                >
                    <Plus className="w-3 h-3" />
                    Add Equation
                </button>
            </div>

            {/* Equation List */}
            <div className="divide-y divide-slate-800">
                {equations.map(eq => (
                    <div
                        key={eq.id}
                        className={`p-3 transition-colors ${eq.isActive ? 'bg-slate-800/50' : 'bg-slate-900/80 opacity-60'}`}
                    >
                        {editingId === eq.id ? (
                            // Edit Mode
                            <div className="space-y-3">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={editBuffer.name || ''}
                                        onChange={(e) => setEditBuffer({ ...editBuffer, name: e.target.value })}
                                        placeholder="Equation Name"
                                        className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white"
                                    />
                                    <span className={`px-2 py-1 rounded text-xs ${getCategoryColor(editBuffer.category || 'custom')}`}>
                                        {editBuffer.category}
                                    </span>
                                </div>

                                <div>
                                    <label className="text-xs text-slate-500 mb-1 block">Expression (Plain Text)</label>
                                    <input
                                        type="text"
                                        value={editBuffer.plain || ''}
                                        onChange={(e) => setEditBuffer({ ...editBuffer, plain: e.target.value })}
                                        placeholder="e.g., y = m * x + b"
                                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm font-mono text-cyan-300"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs text-slate-500 mb-1 block">Description</label>
                                    <input
                                        type="text"
                                        value={editBuffer.description || ''}
                                        onChange={(e) => setEditBuffer({ ...editBuffer, description: e.target.value })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-slate-300"
                                    />
                                </div>

                                <div className="flex justify-end gap-2">
                                    <button
                                        onClick={handleCancelEdit}
                                        className="px-2 py-1 text-slate-400 hover:text-white text-xs rounded transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSaveEdit}
                                        className="flex items-center gap-1 px-2 py-1 bg-green-600 hover:bg-green-500 text-white text-xs rounded transition-colors"
                                    >
                                        <Save className="w-3 h-3" />
                                        Save
                                    </button>
                                </div>
                            </div>
                        ) : (
                            // View Mode
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <button
                                            onClick={() => handleToggleActive(eq.id)}
                                            className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${eq.isActive
                                                    ? 'bg-green-600 border-green-500'
                                                    : 'border-slate-600 hover:border-slate-500'
                                                }`}
                                        >
                                            {eq.isActive && <CheckCircle2 className="w-3 h-3 text-white" />}
                                        </button>
                                        <span className="text-sm font-medium text-white">{eq.name}</span>
                                        <span className={`px-1.5 py-0.5 rounded text-xs ${getCategoryColor(eq.category)}`}>
                                            {eq.category}
                                        </span>
                                    </div>

                                    <div className="bg-slate-900/50 border border-slate-800 rounded px-2 py-1 mb-1">
                                        <code className="text-sm font-mono text-cyan-300">{eq.symbol}</code>
                                    </div>

                                    <p className="text-xs text-slate-500">{eq.description}</p>

                                    {testResult?.id === eq.id && (
                                        <div className={`mt-2 text-xs px-2 py-1 rounded ${testResult.valid
                                                ? 'bg-green-500/20 text-green-400'
                                                : 'bg-red-500/20 text-red-400'
                                            }`}>
                                            {testResult.message}
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-1">
                                    {onTestEquation && (
                                        <button
                                            onClick={() => handleTest(eq)}
                                            className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded transition-colors"
                                            title="Test Equation"
                                        >
                                            <Play className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                    {eq.isEditable && (
                                        <>
                                            <button
                                                onClick={() => handleEdit(eq)}
                                                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                                                title="Edit"
                                            >
                                                <Edit3 className="w-3.5 h-3.5" />
                                            </button>
                                            {eq.category === 'custom' && (
                                                <button
                                                    onClick={() => handleDelete(eq.id)}
                                                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Footer */}
            <div className="p-2 bg-slate-900/50 border-t border-slate-800 flex items-center gap-2 text-xs text-slate-500">
                <Info className="w-3 h-3" />
                <span>{equations.filter(e => e.isActive).length} of {equations.length} equations active</span>
            </div>
        </div>
    );
};

export default EquationEditor;
