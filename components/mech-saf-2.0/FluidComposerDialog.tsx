/**
 * Fluid Composer Dialog
 * 
 * Advanced UI for creating and editing molecular fluids with
 * composition-based property calculation. Part of the Living
 * Mathematics Engine.
 */

import React, { useState, useMemo } from 'react';
import {
    X, Plus, Trash2, Beaker, Droplets, Thermometer,
    AlertCircle, CheckCircle, FlaskConical, Fuel
} from 'lucide-react';
import { MolecularFluidService, COMMON_SPECIES } from '../../services/physics/MolecularFluid';
import type { MolecularFluid, ChemicalSpecies } from '../../src/components/saf/mechanical/SemanticComponent';

interface FluidComposerDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onFluidCreated: (fluid: MolecularFluid) => void;
    editFluid?: MolecularFluid;
}

interface CompositionEntry {
    species: ChemicalSpecies;
    fraction: number;
}

const PRESET_FLUIDS = [
    { id: 'water', name: 'Pure Water', create: () => MolecularFluidService.createPureFluid('H2O') },
    { id: 'coolant_50', name: '50% Ethylene Glycol Coolant', create: () => MolecularFluidService.createCoolant(50, 'ethylene') },
    { id: 'coolant_30', name: '30% Propylene Glycol Coolant', create: () => MolecularFluidService.createCoolant(30, 'propylene') },
    { id: 'e10', name: 'E10 Gasoline', create: () => MolecularFluidService.createGasolineBlend(10) },
    { id: 'e85', name: 'E85 Flex Fuel', create: () => MolecularFluidService.createGasolineBlend(85) },
    { id: 'diesel', name: 'Diesel (Dodecane)', create: () => MolecularFluidService.createPureFluid('C12H26') },
    { id: 'methane', name: 'Natural Gas (Methane)', create: () => MolecularFluidService.createPureFluid('CH4') },
    { id: 'r134a', name: 'R-134a Refrigerant', create: () => MolecularFluidService.createPureFluid('R134a') },
];

