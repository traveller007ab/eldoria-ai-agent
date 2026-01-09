/**
 * Export Service
 * Handles conversion between internal MechBlueprint and portable SAFBlueprintV1
 */

import { v4 as uuidv4 } from 'uuid';
import type { MechBlueprint, MechComponent, Connection } from '../../types.ts';
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
            sourceId: c.source,
            targetId: c.target,
            sourceHandle: c.sourceHandle,
            targetHandle: c.targetHandle,
            type: c.type
        }));

        return {
            schemaVersion: '1.0',
            metadata: {
                id: blueprint.id || uuidv4(),
                name: blueprint.project_name || 'Untitled Project',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
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
            parameterValues: c.parameters
        }));

        // Hydrate connections
        const connections: Connection[] = data.connections.map(c => ({
            id: c.id,
            source: c.sourceId,
            target: c.targetId,
            sourceHandle: c.sourceHandle,
            targetHandle: c.targetHandle,
            type: c.type
        }));

        return {
            id: data.metadata.id,
            project_name: data.metadata.name,
            updated_at: data.metadata.updatedAt,
            components,
            connections
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
