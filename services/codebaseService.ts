
import { runCommand } from './workspaceService';

export interface FileMetadata {
    lastModified: string;
    size: number;
    relevance?: number;
}

export interface FileNode {
    name: string;
    path: string;
    type: 'file' | 'directory';
    metadata?: FileMetadata;
    children?: FileNode[];
}

export class CodebaseService {
    private static projectIndex: string = "";
    private static structuredIndex: FileNode[] = [];

    /**
     * Scans the codebase to build a structural overview with metadata.
     */
    static async indexProject(): Promise<string> {
        try {
            console.log("[CODEBASE] Indexing project structure with metadata...");

            // Use powershell friendly command with metadata selection
            const command = "Get-ChildItem -Recurse -File -Exclude node_modules,dist,.git,.next,build | Select-Object FullName, LastWriteTime, Length | ConvertTo-Json";
            const result = await runCommand(command);

            if (result.error && result.error.includes("[FAILED TO CONNECT TO BRIDGE]")) {
                return "Project indexing failed: Bridge not connected.";
            }

            try {
                const rawData = JSON.parse(result.output);
                this.structuredIndex = Array.isArray(rawData) ? rawData.map((item: any) => ({
                    name: item.FullName.split('\\').pop(),
                    path: item.FullName,
                    type: 'file',
                    metadata: {
                        lastModified: item.LastWriteTime,
                        size: item.Length,
                        relevance: this.calculateRelevance(item.FullName)
                    }
                })) : [];

                this.projectIndex = this.structuredIndex.map(node => `${node.path} (${node.metadata?.lastModified})`).join('\n');
                return this.projectIndex;
            } catch (e) {
                console.warn("[CODEBASE] Failed to parse structured JSON, falling back to raw output.");
                this.projectIndex = result.output;
                return result.output;
            }
        } catch (error) {
            console.error("[CODEBASE] Error indexing project:", error);
            return "Error indexing project.";
        }
    }

    private static calculateRelevance(path: string): number {
        // Simple heuristic: newer files or files in key directories are more relevant
        if (path.includes('academic-hub')) return 90;
        if (path.includes('services')) return 80;
        if (path.endsWith('.tsx') || path.endsWith('.ts')) return 70;
        return 50;
    }

    static getProjectIndex(): string {
        return this.projectIndex;
    }

    static getStructuredIndex(): FileNode[] {
        return this.structuredIndex;
    }

    static async readFileContent(filePath: string): Promise<string> {
        try {
            // Use type for Windows/Bridge compatibility to read file contents
            const command = `type "${filePath}"`;
            const result = await runCommand(command);
            return result.output || "";
        } catch (error) {
            console.error(`[CODEBASE] Error reading file ${filePath}:`, error);
            return `Error reading file: ${filePath}`;
        }
    }
}
