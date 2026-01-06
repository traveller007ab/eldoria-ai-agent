/**
 * Mechanical SAF Lab v2.0 - Export Service
 * Exports blueprints to various formats (JSON, CSV, Modelica)
 */

import { Blueprint, ComponentInstance } from '../types';
import { COMPONENT_CATALOG } from '../components/fluid';
import { EXTENDED_COMPONENT_CATALOG } from '../components/extended';

// ============================================================================
// UTILITIES
// ============================================================================

function getComponentDefinition(definitionId: string) {
  return COMPONENT_CATALOG[definitionId] || EXTENDED_COMPONENT_CATALOG[definitionId];
}

function createComponentMap(blueprint: Blueprint): Map<string, ComponentInstance> {
  const map = new Map<string, ComponentInstance>();
  for (const component of blueprint.components) {
    map.set(component.id, component);
  }
  return map;
}

// ============================================================================
// JSON EXPORT
// ============================================================================

export interface JSONExportOptions {
  includeMetadata: boolean;
  includeParameters: boolean;
  includeResults: boolean;
  prettyPrint: boolean;
}

export function exportToJSON(blueprint: Blueprint, options?: Partial<JSONExportOptions>): string {
  const opts = {
    includeMetadata: true,
    includeParameters: true,
    includeResults: true,
    prettyPrint: true,
    ...options,
  };

  const exportData: any = {
    format: 'mechanical-saf-lab-v2',
    version: '1.0.0',
  };

  if (opts.includeMetadata) {
    exportData.metadata = {
      id: blueprint.id,
      name: blueprint.name,
      description: blueprint.description,
      domain: blueprint.domain,
      version: blueprint.version,
      createdAt: blueprint.createdAt,
      updatedAt: blueprint.updatedAt,
      author: blueprint.author,
    };
  }

  exportData.components = blueprint.components.map(comp => {
    const def = getComponentDefinition(comp.definitionId);
    return {
      id: comp.id,
      name: comp.name,
      definitionId: comp.definitionId,
      definitionName: def?.name || 'Unknown',
      position: comp.position,
      rotation: comp.rotation,
      parameters: opts.includeParameters ? comp.parameterValues : undefined,
    };
  });

  exportData.connections = blueprint.connections.map(conn => ({
    id: conn.id,
    sourceComponentId: conn.sourceComponentId,
    sourcePortId: conn.sourcePortId,
    targetComponentId: conn.targetComponentId,
    targetPortId: conn.targetPortId,
    type: conn.type,
  }));

  return opts.prettyPrint ? JSON.stringify(exportData, null, 2) : JSON.stringify(exportData);
}

export function downloadJSON(blueprint: Blueprint, filename?: string): void {
  const json = exportToJSON(blueprint);
  downloadFile(json, filename || `${blueprint.name.replace(/\s+/g, '_')}.json`, 'application/json');
}

// ============================================================================
// CSV EXPORT
// ============================================================================

export interface CSVExportOptions {
  includeParameters: boolean;
  includeConnections: boolean;
  delimiter: string;
}

export function exportToCSV(blueprint: Blueprint, options?: Partial<CSVExportOptions>): string {
  const opts = {
    includeParameters: true,
    includeConnections: true,
    delimiter: ',',
    ...options,
  };

  const lines: string[] = [];

  // Component header
  lines.push([
    'Component ID',
    'Component Name',
    'Definition ID',
    'Definition Name',
    'Position X',
    'Position Y',
    'Rotation',
    'Parameter Key',
    'Parameter Value',
  ].join(opts.delimiter));

  // Components with parameters
  for (const component of blueprint.components) {
    const def = getComponentDefinition(component.definitionId);
    const paramKeys = Object.keys(component.parameterValues);
    
    if (paramKeys.length === 0) {
      lines.push([
        component.id,
        component.name,
        component.definitionId,
        def?.name || 'Unknown',
        component.position.x.toString(),
        component.position.y.toString(),
        component.rotation.toString(),
        '',
        '',
      ].join(opts.delimiter));
    } else {
      for (const paramKey of paramKeys) {
        lines.push([
          component.id,
          component.name,
          component.definitionId,
          def?.name || 'Unknown',
          component.position.x.toString(),
          component.position.y.toString(),
          component.rotation.toString(),
          paramKey,
          String(component.parameterValues[paramKey]),
        ].join(opts.delimiter));
      }
    }
  }

  // Connections
  if (opts.includeConnections) {
    lines.push(''); // Empty line separator
    lines.push([
      'Connection ID',
      'Source Component',
      'Source Port',
      'Target Component',
      'Target Port',
      'Type',
    ].join(opts.delimiter));

    const componentMap = createComponentMap(blueprint);
    for (const connection of blueprint.connections) {
      const sourceComp = componentMap.get(connection.sourceComponentId);
      const targetComp = componentMap.get(connection.targetComponentId);
      
      lines.push([
        connection.id,
        sourceComp?.name || connection.sourceComponentId,
        connection.sourcePortId,
        targetComp?.name || connection.targetComponentId,
        connection.targetPortId,
        connection.type,
      ].join(opts.delimiter));
    }
  }

  return lines.join('\n');
}

