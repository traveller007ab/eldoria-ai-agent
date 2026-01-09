import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Activity, X, Trash2, ChevronUp, ChevronDown, Filter } from 'lucide-react';
import { useMechStore } from '../../stores/useMechStore';

export const BottomPanel: React.FC = () => {
    const { logs, clearLogs, isBottomPanelOpen, toggleBottomPanel } = useMechStore();
    const [activeTab, setActiveTab] = useState<'console' | 'debug'>('console');
    const [filterType, setFilterType] = useState<'all' | 'info' | 'error' | 'warning' | 'success'>('all');
    const scrollRef = useRef<HTMLDivElement>(null);
    const [showFilterMenu, setShowFilterMenu] = useState(false);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs, activeTab, isBottomPanelOpen, filterType]);

    const filteredLogs = logs.filter(log => filterType === 'all' || log.type === filterType);

    if (!isBottomPanelOpen) {
        return (
            <div className="h-8 bg-slate-900 border-t border-slate-700 flex items-center px-4 justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={toggleBottomPanel}
                        className="flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
                    >
                        <Terminal className="w-3.5 h-3.5" />
                        Console
                    </button>
                </div>
                <button onClick={toggleBottomPanel} className="text-slate-500 hover:text-white">
                    <ChevronUp className="w-4 h-4" />
                </button>
            </div>
        );
    }

    return (
        <div className="h-48 bg-slate-900 border-t border-slate-700 flex flex-col shrink-0 transition-all duration-300">
            {/* Header */}
            <div className="h-9 flex items-center justify-between px-4 bg-slate-800/50 border-b border-slate-700">
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setActiveTab('console')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-t-md transition-colors flex items-center gap-2 ${
                            activeTab === 'console' 
                                ? 'text-blue-400 bg-slate-800 border-t border-x border-slate-700 -mb-px' 
                                : 'text-slate-500 hover:text-slate-300'
                        }`}
                    >
                        <Terminal className="w-3.5 h-3.5" />
                        Console
                        <span className="bg-slate-700 text-slate-300 px-1.5 rounded-full text-[10px]">{logs.length}</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('debug')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-t-md transition-colors flex items-center gap-2 ${
                            activeTab === 'debug' 
                                ? 'text-purple-400 bg-slate-800 border-t border-x border-slate-700 -mb-px' 
                                : 'text-slate-500 hover:text-slate-300'
                        }`}
                    >
                        <Activity className="w-3.5 h-3.5" />
                        Genesis Debug
                    </button>
                </div>
                
                <div className="flex items-center gap-2">
                    {activeTab === 'console' && (
                        <div className="relative">
                            <button 
                                onClick={() => setShowFilterMenu(!showFilterMenu)}
                                className={`p-1 hover:bg-slate-700 rounded transition-colors flex items-center gap-1 ${filterType !== 'all' ? 'text-blue-400' : 'text-slate-500'}`}
                                title="Filter Logs"
                            >
                                <Filter className="w-3.5 h-3.5" />
                                {filterType !== 'all' && <span className="text-[10px] uppercase font-bold">{filterType}</span>}
                            </button>
                            
                            {showFilterMenu && (
                                <div className="absolute right-0 top-full mt-1 w-32 bg-slate-800 border border-slate-700 rounded shadow-xl z-50 flex flex-col py-1">
                                    {(['all', 'info', 'success', 'warning', 'error'] as const).map(type => (
                                        <button
                                            key={type}
                                            onClick={() => { setFilterType(type); setShowFilterMenu(false); }}
                                            className={`px-3 py-1.5 text-left text-xs hover:bg-slate-700 capitalize flex items-center justify-between ${filterType === type ? 'text-blue-400 bg-slate-700/50' : 'text-slate-300'}`}
                                        >
                                            {type}
                                            {filterType === type && <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    <button onClick={clearLogs} className="p-1 text-slate-500 hover:text-red-400" title="Clear Console">
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="w-px h-4 bg-slate-700 mx-1" />
                    <button onClick={toggleBottomPanel} className="p-1 text-slate-500 hover:text-white">
                        <ChevronDown className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-2 font-mono text-xs" ref={scrollRef}>
                {activeTab === 'console' && (
                    <div className="space-y-1">
                        {filteredLogs.length === 0 && (
                            <div className="text-slate-600 italic px-2">
                                {logs.length === 0 ? "No logs to display. Run a simulation to see output." : `No ${filterType} logs found.`}
                            </div>
                        )}
                        {filteredLogs.map((log, i) => (
                            <div key={i} className="flex gap-2 hover:bg-slate-800/50 rounded px-2 py-0.5">
                                <span className="text-slate-600 shrink-0 select-none">
                                    {log.timestamp.toLocaleTimeString()}
                                </span>
                                <span className={`
                                    ${log.type === 'error' ? 'text-red-400' : ''}
                                    ${log.type === 'warning' ? 'text-yellow-400' : ''}
                                    ${log.type === 'success' ? 'text-emerald-400' : ''}
                                    ${log.type === 'info' ? 'text-slate-300' : ''}
                                `}>
                                    {log.message}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
                {activeTab === 'debug' && (
                    <div className="text-slate-400 px-2">
                        {/* Placeholder for future detailed debug info */}
                        <div className="text-purple-400 font-bold mb-2">Genesis Engine Status: Ready</div>
                        <div>Waiting for simulation data...</div>
                    </div>
                )}
            </div>
        </div>
    );
};
