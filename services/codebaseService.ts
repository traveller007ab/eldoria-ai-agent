
import { bridgeClient } from './bridgeClient';
import { runCommand } from './workspaceService';

const STORAGE_KEY = 'eldoria_project_path';

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
    private static activeProjectPath: string = localStorage.getItem(STORAGE_KEY) || ".";

    /**
     * Set the active project path for indexing.
     */
    static setProjectPath(path: string): void {
        this.activeProjectPath = path;
        localStorage.setItem(STORAGE_KEY, path);
        console.log(`[CODEBASE] Active project path set to: ${path}`);
    }

    /**
     * Get the active project path.
     */
    static getProjectPath(): string {
        return this.activeProjectPath;
    }

    /**
     * Scans the codebase to build a structural overview with metadata.
     */
    static async indexProject(path?: string): Promise<string> {
        try {
            const targetPath = path || this.activeProjectPath;
            console.log(`[CODEBASE] Indexing project structure via Python Bridge... Path: ${targetPath}`);

            const result = await bridgeClient.indexProject(targetPath);

            if (result.files.length === 0) {
                console.warn("[CODEBASE] Received empty index from bridge.");
            }

            this.structuredIndex = result.files.map((item: any) => ({
                name: item.name,
                path: item.path,
                type: 'file',
                metadata: {
                    lastModified: item.lastModified,
                    size: item.size,
                    relevance: this.calculateRelevance(item.path)
                }
            }));

            this.projectIndex = this.structuredIndex.map(node => `${node.path} (${node.metadata?.lastModified})`).join('\n');
            return this.projectIndex;
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