export function downloadCSV(blueprint: Blueprint, filename?: string): void {
  const csv = exportToCSV(blueprint);
  downloadFile(csv, filename || `${blueprint.name.replace(/\s+/g, '_')}.csv`, 'text/csv');
}

// ============================================================================
// MODELICA EXPORT
// ============================================================================

export interface ModelicaExportOptions {
  packageName: string;
  modelName: string;
  includeAnnotations: boolean;
}

export function exportToModelica(blueprint: Blueprint, options?: Partial<ModelicaExportOptions>): string {
  const opts = {
    packageName: 'MechanicalSAFLab',
    modelName: blueprint.name.replace(/\s+/g, ''),
    includeAnnotations: true,
    ...options,
  };

  const lines: string[] = [];

  // Header
  lines.push(`within ${opts.packageName};`);
  lines.push(`model ${opts.modelName}`);
  lines.push(`  "Generated from Mechanical SAF Lab v2.0"`);

  // Import statements
  lines.push('');
  lines.push('  // Fluid system components');
  lines.push('  import SI = Modelica.SIunits;');
  lines.push('  import Modelica.Fluid;');
  lines.push('  import Modelica.Fluid.Sources;');
  lines.push('  import Modelica.Fluid.Components;');

  // Declarations
  lines.push('');
  lines.push('  // Component declarations');

  const componentMap = createComponentMap(blueprint);
  let pumpCount = 0;
  let pipeCount = 0;
  let valveCount = 0;
  let heCount = 0;

  for (const component of blueprint.components) {
    const def = getComponentDefinition(component.definitionId);
    const safeName = component.name.replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '');
    
    switch (component.definitionId) {
      case 'fluid.pump.centrifugal':
        pumpCount++;
        lines.push(`  Modelica.Fluid.Machines.PrescribedPump pump${pumpCount}(
          m_flow_nominal=${component.parameterValues.Q_design || 100},
          head_nominal=${component.parameterValues.H_design || 50},
          eta_nominal=${component.parameterValues.eta_BEP || 0.75});`);
        break;
      case 'fluid.pipe.straight':
        pipeCount++;
        lines.push(`  Modelica.Fluid.Pipes.DynamicPipe pipe${pipeCount}(
          length=${component.parameterValues.L || 10},
          diameter=${(component.parameterValues.D || 50) / 1000});`);
        break;
      case 'fluid.valve.control':
        valveCount++;
        lines.push(`  Modelica.Fluid.Valves.ValveLinear valve${valveCount}(
          m_flow_nominal=100,
          dp_nominal=50000);`);
        break;
      case 'heatTransfer.heatExchanger.shellTube':
        heCount++;
        lines.push(`  // Heat exchanger ${heCount} (Area: ${component.parameterValues.A || 50} m²)`);
        lines.push(`  Modelica.Fluid.HeatExchangers.DynamicShellTube_HE he${heCount}(
          area=${component.parameterValues.A || 50},
          U_nominal=${component.parameterValues.U || 500});`);
        break;
      default:
        lines.push(`  // ${component.name} (${component.definitionId})`);
    }
  }

  // Equations section
  lines.push('');
  lines.push('equation');
  lines.push('  // Connection equations');

  // Generate connection equations
  for (const connection of blueprint.connections) {
    const sourceComp = componentMap.get(connection.sourceComponentId);
    const targetComp = componentMap.get(connection.targetComponentId);
    
    if (sourceComp && targetComp) {
      const sourceName = sourceComp.name.replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '');
      const targetName = targetComp.name.replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '');
      lines.push(`  connect(${sourceName}.${connection.sourcePortId}, ${targetName}.${connection.targetPortId});`);
    }
  }

  // Annotation
  if (opts.includeAnnotations) {
    lines.push('');
    lines.push('  annotation(__ModelicaAssociation(Placement(true)));');
  }

  // End model
  lines.push('end ' + opts.modelName + ';');

  return lines.join('\n');
}

