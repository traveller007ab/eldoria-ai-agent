import { PromptMemoryService } from './PromptMemoryService';

export interface ActiveContext {
    activeFileName?: string;
    activeFileContent?: string;
    recentFiles: string[];
    academicProject?: {
        id: string;
        title: string;
        mapSummary?: string;
    };
    environment?: {
        os: string;
        isElectron: boolean;
    };
}

class ContextService {
    private static instance: ContextService;
    private context: ActiveContext = {
        recentFiles: []
    };

    private constructor() {
        this.context.environment = {
            os: (navigator as any).platform || 'unknown',
            isElectron: !!(window as any).ipcRenderer || !!(window as any).process?.versions?.electron
        };
    }

    public static getInstance(): ContextService {
        if (!ContextService.instance) {
            ContextService.instance = new ContextService();
        }
        return ContextService.instance;
    }

    public updateContext(update: Partial<ActiveContext>) {
        this.context = { ...this.context, ...update };
        if (update.activeFileName && !this.context.recentFiles.includes(update.activeFileName)) {
            this.context.recentFiles = [update.activeFileName, ...this.context.recentFiles].slice(0, 5);
        }
    }

    public getContext(): ActiveContext {
        return this.context;
    }


    // 2. Nexus / Graph Context (Push-based)
    private nexusState: any = null;

    public updateNexusState(state: any) {
        this.nexusState = state;
    }

    public getSystemContextString(): string {
        const ctx = this.context;
        let contextBuffer = "\n\n--- AMBIENT WORKSPACE CONTEXT ---\n";

        // 1. Core IDE Context
        if (ctx.activeFileName) {
            contextBuffer += `ACTIVE FILE: ${ctx.activeFileName}\n`;
        }

        if (ctx.academicProject) {
            contextBuffer += `ACTIVE ACADEMIC PROJECT: ${ctx.academicProject.title} (${ctx.academicProject.id})\n`;
        }

        // 2. Nexus / Graph Context (Push via updateNexusState)
        if (this.nexusState) {
            const { nodeCount, edgeCount, viewMode, selectedNodes } = this.nexusState;

            contextBuffer += `CURRENT VIEW MODE: ${viewMode ? viewMode.toUpperCase() : 'UNKNOWN'}\n`;
            contextBuffer += `KNOWLEDGE GRAPH STATUS: ${nodeCount} Nodes, ${edgeCount} Connections\n`;

            if (selectedNodes && selectedNodes.length > 0) {
                const selectedSummary = selectedNodes.map((n: any) =>
                    `- [${n.type.toUpperCase()}] "${n.label}": ${n.preview}`
                ).join('\n');
                contextBuffer += `SELECTED NODES:\n${selectedSummary}\n`;
            }
        }

        if (ctx.recentFiles.length > 0) {
            contextBuffer += `RECENTLY VISITED: ${ctx.recentFiles.join(', ')}\n`;
        }

        const promptHistory = PromptMemoryService.getMemorySummary();
        if (promptHistory !== "No recent prompt usage.") {
            contextBuffer += `RECENT PROMPT USAGE: ${promptHistory}\n`;
        }

        contextBuffer += "--- END CONTEXT ---\n";
        return contextBuffer;
    }
}

export const contextService = ContextService.getInstance();
