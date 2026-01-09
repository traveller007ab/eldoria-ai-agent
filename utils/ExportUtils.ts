import { MechSimulationResult, MechBlueprint } from '../types';

export interface ExportOptions {
    includeVariables: boolean;
    includeMetrics: boolean;
    includeDiagnostics: boolean;
    includeTimeSeries: boolean;
    includeDynamicMetrics: boolean;
    format: 'csv' | 'json';
}

export function exportSimulationResult(
    result: MechSimulationResult,
    blueprint: MechBlueprint,
    options: ExportOptions
): string {
    const lines: string[] = [];

    lines.push('# Eldoria SAF Simulation Results');
    lines.push(`# Blueprint: ${blueprint.name}`);
    lines.push(`# Date: ${new Date().toISOString()}`);
    lines.push(`# Duration: ${result.duration}ms`);
    lines.push(`# Status: ${result.status}`);
    lines.push('');

    if (options.includeMetrics && result.metrics) {
        lines.push('## System Metrics');
        lines.push('Metric,Value,Unit');
        lines.push(`Power Input,${result.metrics.totalPowerInput},kW`);
        lines.push(`Power Output,${result.metrics.totalPowerOutput},kW`);
        lines.push(`Efficiency,${result.metrics.overallEfficiency},%`);
        lines.push(`Total Flow Rate,${result.metrics.totalFlowRate},m³/h`);
        if (result.metrics.totalHeatInput > 0) {
            lines.push(`Heat Input,${result.metrics.totalHeatInput},kW`);
            lines.push(`Heat Output,${result.metrics.totalHeatOutput},kW`);
        }
        lines.push('');

        // Add Dynamic Metrics based on model category
        if (result.dynamicMetrics?.summary?.modelCategory) {
            lines.push(`## ${result.dynamicMetrics.summary.modelCategory.replace(/_/g, ' ')} Metrics`);
            lines.push('Metric,Value,Unit');

            const category = result.dynamicMetrics.summary.modelCategory;

            if (category.includes('engine') || category.includes('vehicle')) {
                const engine = result.dynamicMetrics.engine || {};
                if (engine.torque) lines.push(`Torque,${engine.torque},Nm`);
                if (engine.rpm) lines.push(`RPM,${engine.rpm},rpm`);
                if (engine.brakePower) lines.push(`Brake Power,${engine.brakePower},kW`);
                if (engine.horsepower) lines.push(`Horsepower,${engine.horsepower},HP`);
                if (engine.bmep) lines.push(`BMEP,${engine.bmep},bar`);
                if (engine.bsfc) lines.push(`BSFC,${engine.bsfc},g/kWh`);
                if (engine.thermalEfficiency) lines.push(`Thermal Efficiency,${engine.thermalEfficiency},%`);
                if (engine.airFuelRatio) lines.push(`Air-Fuel Ratio,${engine.airFuelRatio},`);
            }

            if (category.includes('pump') || category.includes('hydraulic')) {
                const pump = result.dynamicMetrics.pump || {};
                const hydraulic = result.dynamicMetrics.hydraulic || {};
                if (pump.head) lines.push(`Pump Head,${pump.head},m`);
                if (pump.efficiency) lines.push(`Pump Efficiency,${pump.efficiency},%`);
                if (pump.npsha) lines.push(`NPSHa,${pump.npsha},m`);
                if (pump.npshr) lines.push(`NPSHr,${pump.npshr},m`);
                if (pump.flowCoefficient) lines.push(`Flow Coefficient,${pump.flowCoefficient},`);
                if (hydraulic.pipeVelocity) lines.push(`Max Velocity,${hydraulic.pipeVelocity},m/s`);
                if (hydraulic.reynoldsNumber) lines.push(`Reynolds Number,${hydraulic.reynoldsNumber},`);
            }

            if (category.includes('thermal') || category.includes('hvac')) {
                const thermal = result.dynamicMetrics.thermal || {};
                if (thermal.cop) lines.push(`COP,${thermal.cop},`);
                if (thermal.eer) lines.push(`EER,${thermal.eer},`);
                if (thermal.lmtd) lines.push(`LMTD,${thermal.lmtd},°C`);
                if (thermal.uaValue) lines.push(`UA Value,${thermal.uaValue},kW/K`);
                if (thermal.effectiveness) lines.push(`Effectiveness,${thermal.effectiveness * 100},%`);
            }

            if (category.includes('vehicle')) {
                const vehicle = result.dynamicMetrics.vehicle || {};
                if (vehicle.topSpeed) lines.push(`Top Speed,${vehicle.topSpeed},km/h`);
                if (vehicle.accelerationTime) lines.push(`0-100 km/h,${vehicle.accelerationTime},s`);
                if (vehicle.wheelHorsepower) lines.push(`Wheel HP,${vehicle.wheelHorsepower},HP`);
                if (vehicle.powerToWeightRatio) lines.push(`Power/Weight Ratio,${vehicle.powerToWeightRatio},kW/kg`);
                if (vehicle.range) lines.push(`Range,${vehicle.range},km`);
            }

            if (category.includes('process')) {
                const process = result.dynamicMetrics.process || {};
                if (process.throughput) lines.push(`Throughput,${process.throughput},m³/h`);
                if (process.residenceTime) lines.push(`Residence Time,${process.residenceTime},s`);
                if (process.yield) lines.push(`Yield,${process.yield * 100},%`);
                if (process.conversion) lines.push(`Conversion,${process.conversion * 100},%`);
            }

            lines.push('');
        }
    }

    if (options.includeDiagnostics && result.diagnostics) {
        lines.push('## Diagnostics');
        lines.push('Check,Status,Details');
        lines.push(`Convergence,${result.diagnostics.convergence.converged ? 'Converged' : 'Failed'},${result.diagnostics.convergence.iterations} iterations`);
        lines.push(`Mass Balance,${result.diagnostics.massBalance.status},${result.diagnostics.massBalance.imbalancePercent}% imbalance`);
        lines.push(`Energy Balance,${result.diagnostics.energyBalance.status},${result.diagnostics.energyBalance.imbalancePercent}% imbalance`);
        lines.push('');

        if (result.issues && result.issues.length > 0) {
            lines.push('## Issues');
            lines.push('Component,Severity,Message');
            result.issues.forEach(issue => {
                const componentName = blueprint.components.find(c => c.id === issue.componentId)?.name || issue.componentId;
                lines.push(`"${componentName}",${issue.severity},"${issue.message}"`);
            });
            lines.push('');
        }
    }

    if (options.includeVariables && result.variables) {
        lines.push('## Calculated Variables');
        lines.push('Variable,Value');
        Object.entries(result.variables).forEach(([key, value]) => {
            lines.push(`"${key}",${typeof value === 'number' ? value.toExponential(6) : value}`);
        });
        lines.push('');
    }

    return lines.join('\n');
}

