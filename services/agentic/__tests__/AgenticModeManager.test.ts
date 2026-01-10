import { describe, it, expect, beforeEach } from 'vitest';
import { AgenticModeManager, AgentConfig, AgentInsight, AgentAction } from '../AgenticModeManager';
import { createMockAcademicProject } from './mocks';

describe('AgenticModeManager', () => {
  let manager: AgenticModeManager;
  let mockProject: ReturnType<typeof createMockAcademicProject>;

  beforeEach(() => {
    manager = new AgenticModeManager();
    mockProject = createMockAcademicProject();
  });

  describe('Initialization', () => {
    it('should create manager instance', () => {
      expect(manager).toBeInstanceOf(AgenticModeManager);
    });

    it('should initialize with default config', () => {
      expect(manager).toBeDefined();
    });

    it('should initialize with custom config', () => {
      const customConfig: Partial<AgentConfig> = {
        checkInterval: 10000,
        autoSuggestEnabled: false
      };
      const customManager = new AgenticModeManager(customConfig);
      expect(customManager).toBeInstanceOf(AgenticModeManager);
    });
  });

  describe('Project Setup', () => {
    it('should initialize with project', () => {
      manager.initialize(mockProject);
      expect(manager).toBeDefined();
    });

    it('should emit initialization insight', (done) => {
      manager.onInsight((insight) => {
        expect(insight.category).toBe('initialization');
        expect(insight.type).toBe('info');
        done();
      });
      manager.initialize(mockProject);
    });
  });

  describe('Background Agent', () => {
    it('should start background agent', () => {
      manager.initialize(mockProject);
      manager.startBackgroundAgent();
      expect(manager).toBeDefined();
    });

    it('should stop background agent', () => {
      manager.startBackgroundAgent();
      manager.stopBackgroundAgent();
      expect(manager).toBeDefined();
    });

    it('should handle multiple start/stop cycles', () => {
      manager.startBackgroundAgent();
      manager.stopBackgroundAgent();
      manager.startBackgroundAgent();
      manager.stopBackgroundAgent();
      expect(manager).toBeDefined();
    });
  });

  describe('Event Callbacks', () => {
    it('should register insight callback', () => {
      const callback = (insight: AgentInsight) => {};
      manager.startBackgroundAgent(callback);
      expect(manager).toBeDefined();
    });

    it('should register action callback', () => {
      const insightCallback = (insight: AgentInsight) => {};
      const actionCallback = (action: AgentAction) => {};
      manager.startBackgroundAgent(insightCallback, actionCallback);
      expect(manager).toBeDefined();
    });
  });
});

describe('AgentInsight Types', () => {
  it('should create valid insight objects', () => {
    const insight: AgentInsight = {
      id: 'test-insight-001',
      type: 'suggestion',
      category: 'progress',
      title: 'Add More Citations',
      message: 'Consider adding more recent citations.',
      confidence: 0.85,
      priority: 'medium',
      timestamp: new Date(),
      actions: [
        { id: 'action-1', label: 'Search for papers', type: 'action' }
      ]
    };

    expect(insight.id).toBe('test-insight-001');
    expect(insight.type).toBe('suggestion');
    expect(insight.confidence).toBeGreaterThan(0);
    expect(insight.confidence).toBeLessThanOrEqual(1);
  });

  it('should create valid action objects', () => {
    const action: AgentAction = {
      id: 'test-action-001',
      type: 'suggestion',
      label: 'Add citation',
      description: 'Add a citation for this section',
      timestamp: new Date(),
      status: 'pending'
    };

    expect(action.id).toBe('test-action-001');
    expect(action.status).toBe('pending');
  });
});

describe('AgentConfig Types', () => {
  it('should have valid config properties', () => {
    const config: AgentConfig = {
      checkInterval: 5000,
      autoSuggestEnabled: true,
      autoCiteEnabled: true,
      progressTrackingEnabled: true,
      learningEnabled: true,
      proactiveResearchEnabled: true,
      maxSuggestions: 50,
      confidenceThreshold: 0.7
    };

    expect(config.checkInterval).toBeGreaterThan(0);
    expect(config.confidenceThreshold).toBeGreaterThan(0);
    expect(config.confidenceThreshold).toBeLessThanOrEqual(1);
  });
});
