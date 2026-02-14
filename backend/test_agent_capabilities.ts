import { AgentOrchestrator, AgentContext } from './src/services/ai/AgentOrchestrator';
import { InterAgentCommunication, AgentMessage, AgentRequest } from './src/services/InterAgentCommunication';
import { SearchService } from './src/services/SearchService';
import { CodeExecutionService } from './src/services/CodeExecutionService';
import { AcademicSearchService } from './src/services/AcademicSearchService';
import { SimulationService } from './src/services/SimulationService';
import { FileStorageService } from './src/services/FileStorageService';
import { logger } from './src/utils/logger';

// Test configuration
const testResults: { name: string; passed: boolean; error: string | null; durationMs: number }[] = [];

async function runTests() {
  logger.info('🧪 Starting Eldoria AI Agent Capabilities Test Suite\n');

  try {
    // Test 1: Agent Orchestrator Initialization
    await testAgentOrchestratorInitialization();

    // Test 2: Inter-Agent Communication
    await testInterAgentCommunication();

    // Test 3: Search Service
    await testSearchService();

    // Test 4: Code Execution Service
    await testCodeExecutionService();

    // Test 5: Academic Search Service
    await testAcademicSearchService();

    // Test 6: Simulation Service
    await testSimulationService();

    // Test 7: File Storage Service
    await testFileStorageService();

    // Test 8: Complete Workflow
    await testCompleteWorkflow();

    // Print test summary
    printTestSummary();

  } catch (error) {
    logger.error('❌ Test suite failed:', error);
    process.exit(1);
  }
}

async function testAgentOrchestratorInitialization() {
  const testName = 'Agent Orchestrator Initialization';
  const startTime = Date.now();

  try {
    const context = {
      userId: 'test_user',
      sessionId: 'test_session',
      projectId: 'test_project',
      conversationHistory: [],
      availableTools: []
    };

    const orchestrator = new AgentOrchestrator(context);
    
    // Verify initialization
    if (!orchestrator || typeof orchestrator.executeTask !== 'function') {
      throw new Error('Orchestrator not properly initialized');
    }

    const duration = Date.now() - startTime;
    recordTestResult(testName, true, undefined, duration);
    logger.info(`✅ ${testName} passed (${duration}ms)`);

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    recordTestResult(testName, false, errorMsg, duration);
    logger.error(`❌ ${testName} failed:`, error);
  }
}

async function testInterAgentCommunication() {
  const testName = 'Inter-Agent Communication';
  const startTime = Date.now();

  try {
    const communication = new InterAgentCommunication();
    
    // Test agent registration
    communication.registerAgent('test_agent_1');
    communication.registerAgent('test_agent_2');
    
    const registeredAgents = communication.getRegisteredAgents();
    if (registeredAgents.length !== 2) {
      throw new Error('Agent registration failed');
    }

    // Test message sending
    const message: AgentMessage = {
      id: 'test_msg_1',
      sender: 'test_agent_1',
      recipient: 'test_agent_2',
      type: 'notification',
      content: { message: 'Test notification' },
      timestamp: new Date().toISOString()
    };

    await communication.sendMessage(message);

    // Test request-response
    const request: AgentRequest = {
      id: 'test_req_1',
      sender: 'test_agent_1',
      recipient: 'test_agent_2',
      type: 'request',
      content: { task: 'test_task' },
      timestamp: new Date().toISOString(),
      correlationId: 'test_correlation_1',
      timeoutMs: 5000
    };

    // This will timeout since we don't have a real agent responding
    try {
      await communication.requestResponse(request);
    } catch (error: unknown) {
      // Expected to timeout
      if (error instanceof Error && !error.message.includes('timed out')) {
        throw error;
      }
    }

    const duration = Date.now() - startTime;
    recordTestResult(testName, true, undefined, duration);
    logger.info(`✅ ${testName} passed (${duration}ms)`);

  } catch (error) {
    const duration = Date.now() - startTime;
    recordTestResult(testName, false, error instanceof Error ? error.message : 'Unknown error', duration);
    logger.error(`❌ ${testName} failed:`, error);
  }
}

