/**
 * SAF Blueprint Exchange Schema v1.0
 * 
 * This file defines the strict contract for exporting and importing
 * Mechanical SAF Lab designs. It decouples the saved data format
 * from the internal application state to ensure long-term stability.
 */

export interface SAFBlueprintV1 {
    schemaVersion: '1.0';
    metadata: {
        id: string;
        name: string;
        description?: string;
        author?: string;
        createdAt: string;
        updatedAt: string;
        appVersion?: string;
    };
    components: ExportedComponent[];
    connections: ExportedConnection[];
    settings?: {
        simulationTimeStep?: number;
    };
}

export interface ExportedComponent {
    id: string;
    definitionId: string;
    label: string;
    position: { x: number; y: number };
    parameters: Record<string, number | string | boolean>;
}

export interface ExportedConnection {
    id: string;
    sourceId: string;
    targetId: string;
    sourceHandle: string;
    targetHandle: string;
    type: 'fluid' | 'mechanical' | 'signal' | 'thermal';
}
