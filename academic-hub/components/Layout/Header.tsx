import React from 'react';
import { GraduationCap, Brain, Settings, User, Menu } from 'lucide-react';
import { Button } from '../Common/Button';
import './Header.css';

type Mode = 'standard' | 'agentic';

interface HeaderProps {
  mode: Mode;
  onToggleMode: () => void;
  projectTitle?: string;
  userName?: string;
  onMenuToggle?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  mode,
  onToggleMode,
  projectTitle,
  userName,
  onMenuToggle
}) => {
  return (
    <header className={`ah-header ah-header--${mode}`}>
      <div className="ah-header__left">
        {onMenuToggle && (
          <button 
            className="ah-menu-button"
            onClick={onMenuToggle}
            aria-label="Toggle navigation"
          >
            <Menu size={20} />
          </button>
        )}
        
        <div className="ah-header__brand">
          <div className="ah-header__icon">
            {mode === 'agentic' ? <Brain size={24} /> : <GraduationCap size={24} />}
          </div>
          <div className="ah-header__text">
            <h1 className="ah-header__title">Academic Hub</h1>
            {projectTitle && (
              <p className="ah-header__subtitle">{projectTitle}</p>
            )}
          </div>
        </div>
      </div>

      <div className="ah-header__center">
        <ModeToggle mode={mode} onToggle={onToggleMode} />
      </div>

      <div className="ah-header__right">
        <Button variant="ghost" size="sm" onClick={() => {}}>
          <Settings size={16} />
        </Button>
        <div className="ah-header__user">
          <User size={20} />
          {userName && <span className="ah-header__user-name">{userName}</span>}
        </div>
      </div>
    </header>
  );
};

interface ModeToggleProps {
  mode: Mode;
  onToggle: () => void;
}

const ModeToggle: React.FC<ModeToggleProps> = ({ mode, onToggle }) => {
  return (
    <div className="ah-mode-toggle" role="group" aria-label="Interface mode">
      <button
        className={`ah-mode-toggle__option ${mode === 'standard' ? 'is-active' : ''}`}
        onClick={() => mode !== 'standard' && onToggle()}
        aria-pressed={mode === 'standard'}
      >
        <span>Standard</span>
      </button>
      
      <button
        className={`ah-mode-toggle__option ${mode === 'agentic' ? 'is-active' : ''}`}
        onClick={() => mode !== 'agentic' && onToggle()}
        aria-pressed={mode === 'agentic'}
      >
        <Brain size={14} />
        <span>Agentic</span>
      </button>
    </div>
  );
};

export default Header;
