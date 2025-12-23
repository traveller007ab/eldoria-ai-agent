import React, { useRef, useEffect } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { TerminalIcon, TrashIcon, MaximizeIcon, MinimizeIcon } from './Icons';

export const TerminalPanel: React.FC = () => {
    const { activeCanvas, clearTerminal, runManualCommand, toggleTerminalExpansion, isTerminalExpanded } = useWorkspace();
    const scrollRef = useRef<HTMLDivElement>(null);
    const [command, setCommand] = React.useState('');

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [activeCanvas?.terminal_output]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (command.trim()) {
            runManualCommand(command.trim());
            setCommand('');
        }
    };

    return (
        <div className={`panel ${isTerminalExpanded ? 'h-[80%]' : 'h-64'} shrink-0 w-full relative group flex flex-col transition-all duration-500 ease-in-out`}>
            <div className="flex justify-between items-center px-4 py-2 bg-cyan-950/40 border-b border-cyan-500/20 backdrop-blur-md">
                <div className="flex items-center gap-2 text-cyan-300">
                    <TerminalIcon className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Strategic Terminal</span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={toggleTerminalExpansion}
                        className="p-1 text-cyan-500/50 hover:text-cyan-300 transition-colors"
                        title={isTerminalExpanded ? "Restore Terminal" : "Maximize Terminal"}
                    >
                        {isTerminalExpanded ? <MinimizeIcon className="w-4 h-4" /> : <MaximizeIcon className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={clearTerminal}
                        className="p-1 text-cyan-500/50 hover:text-red-400 transition-colors"
                        title="Clear Terminal"
                    >
                        <TrashIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div
                ref={scrollRef}
                className="p-4 flex-1 overflow-y-auto custom-scrollbar font-mono text-sm leading-relaxed"
            >
                {activeCanvas?.terminal_output ? (
                    <pre className="text-cyan-400 whitespace-pre-wrap">
                        {activeCanvas.terminal_output}
                    </pre>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-cyan-900 select-none">
                        <TerminalIcon className="w-8 h-8 mb-2 opacity-20" />
                        <span className="text-xs uppercase tracking-widest opacity-30 italic">Terminal Standby...</span>
                    </div>
                )}
            </div>

            <form onSubmit={handleSubmit} className="px-4 py-2 bg-cyan-950/20 border-t border-cyan-500/10 flex items-center gap-2">
                <span className="text-cyan-500 font-bold">$</span>
                <input
                    type="text"
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                    placeholder="Enter strategic command..."
                    className="flex-1 bg-transparent border-none outline-none text-cyan-300 text-sm placeholder:text-cyan-900 font-mono"
                />
            </form>
        </div>
    );
};
