/**
 * Export Service
 * Handles conversion between internal MechBlueprint and portable SAFBlueprintV1
 */

import { v4 as uuidv4 } from 'uuid';
import type { MechBlueprint, MechComponentInstance, MechConnection, MechComponent } from '../../types.ts';
import type { SAFBlueprintV1, ExportedComponent, ExportedConnection } from './schema.ts';

export class ExportService {

    /**
     * Converts an internal runtime blueprint to a portable v1 JSON object.
     * Sanitizes data by removing runtime properties.
     */
    static exportToJSON(blueprint: MechBlueprint): SAFBlueprintV1 {
        const exportedComponents: ExportedComponent[] = blueprint.components.map(c => ({
            id: c.id,
            definitionId: c.componentDefinitionId,
            label: c.name,
            position: c.position,
            parameters: { ...c.parameterValues } // Clone to ensure no ref issues
        }));

        const exportedConnections: ExportedConnection[] = blueprint.connections.map(c => ({
            id: c.id,
            sourceId: c.sourceComponentId,
            targetId: c.targetComponentId,
            sourceHandle: c.sourcePortId,
            targetHandle: c.targetPortId,
            type: (c.type as any) || 'fluid'
        }));

        return {
            schemaVersion: '1.0',
            metadata: {
                id: blueprint.id || uuidv4(),
                name: blueprint.name || 'Untitled Project',
                createdAt: (blueprint.createdAt || new Date()).toISOString(),
                updatedAt: (blueprint.updatedAt || new Date()).toISOString(),
                appVersion: 'SAF-Lab-2.0'
            },
            components: exportedComponents,
            connections: exportedConnections
        };
    }

    /**
     * Parses a JSON string, validates the version, and hydrates into a runtime Blueprint.
     * Throws error if schema version is unsupported.
     */
    static importFromJSON(jsonString: string): MechBlueprint {
        let data: SAFBlueprintV1;
        try {
            data = JSON.parse(jsonString);
        } catch (e) {
            throw new Error('Invalid JSON file format.');
        }

        if (data.schemaVersion !== '1.0') {
            throw new Error(`Unsupported schema version: ${data.schemaVersion}. Only '1.0' is supported.`);
        }

        // Hydrate components
        const components: MechComponent[] = data.components.map(c => ({
            id: c.id,
            name: c.label,
            componentDefinitionId: c.definitionId,
            position: c.position,
            parameterValues: c.parameters,
            rotation: 0,
            isSelected: false,
            groupIds: []
        } as MechComponentInstance));

        // Hydrate connections
        const connections: MechConnection[] = data.connections.map(c => ({
            id: c.id,
            sourceComponentId: c.sourceId,
            targetComponentId: c.targetId,
            sourcePortId: c.sourceHandle,
            targetPortId: c.targetHandle,
            type: c.type,
            isSelected: false
        }));

        return {
            id: data.metadata.id,
            name: data.metadata.name,
            updatedAt: new Date(data.metadata.updatedAt),
            createdAt: new Date(data.metadata.createdAt),
            components,
            connections,
            author: data.metadata.author || 'Anonymous',
            domain: 'industrial',
            version: '1.0',
            tags: []
        };
    }

    /**
     * Trigger a browser download of the blueprint
     */
    static downloadBlueprint(blueprint: MechBlueprint) {
        const data = this.exportToJSON(blueprint);
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `${data.metadata.name.replace(/\s+/g, '_')}_v1.saf.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}