export const FluidComposerDialog: React.FC<FluidComposerDialogProps> = ({
    isOpen,
    onClose,
    onFluidCreated,
    editFluid
}) => {
    const [name, setName] = useState(editFluid?.name || 'Custom Mixture');
    const [composition, setComposition] = useState<CompositionEntry[]>(() => {
        if (editFluid) {
            return editFluid.composition.map(c => ({
                species: c.species,
                fraction: c.fraction * 100  // Convert to percentage
            }));
        }
        return [{ species: COMMON_SPECIES.H2O, fraction: 100 }];
    });
    const [temperature, setTemperature] = useState(25);  // °C
    const [pressure, setPressure] = useState(101.325);   // kPa
    const [basis, setBasis] = useState<'mass' | 'mole'>('mass');

    // Calculate total and normalize
    const totalFraction = useMemo(() =>
        composition.reduce((sum, c) => sum + c.fraction, 0), [composition]);

    const isValid = Math.abs(totalFraction - 100) < 0.01;

    // Calculate properties in real-time
    const calculatedFluid = useMemo(() => {
        if (!isValid || composition.length === 0) return null;

        try {
            const normalizedComp = composition.map(c => ({
                formula: c.species.formula,
                fraction: c.fraction / 100
            }));

            return MolecularFluidService.createMixture(
                normalizedComp,
                name,
                basis,
                temperature + 273.15,  // Convert to K
                pressure * 1000        // Convert to Pa
            );
        } catch (e) {
            return null;
        }
    }, [composition, name, basis, temperature, pressure, isValid]);

    const freezePoint = useMemo(() => {
        if (!calculatedFluid) return null;
        const fp = MolecularFluidService.estimateFreezePoint(calculatedFluid);
        return fp ? (fp - 273.15).toFixed(1) : null;
    }, [calculatedFluid]);

    const handleAddSpecies = () => {
        // Find a species not already in the composition
        const usedFormulas = composition.map(c => c.species.formula);
        const available = Object.values(COMMON_SPECIES).find(s => !usedFormulas.includes(s.formula));
        if (available) {
            setComposition([...composition, { species: available, fraction: 0 }]);
        }
    };

    const handleRemoveSpecies = (index: number) => {
        if (composition.length > 1) {
            setComposition(composition.filter((_, i) => i !== index));
        }
    };

    const handleSpeciesChange = (index: number, formula: string) => {
        const newComp = [...composition];
        newComp[index].species = COMMON_SPECIES[formula];
        setComposition(newComp);
    };

    const handleFractionChange = (index: number, value: number) => {
        const newComp = [...composition];
        newComp[index].fraction = Math.max(0, Math.min(100, value));
        setComposition(newComp);
    };

    const handlePresetSelect = (preset: typeof PRESET_FLUIDS[0]) => {
        const fluid = preset.create();
        setName(fluid.name);
        setComposition(fluid.composition.map(c => ({
            species: c.species,
            fraction: c.fraction * 100
        })));
    };

    const handleNormalize = () => {
        const total = composition.reduce((sum, c) => sum + c.fraction, 0);
        if (total > 0) {
            setComposition(composition.map(c => ({
                ...c,
                fraction: (c.fraction / total) * 100
            })));
        }
    };

    const handleSubmit = () => {
        if (calculatedFluid) {
            onFluidCreated(calculatedFluid);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-gradient-to-r from-cyan-600/20 to-purple-600/20">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-cyan-500/20 rounded-xl">
                            <FlaskConical className="w-6 h-6 text-cyan-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Fluid Composer</h2>
                            <p className="text-xs text-slate-400">Create composition-based fluids</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 max-h-[60vh] overflow-y-auto space-y-4">
                    {/* Presets */}
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
                            Quick Presets
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {PRESET_FLUIDS.map(preset => (
                                <button
                                    key={preset.id}
                                    onClick={() => handlePresetSelect(preset)}
                                    className="px-3 py-1.5 bg-slate-900 hover:bg-cyan-500/20 border border-slate-700 hover:border-cyan-500/40 rounded-lg text-xs text-slate-300 transition-all"
                                >
                                    {preset.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Name */}
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                            Fluid Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                            placeholder="Custom Coolant Blend"
                        />
                    </div>

                    {/* Composition */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-bold text-slate-400 uppercase">
                                Composition ({basis} fraction)
                            </label>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setBasis('mass')}
                                    className={`px-2 py-1 text-xs rounded ${basis === 'mass' ? 'bg-cyan-500 text-white' : 'bg-slate-700 text-slate-400'}`}
                                >
                                    Mass %
                                </button>
                                <button
                                    onClick={() => setBasis('mole')}
                                    className={`px-2 py-1 text-xs rounded ${basis === 'mole' ? 'bg-cyan-500 text-white' : 'bg-slate-700 text-slate-400'}`}
                                >
                                    Mole %
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            {composition.map((entry, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <select
                                        value={entry.species.formula}
                                        onChange={(e) => handleSpeciesChange(index, e.target.value)}
                                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                                    >
                                        {Object.entries(COMMON_SPECIES).map(([formula, species]) => (
                                            <option key={formula} value={formula}>
                                                {species.name} ({formula})
                                            </option>
                                        ))}
                                    </select>
                                    <input
                                        type="number"
                                        value={entry.fraction}
                                        onChange={(e) => handleFractionChange(index, parseFloat(e.target.value) || 0)}
                                        className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white text-right focus:outline-none focus:border-cyan-500"
                                        min={0}
                                        max={100}
                                        step={1}
                                    />
                                    <span className="text-sm text-slate-400 w-6">%</span>
                                    <button
                                        onClick={() => handleRemoveSpecies(index)}
                                        className="p-2 hover:bg-red-500/20 rounded-lg text-slate-500 hover:text-red-400 transition-colors"
                                        disabled={composition.length <= 1}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center justify-between mt-2">
                            <button
                                onClick={handleAddSpecies}
                                className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300"
                            >
                                <Plus className="w-4 h-4" /> Add Species
                            </button>

                            <div className="flex items-center gap-2">
                                {!isValid && (
                                    <button
                                        onClick={handleNormalize}
                                        className="text-xs text-orange-400 hover:text-orange-300"
                                    >
                                        Normalize to 100%
                                    </button>
                                )}
                                <span className={`text-xs ${isValid ? 'text-green-400' : 'text-orange-400'}`}>
                                    Total: {totalFraction.toFixed(1)}%
                                    {isValid ? ' ✓' : ' ⚠'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Conditions */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                                Temperature (°C)
                            </label>
                            <input
                                type="number"
                                value={temperature}
                                onChange={(e) => setTemperature(parseFloat(e.target.value) || 0)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                                Pressure (kPa)
                            </label>
                            <input
                                type="number"
                                value={pressure}
                                onChange={(e) => setPressure(parseFloat(e.target.value) || 101.325)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                            />
                        </div>
                    </div>

                    {/* Calculated Properties */}
                    {calculatedFluid && (
                        <div className="bg-slate-900/50 border border-cyan-500/30 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <Beaker className="w-4 h-4 text-cyan-400" />
                                <span className="text-xs font-bold text-cyan-300 uppercase">Calculated Properties</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Density:</span>
                                    <span className="text-white font-mono">{calculatedFluid.properties.density.toFixed(1)} kg/m³</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Viscosity:</span>
                                    <span className="text-white font-mono">{(calculatedFluid.properties.viscosity * 1000).toFixed(3)} mPa·s</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Specific Heat:</span>
                                    <span className="text-white font-mono">{calculatedFluid.properties.specificHeat.toFixed(0)} J/(kg·K)</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Thermal Cond.:</span>
                                    <span className="text-white font-mono">{calculatedFluid.properties.thermalConductivity.toFixed(3)} W/(m·K)</span>
                                </div>
                                {freezePoint && (
                                    <div className="flex justify-between col-span-2">
                                        <span className="text-slate-400">Est. Freeze Point:</span>
                                        <span className="text-white font-mono">{freezePoint} °C</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Info Box */}
                    <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-3 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-blue-200">
                            Properties are calculated from molecular composition using mixing rules.
                            For high accuracy, consider using CoolProp or REFPROP databases.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-700 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-400 hover:text-white text-sm"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!calculatedFluid}
                        className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        <CheckCircle className="w-4 h-4" />
                        Create Fluid
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FluidComposerDialog;
