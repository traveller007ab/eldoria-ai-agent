import React, { useState, useEffect } from 'react';
import {
  Brain, Play, Pause, Square, Settings, Wifi, WifiOff,
  BookOpen, Edit3, CheckCircle, AlertTriangle, Lightbulb,
  ChevronRight, Search, Download, RefreshCw, Plus, Wand2, FileDown, Book, Eye,
  Activity, Gamepad2, Sparkles
} from 'lucide-react';
import { Button } from '../Common/Button';
import { Card, CardTitle } from '../Common/Card';
import { useAgentWebSocket, calculateOverallProgress, filterTasksByAgent, AgentTask, AgentInsight } from '../../../hooks/useAgentWebSocket';
import { ReferenceManager } from '../ReferenceManager';
import { ThesisPreview } from './ThesisPreview';
import { Reference } from '../../../services/citationEngine';
import { SimulationOptimizationPanel } from '../SimulationOptimizationPanel';
import { ComplianceCitationPanel } from '../ComplianceCitationPanel';
import { SafHelpPanel } from '../SafHelpPanel';
import { ScenariosPanel } from '../ScenariosPanel';
import './AgenticDashboard.css';

interface Project {
  id: string;
  wizard_state?: {
    basics?: {
      title?: string;
      author?: string;
      supervisor?: string;
      department?: string;
      university?: string;
    };
  };
  draft_content?: Record<string, string>;
  references?: Array<{ id: string }>;
}

interface ThesisPreviewProps {
  wizard_state?: {
    basics?: {
      title?: string;
      author?: string;
      supervisor?: string;
      department?: string;
      university?: string;
    };
  };
  draft_content?: Record<string, string>;
}

interface AgenticDashboardProps {
  projectId: string;
  project?: Project;
  onOpenWizard?: () => void;
  onOpenExport?: () => void;
  onOpenCustomizer?: () => void;
  onNewProject?: () => void;
  onSelectProject?: (project: any) => void;
  onUpdateDraft?: (section: string, content: string) => void;
}

