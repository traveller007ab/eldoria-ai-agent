import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { ConfigErrorOverlay } from './components/ConfigErrorOverlay';
import { FileExplorerPanel } from './components/FileExplorerPanel';
import { EditorPanel } from './components/EditorPanel';
import { OutputPanel } from './components/OutputPanel';
import { NeuralCodexTerminal } from './components/NeuralCodexTerminal';
import { StatusBar } from './components/layout/StatusBar';
import { Sidebar } from './components/layout/Sidebar';
import { AcademicHub } from './academic-hub/AcademicHub';
import { CommandBar, CommandBarTrigger } from './components/CommandBar';

import { API_KEY, GROQ_API_KEY, OPENROUTER_API_KEY } from './config';
import { useWorkspace } from './context/WorkspaceContext';
import { SplashScreen } from './components/onboarding/SplashScreen';
import { UserLevelModal } from './components/onboarding/UserLevelModal';
import { OnboardingTour } from './components/onboarding/OnboardingTour';
import { EldoriaLogo } from './components/Icons';
import { DownloadHub } from './components/DownloadHub';
import { TitleBar } from './components/layout/TitleBar';
import { MechanicalBackground } from './components/layout/MechanicalBackground';
import { MechLabLayout } from './components/mech-saf-2.0/MechLabLayout';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { MindCanvas } from './components/nexus/MindCanvas';
import { FocusModeContainer } from './components/nexus/FocusModeContainer';
import { ReactFlowProvider } from 'reactflow';
import { Layout, Compass, Sun, Moon } from 'lucide-react';

type WorkspaceMode = 'classic' | 'canvas';

const IdeWorkspace: React.FC = () => {
  const { isTerminalVisible, isTerminalExpanded, workspaceMode } = useWorkspace();
  const isReallyExpanded = isTerminalVisible && isTerminalExpanded;
  const [isCommandBarOpen, setIsCommandBarOpen] = useState(false);

  // Ctrl+K / Cmd+K to open command bar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandBarOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex-grow flex flex-col overflow-hidden relative">

      {/* Classic Mode */}
      {workspaceMode === 'classic' && (
        <div className="flex-grow flex p-4 gap-4 overflow-hidden">
          {!isReallyExpanded && <FileExplorerPanel />}
          <div className="flex-grow flex flex-col h-full gap-4 overflow-hidden min-h-0">
            <div className={`flex-grow flex flex-col md:flex-row gap-4 overflow-hidden min-h-0 ${isReallyExpanded ? 'opacity-20 pointer-events-none scale-[0.98]' : 'opacity-100'} transition-all duration-500`}>
              <EditorPanel />
              <OutputPanel />
            </div>
            {isTerminalVisible && <NeuralCodexTerminal />}
          </div>
        </div>
      )}

      {/* Canvas Mode */}
      {workspaceMode === 'canvas' && (
        <div className="flex-grow flex p-4 gap-4 overflow-hidden">
          {!isReallyExpanded && <FileExplorerPanel />}
          <div className="flex-grow relative bg-slate-900/50 rounded-2xl border border-slate-800 overflow-hidden">
            <ReactFlowProvider>
              <MindCanvas />
              <FocusModeContainer />
            </ReactFlowProvider>
          </div>
        </div>
      )}

      {/* Command Bar Trigger */}
      <CommandBarTrigger onClick={() => setIsCommandBarOpen(true)} />

      {/* Command Bar */}
      <CommandBar
        isOpen={isCommandBarOpen}
        onClose={() => setIsCommandBarOpen(false)}
      />
    </div>
  );
};

