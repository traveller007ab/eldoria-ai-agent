import { useEffect, useRef, useState, useCallback } from 'react';

export type AgentStatus = 'idle' | 'running' | 'error' | 'initializing';

export interface AgentTask {
  id: string;
  agent_type: string;
  task_type: string;
  description: string;
  priority: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  payload: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
  created_at: string;
  completed_at?: string;
  requires_approval?: boolean;
}

export interface AgentInsight {
  id: string;
  type: 'info' | 'suggestion' | 'warning' | 'success';
  source: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  actionable: boolean;
  actions?: { label: string; action: string }[];
  timestamp: string;
  read: boolean;
}

export interface AgentConfiguration {
  auto_search: boolean;
  auto_cite: boolean;
  auto_validate: boolean;
  max_concurrent_tasks: number;
  approval_threshold: 'all' | 'major' | 'none';
  preferred_sources: string[];
  citation_style: string;
}

interface WebSocketMessage {
  type: 'task_update' | 'insight' | 'agent_status' | 'error' | 'connected' | 'task_started' | 'task_completed' | 'task_failed';
  payload: unknown;
  timestamp: string;
}

export function useAgentWebSocket(projectId: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [agentStatus, setAgentStatus] = useState<Record<string, AgentStatus>>({});
  const [insights, setInsights] = useState<AgentInsight[]>([]);
  const [tasks, setTasks] = useState<Record<string, AgentTask>>({});
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    const wsUrl = `${import.meta.env.VITE_WS_URL || 'ws://localhost:8000'}/ws/projects/${projectId}/agents`;
    
    try {
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
        console.log('Agent WebSocket connected');
      };
      
      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          switch (message.type) {
            case 'connected':
              console.log('WebSocket connection confirmed');
              break;
              
            case 'task_update': {
              const task = message.payload as AgentTask;
              setTasks(prev => ({
                ...prev,
                [task.id]: task
              }));
              break;
            }
              
            case 'task_started': {
              const data = message.payload as { task: AgentTask };
              setTasks(prev => ({
                ...prev,
                [data.task.id]: data.task
              }));
              break;
            }
              
            case 'task_completed': {
              const data = message.payload as { task: AgentTask };
              setTasks(prev => ({
                ...prev,
                [data.task.id]: data.task
              }));
              break;
            }
              
            case 'task_failed': {
              const data = message.payload as { task: AgentTask; error: string };
              setTasks(prev => ({
                ...prev,
                [data.task.id]: { ...data.task, error: data.error }
              }));
              break;
            }
              
            case 'insight': {
              const insight = message.payload as AgentInsight;
              setInsights(prev => [insight, ...prev].slice(0, 50));
              break;
            }
              
            case 'agent_status': {
              const status = message.payload as Record<string, AgentStatus>;
              setAgentStatus(status);
              break;
            }
              
            case 'error': {
              const err = message.payload as { message: string };
              setError(err.message);
              console.error('WebSocket error:', err.message);
              break;
            }
          }
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };
      
      ws.onclose = () => {
        setIsConnected(false);
        console.log('WebSocket disconnected');
        
        // Attempt reconnect
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectAttemptsRef.current += 1;
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        } else {
          setError('Max reconnection attempts reached');
        }
      };
      
      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError('WebSocket connection error');
      };
      
      wsRef.current = ws;
    } catch (e) {
      console.error('Failed to create WebSocket:', e);
      setError('Failed to connect to agent service');
    }
  }, [projectId]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
  }, []);

  const sendCommand = useCallback((command: string, payload: Record<string, unknown> = {}) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ command, payload }));
    } else {
      console.warn('WebSocket not connected, command not sent');
      setError('Not connected to agent service');
    }
  }, []);

  const markInsightRead = useCallback((insightId: string) => {
    setInsights(prev => prev.map(i => 
      i.id === insightId ? { ...i, read: true } : i
    ));
    sendCommand('mark_insight_read', { insightId });
  }, [sendCommand]);

  const dismissInsight = useCallback((insightId: string) => {
    setInsights(prev => prev.filter(i => i.id !== insightId));
    sendCommand('dismiss_insight', { insightId });
  }, [sendCommand]);

  const approveTask = useCallback((taskId: string) => {
    sendCommand('approve_task', { taskId });
  }, [sendCommand]);

  const cancelTask = useCallback((taskId: string) => {
    sendCommand('cancel_task', { taskId });
    setTasks(prev => {
      const updated = { ...prev };
      if (updated[taskId]) {
        updated[taskId] = { ...updated[taskId], status: 'failed' as const };
      }
      return updated;
    });
  }, [sendCommand]);

  // Auto-connect on mount
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    isConnected,
    agentStatus,
    insights,
    tasks,
    error,
    sendCommand,
    markInsightRead,
    dismissInsight,
    approveTask,
    cancelTask,
    disconnect,
    reconnect: connect,
  };
}

// Helper function to filter tasks by status
export function filterTasksByStatus(tasks: Record<string, AgentTask>, status: AgentTask['status']): AgentTask[] {
  return Object.values(tasks).filter(t => t.status === status);
}

// Helper function to get tasks by agent type
export function filterTasksByAgent(tasks: Record<string, AgentTask>, agentType: string): AgentTask[] {
  return Object.values(tasks).filter(t => t.agent_type === agentType);
}

// Helper to calculate overall progress
export function calculateOverallProgress(tasks: Record<string, AgentTask>): number {
  const completedTasks = Object.values(tasks).filter(t => t.status === 'completed').length;
  const totalTasks = Object.keys(tasks).length;
  return totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
}
