import React, { useRef, useEffect } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { TerminalIcon, TrashIcon, MaximizeIcon, MinimizeIcon, ChevronRightIcon, ZapIcon as Zap } from './Icons';
import { bridgeClient } from '../services/bridgeClient';

export const TerminalPanel: React.FC = () => {
    const {
        activeCanvas,
        clearTerminal,
        runManualCommand,
        toggleTerminalExpansion,
        toggleTerminalMinimized,
        isTerminalExpanded,
        isTerminalMinimized,
        isTerminalExecuting
    } = useWorkspace();
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
        <div
            className={`
                ${isTerminalExpanded ? 'h-[60vh]' : isTerminalMinimized ? 'h-11' : 'h-64'} 
                w-full relative group flex flex-col transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) shrink-0
                overflow-hidden bg-[#0a0a0f]/80 backdrop-blur-xl border-t border-cyan-500/20
                ${isTerminalMinimized ? 'hover:bg-cyan-500/5' : ''}
            `}
        >
            <div
                className={`
                    flex justify-between items-center px-4 h-11 shrink-0
                    ${isTerminalMinimized ? '' : 'bg-cyan-950/40 border-b border-cyan-500/10'}
                    transition-colors duration-500
                `}
            >
                <div
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={isTerminalMinimized ? toggleTerminalMinimized : undefined}
                >
                    <TerminalIcon className={`w-4 h-4 transition-all duration-500 ${isTerminalExecuting ? 'text-amber-400 animate-pulse' : isTerminalMinimized ? 'text-cyan-400' : 'text-cyan-300'}`} />
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300/80">Strategic Terminal</span>
                    {(isTerminalMinimized && (activeCanvas?.terminal_output || isTerminalExecuting)) && (
                        <div className={`w-1.5 h-1.5 rounded-full ${isTerminalExecuting ? 'bg-amber-400 animate-ping shadow-[0_0_8px_rgba(251,191,36,0.8)]' : 'bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]'}`} />
                    )}
                </div>
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={toggleTerminalMinimized}
                        className="p-1.5 text-cyan-500/40 hover:text-cyan-300 hover:bg-white/5 rounded-md transition-all"
                        title={isTerminalMinimized ? "Expand Terminal" : "Minimize Terminal"}
                    >
                        <ChevronRightIcon className={`w-3.5 h-3.5 transform transition-transform duration-500 ${isTerminalMinimized ? '' : 'rotate-90'}`} />
                    </button>
                    {!isTerminalMinimized && (
                        <>
                            <button
                                onClick={toggleTerminalExpansion}
                                className="p-1.5 text-cyan-500/40 hover:text-cyan-300 hover:bg-white/5 rounded-md transition-all"
                                title={isTerminalExpanded ? "Restore Terminal" : "Maximize Terminal"}
                            >
                                {isTerminalExpanded ? <MinimizeIcon className="w-3.5 h-3.5" /> : <MaximizeIcon className="w-3.5 h-3.5" />}
                            </button>
                            <button
                                onClick={clearTerminal}
                                className="p-1.5 text-cyan-500/40 hover:text-red-400 hover:bg-red-500/5 rounded-md transition-all"
                                title="Clear Terminal"
                            >
                                <TrashIcon className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => bridgeClient.restartBridge()}
                                className="p-1.5 text-cyan-500/40 hover:text-cyan-300 hover:bg-cyan-500/5 rounded-md transition-all"
                                title="Restart Neural Bridge"
                            >
                                <Zap className="w-3.5 h-3.5" />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {!isTerminalMinimized && (
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
            )}

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
