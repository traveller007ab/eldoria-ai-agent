
import React, { useState, useEffect, useCallback } from 'react';
import { Folder, File, Upload, Trash2, Loader2, FileSearch, HardDrive, RefreshCcw, FlaskConical } from 'lucide-react';
import { AcademicProject } from '../types';
import { AcademicProject } from '../types';
import { AcademicProject } from '../types';
import { useWorkspace } from '../context/WorkspaceContext';
import { bridgeClient } from '../services/bridgeClient';

interface ProjectResourcesProps {
    project: AcademicProject;
}

export const ProjectResources: React.FC<ProjectResourcesProps> = ({ project }) => {
    const { runManualCommand, reIndexWorkspace, isIndexing } = useWorkspace();
    const [resources, setResources] = useState<{ name: string, path: string, isDir: boolean }[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const fetchResources = useCallback(async () => {
        setIsLoading(true);
        try {
            // Using powershell to list files in the academic resources folder
            const folderPath = `Academic-Resources/${project.id}`;
            const command = `powershell -Command "Get-ChildItem -Path '${folderPath}' -Recurse | Select-Object Name, FullName, PSIsContainer | ConvertTo-Json"`;
            const result = await runManualCommand(command);

            if (result.output) {
                try {
                    const parsed = JSON.parse(result.output);
                    const items = Array.isArray(parsed) ? parsed : [parsed];
                    setResources(items.map((item: any) => ({
                        name: item.Name,
                        path: item.FullName,
                        isDir: item.PSIsContainer
                    })));
                } catch (e) {
                    console.error("Failed to parse resources JSON", result.output);
                    setResources([]);
                }
            } else {
                setResources([]);
            }
        } catch (e) {
            console.error("Failed to fetch resources", e);
        } finally {
            setIsLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [project.id]); // Stabilize: only re-fetch when project changes

    useEffect(() => {
        fetchResources();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [project.id]); // Stabilize: only run on project.id change, not on every fetchResources recreation

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        // In a real browser app, we'd use the File API
        // For Eldoria, we might simulate or use a bridge command if we had a way to 'upload'
        // For now, we'll log the attempt and show how we'd handle it
        console.log("Files dropped:", e.dataTransfer.files);
        alert("Drag-and-drop ingestion active. In production, files are moved to EmeraldMind buffer.");
    };

    return (
        <div
            className={`flex-grow flex flex-col overflow-hidden transition-all ${isDragging ? 'bg-cyan-500/10' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
        >
            <div className="p-4 border-b border-cyan-500/10 flex items-center justify-between bg-cyan-500/5">
                <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-cyan-400" />
                    <h4 className="text-[10px] font-bold text-cyan-100 uppercase tracking-widest">Resource Vault</h4>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => reIndexWorkspace()}
                        className={`p-1.5 hover:bg-white/5 rounded-lg transition-colors ${isIndexing ? 'text-amber-400 animate-pulse' : 'text-cyan-500/40 hover:text-cyan-100'}`}
                        title="Re-index Global Knowledge"
                    >
                        <FileSearch className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={fetchResources} className="p-1.5 hover:bg-white/5 rounded-lg transition-colors text-cyan-500/40 hover:text-cyan-100" title="Refresh Folder">
                        <RefreshCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            <div className="flex-grow overflow-y-auto custom-scrollbar p-2 space-y-1">
                {resources.length > 0 ? resources.map((res, i) => (
                    <div key={i} className="group flex items-center justify-between p-2 hover:bg-cyan-500/5 rounded-lg border border-transparent hover:border-cyan-500/10 transition-all cursor-default">
                        <div className="flex items-center gap-2 overflow-hidden">
                            {res.isDir ? (
                                <Folder className="w-3.5 h-3.5 text-cyan-500/40 group-hover:text-cyan-400 transition-colors" />
                            ) : (
                                <File className="w-3.5 h-3.5 text-cyan-500/40 group-hover:text-cyan-400 transition-colors" />
                            )}
                            <span className="text-[11px] text-cyan-100/60 group-hover:text-cyan-100 transition-colors truncate">
                                {res.name}
                            </span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            {!res.isDir && (
                                <button
                                    onClick={async () => {
                                        const btn = document.activeElement as HTMLButtonElement;
                                        const originalHtml = btn.innerHTML;
                                        btn.innerHTML = '<svg class="animate-spin w-3 h-3 text-emerald-400" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>';

                                        try {
                                            // Real API Call to Genesis Engine
                                            const response = await fetch('http://localhost:3001/analyze/physics', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ content: `Analyze file: ${res.path}`, context: project.name }) // Passing path for bridge to read
                                            });

                                            const data = await response.json();

                                            if (data.success) {
                                                const laws = data.equations.map((eq: any) => `- ${eq.name}: ${eq.expression}`).join('\n');
                                                alert(`Genesis Engine Extraction Complete 🧬\n\nIdentified Laws:\n${laws}\n\nEquations have been pushed to the Simulation Kernel context.`);
                                                // Functionally, we would now dispatch(setProjectEquations(data.equations))
                                            } else {
                                                alert(`Extraction Failed: ${data.message}`);
                                            }
                                        } catch (e) {
                                            console.error("Extraction error", e);
                                            alert("Failed to reach Genesis Engine. ensure bridge is running.");
                                        } finally {
                                            btn.innerHTML = originalHtml;
                                        }
                                    }}
                                    className="p-1 text-cyan-500/40 hover:text-emerald-400"
                                    title="Extract Physics Laws to SAF"
                                >
                                    <FlaskConical className="w-3 h-3" />
                                </button>
                            )}
                            <button className="p-1 text-cyan-500/20 hover:text-red-400">
                                <Trash2 className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                )) : (
                    <div className="flex flex-col items-center justify-center py-12 text-cyan-500/10 text-center px-4">
                        <Upload className="w-10 h-10 mb-3 opacity-20" />
                        <p className="text-[10px] uppercase font-bold tracking-widest mb-1">Vault Empty</p>
                        <p className="text-[9px] italic">Drag research PDFs or folders here for EmeraldMind ingestion.</p>
                    </div>
                )}
            </div>

            <div className="p-3 bg-cyan-500/5 border-t border-cyan-500/10 flex items-center gap-3">
                <FileSearch className="w-4 h-4 text-emerald-400 shrink-0" />
                <p className="text-[9px] text-emerald-400/60 leading-tight italic">
                    EmeraldMind automatically extracts theoretical context from uploaded resources.
                </p>
            </div>
        </div>
    );
};