export function downloadModelica(blueprint: Blueprint, filename?: string): void {
  const modelica = exportToModelica(blueprint);
  const ext = filename?.endsWith('.mo') ? filename : `${filename || blueprint.name.replace(/\s+/g, '_')}.mo`;
  downloadFile(modelica, ext, 'text/plain');
}

// ============================================================================
// REPORT EXPORT
// ============================================================================

export interface ReportExportOptions {
  includeParameters: boolean;
  includeEquations: boolean;
  includeDiagnostics: boolean;
}

export function exportToReport(blueprint: Blueprint, options?: Partial<ReportExportOptions>): string {
  const opts = {
    includeParameters: true,
    includeEquations: true,
    includeDiagnostics: true,
    ...options,
  };

  const lines: string[] = [];

  lines.push(`# ${blueprint.name}`);
  lines.push('');
  lines.push(`**Description:** ${blueprint.description}`);
  lines.push(`**Domain:** ${blueprint.domain}`);
  lines.push(`**Version:** ${blueprint.version}`);
  lines.push(`**Created:** ${blueprint.createdAt}`);
  lines.push(`**Author:** ${blueprint.author}`);
  lines.push('');

  lines.push('## Components');
  lines.push('');

  for (const component of blueprint.components) {
    const def = getComponentDefinition(component.definitionId);
    lines.push(`### ${component.name}`);
    lines.push(`- **ID:** ${component.id}`);
    lines.push(`- **Type:** ${def?.name || component.definitionId}`);
    lines.push('');
    
    if (opts.includeParameters && Object.keys(component.parameterValues).length > 0) {
      lines.push('**Parameters:**');
      lines.push('');
      for (const [key, value] of Object.entries(component.parameterValues)) {
        lines.push(`- ${key}: ${value}`);
      }
      lines.push('');
    }
    
    if (opts.includeEquations && def?.equations) {
      lines.push('**Equations:**');
      lines.push('');
      for (const eq of def.equations) {
        lines.push(`- ${eq.name}: \\(${eq.expression}\\)`);
      }
      lines.push('');
    }
  }

  lines.push('## Connections');
  lines.push('');

  const componentMap = createComponentMap(blueprint);
  for (const connection of blueprint.connections) {
    const sourceComp = componentMap.get(connection.sourceComponentId);
    const targetComp = componentMap.get(connection.targetComponentId);
    lines.push(`- ${sourceComp?.name || connection.sourceComponentId}:${connection.sourcePortId} → ${targetComp?.name || connection.targetComponentId}:${connection.targetPortId}`);
  }

  return lines.join('\n');
}

export function downloadReport(blueprint: Blueprint, filename?: string): void {
  const report = exportToReport(blueprint);
  const ext = filename?.endsWith('.md') ? filename : `${filename || blueprint.name.replace(/\s+/g, '_')}.md`;
  downloadFile(report, ext, 'text/markdown');
}

// ============================================================================
// BULK EXPORT
// ============================================================================

export interface BulkExportOptions {
  formats: ('json' | 'csv' | 'modelica' | 'report')[];
  filenamePrefix?: string;
}

export function bulkExport(blueprint: Blueprint, options: BulkExportOptions): void {
  const prefix = options.filenamePrefix || blueprint.name.replace(/\s+/g, '_');
  
  for (const format of options.formats) {
    switch (format) {
      case 'json':
        downloadJSON(blueprint, `${prefix}.json`);
        break;
      case 'csv':
        downloadCSV(blueprint, `${prefix}.csv`);
        break;
      case 'modelica':
        downloadModelica(blueprint, `${prefix}.mo`);
        break;
      case 'report':
        downloadReport(blueprint, `${prefix}_report.md`);
        break;
    }
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================================================
// EXPORT
// ============================================================================

export const ExportService = {
  // Individual exports
  toJSON: exportToJSON,
  toCSV: exportToCSV,
  toModelica: exportToModelica,
  toReport: exportToReport,
  
  // Downloads
  downloadJSON,
  downloadCSV,
  downloadModelica,
  downloadReport,
  
  // Bulk
  bulkExport,
};

export default ExportService;