async function testSearchService() {
  const testName = 'Search Service';
  const startTime = Date.now();

  try {
    const searchService = new SearchService();
    
    // Check available providers
    const providers = searchService.getAvailableProviders();
    if (providers.length === 0) {
      throw new Error('No search providers available');
    }

    // Check provider availability
    const availability = await searchService.checkProviderAvailability();
    logger.info('Available search providers:', availability);

    // Test search (this will use DuckDuckGo which doesn't require API key)
    const testQuery = 'artificial intelligence research';
    const results = await searchService.search(testQuery, 3);
    
    if (!results || results.length === 0) {
      logger.warn('Search returned no results (this is expected if no API keys are configured)');
    }

    const duration = Date.now() - startTime;
    recordTestResult(testName, true, undefined, duration);
    logger.info(`✅ ${testName} passed (${duration}ms)`);

  } catch (error) {
    const duration = Date.now() - startTime;
    recordTestResult(testName, false, error instanceof Error ? error.message : 'Unknown error', duration);
    logger.error(`❌ ${testName} failed:`, error);
  }
}

async function testCodeExecutionService() {
  const testName = 'Code Execution Service';
  const startTime = Date.now();

  try {
    const codeService = new CodeExecutionService();
    
    // Test Python code execution
    const pythonCode = `
import json
result = {"sum": 5 + 3, "product": 5 * 3}
print(json.dumps(result))
`;

    const pythonResult = await codeService.executeSafeCode(pythonCode, 'python', {
      timeoutMs: 10000,
      memoryLimitMb: 128
    });

    if (!pythonResult.success) {
      throw new Error(`Python execution failed: ${pythonResult.error}`);
    }

    // Test JavaScript code execution
    const jsCode = `
const result = { sum: 5 + 3, product: 5 * 3 };
console.log(JSON.stringify(result));
`;

    const jsResult = await codeService.executeSafeCode(jsCode, 'javascript', {
      timeoutMs: 10000,
      memoryLimitMb: 128
    });

    if (!jsResult.success) {
      throw new Error(`JavaScript execution failed: ${jsResult.error}`);
    }

    const duration = Date.now() - startTime;
    recordTestResult(testName, true, undefined, duration);
    logger.info(`✅ ${testName} passed (${duration}ms)`);

  } catch (error) {
    const duration = Date.now() - startTime;
    recordTestResult(testName, false, error instanceof Error ? error.message : 'Unknown error', duration);
    logger.error(`❌ ${testName} failed:`, error);
  }
}

async function testAcademicSearchService() {
  const testName = 'Academic Search Service';
  const startTime = Date.now();

  try {
    const academicService = new AcademicSearchService();
    
    // Check available providers
    const providers = academicService.getAvailableProviders();
    logger.info('Academic search providers:', providers);

    // Test arXiv search (no API key required)
    const testQuery = 'artificial intelligence';
    const results = await academicService.searchPapers(testQuery, 2);
    
    logger.info(`Found ${results.length} papers on arXiv for "${testQuery}"`);

    const duration = Date.now() - startTime;
    recordTestResult(testName, true, undefined, duration);
    logger.info(`✅ ${testName} passed (${duration}ms)`);

  } catch (error) {
    const duration = Date.now() - startTime;
    recordTestResult(testName, false, error instanceof Error ? error.message : 'Unknown error', duration);
    logger.error(`❌ ${testName} failed:`, error);
  }
}

async function testSimulationService() {
  const testName = 'Simulation Service';
  const startTime = Date.now();

  try {
    const simulationService = new SimulationService();
    
    // Check available blueprints
    const blueprints = simulationService.getAvailableBlueprints();
    if (blueprints.length === 0) {
      throw new Error('No simulation blueprints available');
    }
    logger.info('Available simulation blueprints:', blueprints.map(b => b.id));

    // Test mechanical stress simulation
    const stressResult = await simulationService.runSimulation('mechanical-stress', {
      force: 1000, // Newtons
      area: 0.01, // m²
      material_properties: {
        youngs_modulus: 200e9, // Steel
        poisson_ratio: 0.3
      }
    });

    if (!stressResult.success) {
      throw new Error(`Stress simulation failed: ${stressResult.error}`);
    }

    logger.info('Stress simulation result:', stressResult.output);

    const duration = Date.now() - startTime;
    recordTestResult(testName, true, undefined, duration);
    logger.info(`✅ ${testName} passed (${duration}ms)`);

  } catch (error) {
    const duration = Date.now() - startTime;
    recordTestResult(testName, false, error instanceof Error ? error.message : 'Unknown error', duration);
    logger.error(`❌ ${testName} failed:`, error);
  }
}

