import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { FileCode, FileJson, FileType, Terminal, Cpu, Braces } from 'lucide-react';
import { useNexusStore, type CodexNodeData } from '../../../stores/useNexusStore';

export const CodexNode: React.FC<NodeProps<CodexNodeData>> = memo(({ id, data, selected }) => {
    const enterRoom = useNexusStore((state) => state.enterRoom);
    const langConfig = {
        python: { icon: FileCode, color: 'text-amber-400', bg: 'bg-amber-500/10', glow: 'shadow-amber-500/20' },
        typescript: { icon: FileCode, color: 'text-blue-400', bg: 'bg-blue-500/10', glow: 'shadow-blue-500/20' },
        javascript: { icon: FileType, color: 'text-yellow-400', bg: 'bg-yellow-500/10', glow: 'shadow-yellow-500/20' },
    };

    const config = langConfig[data.language] || langConfig.python;
    const Icon = config.icon;

    // Get a few lines of code for preview
    const codePreview = data.codeContent
        ? data.codeContent.split('\n').filter(l => l.trim()).slice(0, 3).join('\n')
        : null;

    return (
        <div
            onDoubleClick={(e) => {
                e.stopPropagation();
                enterRoom(id, 'codex_lab');
            }}
            className={`
            min-w-[280px] bg-slate-900/80 backdrop-blur-md border rounded-lg overflow-hidden transition-all duration-200 group
            cursor-pointer
            ${selected
                    ? `border-blue-500/40 ring-1 ring-blue-500/10`
                    : 'border-white/10 hover:border-white/15'
                }
        `}>
            {/* Connection Handles */}
            <Handle
                type="target"
                position={Position.Left}
                className="!w-2 !h-2 !bg-slate-500 !border-slate-700 !-left-1"
            />
            <Handle
                type="source"
                position={Position.Right}
                className="!w-2 !h-2 !bg-slate-500 !border-slate-700 !-right-1"
            />

            {/* Header Area */}
            <div className="px-4 py-3 bg-white/5 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2.5 truncate">
                    <div className={`p-1.5 rounded-lg ${config.bg}`}>
                        <Icon className={`w-4 h-4 ${config.color}`} />
                    </div>
                    <div>
                        <span className="text-[10px] font-black text-white/90 truncate uppercase tracking-[0.15em] block leading-none">
                            {data.filename}
                        </span>
                        <span className="text-[8px] text-slate-500 font-mono mt-1 block uppercase">codex_module_v1.0</span>
                    </div>
                </div>
                {data.isDirty && (
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,1)] animate-pulse" />
                )}
            </div>

            {/* Content Preview / Code Snippet */}
            <div className="p-4 relative">
                <div className="flex items-center gap-2 mb-3">
                    <Cpu className="w-3 h-3 text-slate-500" />
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Logic Preview</span>
                </div>

                <div className="bg-slate-950/40 rounded-xl p-3 border border-white/5 font-mono text-[10px] leading-relaxed text-blue-100/40 group-hover:text-blue-100/60 transition-colors relative overflow-hidden">
                    {codePreview ? (
                        <pre className="whitespace-pre-wrap">{codePreview}</pre>
                    ) : (
                        <div className="space-y-2 py-1">
                            <div className="h-1.5 w-full bg-white/5 rounded-full" />
                            <div className="h-1.5 w-3/4 bg-white/5 rounded-full" />
                            <div className="h-1.5 w-5/6 bg-white/5 rounded-full" />
                        </div>
                    )}

                    {/* Glossy overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent pointer-events-none" />
                </div>

                <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-slate-500">
                        <Braces className="w-3 h-3" />
                        <span className="text-[9px] font-black uppercase tracking-widest">{data.language}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="h-1 w-12 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full w-2/3 bg-blue-500/40" />
                        </div>
                        <span className="text-[8px] font-mono text-slate-600 uppercase">Optimization: 68%</span>
                    </div>
                </div>
            </div>

            {/* Interactive Indication */}
            <div className="px-4 py-2 border-t border-white/5 bg-blue-500/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[8px] font-black text-blue-400 uppercase tracking-[0.2em] animate-pulse">
                    Double Click to Open Lab
                </span>
            </div>
        </div>
    );
});

CodexNode.displayName = 'CodexNode';
export default CodexNode;
