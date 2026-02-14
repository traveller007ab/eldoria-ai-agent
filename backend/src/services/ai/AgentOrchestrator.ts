import { EventEmitter } from 'events';
import { logger } from '@/utils/logger';
import { GeminiService } from './GeminiService';
import { GroqService } from './GroqService';
import { ToolRegistry } from './ToolRegistry';
import { SearchService } from '../SearchService';
import { CodeExecutionService } from '../CodeExecutionService';
import { AcademicSearchService } from '../AcademicSearchService';
import { SimulationService } from '../SimulationService';
import { FileStorageService } from '../FileStorageService';
import { InterAgentCommunication } from '../InterAgentCommunication';

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
  private searchService: SearchService;
  private codeExecutionService: CodeExecutionService;
  private academicSearchService: AcademicSearchService;
  private simulationService: SimulationService;
  private fileStorageService: FileStorageService;
  private interAgentCommunication: InterAgentCommunication;

  constructor(context: AgentContext) {
    super();
    this.context = context;
    this.toolRegistry = new ToolRegistry();
    this.geminiService = new GeminiService();
    this.groqService = new GroqService();
    this.searchService = new SearchService();
    this.codeExecutionService = new CodeExecutionService();
    this.academicSearchService = new AcademicSearchService();
    this.simulationService = new SimulationService();
    this.fileStorageService = new FileStorageService();
    this.interAgentCommunication = new InterAgentCommunication();
    
    this.registerDefaultTools();
    this.registerAgentForCommunication();
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

    // Enhanced planning with context awareness and multi-step reasoning
    const planningPrompt = `
You are an AI agent planner for an academic research assistant. Given a user task, create a detailed execution plan.

## Context
- User: ${this.context.userId}
- Project: ${this.context.projectId || 'general research'}
- Session: ${this.context.sessionId}
- Available tools: ${availableTools.length} tools

## User Task
${userInput}

## Available Tools
${availableTools.map(t => `
### ${t.name}
- **Description**: ${t.description}
- **Parameters**: ${JSON.stringify(t.parameters)}
- **Use cases**: ${this.getToolUseCases(t.name)}`).join('\n')}

## Planning Guidelines
1. **Understand the task**: Analyze what the user is asking for
2. **Break it down**: Divide into logical sub-tasks
3. **Tool selection**: Choose the most appropriate tools for each step
4. **Order matters**: Consider dependencies between steps
5. **Error handling**: Anticipate potential issues
6. **Validation**: Define clear success criteria

## Required Output Format
Create a plan as JSON with this exact structure:
{
  "steps": [
    {
      "id": "step_unique_id",
      "description": "Clear description of what this step accomplishes",
      "tool": "tool_name_from_available_tools",
      "parameters": {"param": "value"},
      "successCriteria": "Specific, measurable criteria for success",
      "expectedOutput": "What this step should produce",
      "dependencies": ["step_id_1", "step_id_2"] // optional
    }
  ],
  "estimatedDurationMs": 10000,
  "requiredResources": ["api_access", "compute"],
  "potentialRisks": ["risk_description"],
  "mitigationStrategies": ["how_to_handle_risk"]
}

## Example Plan
For a task like "Find recent papers on AI in healthcare and summarize key findings":
{
  "steps": [
    {
      "id": "search_papers",
      "description": "Search academic databases for recent AI healthcare papers",
      "tool": "search_research",
      "parameters": {"query": "AI in healthcare", "sources": ["arXiv", "PubMed"]},
      "successCriteria": "At least 5 relevant papers found from 2023-2024",
      "expectedOutput": "List of academic papers with metadata"
    },
    {
      "id": "analyze_papers",
      "description": "Extract and summarize key findings",
      "tool": "execute_code",
      "parameters": {"language": "python", "code": "...summary code..."},
      "successCriteria": "Structured summary with key contributions and methodologies",
      "expectedOutput": "JSON summary of findings",
      "dependencies": ["search_papers"]
    }
  ],
  "estimatedDurationMs": 15000,
  "requiredResources": ["arxiv_api", "python_sandbox"],
  "potentialRisks": ["No recent papers found", "API rate limits"],
  "mitigationStrategies": ["Expand search terms", "Implement retry logic"]
}

## Your Analysis
Analyze the user task and create an optimal plan:`;

    // Define the expected response schema
    const responseSchema = {
      type: 'object',
      properties: {
        steps: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              description: { type: 'string' },
              tool: { type: 'string' },
              parameters: { type: 'object' },
              successCriteria: { type: 'string' },
              expectedOutput: { type: 'string' },
              dependencies: { 
                type: 'array',
                items: { type: 'string' }
              }
            },
            required: ['id', 'description', 'tool', 'parameters', 'successCriteria']
          }
        },
        estimatedDurationMs: { type: 'number' },
        requiredResources: { 
          type: 'array',
          items: { type: 'string' }
        },
        potentialRisks: { 
          type: 'array',
          items: { type: 'string' }
        },
        mitigationStrategies: { 
          type: 'array',
          items: { type: 'string' }
        }
      },
      required: ['steps', 'estimatedDurationMs']
    };

    // Use structured LLM call for more reliable JSON output
    const planData = await this.callLLMWithStructuredOutput(planningPrompt, responseSchema, {
      temperature: 0.2, // Lower temperature for more deterministic planning
      maxTokens: 3000,
    });

    // Validate and enhance the plan
    const validatedPlan = this.validateAndEnhancePlan(planData, availableTools);
    
    logger.info(`📋 Agent created enhanced plan with ${validatedPlan.steps.length} steps`);
    logger.debug('Created plan:', JSON.stringify(validatedPlan, null, 2));
    
    return validatedPlan;
  }

  private getToolUseCases(toolName: string): string {
    // Provide specific use cases for each tool to help the LLM make better decisions
    const useCases: Record<string, string> = {
      web_search: 'Finding general information, current events, definitions, and non-academic resources',
      search_research: 'Discovering academic papers, research articles, and scholarly publications',
      execute_code: 'Running data analysis, processing research data, performing calculations',
      run_simulation: 'Executing engineering simulations, physics models, and computational experiments',
      read_file: 'Accessing project documents, reading research notes, loading configuration files',
      write_file: 'Saving research results, storing analysis outputs, creating reports'
    };

    return useCases[toolName] || 'General purpose tool for various tasks';
  }

  private validateAndEnhancePlan(planData: any, availableTools: any[]): TaskPlan {
    // Validate the plan structure
    if (!planData.steps || !Array.isArray(planData.steps) || planData.steps.length === 0) {
      throw new Error('Invalid plan: no steps defined');
    }

    // Enhance each step
    const enhancedSteps = planData.steps.map((step: any) => {
      // Validate tool exists
      const toolExists = availableTools.some(t => t.name === step.tool);
      if (!toolExists) {
        throw new Error(`Invalid tool specified: ${step.tool}`);
      }

      // Add automatic step ID if missing
      if (!step.id || step.id.trim() === '') {
        step.id = `step_${Math.random().toString(36).substring(2, 8)}`;
      }

      // Ensure parameters is an object
      if (!step.parameters || typeof step.parameters !== 'object') {
        step.parameters = {};
      }

      // Add execution metadata
      return {
        ...step,
        _enhanced: true,
        _toolValidated: true
      };
    });

    // Calculate more accurate duration estimate
    const estimatedDuration = this.calculatePlanDuration(enhancedSteps);

    return {
      steps: enhancedSteps,
      estimatedDuration: estimatedDuration,
      dependencies: planData.dependencies || [],
      metadata: {
        originalSteps: planData.steps.length,
        enhancedSteps: enhancedSteps.length,
        validationTimestamp: new Date().toISOString(),
        potentialRisks: planData.potentialRisks || [],
        mitigationStrategies: planData.mitigationStrategies || []
      }
    };
  }

  private calculatePlanDuration(steps: any[]): number {
    // Estimate duration based on step complexity
    const baseDurationPerStep = 2000; // 2 seconds base per step
    
    let totalDuration = 0;
    
    steps.forEach(step => {
      let stepDuration = baseDurationPerStep;
      
      // Adjust based on tool complexity
      if (step.tool === 'execute_code' || step.tool === 'run_simulation') {
        stepDuration *= 3; // Complex tools take longer
      } else if (step.tool === 'search_research') {
        stepDuration *= 2; // Search might take longer
      }
      
      // Adjust based on dependencies
      if (step.dependencies && step.dependencies.length > 0) {
        stepDuration *= 1.5; // Steps with dependencies might need coordination
      }
      
      totalDuration += stepDuration;
    });

    // Add buffer
    return Math.round(totalDuration * 1.2);
  }

  /**
   * Execute plan step by step with error handling
   */
  private async executePlan(plan: TaskPlan): Promise<any> {
    const results: any[] = [];
    
    // Check if this plan requires inter-agent coordination
    const requiresCoordination = this.planRequiresCoordination(plan);
    
    if (requiresCoordination) {
      logger.info('🤝 Plan requires inter-agent coordination');
      return this.executeCoordinatedPlan(plan);
    }
    
    // Execute simple plan sequentially
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

  private planRequiresCoordination(plan: TaskPlan): boolean {
    // Determine if this plan requires coordination with other agents
    const description = this.context.conversationHistory
      .map(msg => msg.content)
      .join(' ')
      .toLowerCase();
    
    // Check for coordination indicators
    const coordinationIndicators = [
      'team', 'collaborate', 'coordinate', 'multiple agents',
      'divide work', 'parallel', 'distribute', 'delegate'
    ];
    
    return coordinationIndicators.some(indicator => description.includes(indicator));
  }

  private async executeCoordinatedPlan(plan: TaskPlan): Promise<any> {
    logger.info('🎯 Starting coordinated plan execution');
    
    try {
      // Identify potential agents for coordination
      const potentialAgents = this.identifyPotentialAgents(plan);
      
      if (potentialAgents.length === 0) {
        logger.warn('🤷 No suitable agents found for coordination, executing sequentially');
        return this.executePlan(plan); // Fall back to sequential execution
      }
      
      // Negotiate task distribution
      const taskDistribution = await this.negotiateTaskDistribution(plan, potentialAgents);
      
      if (!taskDistribution) {
        logger.warn('❌ Task negotiation failed, executing sequentially');
        return this.executePlan(plan); // Fall back to sequential execution
      }
      
      // Coordinate task execution
      const coordinationResult = await this.coordinateTaskExecution(plan, taskDistribution);
      
      if (!coordinationResult.success) {
        logger.warn(`⚠️ Coordination completed with ${coordinationResult.errors.length} errors`);
        // Try to recover from coordination failures
        return this.handleCoordinationFailure(plan, coordinationResult);
      }
      
      logger.info('🎉 Coordinated plan execution completed successfully');
      return this.aggregateCoordinationResults(coordinationResult);
      
    } catch (error) {
      logger.error('❌ Coordinated plan execution failed:', error);
      // Fall back to sequential execution
      return this.executePlan(plan);
    }
  }

  private identifyPotentialAgents(plan: TaskPlan): string[] {
    // Identify agents that might be able to help with this plan
    const allAgents = this.interAgentCommunication.getRegisteredAgents();
    
    // Filter out ourselves
    const agentId = this.context.projectId 
      ? `orchestrator_${this.context.projectId}`
      : `orchestrator_${this.context.sessionId}`;
    
    return allAgents.filter(id => id !== agentId);
  }

  private async negotiateTaskDistribution(
    plan: TaskPlan,
    potentialAgents: string[]
  ): Promise<{ agent: string; steps: any[] } | null> {
    try {
      // Create task description from plan
      const taskDescription = this.createTaskDescriptionFromPlan(plan);
      
      // Use the inter-agent communication system to negotiate
      const negotiationResult = await this.interAgentCommunication.negotiateTask(
        this.getAgentId(),
        {
          description: taskDescription,
          planComplexity: plan.steps.length,
          estimatedDurationMs: plan.estimatedDuration
        },
        potentialAgents
      );
      
      return negotiationResult;
      
    } catch (error) {
      logger.error('Task negotiation failed:', error);
      return null;
    }
  }

  private createTaskDescriptionFromPlan(plan: TaskPlan): string {
    const stepDescriptions = plan.steps.map(step => `
      - ${step.description} (using ${step.tool})`).join('\n');
    
    return `Coordinate execution of a ${plan.steps.length}-step plan:
${stepDescriptions}

Estimated duration: ${plan.estimatedDuration}ms
Complexity: ${this.estimatePlanComplexity(plan)}`;
  }

  private estimatePlanComplexity(plan: TaskPlan): 'low' | 'medium' | 'high' {
    if (plan.steps.length <= 2) return 'low';
    if (plan.steps.length <= 5) return 'medium';
    return 'high';
  }

  private getAgentId(): string {
    return this.context.projectId 
      ? `orchestrator_${this.context.projectId}`
      : `orchestrator_${this.context.sessionId}`;
  }

  private async coordinateTaskExecution(
    plan: TaskPlan,
    taskDistribution: { agent: string; steps: any[] }
  ): Promise<{ success: boolean; responses: any[]; errors: any[] }> {
    try {
      // For now, we'll use the simple coordination method
      // In a full implementation, this would distribute steps to different agents
      return this.interAgentCommunication.coordinateTask(
        this.getAgentId(),
        `Execute coordinated plan with ${plan.steps.length} steps`,
        [taskDistribution.agent]
      );
      
    } catch (error) {
      logger.error('Task coordination failed:', error);
      return { success: false, responses: [], errors: [error instanceof Error ? error.message : 'Coordination failed'] };
    }
  }

  private async handleCoordinationFailure(
    plan: TaskPlan,
    coordinationResult: { success: boolean; responses: any[]; errors: any[] }
  ): Promise<any> {
    logger.info('🔄 Attempting to recover from coordination failure');
    
    // Analyze which steps failed
    const failedSteps = coordinationResult.errors.map(error => {
      // Try to map errors to specific steps
      return {
        error: error.error || error,
        step: this.findRelatedStep(plan, error)
      };
    });
    
    // Execute failed steps sequentially
    const recoveryResults: any[] = [];
    
    for (const failure of failedSteps) {
      if (failure.step) {
        try {
          logger.info(`🔧 Recovering step: ${failure.step.description}`);
          
          const tool = this.toolRegistry.getTool(failure.step.tool);
          if (tool) {
            const result = await tool.execute(failure.step.parameters, this.context);
            recoveryResults.push(result);
            logger.info(`✅ Recovery successful for: ${failure.step.description}`);
          }
        } catch (recoveryError) {
          logger.error(`❌ Recovery failed for step: ${failure.step.description}`, recoveryError);
        }
      }
    }
    
    // Combine successful coordination results with recovery results
    const successfulResults = coordinationResult.responses
      .filter(r => r.status === 'success')
      .map(r => r.response);
    
    return [...successfulResults, ...recoveryResults];
  }

  private findRelatedStep(plan: TaskPlan, error: any): any | null {
    // Simple heuristic to find related step
    const errorString = JSON.stringify(error).toLowerCase();
    
    for (const step of plan.steps) {
      const stepString = JSON.stringify(step).toLowerCase();
      
      if (stepString.includes(errorString) || errorString.includes(stepString)) {
        return step;
      }
    }
    
    return null;
  }

  private aggregateCoordinationResults(
    coordinationResult: { success: boolean; responses: any[]; errors: any[] }
  ): any {
    // Aggregate results from multiple agents
    const aggregatedResults = coordinationResult.responses
      .filter(r => r.status === 'success')
      .map(r => r.response);
    
    return {
      coordinationSuccess: true,
      agentResponses: coordinationResult.responses.length,
      successfulResponses: aggregatedResults.length,
      errors: coordinationResult.errors,
      results: aggregatedResults
    };
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
      return await this.geminiService.generate(prompt, {
        temperature: options.temperature || 0.7,
        maxTokens: options.maxTokens || 2000,
        topP: options.topP || 0.9,
        topK: options.topK || 40,
      });
    } catch (error) {
      logger.warn('Gemini failed, trying Groq', error);
      try {
        return await this.groqService.generate(prompt, {
          temperature: options.temperature || 0.7,
          max_tokens: options.maxTokens || 2000,
          top_p: options.topP || 0.9,
        });
      } catch (groqError) {
        logger.error('All LLM providers failed', { geminiError: error, groqError });
        throw new Error('All AI providers failed');
      }
    }
  }

  private async callLLMWithStructuredOutput(
    prompt: string,
    responseSchema: any,
    options: any = {}
  ): Promise<any> {
    try {
      // Create a structured prompt that guides the LLM to produce JSON output
      const structuredPrompt = `
${prompt}

IMPORTANT: Respond ONLY with valid JSON that matches this schema:
${JSON.stringify(responseSchema, null, 2)}

Your response must be parseable JSON with no additional text before or after.
`;

      const response = await this.callLLM(structuredPrompt, {
        temperature: options.temperature || 0.3,
        maxTokens: options.maxTokens || 2000,
      });

      // Try to parse the JSON response
      try {
        // Clean up the response by removing any markdown code blocks
        const cleanedResponse = response
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .replace(/\n/g, ' ')
          .trim();

        const parsed = JSON.parse(cleanedResponse);
        return parsed;
      } catch (parseError) {
        logger.error('Failed to parse LLM structured response:', parseError);
        throw new Error('LLM response parsing failed');
      }
    } catch (error) {
      logger.error('Structured LLM call failed:', error);
      throw error instanceof Error ? error : new Error('Structured LLM call failed');
    }
  }

  /**
   * Register default tools
   */
  private registerAgentForCommunication(): void {
    // Register this orchestrator as an agent in the communication system
    const agentId = this.context.projectId 
      ? `orchestrator_${this.context.projectId}`
      : `orchestrator_${this.context.sessionId}`;
    
    this.interAgentCommunication.registerAgent(agentId);
    
    // Subscribe to relevant message types
    this.interAgentCommunication.subscribe(agentId, ['request', 'notification'], (message) => {
      this.handleIncomingMessage(message);
    });
    
    logger.info(`🤖 Registered as agent: ${agentId}`);
  }

  private handleIncomingMessage(message: any): void {
    try {
      logger.debug(`📩 Received message: ${message.type} from ${message.sender}`);
      
      if (message.type === 'request') {
        this.handleAgentRequest(message);
      } else if (message.type === 'notification') {
        this.handleAgentNotification(message);
      }
    } catch (error) {
      logger.error(`Failed to handle incoming message:`, error);
    }
  }

  private async handleAgentRequest(request: any): Promise<void> {
    try {
      logger.info(`🤝 Handling request from ${request.sender}: ${request.content?.description || 'no description'}`);
      
      // Create a response
      const response: any = {
        id: `${request.id}:response`,
        sender: request.recipient, // We're the recipient, now sender of response
        recipient: request.sender,
        type: 'response' as const,
        content: {},
        timestamp: new Date().toISOString(),
        correlationId: request.correlationId,
        requestId: request.id,
        status: 'success' as const
      };
      
      // Handle different types of requests
      if (request.content?.taskId) {
        // This is a coordinated task request
        response.content.taskStatus = 'accepted';
        response.content.message = `Task ${request.content.taskId} accepted for processing`;
        
      } else if (request.content?.negotiationId) {
        // This is a task negotiation request
        const canHandle = this.canHandleTask(request.content.task);
        
        if (canHandle) {
          response.content.accept = true;
          response.content.estimatedCompletionTimeMs = this.estimateTaskCompletion(request.content.task);
          response.content.priority = this.determineTaskPriority(request.content.task);
        } else {
          response.status = 'failure';
          response.content.accept = false;
          response.content.reason = 'Task type not supported by this agent';
        }
      }
      
      // Send the response
      await this.interAgentCommunication.sendMessage(response);
      
    } catch (error) {
      logger.error(`Failed to handle agent request:`, error);
      
      // Send error response
      const errorResponse: any = {
        id: `${request.id}:error`,
        sender: request.recipient,
        recipient: request.sender,
        type: 'error' as const,
        content: {
          error: error instanceof Error ? error.message : 'Unknown error processing request'
        },
        timestamp: new Date().toISOString(),
        correlationId: request.correlationId,
        requestId: request.id,
        status: 'failure' as const
      };
      
      this.interAgentCommunication.sendMessage(errorResponse).catch(() => {
        // Silent failure for error responses
      });
    }
  }

  private async handleAgentNotification(notification: any): Promise<void> {
    try {
      logger.info(`📢 Notification from ${notification.sender}: ${notification.content?.message || 'no message'}`);
      
      // Handle different types of notifications
      if (notification.content?.status === 'selected') {
        // We were selected for a task
        this.emit('task:selected', {
          taskId: notification.content.negotiationId,
          initiator: notification.sender
        });
      }
      
    } catch (error) {
      logger.error(`Failed to handle agent notification:`, error);
    }
  }

  private canHandleTask(task: any): boolean {
    // Determine if this agent can handle the specified task
    if (!task || !task.description) {
      return false;
    }
    
    const description = task.description.toLowerCase();
    
    // This orchestrator can handle research and coordination tasks
    const canHandle = description.includes('research') || 
                     description.includes('coordinate') ||
                     description.includes('plan') ||
                     description.includes('organize');
    
    return canHandle;
  }

  private estimateTaskCompletion(task: any): number {
    // Simple estimation based on task description length
    const descriptionLength = task.description?.length || 100;
    return Math.min(30000, descriptionLength * 50); // Max 30 seconds
  }

  private determineTaskPriority(task: any): 'low' | 'normal' | 'high' {
    // Determine priority based on task urgency indicators
    const description = task.description?.toLowerCase() || '';
    
    if (description.includes('urgent') || description.includes('immediate')) {
      return 'high';
    } else if (description.includes('important') || description.includes('priority')) {
      return 'normal';
    } else {
      return 'low';
    }
  }

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
    try {
      const results = await this.searchService.search(query, limit);
      
      return {
        query,
        results,
        success: true,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error(`Web search failed for query "${query}":`, error);
      
      return {
        query,
        results: [],
        success: false,
        error: error instanceof Error ? error.message : 'Unknown search error',
        timestamp: new Date().toISOString()
      };
    }
  }

  private async executeSandboxedCode(language: string, code: string) {
    try {
      // Validate language
      if (language !== 'python' && language !== 'javascript') {
        throw new Error(`Unsupported language: ${language}`);
      }

      // Execute code safely with sandboxing
      const result = await this.codeExecutionService.executeSafeCode(
        code,
        language as 'python' | 'javascript',
        {
          timeoutMs: 15000, // 15 seconds timeout
          memoryLimitMb: 256, // 256MB memory limit
          allowNetwork: false, // No network access by default
        }
      );

      if (!result.success) {
        return {
          language,
          code,
          success: false,
          error: result.error || 'Code execution failed',
          output: result.output,
          executionTimeMs: result.executionTimeMs,
          timestamp: new Date().toISOString()
        };
      }

      return {
        language,
        code,
        success: true,
        output: result.output || '',
        executionTimeMs: result.executionTimeMs,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error(`Code execution failed for ${language}:`, error);
      
      return {
        language,
        code,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown execution error',
        timestamp: new Date().toISOString()
      };
    }
  }

  private async searchResearchPapers(query: string, sources: string[]) {
    try {
      // Parse filters from sources if provided
      const filters: Record<string, any> = {};
      
      if (sources && sources.length > 0) {
        // Check if sources contain filter parameters
        sources.forEach(source => {
          if (source.includes(':')) {
            const [key, value] = source.split(':');
            filters[key.trim()] = value.trim();
          }
        });
      }

      // Search for academic papers
      const results = await this.academicSearchService.searchPapers(query, 10, filters);

      return {
        query,
        sources: this.academicSearchService.getAvailableProviders(),
        results,
        success: true,
        count: results.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error(`Academic search failed for query "${query}":`, error);
      
      return {
        query,
        sources: [],
        results: [],
        success: false,
        error: error instanceof Error ? error.message : 'Unknown academic search error',
        timestamp: new Date().toISOString()
      };
    }
  }

  private async runSimulation(blueprintId: string, parameters: any) {
    try {
      // Run the simulation using our simulation service
      const result = await this.simulationService.runSimulation(blueprintId, parameters, {
        timeoutMs: 30000, // 30 seconds timeout
        allowNetwork: false, // No network access for security
      });

      if (!result.success) {
        return {
          blueprintId,
          parameters,
          success: false,
          error: result.error || 'Simulation execution failed',
          executionTimeMs: result.executionTimeMs,
          timestamp: new Date().toISOString()
        };
      }

      return {
        blueprintId,
        parameters,
        success: true,
        results: result.output || {},
        metrics: result.metrics,
        executionTimeMs: result.executionTimeMs,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error(`Simulation failed for blueprint ${blueprintId}:`, error);
      
      return {
        blueprintId,
        parameters,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown simulation error',
        timestamp: new Date().toISOString()
      };
    }
  }

  private async readFile(path: string) {
    try {
      // Extract project ID from context or use default
      const projectId = this.context.projectId || 'default';
      
      const result = await this.fileStorageService.readFile(projectId, path);
      
      return {
        path,
        content: result.content,
        success: true,
        metadata: result.metadata,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error(`File read failed for path "${path}":`, error);
      
      return {
        path,
        content: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown file read error',
        timestamp: new Date().toISOString()
      };
    }
  }

  private async writeFile(path: string, content: string) {
    try {
      // Extract project ID from context or use default
      const projectId = this.context.projectId || 'default';
      
      const metadata = await this.fileStorageService.writeFile(projectId, path, content, {
        overwrite: true
      });
      
      return {
        path,
        content,
        success: true,
        metadata,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error(`File write failed for path "${path}":`, error);
      
      return {
        path,
        content,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown file write error',
        timestamp: new Date().toISOString()
      };
    }
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