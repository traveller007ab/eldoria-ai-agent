import { EventEmitter } from 'events';
import { logger } from '@/utils/logger';
import { GeminiService } from './GeminiService';
import { GroqService } from './GroqService';
import { ToolRegistry } from './ToolRegistry';

export interface AgentContext {
  userId: string;
  sessionId: string;
  projectId?: string;
  conversationHistory: Message[];
  availableTools: Tool[];
}

export interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  metadata?: any;
}

export interface Tool {
  name: string;
  description: string;
  parameters: JSONSchema;
  execute: (params: any, context: AgentContext) => Promise<any>;
}

export interface Task {
  id: string;
  description: string;
  status: 'pending' | 'planning' | 'executing' | 'completed' | 'failed';
  plan?: TaskPlan;
  result?: any;
  error?: Error;
}

export interface TaskPlan {
  steps: PlanStep[];
  estimatedDuration: number;
  dependencies: string[];
}

export interface PlanStep {
  id: string;
  description: string;
  tool: string;
  parameters: any;
  successCriteria: string;
}

export class AgentOrchestrator extends EventEmitter {
  private context: AgentContext;
  private currentTask: Task | null = null;
  private toolRegistry: ToolRegistry;
  private geminiService: GeminiService;
  private groqService: GroqService;

  constructor(context: AgentContext) {
    super();
    this.context = context;
    this.toolRegistry = new ToolRegistry();
    this.geminiService = new GeminiService();
    this.groqService = new GroqService();
    
    this.registerDefaultTools();
  }

  /**
   * Main execution loop - AUTONOMOUS PLANNING AND EXECUTION
   */
  async executeTask(userInput: string): Promise<any> {
    logger.info(`🤖 Agent executing task: ${userInput}`);

    // 1. Create task
    const task: Task = {
      id: this.generateId(),
      description: userInput,
      status: 'pending',
    };

    this.currentTask = task;
    this.emit('task:created', task);

    try {
      // 2. PLANNING PHASE - Let AI decide approach
      task.status = 'planning';
      this.emit('task:planning', task);
      
      const plan = await this.createExecutionPlan(userInput);
      task.plan = plan;
      this.emit('task:planned', { task, plan });

      // 3. EXECUTION PHASE - Execute plan autonomously
      task.status = 'executing';
      this.emit('task:executing', task);
      
      const result = await this.executePlan(plan);
      
      task.status = 'completed';
      task.result = result;
      this.emit('task:completed', { task, result });
      
      return result;
    } catch (error) {
      task.status = 'failed';
      task.error = error as Error;
      this.emit('task:failed', { task, error });
      
      // ERROR RECOVERY - Try alternative approach
      return await this.handleExecutionError(error as Error, task);
    }
  }

