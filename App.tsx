import React, { useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { ConfigErrorOverlay } from './components/ConfigErrorOverlay';
import { FileExplorerPanel } from './components/FileExplorerPanel';
import { EditorPanel } from './components/EditorPanel';
import { OutputPanel } from './components/OutputPanel';
import { TerminalPanel } from './components/TerminalPanel';
import { StatusBar } from './components/StatusBar';
import { Sidebar } from './components/Sidebar';
import { AcademicHub } from './academic-hub/AcademicHub';
import { API_KEY } from './config';
import { useWorkspace } from './context/WorkspaceContext';

const IdeWorkspace: React.FC = () => {
  const { isTerminalVisible, isTerminalExpanded } = useWorkspace();
  return (
    <div className="flex-grow flex p-4 gap-4 overflow-hidden">
      {!isTerminalExpanded && <FileExplorerPanel />}
      <div className="flex-grow flex flex-col h-full gap-4 overflow-hidden">
        <div className={`flex-grow flex flex-col md:flex-row gap-4 overflow-hidden ${isTerminalExpanded ? 'opacity-20 pointer-events-none scale-[0.98]' : 'opacity-100'} transition-all duration-500`}>
          <EditorPanel />
          <OutputPanel />
        </div>
        {isTerminalVisible && <TerminalPanel />}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const navigate = useNavigate();
  const { isTerminalVisible, isTerminalExpanded } = useWorkspace();

  // Keyboard shortcut: Ctrl+Shift+A for Academic Hub
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        navigate('/academic-hub');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  if (!API_KEY) {
    return <ConfigErrorOverlay />;
  }

  return (
    <div className="relative h-screen w-screen flex flex-col font-sans text-cyan-50">
      <div className="animated-bg"></div>
      <div className="ide-layout flex flex-row h-full overflow-hidden">
        <Sidebar />
        <div className="flex-grow flex flex-col h-full overflow-hidden">
          <Routes>
            <Route path="/" element={<IdeWorkspace />} />
            <Route path="/academic-hub" element={<AcademicHub />} />
          </Routes>
          <StatusBar />
        </div>
      </div>
    </div>
  );
};

export default App;