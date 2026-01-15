import React, { useState, useCallback } from 'react';
import { 
    Calculator, 
    TrendingUp, 
    AlertTriangle, 
    CheckCircle, 
    Play, 
    Settings,
    BarChart3,
    Activity,
    Zap,
    Target
} from 'lucide-react';
import type { MonteCarloConfig, MonteCarloResult, SensitivityResult, OptimizationResult } from '../../services/integration/SimulationIntegration';
import { runMonteCarlo, runSensitivityAnalysis, runOptimization } from '../../services/integration/ApiIntegrations';

interface SimulationOptimizationPanelProps {
    blueprint: Record<string, unknown> | null;
    onApplyOptimization?: (componentId: string, params: Record<string, number>) => void;
}

export const SimulationOptimizationPanel: React.FC<SimulationOptimizationPanelProps> = ({
    blueprint,
    onApplyOptimization
}) => {
    const [activeTab, setActiveTab] = useState<'montecarlo' | 'sensitivity' | 'optimization'>('montecarlo');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<MonteCarloResult | SensitivityResult | OptimizationResult | null>(null);

    const [mcConfig, setMcConfig] = useState<MonteCarloConfig>({
        samples: 1000,
        parameters: [],
        outputs: ['efficiency'],
        distributionType: 'normal'
    });

    const [sensitivityInputs, setSensitivityInputs] = useState<Array<{
        parameter: string;
        label: string;
        baseValue: number;
        perturbation: number;
    }>>([]);

    const [optRequest, setOptRequest] = useState({
        componentId: '',
        componentType: 'pump' as const,
        requirements: {
            flow: 100,
            head: 50
        }
    });

    const handleMonteCarlo = useCallback(async () => {
        if (!blueprint) return;
        setIsLoading(true);
        try {
            const res = await runMonteCarlo({ blueprint, config: mcConfig });
            setResult(res);
        } catch (err) {
            console.error('Monte Carlo failed:', err);
        } finally {
            setIsLoading(false);
        }
    }, [blueprint, mcConfig]);

    const handleSensitivity = useCallback(async () => {
        if (!blueprint) return;
        setIsLoading(true);
        try {
            const res = await runSensitivityAnalysis({
                blueprint,
                inputs: sensitivityInputs,
                outputMetrics: [{ key: 'efficiency', label: 'System Efficiency' }]
            });
            setResult(res);
        } catch (err) {
            console.error('Sensitivity analysis failed:', err);
        } finally {
            setIsLoading(false);
        }
    }, [blueprint, sensitivityInputs]);

    const handleOptimization = useCallback(async () => {
        if (!blueprint || !optRequest.componentId) return;
        setIsLoading(true);
        try {
            const res = await runOptimization({
                blueprint,
                componentId: optRequest.componentId,
                componentType: optRequest.componentType,
                requirements: optRequest.requirements
            });
            setResult(res);
        } catch (err) {
            console.error('Optimization failed:', err);
        } finally {
            setIsLoading(false);
        }
    }, [blueprint, optRequest]);

    if (!blueprint) {
        return (
            <div className="simulation-panel">
                <div className="simulation-panel__empty">
                    <Calculator size={48} />
                    <p>Load a blueprint to access simulation tools</p>
                </div>
            </div>
        );
    }

    return (
        <div className="simulation-panel">
            <div className="simulation-panel__header">
                <h3>Simulation & Optimization</h3>
                <div className="simulation-panel__tabs">
                    <button 
                        className={`tab ${activeTab === 'montecarlo' ? 'active' : ''}`}
                        onClick={() => setActiveTab('montecarlo')}
                    >
                        <Activity size={16} />
                        Monte Carlo
                    </button>
                    <button 
                        className={`tab ${activeTab === 'sensitivity' ? 'active' : ''}`}
                        onClick={() => setActiveTab('sensitivity')}
                    >
                        <TrendingUp size={16} />
                        Sensitivity
                    </button>
                    <button 
                        className={`tab ${activeTab === 'optimization' ? 'active' : ''}`}
                        onClick={() => setActiveTab('optimization')}
                    >
                        <Target size={16} />
                        Optimization
                    </button>
                </div>
            </div>

            <div className="simulation-panel__content">
                {activeTab === 'montecarlo' && (
                    <div className="monte-carlo-section">
                        <h4>Uncertainty Analysis</h4>
                        <div className="form-group">
                            <label>Number of Samples</label>
                            <input
                                type="number"
                                value={mcConfig.samples}
                                onChange={(e) => setMcConfig({ ...mcConfig, samples: parseInt(e.target.value) })}
                                min={100}
                                max={10000}
                            />
                        </div>
                        <div className="form-group">
                            <label>Distribution Type</label>
                            <select
                                value={mcConfig.distributionType}
                                onChange={(e) => setMcConfig({ ...mcConfig, distributionType: e.target.value as any })}
                            >
                                <option value="normal">Normal (Gaussian)</option>
                                <option value="uniform">Uniform</option>
                                <option value="lognormal">Log-Normal</option>
                                <option value="triangular">Triangular</option>
                            </select>
                        </div>
                        <button 
                            className="btn-primary"
                            onClick={handleMonteCarlo}
                            disabled={isLoading}
                        >
                            <Play size={16} />
                            {isLoading ? 'Running...' : 'Run Analysis'}
                        </button>
                    </div>
                )}

                {activeTab === 'sensitivity' && (
                    <div className="sensitivity-section">
                        <h4>Parameter Sensitivity Analysis</h4>
                        <div className="parameters-list">
                            {sensitivityInputs.map((input, idx) => (
                                <div key={idx} className="parameter-item">
                                    <input
                                        placeholder="Parameter name"
                                        value={input.parameter}
                                        onChange={(e) => {
                                            const updated = [...sensitivityInputs];
                                            updated[idx].parameter = e.target.value;
                                            setSensitivityInputs(updated);
                                        }}
                                    />
                                    <input
                                        type="number"
                                        placeholder="Base value"
                                        value={input.baseValue}
                                        onChange={(e) => {
                                            const updated = [...sensitivityInputs];
                                            updated[idx].baseValue = parseFloat(e.target.value);
                                            setSensitivityInputs(updated);
                                        }}
                                    />
                                    <input
                                        type="number"
                                        step={0.1}
                                        placeholder="Perturbation %"
                                        value={input.perturbation}
                                        onChange={(e) => {
                                            const updated = [...sensitivityInputs];
                                            updated[idx].perturbation = parseFloat(e.target.value);
                                            setSensitivityInputs(updated);
                                        }}
                                    />
                                    <button 
                                        className="btn-icon"
                                        onClick={() => setSensitivityInputs(sensitivityInputs.filter((_, i) => i !== idx))}
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                        <button 
                            className="btn-secondary"
                            onClick={() => setSensitivityInputs([...sensitivityInputs, { parameter: '', label: '', baseValue: 0, perturbation: 0.1 }])}
                        >
                            Add Parameter
                        </button>
                        <button 
                            className="btn-primary"
                            onClick={handleSensitivity}
                            disabled={isLoading || sensitivityInputs.length === 0}
                        >
                            <Play size={16} />
                            {isLoading ? 'Analyzing...' : 'Analyze Sensitivity'}
                        </button>
                    </div>
                )}

                {activeTab === 'optimization' && (
                    <div className="optimization-section">
                        <h4>Component Optimization</h4>
                        <div className="form-group">
                            <label>Component ID</label>
                            <input
                                placeholder="e.g., Pump_1"
                                value={optRequest.componentId}
                                onChange={(e) => setOptRequest({ ...optRequest, componentId: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label>Component Type</label>
                            <select
                                value={optRequest.componentType}
                                onChange={(e) => setOptRequest({ ...optRequest, componentType: e.target.value as any })}
                            >
                                <option value="pump">Pump</option>
                                <option value="heat_exchanger">Heat Exchanger</option>
                                <option value="motor">Motor</option>
                                <option value="pipe">Pipe</option>
                            </select>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Required Flow (m³/h)</label>
                                <input
                                    type="number"
                                    value={optRequest.requirements.flow}
                                    onChange={(e) => setOptRequest({
                                        ...optRequest, 
                                        requirements: { ...optRequest.requirements, flow: parseFloat(e.target.value) }
                                    })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Required Head (m)</label>
                                <input
                                    type="number"
                                    value={optRequest.requirements.head}
                                    onChange={(e) => setOptRequest({
                                        ...optRequest, 
                                        requirements: { ...optRequest.requirements, head: parseFloat(e.target.value) }
                                    })}
                                />
                            </div>
                        </div>
                        <button 
                            className="btn-primary"
                            onClick={handleOptimization}
                            disabled={isLoading || !optRequest.componentId}
                        >
                            <Zap size={16} />
                            {isLoading ? 'Optimizing...' : 'Optimize Component'}
                        </button>
                    </div>
                )}

                {result && (
                    <div className="results-section">
                        <h4>Results</h4>
                        <pre className="results-json">
                            {JSON.stringify(result, null, 2)}
                        </pre>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SimulationOptimizationPanel;
