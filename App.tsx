import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { ConfigErrorOverlay } from './components/ConfigErrorOverlay';
import { FileExplorerPanel } from './components/FileExplorerPanel';
import { EditorPanel } from './components/EditorPanel';
import { OutputPanel } from './components/OutputPanel';
import { TerminalPanel } from './components/TerminalPanel';
import { StatusBar } from './components/layout/StatusBar';
import { Sidebar } from './components/layout/Sidebar';
import { AcademicHub } from './academic-hub/AcademicHub';
import { SAFLab } from './components/saf';
import { API_KEY, GROQ_API_KEY, OPENROUTER_API_KEY } from './config';
import { useWorkspace } from './context/WorkspaceContext';
import { SplashScreen } from './components/onboarding/SplashScreen';
import { UserLevelModal } from './components/onboarding/UserLevelModal';
import { OnboardingTour } from './components/onboarding/OnboardingTour';
import { EldoriaLogo } from './components/Icons';
import { DownloadHub } from './components/DownloadHub';
import { TitleBar } from './components/layout/TitleBar';
import { MechanicalSAFLab } from './src/components/saf/mechanical/MechanicalSAFLab';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

const IdeWorkspace: React.FC = () => {
  const { isTerminalVisible, isTerminalExpanded } = useWorkspace();
  const isReallyExpanded = isTerminalVisible && isTerminalExpanded;

  return (
    <div className="flex-grow flex p-4 gap-4 overflow-hidden">
      {!isReallyExpanded && <FileExplorerPanel />}
      <div className="flex-grow flex flex-col h-full gap-4 overflow-hidden min-h-0">
        <div className={`flex-grow flex flex-col md:flex-row gap-4 overflow-hidden min-h-0 ${isReallyExpanded ? 'opacity-20 pointer-events-none scale-[0.98]' : 'opacity-100'} transition-all duration-500`}>
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

  const handleLevelSelect = (level: 'newbie' | 'intermediate' | 'expert') => {
    if (level === 'expert') {
      completeOnboarding();
      setOnboardingPhase('done');
    } else {
      setOnboardingPhase('tour');
    }
  };

  // Keyboard shortcut: Ctrl+Shift+A for Academic Hub
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

  // Allow app to run if any supported AI key is present
  if (!API_KEY && !GROQ_API_KEY && !OPENROUTER_API_KEY) {
    return <ConfigErrorOverlay />;
  }

  return (
    <ThemeProvider defaultTheme="dark">
      <div className="relative h-screen w-screen flex flex-col font-sans text-cyan-50 pt-8">
        {/* Theme Toggle Button - Fixed position */}
        <button
          onClick={toggleTheme}
          className="fixed top-20 right-16 z-50 p-2 rounded-lg bg-gray-800/90 backdrop-blur-sm border border-gray-700 hover:border-cyan-500/50 transition-all shadow-lg"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-cyan-400" />}
        </button>

        <TitleBar />
        <div className="animated-bg"></div>

        {/* Sentient Watermark */}
        <div className="fixed bottom-12 right-12 w-64 h-64 opacity-[0.07] pointer-events-none select-none z-[1]">
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
              <Route path="/saf-lab" element={<SAFLab />} />
              <Route path="/mech-saf-lab" element={<MechanicalSAFLab />} />
              <Route path="/download-hub" element={<DownloadHub />} />
            </Routes>
            <StatusBar />
          </div>
        </div>

        {/* Sidebar rendered LAST to guarantee stacking priority */}
        <Sidebar />
      </div>
    </ThemeProvider>
  );
};

export default App;