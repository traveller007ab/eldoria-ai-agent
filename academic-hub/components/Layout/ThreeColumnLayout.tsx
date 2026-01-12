import React, { useState } from 'react';
import { Search, Layout, BookOpen, GraduationCap, Plus, ChevronRight } from 'lucide-react';
import { Button } from '../Common/Button';
import { Input } from '../Common/Input';
import { Card, CardTitle } from '../Common/Card';
import './ThreeColumnLayout.css';

interface Template {
  id: string;
  name: string;
  institution: string;
  chapters: number;
}

interface Project {
  id: string;
  title: string;
  format: string;
  created_at: string;
}

interface ThreeColumnLayoutProps {
  children: React.ReactNode;
  rightPanel?: React.ReactNode;
  templates?: Template[];
  projects?: Project[];
  onSelectTemplate?: (templateId: string) => void;
  onSelectProject?: (projectId: string) => void;
  onNewProject?: () => void;
}

export const ThreeColumnLayout: React.FC<ThreeColumnLayoutProps> = ({
  children,
  rightPanel,
  templates = [],
  projects = [],
  onSelectTemplate,
  onSelectProject,
  onNewProject
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="ah-three-column">
      {/* Left Sidebar - Library */}
      <aside className="ah-sidebar">
        <div className="ah-sidebar__section">
          <div className="ah-sidebar__search">
            <Input
              placeholder="Search research..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search size={16} />}
            />
          </div>
        </div>

        <div className="ah-sidebar__section">
          <div className="ah-sidebar__header">
            <Layout size={16} />
            <span>Library</span>
          </div>
          
          {templates.length > 0 && (
            <div className="ah-sidebar__templates">
              <div className="ah-sidebar__label">Thesis Templates</div>
              {templates.map(template => (
                <button
                  key={template.id}
                  className="ah-template-item"
                  onClick={() => onSelectTemplate?.(template.id)}
                >
                  <div className="ah-template-item__icon">
                    <GraduationCap size={18} />
                  </div>
                  <div className="ah-template-item__info">
                    <div className="ah-template-item__name">{template.name}</div>
                    <div className="ah-template-item__meta">
                      {template.institution} • {template.chapters} chapters
                    </div>
                  </div>
                  <ChevronRight size={14} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="ah-sidebar__section">
          <div className="ah-sidebar__header">
            <BookOpen size={16} />
            <span>Your Projects</span>
          </div>
          
          {projects.length > 0 ? (
            <div className="ah-sidebar__projects">
              {projects.map(project => (
                <button
                  key={project.id}
                  className="ah-project-item"
                  onClick={() => onSelectProject?.(project.id)}
                >
                  <div className="ah-project-item__info">
                    <div className="ah-project-item__title">
                      {project.title || 'Untitled Project'}
                    </div>
                    <div className="ah-project-item__meta">
                      {project.format} • {new Date(project.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="ah-sidebar__empty">
              <p>No active research found.</p>
            </div>
          )}
          
          <Button 
            variant="secondary" 
            fullWidth 
            onClick={onNewProject}
            leftIcon={<Plus size={16} />}
          >
            New Project
          </Button>
        </div>
      </aside>

      {/* Center - Main Content */}
      <main className="ah-main-content">
        {children}
      </main>

      {/* Right Panel - Compliance & References */}
      {rightPanel && (
        <aside className="ah-right-panel">
          {rightPanel}
        </aside>
      )}
    </div>
  );
};

export default ThreeColumnLayout;
