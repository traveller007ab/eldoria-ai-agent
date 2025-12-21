
import { runCommand } from './workspaceService';

export interface FileNode {
    name: string;
    type: 'file' | 'directory';
    children?: FileNode[];
}

export class CodebaseService {
    private static projectIndex: string = "";

    /**
     * Scans the codebase to build a structural overview.
     */
    static async indexProject(): Promise<string> {
        try {
            console.log("[CODEBASE] Indexing project structure...");

            // Index only the user projects directory, not the app itself
            const command = "dir /s /b";
            const result = await runCommand(command);

            if (result.error && result.error.includes("[FAILED TO CONNECT TO BRIDGE]")) {
                return "Project indexing failed: Bridge not connected.";
            }

            this.projectIndex = result.output;
            return result.output;
        } catch (error) {
            console.error("[CODEBASE] Error indexing project:", error);
            return "Error indexing project.";
        }
    }

    static getProjectIndex(): string {
        return this.projectIndex;
    }
}