export function exportSimulationResultJSON(
    result: MechSimulationResult,
    blueprint: MechBlueprint
): string {
    const exportData = {
        metadata: {
            blueprintName: blueprint.name,
            blueprintId: blueprint.id,
            exportDate: new Date().toISOString(),
            duration: result.duration,
            status: result.status,
            configuration: result.configuration
        },
        metrics: result.metrics,
        dynamicMetrics: result.dynamicMetrics,
        diagnostics: result.diagnostics,
        variables: result.variables,
        issues: result.issues
    };

    return JSON.stringify(exportData, null, 2);
}

export function downloadExport(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

export function exportToCSV(
    result: MechSimulationResult,
    blueprint: MechBlueprint,
    filename?: string
): void {
    const content = exportSimulationResult(result, blueprint, {
        includeVariables: true,
        includeMetrics: true,
        includeDiagnostics: true,
        includeTimeSeries: false,
        includeDynamicMetrics: true,
        format: 'csv'
    });
    const defaultFilename = filename || `${blueprint.name.replace(/\s+/g, '_')}_results.csv`;
    downloadExport(content, defaultFilename, 'text/csv;charset=utf-8;');
}

export function exportToJSON(
    result: MechSimulationResult,
    blueprint: MechBlueprint,
    filename?: string
): void {
    const content = exportSimulationResultJSON(result, blueprint);
    const defaultFilename = filename || `${blueprint.name.replace(/\s+/g, '_')}_results.json`;
    downloadExport(content, defaultFilename, 'application/json;charset=utf-8;');
}

export function exportDynamicMetricsJSON(
    result: MechSimulationResult,
    blueprint: MechBlueprint,
    filename?: string
): void {
    if (!result.dynamicMetrics) {
        console.warn('No dynamic metrics to export');
        return;
    }

    const exportData = {
        metadata: {
            blueprintName: blueprint.name,
            blueprintId: blueprint.id,
            exportDate: new Date().toISOString(),
            modelCategory: result.dynamicMetrics.summary?.modelCategory || 'general'
        },
        dynamicMetrics: result.dynamicMetrics
    };

    const content = JSON.stringify(exportData, null, 2);
    const defaultFilename = filename || `${blueprint.name.replace(/\s+/g, '_')}_dynamic_metrics.json`;
    downloadExport(content, defaultFilename, 'application/json;charset=utf-8;');
}
