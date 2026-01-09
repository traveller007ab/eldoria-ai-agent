import React, { useState } from 'react';
import { MaterialRegistry, FluidProperties } from '../../services/physics/MaterialRegistry';
import { X, Plus, Trash2, AlertCircle } from 'lucide-react';

interface CustomFluidDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onFluidCreated: (fluidId: string) => void;
    editFluidId?: string;
}

export const CustomFluidDialog: React.FC<CustomFluidDialogProps> = ({
    isOpen,
    onClose,
    onFluidCreated,
    editFluidId
}) => {
    const registry = MaterialRegistry.getInstance();
    const isEditing = editFluidId && registry.isCustomFluid(editFluidId);

    const [formData, setFormData] = useState<Omit<FluidProperties, 'id' | 'isCustom'>>(() => {
        if (isEditing) {
            const existing = registry.getFluid(editFluidId);
            return {
                name: existing.name,
                density: existing.density,
                viscosity: existing.viscosity,
                specificHeat: existing.specificHeat,
                bulkModulus: existing.bulkModulus,
                gamma: existing.gamma,
                type: existing.type,
                tags: existing.tags || []
            };
        }
        return {
            name: 'Custom Fluid',
            density: 1000,
            viscosity: 0.001,
            specificHeat: 4.18,
            bulkModulus: 2.0e9,
            gamma: 1.4,
            type: 'liquid',
            tags: []
        };
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    function validateForm(): boolean {
        const newErrors: Record<string, string> = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Name is required';
        }

        if (formData.density <= 0) {
            newErrors.density = 'Density must be positive';
        }

        if (formData.viscosity <= 0) {
            newErrors.viscosity = 'Viscosity must be positive';
        }

        if (formData.specificHeat <= 0) {
            newErrors.specificHeat = 'Specific heat must be positive';
        }

        if (formData.bulkModulus <= 0) {
            newErrors.bulkModulus = 'Bulk modulus must be positive';
        }

        if (formData.type === 'gas' && (!formData.gamma || formData.gamma <= 1)) {
            newErrors.gamma = 'Gamma must be greater than 1 for gases';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        if (!validateForm()) return;

        if (isEditing) {
            registry.updateCustomFluid(editFluidId, formData);
            onFluidCreated(editFluidId);
        } else {
            const newFluidId = registry.registerCustomFluid(formData);
            onFluidCreated(newFluidId);
        }
        onClose();
    };

    const handleDelete = () => {
        if (isEditing && confirm('Are you sure you want to delete this custom fluid?')) {
            registry.removeCustomFluid(editFluidId);
            onClose();
        }
    };

    const toggleTag = (tag: string) => {
        setFormData(prev => ({
            ...prev,
            tags: prev.tags?.includes(tag)
                ? prev.tags.filter(t => t !== tag)
                : [...(prev.tags || []), tag]
        }));
    };

    if (!isOpen) return null;

    const availableTags = ['combustible', 'coolant', 'lubricant', 'fuel', 'corrosive', 'volatile', 'cryogenic', 'pneumatic', 'gas', 'dirty', 'viscous', 'antifreeze'];

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white">
                        {isEditing ? 'Edit Custom Fluid' : 'Create Custom Fluid'}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 max-h-[60vh] overflow-y-auto space-y-4 custom-scrollbar">
                    {/* Name */}
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">
                            Fluid Name
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            className={`w-full bg-slate-900 border rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 ${errors.name ? 'border-red-500' : 'border-slate-700'}`}
                            placeholder="e.g., Custom Oil Blend"
                        />
                        {errors.name && (
                            <p className="text-red-500 text-xs mt-1">{errors.name}</p>
                        )}
                    </div>

                    {/* Type */}
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">
                            Fluid Type
                        </label>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, type: 'liquid' }))}
                                className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-colors ${
                                    formData.type === 'liquid'
                                        ? 'bg-cyan-600 text-white'
                                        : 'bg-slate-900 text-slate-400 hover:text-white'
                                }`}
                            >
                                Liquid
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, type: 'gas' }))}
                                className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-colors ${
                                    formData.type === 'gas'
                                        ? 'bg-orange-600 text-white'
                                        : 'bg-slate-900 text-slate-400 hover:text-white'
                                }`}
                            >
                                Gas
                            </button>
                        </div>
                    </div>

                    {/* Physical Properties */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">
                                Density (kg/m³)
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                min="0.001"
                                value={formData.density}
                                onChange={(e) => setFormData(prev => ({ ...prev, density: parseFloat(e.target.value) || 0 }))}
                                className={`w-full bg-slate-900 border rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 ${errors.density ? 'border-red-500' : 'border-slate-700'}`}
                            />
                            {errors.density && (
                                <p className="text-red-500 text-xs mt-1">{errors.density}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">
                                Viscosity (Pa·s)
                            </label>
                            <input
                                type="number"
                                step="0.0001"
                                min="0.0000001"
                                value={formData.viscosity}
                                onChange={(e) => setFormData(prev => ({ ...prev, viscosity: parseFloat(e.target.value) || 0 }))}
                                className={`w-full bg-slate-900 border rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 ${errors.viscosity ? 'border-red-500' : 'border-slate-700'}`}
                            />
                            {errors.viscosity && (
                                <p className="text-red-500 text-xs mt-1">{errors.viscosity}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">
                                Specific Heat (kJ/kg·K)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0.001"
                                value={formData.specificHeat}
                                onChange={(e) => setFormData(prev => ({ ...prev, specificHeat: parseFloat(e.target.value) || 0 }))}
                                className={`w-full bg-slate-900 border rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 ${errors.specificHeat ? 'border-red-500' : 'border-slate-700'}`}
                            />
                            {errors.specificHeat && (
                                <p className="text-red-500 text-xs mt-1">{errors.specificHeat}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">
                                Bulk Modulus (Pa)
                            </label>
                            <input
                                type="number"
                                step="1e6"
                                min="1"
                                value={formData.bulkModulus}
                                onChange={(e) => setFormData(prev => ({ ...prev, bulkModulus: parseFloat(e.target.value) || 1 }))}
                                className={`w-full bg-slate-900 border rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 ${errors.bulkModulus ? 'border-red-500' : 'border-slate-700'}`}
                            />
                            {errors.bulkModulus && (
                                <p className="text-red-500 text-xs mt-1">{errors.bulkModulus}</p>
                            )}
                        </div>
                    </div>

                    {/* Gamma (for gases) */}
                    {formData.type === 'gas' && (
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">
                                Ratio of Specific Heats (γ = Cp/Cv)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="1.01"
                                max="2.0"
                                value={formData.gamma || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, gamma: parseFloat(e.target.value) }))}
                                className={`w-full bg-slate-900 border rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 ${errors.gamma ? 'border-red-500' : 'border-slate-700'}`}
                                placeholder="1.4 for air"
                            />
                            {errors.gamma && (
                                <p className="text-red-500 text-xs mt-1">{errors.gamma}</p>
                            )}
                        </div>
                    )}

                    {/* Tags */}
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-2">
                            Tags
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {availableTags.map(tag => (
                                <button
                                    key={tag}
                                    type="button"
                                    onClick={() => toggleTag(tag)}
                                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                        formData.tags?.includes(tag)
                                            ? 'bg-cyan-600 text-white'
                                            : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-700'
                                    }`}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Info Box */}
                    <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5" />
                            <p className="text-xs text-blue-200">
                                Custom fluids are saved locally and will persist across sessions. Use them to define proprietary fluid formulations or rare substances.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-700 flex items-center justify-between">
                    {isEditing && (
                        <button
                            onClick={handleDelete}
                            className="flex items-center gap-1 px-3 py-2 text-red-400 hover:text-red-300 text-sm"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete
                        </button>
                    )}
                    <div className="flex gap-2 ml-auto">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-slate-400 hover:text-white text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            className="flex items-center gap-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-sm font-medium"
                        >
                            <Plus className="w-4 h-4" />
                            {isEditing ? 'Save Changes' : 'Create Fluid'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
