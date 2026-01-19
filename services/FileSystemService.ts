// import { FileSystemNode } from '../types'; // Removed to avoid error

export interface FileSystemNode {
    id: string;
    name: string;
    type: 'file' | 'directory';
    path: string;
    content?: string;
    children?: FileSystemNode[];
}

const BRIDGE_URL = 'http://localhost:8000';

export const FileSystemService = {
    /**
     * List files in the project directory.
     * Uses the bridge's optimized os.walk indexer.
     */
    async listFiles(root: string = '.'): Promise<FileSystemNode[]> {
        try {
            const res = await fetch(`${BRIDGE_URL}/codebase/index?root=${encodeURIComponent(root)}`);
            if (!res.ok) throw new Error(`Bridge Error: ${res.statusText}`);
            const data = await res.json();

            // Map bridge format to FileSystemNode
            return data.files.map((f: any) => ({
                id: f.path,
                name: f.name,
                type: 'file', // bridge currently only returns files from index code
                path: f.path, // Absolute path
                content: ''
            }));
        } catch (error) {
            console.error('FileSystemService.listFiles failed:', error);
            return [];
        }
    },

    /**
     * Read file content from disk.
     */
    async readFile(path: string): Promise<string> {
        const res = await fetch(`${BRIDGE_URL}/fs/read`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path })
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || 'Failed to read file');
        }

        const data = await res.json();
        return data.content;
    },

    /**
     * Write file content to disk.
     */
    async writeFile(path: string, content: string): Promise<boolean> {
        const res = await fetch(`${BRIDGE_URL}/fs/write`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path, content })
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || 'Failed to write file');
        }

        return true;
    }
        return true;
},

    /**
     * Get the URL for serving a file directly (e.g. for iframes/images).
     */
    getFileUrl(path: string): string {
        return `${BRIDGE_URL}/fs/serve?path=${encodeURIComponent(path)}`;
    }
};
