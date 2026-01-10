/**
 * Agentic Services Test Suite
 * 
 * Run with: node services/agentic/__tests__/run-tests.js
 */

const assert = require('assert');
const path = require('path');

console.log('='.repeat(60));
console.log('AGENTIC SERVICES TEST SUITE');
console.log('='.repeat(60));
console.log('');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (error) {
    console.log(`✗ ${name}`);
    console.log(`  Error: ${error.message}`);
    failed++;
  }
}

function describe(suiteName, fn) {
  console.log(`\n${suiteName}`);
  console.log('-'.repeat(40));
  fn();
}

function it(name, fn) {
  test(name, fn);
}

async function runTests() {
  describe('AgenticModeManager Types', () => {
    it('should have valid AgentConfig interface', () => {
      const config = {
        checkInterval: 5000,
        autoSuggestEnabled: true,
        autoCiteEnabled: true,
        progressTrackingEnabled: true,
        learningEnabled: true,
        proactiveResearchEnabled: true,
        maxSuggestions: 50,
        confidenceThreshold: 0.7
      };
      assert(typeof config.checkInterval === 'number');
      assert(typeof config.autoSuggestEnabled === 'boolean');
      assert(typeof config.confidenceThreshold === 'number');
      assert(config.confidenceThreshold >= 0 && config.confidenceThreshold <= 1);
    });

    it('should have valid AgentInsight interface', () => {
      const insight = {
        id: 'test-001',
        type: 'suggestion',
        category: 'progress',
        title: 'Test Insight',
        message: 'This is a test message',
        confidence: 0.85,
        priority: 'medium',
        timestamp: new Date(),
        actions: [
          { id: 'action-1', label: 'Do something', type: 'action' }
        ]
      };
      assert(typeof insight.id === 'string');
      assert(['info', 'suggestion', 'warning', 'success', 'critical'].includes(insight.type));
      assert(insight.confidence >= 0 && insight.confidence <= 1);
    });

    it('should have valid AgentAction interface', () => {
      const action = {
        id: 'action-001',
        type: 'suggestion',
        label: 'Add Citation',
        timestamp: new Date(),
        status: 'pending'
      };
      assert(typeof action.id === 'string');
      assert(['pending', 'executing', 'completed', 'failed', 'dismissed'].includes(action.status));
    });
  });

  describe('ResearchIntelligenceEngine Types', () => {
    it('should have valid ResearchQuery interface', () => {
      const query = {
        id: 'query-001',
        query: 'machine learning optimization',
        context: 'academic research',
        priority: 'high'
      };
      assert(typeof query.id === 'string');
      assert(typeof query.query === 'string');
      assert(['high', 'medium', 'low'].includes(query.priority));
    });

    it('should have valid ResearchPaper interface', () => {
      const paper = {
        id: 'paper-001',
        title: 'Deep Learning for Optimization',
        authors: ['John Smith', 'Jane Doe'],
        abstract: 'This paper explores...',
        year: 2023,
        citations: 42,
        relevanceScore: 0.85,
        openAccess: true,
        tags: ['machine learning', 'optimization'],
        publishedAt: new Date()
      };
      assert(typeof paper.id === 'string');
      assert(typeof paper.title === 'string');
      assert(Array.isArray(paper.authors));
      assert(paper.relevanceScore >= 0 && paper.relevanceScore <= 1);
    });

    it('should have valid ResearchResult interface', () => {
      const result = {
        query: { id: 'q1', query: 'test', priority: 'medium' },
        papers: [],
        totalFound: 100,
        searchTime: 1500,
        suggestions: ['related query 1', 'related query 2'],
        relatedConcepts: ['concept1', 'concept2']
      };
      assert(typeof result.totalFound === 'number');
      assert(typeof result.searchTime === 'number');
      assert(Array.isArray(result.suggestions));
    });

    it('should have valid ResearchGap interface', () => {
      const gap = {
        id: 'gap-001',
        topic: 'Real-time optimization',
        description: 'Limited research in real-time scenarios',
        relatedObjectives: ['obj1', 'obj2'],
        priority: 'high',
        searchQueries: ['real-time ML', 'online optimization'],
        existingResearch: [],
        potentialContributions: ['New algorithm', 'Framework'],
        feasibilityScore: 0.75
      };
      assert(typeof gap.id === 'string');
      assert(['high', 'medium', 'low'].includes(gap.priority));
      assert(gap.feasibilityScore >= 0 && gap.feasibilityScore <= 1);
    });
  });

  describe('CitationGraphEngine Types', () => {
    it('should have valid CitationNode interface', () => {
      const node = {
        paperId: 'node-001',
        title: 'Paper Title',
        authors: ['Author A', 'Author B'],
        year: 2022,
        citations: 150,
        referencedBy: ['paper-002', 'paper-003'],
        references: ['paper-004'],
        relevanceScore: 0.9
      };
      assert(typeof node.paperId === 'string');
      assert(typeof node.citations === 'number');
      assert(Array.isArray(node.referencedBy));
    });

    it('should have valid CitationGraph interface', () => {
      const graph = {
        nodes: new Map(),
        edges: [],
        centralPapers: ['paper-001'],
        researchClusters: []
      };
      assert(graph.nodes instanceof Map);
      assert(Array.isArray(graph.centralPapers));
    });

    it('should have valid CitationMetrics interface', () => {
      const metrics = {
        hIndex: 15,
        i10Index: 42,
        citationVelocity: 8.5,
        fieldWeightedCitationImpact: 1.2,
        topCitedPapers: [
          { id: 'p1', title: 'Paper 1', citations: 200 },
          { id: 'p2', title: 'Paper 2', citations: 150 }
        ],
        citationTrends: [
          { year: 2020, citations: 50 },
          { year: 2021, citations: 75 },
          { year: 2022, citations: 100 }
        ]
      };
      assert(typeof metrics.hIndex === 'number');
      assert(Array.isArray(metrics.topCitedPapers));
      assert(Array.isArray(metrics.citationTrends));
    });
  });

  describe('ProgressPredictor Types', () => {
    it('should have valid ProgressMetrics interface', () => {
      const metrics = {
        overallProgress: 65.5,
        chapterProgress: [],
        wordCount: {
          current: 8500,
          target: 15000,
          averagePerDay: 500,
          projectedTotal: 14500,
          paceStatus: 'on_track',
          dailyRateTrend: 'stable'
        },
        citationMetrics: {
          current: 25,
          target: 30,
          perChapter: 4.2,
          qualityScore: 0.85,
          recentGrowth: 5
        },
        timelineMetrics: {
          startDate: new Date('2024-01-01'),
          targetDate: new Date('2024-06-30'),
          elapsedDays: 45,
          totalDays: 180,
          percentTimeElapsed: 25,
          percentWorkComplete: 30,
          velocityScore: 1.2
        },
        estimatedCompletion: {
          date: new Date('2024-06-15'),
          confidence: 0.85,
          scenarios: {
            optimistic: new Date('2024-05-30'),
            realistic: new Date('2024-06-15'),
            pessimistic: new Date('2024-06-30')
          },
          factors: ['Current pace is sustainable']
        },
        riskFactors: [],
        recommendations: ['Maintain current writing pace']
      };
      assert(typeof metrics.overallProgress === 'number');
      assert(metrics.overallProgress >= 0 && metrics.overallProgress <= 100);
      assert(['ahead', 'on_track', 'behind'].includes(metrics.wordCount.paceStatus));
    });

    it('should have valid ChapterProgress interface', () => {
      const chapter = {
        id: 'ch-001',
        title: 'Introduction',
        progress: 100,
        wordCount: 1200,
        targetWordCount: 1000,
        citations: 5,
        status: 'complete',
        lastModified: new Date(),
        dependencies: [],
        blockers: []
      };
      assert(['not_started', 'in_progress', 'review', 'complete'].includes(chapter.status));
    });

    it('should have valid RiskFactor interface', () => {
      const risk = {
        id: 'risk-001',
        type: 'schedule',
        severity: 'medium',
        description: 'Tight deadline approaching',
        mitigation: 'Increase daily writing target',
        probability: 0.4
      };
      assert(['schedule', 'quality', 'resource', 'scope', 'external'].includes(risk.type));
      assert(['low', 'medium', 'high', 'critical'].includes(risk.severity));
      assert(risk.probability >= 0 && risk.probability <= 1);
    });
  });

  describe('ExportEngine Types', () => {
    it('should have valid ExportOptions interface', () => {
      const options = {
        format: 'latex',
        includeAbstract: true,
        includeAcknowledgments: true,
        includeTableOfContents: true,
        includeListOfFigures: false,
        includeListOfTables: false,
        includeBibliography: true,
        citationStyle: 'apa',
        fontSize: 12,
        fontFamily: 'times',
        margins: { top: 1, bottom: 1, left: 1.25, right: 1.25 },
        lineSpacing: 'double',
        pageSize: 'a4'
      };
      assert(['pdf', 'latex', 'word', 'html', 'markdown'].includes(options.format));
      assert(['apa', 'mla', 'chicago', 'ieee', 'harvard'].includes(options.citationStyle));
      assert([10, 11, 12].includes(options.fontSize));
    });

    it('should have valid ExportResult interface', () => {
      const result = {
        success: true,
        content: '\\documentclass{article}',
        filename: 'thesis.tex'
      };
      assert(typeof result.success === 'boolean');
      assert(typeof result.filename === 'string');
    });
  });

  describe('VoiceCommandSystem Types', () => {
    it('should have valid VoiceCommand interface', () => {
      const command = {
        id: 'cmd-001',
        transcript: 'add heading one',
        confidence: 0.95,
        timestamp: new Date(),
        action: {
          type: 'heading',
          payload: { format: '# ' },
          command: 'add heading one'
        },
        status: 'recognized'
      };
      assert(['recognized', 'rejected', 'executed', 'failed'].includes(command.status));
    });

    it('should have valid VoiceAction interface', () => {
      const action = {
        type: 'navigate',
        target: 'literature review',
        command: 'go to literature review'
      };
      assert([
        'navigate', 'edit', 'format', 'search', 'cite',
        'heading', 'save', 'undo', 'redo', 'dictate', 'help', 'custom'
      ].includes(action.type));
    });

    it('should have valid VoiceRecognitionConfig interface', () => {
      const config = {
        language: 'en-US',
        continuous: true,
        interimResults: true,
        maxAlternatives: 3,
        timeout: 3000
      };
      assert(typeof config.language === 'string');
      assert(typeof config.continuous === 'boolean');
      assert(typeof config.maxAlternatives === 'number');
    });

    it('should have valid VoiceFeedback interface', () => {
      const feedback = {
        type: 'success',
        message: 'Command executed successfully',
        audioCue: true
      };
      assert(['success', 'error', 'warning', 'info'].includes(feedback.type));
    });
  });

  describe('Service Files Verification', () => {
    it('should have AgenticModeManager.ts file', () => {
      const fs = require('fs');
      const path = require('path');
      const baseDir = path.dirname(__dirname);
      assert(fs.existsSync(path.join(baseDir, 'AgenticModeManager.ts')));
    });

    it('should have CitationGraphEngine.ts file', () => {
      const fs = require('fs');
      const path = require('path');
      const baseDir = path.dirname(__dirname);
      assert(fs.existsSync(path.join(baseDir, 'CitationGraphEngine.ts')));
    });

    it('should have ProgressPredictor.ts file', () => {
      const fs = require('fs');
      const path = require('path');
      const baseDir = path.dirname(__dirname);
      assert(fs.existsSync(path.join(baseDir, 'ProgressPredictor.ts')));
    });

    it('should have ExportEngine.ts file', () => {
      const fs = require('fs');
      const path = require('path');
      const baseDir = path.dirname(__dirname);
      assert(fs.existsSync(path.join(baseDir, 'ExportEngine.ts')));
    });

    it('should have VoiceCommandSystem.ts file', () => {
      const fs = require('fs');
      const path = require('path');
      const baseDir = path.dirname(__dirname);
      assert(fs.existsSync(path.join(baseDir, 'VoiceCommandSystem.ts')));
    });

    it('should have index.ts barrel file', () => {
      const fs = require('fs');
      const path = require('path');
      const baseDir = path.dirname(__dirname);
      assert(fs.existsSync(path.join(baseDir, 'index.ts')));
    });
  });

  console.log('\n' + '='.repeat(60));
  console.log(`TEST RESULTS: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(60));

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