  /**
   * AI-driven planning - Creates executable plan from user intent
   */
  private async createExecutionPlan(userInput: string): Promise<TaskPlan> {
    const availableTools = Array.from(this.toolRegistry.getTools()).map(t => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    }));

    const planningPrompt = `
You are an AI agent planner. Given a user task, create a detailed execution plan.

Available Tools:
${availableTools.map(t => `- ${t.name}: ${t.description}`).join('\n')}

User Task: ${userInput}

Context: ${JSON.stringify(this.context, null, 2)}

Create a plan as JSON:
{
  "steps": [
    {
      "id": "step_1",
      "description": "What this step does",
      "tool": "tool_name",
      "parameters": { ... },
      "successCriteria": "How to verify success"
    }
  ],
  "estimatedDuration": 5000,
  "dependencies": ["external_api", "database"]
}

Think step by step:
1. What information do I need to gather?
2. What tools can help me?
3. What's the logical order of operations?
4. How do I verify each step succeeded?
5. What could go wrong and how to handle it?
`;

    const response = await this.callLLM(planningPrompt, {
      temperature: 0.3,
      maxTokens: 2000,
    });

    // Parse and validate plan
    const plan = JSON.parse(response);
    this.validatePlan(plan);
    
    logger.info(`📋 Agent created plan with ${plan.steps.length} steps`);
    return plan;
  }

  /**
   * Execute plan step by step with error handling
   */
  private async executePlan(plan: TaskPlan): Promise<any> {
    const results: any[] = [];
    
    for (const step of plan.steps) {
      this.emit('step:started', step);
      logger.info(`⚡ Executing step: ${step.description}`);
      
      try {
        // Get tool
        const tool = this.toolRegistry.getTool(step.tool);
        if (!tool) {
          throw new Error(`Tool ${step.tool} not found`);
        }

        // Execute tool
        const result = await tool.execute(step.parameters, this.context);
        
        // Verify success
        const verified = await this.verifyStepSuccess(step, result);
        if (!verified) {
          throw new Error(`Step verification failed: ${step.successCriteria}`);
        }

        results.push(result);
        this.emit('step:completed', { step, result });
        logger.info(`✅ Step completed: ${step.description}`);
        
      } catch (error) {
        this.emit('step:failed', { step, error });
        logger.error(`❌ Step failed: ${step.description}`, error);
        
        // Try to recover
        const recovered = await this.recoverFromStepFailure(step, error as Error);
        if (!recovered) {
          throw error;
        }
        results.push(recovered);
      }
    }

    return results;
  }

  /**
   * AI-driven verification of step success
   */
  private async verifyStepSuccess(step: PlanStep, result: any): Promise<boolean> {
    const verificationPrompt = `
Verify if this step succeeded:

Step: ${step.description}
Success Criteria: ${step.successCriteria}
Result: ${JSON.stringify(result, null, 2)}

Did this step succeed? Respond with JSON:
{
  "success": true/false,
  "reasoning": "Why it succeeded or failed"
}
`;

    const response = await this.callLLM(verificationPrompt, { temperature: 0.1 });
    const verification = JSON.parse(response);
    
    return verification.success;
  }

  /**
   * Autonomous error recovery
   */
  private async recoverFromStepFailure(step: PlanStep, error: Error): Promise<any> {
    const recoveryPrompt = `
A step failed during execution. Propose a recovery strategy.

Failed Step: ${step.description}
Error: ${error.message}
Available Tools: ${Array.from(this.toolRegistry.getTools()).map(t => t.name).join(', ')}

Propose recovery as JSON:
{
  "canRecover": true/false,
  "strategy": "What to try instead",
  "alternativeStep": { ... } // Alternative step definition
}
`;

    const response = await this.callLLM(recoveryPrompt);
    const recovery = JSON.parse(response);
    
    if (!recovery.canRecover) {
      throw error;
    }

    // Try alternative approach
    const tool = this.toolRegistry.getTool(recovery.alternativeStep.tool);
    if (!tool) throw error;
    
    logger.info(`🔄 Agent attempting recovery: ${recovery.strategy}`);
    return await tool.execute(recovery.alternativeStep.parameters, this.context);
  }

  /**
   * Handle overall execution failure
   */
  private async handleExecutionError(error: Error, task: Task): Promise<any> {
    const retryPrompt = `
Task execution failed. Should we retry with a different approach?

Original Task: ${task.description}
Error: ${error.message}
Failed Plan: ${JSON.stringify(task.plan, null, 2)}

Analyze and respond with JSON:
{
  "shouldRetry": true/false,
  "newApproach": "Description of alternative approach",
  "explanation": "Why the original approach failed and why new approach will work"
}
`;

    const response = await this.callLLM(retryPrompt);
    const analysis = JSON.parse(response);
    
    if (!analysis.shouldRetry) {
      throw error;
    }

    // Retry with new approach
    this.emit('task:retrying', { task, analysis });
    logger.info(`🔄 Agent retrying with new approach: ${analysis.newApproach}`);
    return await this.executeTask(analysis.newApproach);
  }

  /**
   * Call LLM with automatic failover
   */
  private async callLLM(prompt: string, options: any = {}): Promise<string> {
    try {
      // Try Gemini first
      return await this.geminiService.generate(prompt, options);
    } catch (error) {
      logger.warn('Gemini failed, trying Groq', error);
      try {
        return await this.groqService.generate(prompt, options);
      } catch (groqError) {
        logger.error('All LLM providers failed', { geminiError: error, groqError });
        throw new Error('All AI providers failed');
      }
    }
  }

  /**
   * Register default tools
   */
  private registerDefaultTools() {
    // Web Search
    this.toolRegistry.registerTool({
      name: 'web_search',
      description: 'Search the web for current information',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          limit: { type: 'number', default: 10 },
        },
        required: ['query'],
      },
      execute: async (params) => {
        return await this.webSearch(params.query, params.limit);
      },
    });

    // Code Execution
    this.toolRegistry.registerTool({
      name: 'execute_code',
      description: 'Execute Python/JavaScript code in sandbox',
      parameters: {
        type: 'object',
        properties: {
          language: { type: 'string', enum: ['python', 'javascript'] },
          code: { type: 'string' },
        },
        required: ['language', 'code'],
      },
      execute: async (params) => {
        return await this.executeSandboxedCode(params.language, params.code);
      },
    });

    // Research Papers
    this.toolRegistry.registerTool({
      name: 'search_research',
      description: 'Search academic papers on arXiv, Semantic Scholar',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          sources: { type: 'array', items: { type: 'string' } },
        },
        required: ['query'],
      },
      execute: async (params) => {
        return await this.searchResearchPapers(params.query, params.sources);
      },
    });

    // Run Simulation
    this.toolRegistry.registerTool({
      name: 'run_simulation',
      description: 'Run mechanical/engineering simulation',
      parameters: {
        type: 'object',
        properties: {
          blueprintId: { type: 'string' },
          parameters: { type: 'object' },
        },
        required: ['blueprintId'],
      },
      execute: async (params) => {
        return await this.runSimulation(params.blueprintId, params.parameters);
      },
    });

    // File Operations
    this.toolRegistry.registerTool({
      name: 'read_file',
      description: 'Read contents of a file',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string' },
        },
        required: ['path'],
      },
      execute: async (params) => {
        return await this.readFile(params.path);
      },
    });

    this.toolRegistry.registerTool({
      name: 'write_file',
      description: 'Write or create a file',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          content: { type: 'string' },
        },
        required: ['path', 'content'],
      },
      execute: async (params) => {
        return await this.writeFile(params.path, params.content);
      },
    });

    logger.info(`🔧 Registered ${this.toolRegistry.getTools().length} default tools`);
  }

  // Tool implementations
  private async webSearch(query: string, limit: number = 10) {
    // Implementation would use a search API
    return { query, results: [], message: 'Web search not implemented yet' };
  }

  private async executeSandboxedCode(language: string, code: string) {
    // Implementation would use a code execution service
    return { language, code, output: 'Code execution not implemented yet' };
  }

  private async searchResearchPapers(query: string, sources: string[]) {
    // Implementation would use academic search APIs
    return { query, sources, results: [], message: 'Research search not implemented yet' };
  }

  private async runSimulation(blueprintId: string, parameters: any) {
    // Implementation would integrate with simulation engine
    return { blueprintId, parameters, results: {}, message: 'Simulation not implemented yet' };
  }

  private async readFile(path: string) {
    // Implementation would read from project storage
    return { path, content: 'File reading not implemented yet' };
  }

  private async writeFile(path: string, content: string) {
    // Implementation would write to project storage
    return { path, content, message: 'File writing not implemented yet' };
  }

  private validatePlan(plan: any) {
    if (!plan.steps || !Array.isArray(plan.steps)) {
      throw new Error('Invalid plan: missing steps array');
    }
    if (plan.steps.length === 0) {
      throw new Error('Invalid plan: no steps defined');
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}