const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isTerminalVisible, isTerminalExpanded, onboarding_completed, eldoria_user_level, completeOnboarding } = useWorkspace();
  const { theme, toggleTheme } = useTheme();
  const [onboardingPhase, setOnboardingPhase] = useState<'splash' | 'level_prompt' | 'tour' | 'done'>(
    onboarding_completed ? 'done' : 'splash'
  );

  useEffect(() => {
    if (onboardingPhase === 'splash') {
      const timer = setTimeout(() => {
        setOnboardingPhase('level_prompt');
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [onboardingPhase]);

  // Phase 7: Deep Integration - Push Nexus State to AI Context
  // This allows the "Classic Chat" to know what's happening on the Canvas
  // Phase 7: Deep Integration - Push Nexus State to AI Context
  // This allows the "Classic Chat" to know what's happening on the Canvas
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    // Dynamic import to avoid cycles or ensure store exists
    import('./stores/useNexusStore').then(({ useNexusStore }) => {
      unsubscribe = useNexusStore.subscribe((state) => {
        import('./services/ContextService').then(({ contextService }) => {
          contextService.updateNexusState({
            nodeCount: state.nodes.length,
            edgeCount: state.edges.length,
            viewMode: state.viewMode,
            selectedNodes: state.nodes
              .filter(n => state.selectedNodeIds.includes(n.id))
              .map(n => ({
                id: n.id,
                type: n.type,
                label: (n.data as any)?.label || (n.data as any)?.title || (n.data as any)?.name || (n.data as any)?.filename || 'Untitled',
                preview: typeof (n.data as any)?.content === 'string'
                  ? (n.data as any).content.substring(0, 100)
                  : (n.data as any)?.specs || 'Complex Data'
              }))
          });
        });
      });
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleLevelSelect = (level: 'newbie' | 'intermediate' | 'expert') => {
    if (level === 'expert') {
      completeOnboarding();
      setOnboardingPhase('done');
    } else {
      setOnboardingPhase('tour');
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        navigate('/academic-hub');
      }
      if (e.altKey && e.shiftKey && e.key === 'W') {
        e.preventDefault();
        navigate('/');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  useEffect(() => {
    if (onboarding_completed && onboardingPhase !== 'done') {
      setOnboardingPhase('done');
    } else if (!onboarding_completed && onboardingPhase === 'done') {
      setOnboardingPhase('splash');
    }
  }, [onboarding_completed, onboardingPhase]);

  if (!API_KEY && !GROQ_API_KEY && !OPENROUTER_API_KEY) {
    return <ConfigErrorOverlay />;
  }

  return (
    <div className="relative h-screen w-screen flex flex-col font-sans text-cyan-50 pt-8">
      <button
        onClick={toggleTheme}
        className="fixed top-20 right-16 z-50 p-2 rounded-lg bg-gray-800/90 backdrop-blur-sm border border-gray-700 hover:border-cyan-500/50 transition-all shadow-lg"
        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      >
        {theme === 'dark' ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-cyan-400" />}
      </button>

      <TitleBar />
      <MechanicalBackground />

      <div className="fixed bottom-12 right-12 w-64 h-64 opacity-[0.05] pointer-events-none select-none z-[0] mix-blend-overlay">
        <EldoriaLogo className="w-full h-full text-cyan-400" />
      </div>

      {onboardingPhase === 'splash' && <SplashScreen />}
      {onboardingPhase === 'level_prompt' && <UserLevelModal onSelect={handleLevelSelect} />}
      {onboardingPhase === 'tour' && <OnboardingTour />}

      <div className="ide-layout flex flex-row h-full overflow-hidden pl-16">
        <div className="flex-grow flex flex-col h-full overflow-hidden">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<IdeWorkspace />} />
            <Route path="/academic-hub" element={<AcademicHub />} />
            <Route path="/saf-lab" element={<MechLabLayout />} />
            <Route path="/mech-saf-lab" element={<MechLabLayout />} />
            <Route path="/mech-saf-lab-v2" element={<MechLabLayout />} />
            <Route path="/download-hub" element={<DownloadHub />} />

          </Routes>
          <StatusBar />
        </div>
      </div>

      <Sidebar />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider defaultTheme="dark">
      <AppContent />
    </ThemeProvider>
  );
};

export default App;
