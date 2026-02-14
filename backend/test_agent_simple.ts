// Simple test to verify the agentic system is working
import { AgentOrchestrator } from './src/services/ai/AgentOrchestrator';
import { logger } from './src/utils/logger';

async function runSimpleTest() {
  logger.info('🧪 Running Simple Agent Test...\n');

  try {
    // Test 1: Basic initialization
    logger.info('Test 1: Agent Orchestrator Initialization');
    const context = {
      userId: 'test_user',
      sessionId: 'test_session',
      projectId: 'test_project',
      conversationHistory: [],
      availableTools: []
    };

    const orchestrator = new AgentOrchestrator(context);
    
    if (!orchestrator || typeof orchestrator.executeTask !== 'function') {
      throw new Error('Orchestrator not properly initialized');
    }
    
    logger.info('✅ Agent Orchestrator initialized successfully');

    // Test 2: Simple task execution
    logger.info('\nTest 2: Simple Task Execution');
    const simpleTask = 'Analyze the concept of autonomous agents';
    
    const result = await orchestrator.executeTask(simpleTask);
    
    if (!result) {
      throw new Error('Task execution returned no result');
    }
    
    logger.info('✅ Simple task executed successfully');
    logger.info('Result:', JSON.stringify(result, null, 2));

    logger.info('\n🎉 All simple tests passed!');
    logger.info('The agentic system is working correctly.');

  } catch (error) {
    logger.error('❌ Test failed:', error);
    process.exit(1);
  }
}

runSimpleTest().catch(error => {
  logger.error('Fatal error in test:', error);
  process.exit(1);
});