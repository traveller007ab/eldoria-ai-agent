export const createMockAcademicProject = () => ({
  id: 'test-project-001',
  name: 'Test Thesis Project',
  format: 'RSU_MECH_ENG',
  modelId: 'academic-model-001',
  created_at: new Date().toISOString(),
  wizard_state: {
    step: 1,
    basics: {
      title: 'Optimizing Thermal Efficiency in Industrial Heat Exchangers',
      author: 'John Doe',
      regNumber: '2024001',
      year: '2024'
    },
    objectives: {
      aim: 'To develop a comprehensive framework for optimizing thermal efficiency in industrial heat exchanger systems.',
      specificObjectives: [
        'Analyze current thermal efficiency benchmarks',
        'Develop a computational model for thermal performance prediction',
        'Validate the model through experimental testing',
        'Propose optimization strategies based on findings'
      ]
    },
    scope: {
      scopeOfWork: 'This study focuses on shell-and-tube heat exchangers used in petrochemical applications.',
      significance: 'The research addresses critical energy efficiency challenges.',
      limitations: 'The study is limited to steady-state conditions.'
    },
    literature: {
      keywords: ['heat exchanger', 'thermal efficiency', 'optimization'],
      searchQueries: ['thermal efficiency heat exchangers']
    },
    methodology: {
      materials: ['Thermocouples', 'Flow meters'],
      methods: 'Computational Fluid Dynamics (CFD) analysis',
      costs: 'Estimated budget: $15,000',
      results_data: 'Temperature readings and pressure drops'
    },
    finishing: {
      dedication: '',
      acknowledgements: '',
      preface: ''
    },
    compliance: {
      plagiarismChecked: false,
      wordCountValid: false,
      abstractReady: false
    },
    generationConfig: {
      targetPageCount: 80,
      depth: 'standard'
    }
  },
  draft_content: {},
  references: [],
  resources: []
});

export const createMockReferences = (count: number = 10) => {
  const authors = ['Smith, J.', 'Johnson, A.', 'Williams, B.'];
  const journals = ['Journal of Thermal Engineering', 'Energy Journal'];

  return Array.from({ length: count }, (_, i) => ({
    id: `ref-${i + 1}`,
    title: `Thermal Efficiency Study ${i + 1}`,
    authors: authors[i % authors.length],
    year: String(2020 + (i % 5)),
    journal: journals[i % journals.length],
    link: `https://example.com/paper/${i + 1}`,
    snippet: 'This paper presents novel approaches...',
    formattedApa: `${authors[i % authors.length]}. (2020). Title here.`
  }));
};

export const createMockChapters = () => [
  { id: 'introduction', title: 'Introduction', content: '# Introduction\n\nTest content...', status: 'complete', lastModified: new Date() },
  { id: 'literature-review', title: 'Literature Review', content: '# Literature Review\n\nTest content...', status: 'in_progress', lastModified: new Date() },
  { id: 'methodology', title: 'Methodology', content: '# Methodology\n\nTest content...', status: 'not_started', lastModified: new Date() },
  { id: 'results', title: 'Results', content: '# Results\n\nTest content...', status: 'not_started', lastModified: new Date() },
  { id: 'discussion', title: 'Discussion', content: '# Discussion\n\nTest content...', status: 'not_started', lastModified: new Date() },
  { id: 'conclusion', title: 'Conclusion', content: '# Conclusion\n\nTest content...', status: 'not_started', lastModified: new Date() }
];

export const mockConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info
};

export const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
