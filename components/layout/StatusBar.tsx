
import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { DatabaseIcon, EmeraldMindIcon, SAFIcon, TerminalIcon } from '../Icons';
import { useWorkspace } from '../../context/WorkspaceContext';
import { bridgeClient } from '../../services/bridgeClient';
import { CodebaseService } from '../../services/codebaseService';
import { SAFStatus } from '../../types';
import { FolderOpen } from 'lucide-react';

type ConnectionStatus = 'connecting' | 'connected' | 'error';
type MemoryStatus = 'idle' | 'searching' | 'saving' | 'error';

const MemoryStatusIndicator: React.FC<{ status: MemoryStatus }> = ({ status }) => {
  const config = {
    idle: { text: 'EmeraldMind Ready', visible: true, color: 'text-cyan-500/20' },
    searching: { text: 'Consulting EmeraldMind...', visible: true, color: 'text-cyan-400/80' },
    saving: { text: 'Committing to memory...', visible: true, color: 'text-emerald-400/80' },
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
    idle: { text: 'SAF Engine Active', visible: true, color: 'text-cyan-500/20', animate: false },
    planning: { text: 'SAF: Planning Strategy...', visible: true, color: 'text-cyan-400/80', animate: true },
    thinking: { text: 'SAF: Reasoning...', visible: true, color: 'text-cyan-400/80', animate: true },
    executing_tool: { text: 'SAF: Tool Execution...', visible: true, color: 'text-cyan-400/80', animate: true },
    responding: { text: 'SAF: Finalizing...', visible: true, color: 'text-cyan-400/80', animate: true },
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
  const [bridgeStatus, setBridgeStatus] = useState<'connecting' | 'online' | 'offline'>('connecting');
  const [projectPath, setProjectPath] = useState<string>(CodebaseService.getProjectPath());
  const [isIndexing, setIsIndexing] = useState(false);

  useEffect(() => {
    const checkConnections = async () => {
      // 1. Check Supabase (Database)
      try {
        const { error } = await supabase.from('canvases').select('id').limit(1);
        setConnectionStatus(error ? 'error' : 'connected');
      } catch (e) {
        setConnectionStatus('error');
      }

      // 2. Check Terminal Bridge (Centralized)
      const isOnline = await bridgeClient.checkBridgeHealth();
      setBridgeStatus(isOnline ? 'online' : 'offline');
    };

    checkConnections();
    const interval = setInterval(checkConnections, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenProject = async () => {
    const path = await bridgeClient.openFolderDialog();
    if (path) {
      CodebaseService.setProjectPath(path);
      setProjectPath(path);
      setIsIndexing(true);
      await CodebaseService.indexProject(path);
      setIsIndexing(false);
    }
  };

  const statusConfig = {
    connecting: { text: 'Syncing...', color: 'text-cyan-400/50', iconClass: 'animate-pulse' },
    connected: { text: 'Sync Nominal', color: 'text-cyan-400', iconClass: 'shadow-[0_0_8px_rgba(34,211,238,0.4)]' },
    error: { text: 'Sync Offline', color: 'text-red-500', iconClass: 'text-glow' },
  };

  const bridgeConfig = {
    connecting: 'text-cyan-500/30 animate-pulse',
    online: 'text-cyan-400',
    offline: 'text-red-500/60'
  };

  const currentStatus = statusConfig[connectionStatus];
  const saveStatusText = saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'All changes saved' : '';
  const projectName = projectPath === '.' ? 'No Project' : projectPath.split(/[\\/]/).pop() || 'Project';

  return (
    <div className="shrink-0 h-8 bg-black/40 backdrop-filter backdrop-blur-md border-t border-cyan-500/20 flex items-center justify-between px-4 text-[10px] z-10">
      <div className="flex items-center gap-6">
        <div className={`transition-opacity duration-300 ${saveStatus === 'idle' ? 'opacity-0' : 'opacity-100'}`}>
          <span className={`font-bold uppercase tracking-widest ${saveStatus === 'saving' ? 'text-cyan-400/70 animate-pulse' : 'text-cyan-500/60'}`}>
            {saveStatusText}
          </span>
        </div>
        <MemoryStatusIndicator status={memoryStatus} />
      </div>

      <div className="flex items-center space-x-6">
        <SAFStatusIndicator status={safStatus} />

        <div className="flex items-center gap-5 border-l border-cyan-500/10 pl-6 h-4">
          <button
            onClick={handleOpenProject}
            disabled={isIndexing}
            className={`flex items-center gap-2 px-2 py-0.5 rounded transition-all active:scale-95 ${projectPath !== '.' ? 'bg-emerald-500/10 text-emerald-300' : 'text-cyan-500/50 hover:bg-cyan-500/5'}`}
            title={`Current Project: ${projectPath}`}
          >
            <FolderOpen className={`w-3.5 h-3.5 ${isIndexing ? 'animate-pulse' : ''}`} />
            <span className="font-black tracking-tighter uppercase max-w-[100px] truncate">
              {isIndexing ? 'Indexing...' : projectName}
            </span>
          </button>

          <button
            onClick={toggleTerminal}
            className={`flex items-center gap-2 px-2 py-0.5 rounded transition-all active:scale-95 ${isTerminalVisible ? 'bg-cyan-500/10 text-cyan-300' : 'text-cyan-500/50 hover:bg-cyan-500/5'}`}
            title={bridgeStatus === 'online' ? "Bridge Active" : "Bridge Offline - Run 'npm run bridge'"}
          >
            <TerminalIcon className={`w-3.5 h-3.5 ${bridgeConfig[bridgeStatus]}`} />
            <span className={`font-black tracking-tighter uppercase ${bridgeStatus === 'offline' ? 'text-red-500/60 line-through' : ''}`}>
              {isTerminalVisible ? 'OVRD' : 'TERM'}
            </span>
          </button>

          <div className="flex items-center space-x-2">
            <DatabaseIcon className={`w-3.5 h-3.5 ${currentStatus.color} ${currentStatus.iconClass}`} />
            <span className={`font-black uppercase tracking-tighter ${currentStatus.color}`}>{currentStatus.text}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