export const AgenticDashboard: React.FC<AgenticDashboardProps> = ({
  projectId,
  project,
  onOpenWizard,
  onOpenExport,
  onOpenCustomizer,
  onNewProject,
  onSelectProject,
  onUpdateDraft
}) => {
  const [activeAgentTab, setActiveAgentTab] = useState<string>('literature');
  const {
    isConnected,
    agentStatus,
    insights,
    tasks,
    error,
    sendCommand,
    markInsightRead,
    approveTask,
    cancelTask
  } = useAgentWebSocket(projectId);

  const overallProgress = calculateOverallProgress(tasks);
  const totalWords = Object.values(project?.draft_content || {}).reduce(
    (sum, content) => sum + (typeof content === 'string' ? content.split(/\s+/).length : 0),
    0
  );
  const referencesCount = project?.references?.length || 0;

  const activeTasks = Object.values(tasks).filter((t): t is AgentTask => t.status === 'in_progress');
  const pendingTasks = Object.values(tasks).filter((t): t is AgentTask => t.status === 'pending');

  return (
    <div className="agentic-dashboard">
      {/* Header */}
      <header className="agentic-dashboard__header">
        <div className="agentic-dashboard__title">
          <div className="agentic-dashboard__brain-icon">
            <Brain size={28} />
          </div>
          <div>
            <h1>Research Agent Command Center</h1>
            <p className="agentic-dashboard__project-name">
              {project?.wizard_state?.basics?.title || 'Untitled Project'}
            </p>
          </div>
        </div>

        <div className="agentic-dashboard__status">
          <ConnectionStatus isConnected={isConnected} error={error} />
          <div className="agentic-dashboard__controls">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => sendCommand('pause_all', {})}
              disabled={!isConnected}
            >
              <Pause size={14} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => sendCommand('resume_all', {})}
              disabled={!isConnected}
            >
              <Play size={14} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => sendCommand('stop_all', {})}
              disabled={!isConnected}
            >
              <Square size={14} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => sendCommand('configure', {})}
              disabled={!isConnected}
            >
              <Settings size={14} />
            </Button>
          </div>
        </div>

        {/* Project Action Buttons */}
        <div className="agentic-dashboard__actions">
          {onOpenWizard && (
            <Button variant="secondary" size="sm" onClick={onOpenWizard}>
              <Wand2 size={14} />
              <span>Setup Wizard</span>
            </Button>
          )}
          {onOpenExport && (
            <Button variant="secondary" size="sm" onClick={onOpenExport}>
              <FileDown size={14} />
              <span>Export</span>
            </Button>
          )}
          {onOpenCustomizer && (
            <Button variant="ghost" size="sm" onClick={onOpenCustomizer}>
              <Settings size={14} />
              <span>Customize AI</span>
            </Button>
          )}
        </div>
      </header>

      {/* Progress Overview */}
      <section className="agentic-dashboard__overview">
        <div className="agentic-overview-cards">
          <ProgressCard
            title="Completion"
            value={`${overallProgress}%`}
            subtitle={`${totalWords.toLocaleString()} words written`}
            color="purple"
          />
          <ProgressCard
            title="References"
            value={referencesCount.toString()}
            subtitle="Citations collected"
            color="cyan"
          />
          <ProgressCard
            title="Active Tasks"
            value={activeTasks.length.toString()}
            subtitle="Tasks running"
            color="green"
          />
          <ProgressCard
            title="Pending"
            value={pendingTasks.length.toString()}
            subtitle="Tasks queued"
            color="amber"
          />
        </div>
      </section>

      {/* Main Grid */}
      <div className="agentic-dashboard__grid">
        {/* Left: Insights & Timeline */}
        <div className="agentic-dashboard__left">
          <Card>
            <CardTitle>
              <Lightbulb size={16} />
              AI Insights
            </CardTitle>
            <div className="agentic-insights">
              {insights.length > 0 ? (
                insights.slice(0, 10).map(insight => (
                  <InsightCard
                    key={insight.id}
                    insight={insight}
                    onAction={(action) => sendCommand(action, { insightId: insight.id })}
                    onMarkRead={() => markInsightRead(insight.id)}
                  />
                ))
              ) : (
                <div className="agentic-insights__empty">
                  <Brain size={32} />
                  <p>No insights yet</p>
                  <span>Your AI agents are analyzing your project...</span>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Center: Agent Panels */}
        <div className="agentic-dashboard__center">
          <div className="agent-tabs">
            {['literature', 'writing', 'analysis', 'compliance', 'references', 'simulation', 'scenarios', 'saf', 'preview'].map(agent => (
              <button
                key={agent}
                className={`agent-tab ${activeAgentTab === agent ? 'is-active' : ''}`}
                onClick={() => setActiveAgentTab(agent)}
              >
                <AgentIcon type={agent} />
                <span>{agent.charAt(0).toUpperCase() + agent.slice(1)}</span>
                {agent !== 'references' && agent !== 'preview' && agent !== 'simulation' && agent !== 'scenarios' && agent !== 'saf' && <StatusDot status={agentStatus[agent]} />}
              </button>
            ))}
          </div>

          <div className="agent-panel">
            {activeAgentTab === 'references' ? (
              <ReferenceManager
                references={(project?.references as Reference[]) || []}
                onAddReference={(ref) => console.log('Add reference:', ref)}
                onUpdateReference={(id, updates) => console.log('Update reference:', id, updates)}
                onDeleteReference={(id) => console.log('Delete reference:', id)}
                onDeleteSelected={(ids) => console.log('Delete selected:', ids)}
                onImportReferences={(refs) => console.log('Import references:', refs)}
                onExportReferences={(format) => console.log('Export format:', format)}
                selectedIds={[]}
                onSelect={(id) => console.log('Select:', id)}
                onSelectAll={() => console.log('Select all')}
                onDeselectAll={() => console.log('Deselect all')}
              />
            ) : activeAgentTab === 'preview' ? (
              <ThesisPreview
                project={{
                  wizard_state: project?.wizard_state,
                  draft_content: project?.draft_content
                }}
                references={(project?.references as Reference[]) || []}
                onUpdateDraft={onUpdateDraft}
              />
            ) : activeAgentTab === 'simulation' ? (
              <SimulationOptimizationPanel
                blueprint={project?.draft_content as Record<string, unknown> || null}
                onApplyOptimization={(componentId, params) => console.log('Apply optimization:', componentId, params)}
              />
            ) : activeAgentTab === 'compliance' ? (
              <ComplianceCitationPanel
                projectId={project?.id || ''}
                chapterContent={project?.draft_content || {}}
                references={project?.references?.map(r => ({
                  id: r.id,
                  authors: [],
                  year: 2023,
                  title: '',
                  source: ''
                })) || []}
              />
            ) : activeAgentTab === 'saf' ? (
              <SafHelpPanel
                componentCount={project?.references?.length || 0}
                hasSimulationResults={true}
              />
            ) : activeAgentTab === 'scenarios' ? (
              <ScenariosPanel
                onScenarioStart={(id) => console.log('Started scenario:', id)}
              />
            ) : activeTasks.filter(t => t.agent_type === activeAgentTab).map(task => (
              <ActiveTaskCard
                key={task.id}
                task={task}
                onAction={(action) => {
                  if (action === 'approve') approveTask(task.id);
                  if (action === 'cancel') cancelTask(task.id);
                }}
              />
            ))}

            {activeTasks.filter(t => t.agent_type === activeAgentTab).length === 0 && (
              <div className="agent-panel__empty">
                <AgentIcon type={activeAgentTab} size={48} />
                <p>No active tasks</p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => sendCommand('start_task', { agent: activeAgentTab })}
                >
                  Start Task
                </Button>
              </div>
            )}

            {/* Quick Actions */}
            <div className="agent-quick-actions">
              <h4>Quick Actions</h4>
              <div className="quick-actions-grid">
                {getQuickActionsForAgent(activeAgentTab).map(action => (
                  <button
                    key={action.id}
                    className="quick-action"
                    onClick={() => sendCommand(action.command, {})}
                  >
                    <action.icon size={18} />
                    <span>{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Research Timeline */}
        <div className="agentic-dashboard__right">
          <Card>
            <CardTitle>
              <BookOpen size={16} />
              Research Timeline
            </CardTitle>
            <div className="agentic-timeline">
              {Object.values(tasks)
                .filter((t): t is AgentTask => t.status === 'completed')
                .slice(0, 10)
                .map(task => (
                  <div key={task.id} className="timeline-item">
                    <div className="timeline-item__dot" />
                    <div className="timeline-item__content">
                      <div className="timeline-item__title">{task.description}</div>
                      <div className="timeline-item__time">
                        {new Date(task.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              {Object.values(tasks).filter((t): t is AgentTask => t.status === 'completed').length === 0 && (
                <p className="agentic-timeline__empty">No completed tasks yet</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

// Helper Components
const ConnectionStatus: React.FC<{ isConnected: boolean; error?: string | null }> = ({ isConnected, error }) => {
  // If there's an error about no project, show that instead
  const statusText = error?.toLowerCase().includes('select a project') ? 'No Project Selected' : (isConnected ? 'Connected' : 'Disconnected');
  const statusClass = error?.toLowerCase().includes('select a project') ? 'is-warning' : (isConnected ? 'is-connected' : 'is-disconnected');
  const statusIcon = error?.toLowerCase().includes('select a project') ? <AlertTriangle size={14} /> : (isConnected ? <Wifi size={14} /> : <WifiOff size={14} />);

  return (
    <div className={`connection-status ${statusClass}`}>
      {statusIcon}
      <span>{statusText}</span>
    </div>
  );
};

const ProgressCard: React.FC<{
  title: string;
  value: string;
  subtitle: string;
  color: 'purple' | 'cyan' | 'green' | 'amber';
}> = ({ title, value, subtitle, color }) => (
  <div className={`progress-card progress-card--${color}`}>
    <div className="progress-card__value">{value}</div>
    <div className="progress-card__title">{title}</div>
    <div className="progress-card__subtitle">{subtitle}</div>
  </div>
);

const InsightCard: React.FC<{
  insight: {
    id: string;
    type: string;
    source: string;
    title: string;
    message: string;
    priority: string;
    actionable: boolean;
    actions?: { label: string; action: string }[];
    read: boolean;
  };
  onAction: (action: string) => void;
  onMarkRead: () => void;
}> = ({ insight, onAction, onMarkRead }) => {
  const icons: Record<string, React.ReactNode> = {
    suggestion: <Lightbulb size={16} />,
    warning: <AlertTriangle size={16} />,
    success: <CheckCircle size={16} />,
    info: <BookOpen size={16} />,
  };

  return (
    <div
      className={`insight-card ${!insight.read ? 'is-unread' : ''}`}
      onClick={onMarkRead}
    >
      <div className={`insight-card__icon insight-card__icon--${insight.type}`}>
        {icons[insight.type] || icons.info}
      </div>
      <div className="insight-card__content">
        <div className="insight-card__title">{insight.title}</div>
        <div className="insight-card__message">{insight.message}</div>
        {insight.actions && insight.actions.length > 0 && (
          <div className="insight-card__actions">
            {insight.actions.map((action, i) => (
              <Button
                key={i}
                variant="ghost"
                size="sm"
                onClick={(e) => { e.stopPropagation(); onAction(action.action); }}
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const ActiveTaskCard: React.FC<{
  task: {
    id: string;
    description: string;
    progress: number;
    status: string;
    agent_type: string;
  };
  onAction: (action: string) => void;
}> = ({ task, onAction }) => (
  <div className="active-task-card">
    <div className="active-task-card__header">
      <div className="active-task-card__agent">{task.agent_type}</div>
      <div className="active-task-card__progress">{task.progress}%</div>
    </div>
    <div className="active-task-card__description">{task.description}</div>
    <div className="active-task-card__progress-bar">
      <div
        className="active-task-card__progress-fill"
        style={{ width: `${task.progress}%` }}
      />
    </div>
    <div className="active-task-card__actions">
      <Button variant="ghost" size="sm" onClick={() => onAction('cancel')}>
        Cancel
      </Button>
      {task.status === 'pending' && (
        <Button variant="primary" size="sm" onClick={() => onAction('approve')}>
          Approve
        </Button>
      )}
    </div>
  </div>
);

const AgentIcon: React.FC<{ type: string; size?: number }> = ({ type, size = 18 }) => {
  const icons: Record<string, React.ReactNode> = {
    literature: <Search size={size} />,
    writing: <Edit3 size={size} />,
    analysis: <BookOpen size={size} />,
    compliance: <CheckCircle size={size} />,
    references: <Book size={size} />,
    simulation: <Activity size={size} />,
    scenarios: <Gamepad2 size={size} />,
    saf: <Sparkles size={size} />,
    preview: <Eye size={size} />,
  };
  return <span className="agent-icon">{icons[type] || icons.literature}</span>;
};

const StatusDot: React.FC<{ status?: string }> = ({ status }) => {
  const colors: Record<string, string> = {
    running: '#22c55e',
    idle: '#64748b',
    error: '#ef4444',
    initializing: '#f59e0b',
  };
  return (
    <span
      className="status-dot"
      style={{ backgroundColor: colors[status || 'idle'] }}
    />
  );
};

function getQuickActionsForAgent(type: string) {
  const actions = {
    literature: [
      { id: 'search', label: 'Search Papers', command: 'search', icon: Search },
      { id: 'import', label: 'Import Citations', command: 'import', icon: Download },
    ],
    writing: [
      { id: 'draft', label: 'Draft Section', command: 'draft', icon: Edit3 },
      { id: 'expand', label: 'Expand Content', command: 'expand', icon: RefreshCw },
    ],
    analysis: [
      { id: 'validate', label: 'Validate Data', command: 'validate', icon: CheckCircle },
      { id: 'check', label: 'Run Checks', command: 'check', icon: AlertTriangle },
    ],
    compliance: [
      { id: 'report', label: 'Generate Report', command: 'report', icon: BookOpen },
      { id: 'check', label: 'Compliance Check', command: 'check', icon: CheckCircle },
    ],
  };
  return actions[type] || [];
}

export default AgenticDashboard;
