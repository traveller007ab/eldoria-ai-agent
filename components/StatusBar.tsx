
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { DatabaseIcon, EmeraldMindIcon, SAFIcon, TerminalIcon } from './Icons';
import { useWorkspace } from '../context/WorkspaceContext';
import { SAFStatus } from '../types';

type ConnectionStatus = 'connecting' | 'connected' | 'error';
type MemoryStatus = 'idle' | 'searching' | 'saving' | 'error';

const MemoryStatusIndicator: React.FC<{ status: MemoryStatus }> = ({ status }) => {
  const config = {
    idle: { text: '', visible: false, color: '' },
    searching: { text: 'Consulting EmeraldMind...', visible: true, color: 'text-cyan-400/70' },
    saving: { text: 'Committing to memory...', visible: true, color: 'text-cyan-400/70' },
    error: { text: 'Memory Anomaly', visible: true, color: 'text-yellow-500' },
  };
  const current = config[status];
  return (
    <div className={`flex items-center gap-2 transition-opacity duration-300 ${current.visible ? 'opacity-100' : 'opacity-0'}`}>
      <EmeraldMindIcon className={`w-3.5 h-3.5 ${current.color} ${status === 'searching' || status === 'saving' ? 'animate-pulse' : ''}`} />
      <span className={`font-medium ${current.color}`}>{current.text}</span>
    </div>
  );
};

const SAFStatusIndicator: React.FC<{ status: SAFStatus }> = ({ status }) => {
  const config = {
    idle: { text: '', visible: false, color: '', animate: false },
    planning: { text: 'SAF: Planning...', visible: true, color: 'text-cyan-400/70', animate: true },
    thinking: { text: 'SAF: Thinking...', visible: true, color: 'text-cyan-400/70', animate: true },
    executing_tool: { text: 'SAF: Executing tool...', visible: true, color: 'text-cyan-400/70', animate: true },
    responding: { text: 'SAF: Responding...', visible: true, color: 'text-cyan-400/70', animate: true },
  };
  const current = config[status];
  return (
    <div className={`flex items-center gap-2 transition-opacity duration-300 ${current.visible ? 'opacity-100' : 'opacity-0'}`}>
      <SAFIcon className={`w-3.5 h-3.5 ${current.color} ${current.animate ? 'animate-spin' : ''}`} />
      <span className={`font-medium ${current.color}`}>{current.text}</span>
    </div>
  );
}

export const StatusBar: React.FC = () => {
  const { saveStatus, memoryStatus, safStatus, isTerminalVisible, toggleTerminal } = useWorkspace();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');

  useEffect(() => {
    const checkConnection = async () => {
      const { error } = await supabase.from('canvases').select('id').limit(1);
      if (error) {
        setConnectionStatus('error');
      } else {
        setConnectionStatus('connected');
      }
    };
    checkConnection();
  }, []);

  const statusConfig = {
    connecting: { text: 'Establishing Connection...', color: 'text-cyan-400/70', iconClass: 'animate-pulse' },
    connected: { text: 'Workspace Sync | Nominal', color: 'text-cyan-400', iconClass: 'text-glow' },
    error: { text: 'Sync Error | Connection Failed', color: 'text-red-500', iconClass: 'text-glow' },
  };

  const currentStatus = statusConfig[connectionStatus];
  const saveStatusText = saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'All changes saved' : '';

  return (
    <div className="shrink-0 h-8 bg-black/30 backdrop-filter backdrop-blur-sm border-t border-cyan-500/20 flex items-center justify-between px-4 text-xs z-10">
      <div className="flex items-center gap-4">
        <div className={`transition-opacity duration-300 ${saveStatus === 'idle' ? 'opacity-0' : 'opacity-100'}`}>
          <span className={`font-medium ${saveStatus === 'saving' ? 'text-cyan-400/70 animate-pulse' : 'text-cyan-400'}`}>
            {saveStatusText}
          </span>
        </div>
        <MemoryStatusIndicator status={memoryStatus} />
      </div>
      <div className="flex items-center space-x-4">
        <SAFStatusIndicator status={safStatus} />
        <button
          onClick={toggleTerminal}
          className={`flex items-center space-x-2 px-2 py-0.5 rounded transition-colors ${isTerminalVisible ? 'bg-cyan-500/20 text-cyan-300' : 'text-cyan-500/50 hover:bg-cyan-500/10'}`}
          title={isTerminalVisible ? "Hide Terminal" : "Show Terminal"}
        >
          <TerminalIcon className="w-3.5 h-3.5" />
          <span className="font-bold tracking-tighter uppercase">{isTerminalVisible ? 'OVRD' : 'TERM'}</span>
        </button>
        <div className="flex items-center space-x-2 border-l border-cyan-500/10 pl-4">
          <DatabaseIcon className={`w-3.5 h-3.5 ${currentStatus.color} ${currentStatus.iconClass}`} />
          <span className={`font-medium ${currentStatus.color}`}>{currentStatus.text}</span>
        </div>
      </div>
    </div>
  );
};
