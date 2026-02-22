import type { DiagnosticIssue, EnergyPortType, MechBlueprint } from '../../types.ts';
import { ComponentRegistry } from '../ComponentRegistry.ts';

export type ValidationIssueType =
    | 'missing_component'
    | 'missing_port'
    | 'incompatible_domain'
    | 'invalid_direction'
    | 'required_port_disconnected';

export interface ValidationIssue extends DiagnosticIssue {
    type: ValidationIssueType;
    connectionId?: string;
    portId?: string;
}

const ALLOWED_CONNECTION_DOMAINS: Record<string, Array<[EnergyPortType, EnergyPortType]>> = {
    fluid: [['fluid', 'fluid']],
    thermal: [['thermal', 'thermal']],
    mechanical: [['mechanical', 'mechanical']],
    electrical: [['electrical', 'electrical']],
    control: [['signal', 'signal'], ['signal', 'electrical'], ['electrical', 'signal']],
    signal: [['signal', 'signal'], ['signal', 'electrical'], ['electrical', 'signal']]
};

function normalizeConnectionType(type: string | undefined): string {
    return (type || 'fluid').toLowerCase();
}

function allowsDomainPair(
    connectionType: string,
    sourceDomain: EnergyPortType,
    targetDomain: EnergyPortType
): boolean {
    const allowed = ALLOWED_CONNECTION_DOMAINS[normalizeConnectionType(connectionType)];
    if (!allowed) {
        return sourceDomain === targetDomain;
    }
    return allowed.some(([src, dst]) => src === sourceDomain && dst === targetDomain);
}

export function validateConnections(blueprint: MechBlueprint): ValidationIssue[] {
    const registry = ComponentRegistry.getInstance();
    const issues: ValidationIssue[] = [];

    for (const conn of blueprint.connections) {
        const sourceComp = blueprint.components.find(c => c.id === conn.sourceComponentId);
        const targetComp = blueprint.components.find(c => c.id === conn.targetComponentId);

        if (!sourceComp || !targetComp) {
            issues.push({
                id: `validation-missing-component-${conn.id}`,
                type: 'missing_component',
                componentId: 'system',
                connectionId: conn.id,
                severity: 'critical',
                message: `Connection ${conn.id} references a missing component.`,
                ruleId: 'CONNECTION_MISSING_COMPONENT'
            });
            continue;
        }

        const sourceDef = registry.getComponent(sourceComp.componentDefinitionId);
        const targetDef = registry.getComponent(targetComp.componentDefinitionId);
        const sourcePort = sourceDef?.ports.find(p => p.id === conn.sourcePortId);
        const targetPort = targetDef?.ports.find(p => p.id === conn.targetPortId);

        if (!sourcePort || !targetPort) {
            issues.push({
                id: `validation-missing-port-${conn.id}`,
                type: 'missing_port',
                componentId: !sourcePort ? sourceComp.id : targetComp.id,
                connectionId: conn.id,
                severity: 'critical',
                message: `Connection ${conn.id} references a missing port definition.`,
                ruleId: 'CONNECTION_MISSING_PORT'
            });
            continue;
        }

        if (sourcePort.type === 'input' || targetPort.type === 'output') {
            issues.push({
                id: `validation-direction-${conn.id}`,
                type: 'invalid_direction',
                componentId: sourcePort.type === 'input' ? sourceComp.id : targetComp.id,
                connectionId: conn.id,
                severity: 'warning',
                message: `Connection ${conn.id} appears reversed (${sourceComp.name}.${sourcePort.id} -> ${targetComp.name}.${targetPort.id}).`,
                ruleId: 'CONNECTION_INVALID_DIRECTION'
            });
        }

        if (!allowsDomainPair(conn.type, sourcePort.domain, targetPort.domain)) {
            issues.push({
                id: `validation-domain-${conn.id}`,
                type: 'incompatible_domain',
                componentId: sourceComp.id,
                connectionId: conn.id,
                severity: 'critical',
                message: `Incompatible connection (${sourcePort.domain} -> ${targetPort.domain}) between ${sourceComp.name} and ${targetComp.name}.`,
                ruleId: 'CONNECTION_INCOMPATIBLE_DOMAIN'
            });
        }
    }

    for (const comp of blueprint.components) {
        const def = registry.getComponent(comp.componentDefinitionId);
        if (!def) continue;

        for (const port of def.ports.filter(p => p.required)) {
            const hasConnection = blueprint.connections.some(conn => {
                if (port.type === 'output') {
                    return conn.sourceComponentId === comp.id && conn.sourcePortId === port.id;
                }
                if (port.type === 'input') {
                    return conn.targetComponentId === comp.id && conn.targetPortId === port.id;
                }
                return (
                    (conn.sourceComponentId === comp.id && conn.sourcePortId === port.id) ||
                    (conn.targetComponentId === comp.id && conn.targetPortId === port.id)
                );
            });

            if (!hasConnection) {
                issues.push({
                    id: `validation-required-port-${comp.id}-${port.id}`,
                    type: 'required_port_disconnected',
                    componentId: comp.id,
                    portId: port.id,
                    severity: 'warning',
                    message: `${comp.name}.${port.name} is required but not connected.`,
                    ruleId: 'CONNECTION_REQUIRED_PORT_DISCONNECTED'
                });
            }
        }
    }

    return issues;
}