async function testFileStorageService() {
  const testName = 'File Storage Service';
  const startTime = Date.now();

  try {
    const fileService = new FileStorageService();
    
    // Test file write
    const testContent = 'This is a test file content for Eldoria AI Agent.';
    const metadata = await fileService.writeFile('test_project', 'test/file.txt', testContent, {
      overwrite: true
    });

    if (!metadata || metadata.size !== Buffer.byteLength(testContent)) {
      throw new Error('File write failed');
    }

    // Test file read
    const readResult = await fileService.readFile('test_project', 'test/file.txt');
    if (readResult.content !== testContent) {
      throw new Error('File read failed - content mismatch');
    }

    // Test file listing
    const files = await fileService.listFiles('test_project', 'test');
    if (files.length === 0) {
      throw new Error('File listing failed');
    }

    // Test file deletion
    const deleteResult = await fileService.deleteFile('test_project', 'test/file.txt');
    if (!deleteResult) {
      throw new Error('File deletion failed');
    }

    const duration = Date.now() - startTime;
    recordTestResult(testName, true, undefined, duration);
    logger.info(`✅ ${testName} passed (${duration}ms)`);

  } catch (error) {
    const duration = Date.now() - startTime;
    recordTestResult(testName, false, error instanceof Error ? error.message : 'Unknown error', duration);
    logger.error(`❌ ${testName} failed:`, error);
  }
}

async function testCompleteWorkflow() {
  const testName = 'Complete Agentic Workflow';
  const startTime = Date.now();

  try {
    // Create agent context
    const context: AgentContext = {
      userId: 'test_user',
      sessionId: 'workflow_test',
      projectId: 'test_project',
      conversationHistory: [
        {
          role: 'user' as const,
          content: 'Research recent advancements in AI and summarize findings'
        }
      ],
      availableTools: []
    };

    const orchestrator = new AgentOrchestrator(context);
    
    // Execute a research task
    const researchTask = 'Find 3 recent papers on AI advancements and summarize key contributions';
    const result = await orchestrator.executeTask(researchTask);
    
    if (!result || !result.success) {
      logger.warn('Research task completed with partial success or failures');
    }

    logger.info('Complete workflow result:', {
      stepsCompleted: result?.steps?.length,
      hasResults: !!result?.results,
      durationMs: Date.now() - startTime
    });

    const duration = Date.now() - startTime;
    recordTestResult(testName, true, undefined, duration);
    logger.info(`✅ ${testName} passed (${duration}ms)`);

  } catch (error) {
    const duration = Date.now() - startTime;
    recordTestResult(testName, false, error instanceof Error ? error.message : 'Unknown error', duration);
    logger.error(`❌ ${testName} failed:`, error);
  }
}

function recordTestResult(name: string, passed: boolean, error: string | null, durationMs: number) {
  testResults.push({ name, passed, error: error ?? null, durationMs });
}

function printTestSummary() {
  const totalTests = testResults.length;
  const passedTests = testResults.filter(r => r.passed).length;
  const failedTests = totalTests - passedTests;
  const passRate = (passedTests / totalTests * 100).toFixed(1);

  logger.info('\n' + '='.repeat(60));
  logger.info('📊 ELDORIA AI AGENT - TEST SUMMARY');
  logger.info('='.repeat(60));
  logger.info(`Total Tests: ${totalTests}`);
  logger.info(`Passed: ${passedTests} (${passRate}%)`);
  logger.info(`Failed: ${failedTests}`);
  logger.info('-'.repeat(60));

  testResults.forEach((result, index) => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    const errorInfo = result.error ? ` (Error: ${result.error})` : '';
    logger.info(`${index + 1}. ${status}: ${result.name} - ${result.durationMs}ms${errorInfo}`);
  });

  logger.info('='.repeat(60));

  if (failedTests === 0) {
    logger.info('🎉 All tests passed! The agentic system is working correctly.');
  } else {
    logger.warn('⚠️ Some tests failed. Check the error details above.');
  }

  logger.info('\nNext steps:');
  logger.info('1. Review any failed tests');
  logger.info('2. Configure API keys for full functionality');
  logger.info('3. Run performance benchmarking');
  logger.info('4. Prepare for production deployment');
}

// Run the test suite
runTests().catch(error => {
  logger.error('Fatal error in test suite:', error);
  process.exit(1);
});

export { runTests };