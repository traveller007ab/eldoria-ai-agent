// Academic Model Types - Universal Thesis Template System

export interface ChapterDefinition {
    id: string;
    name: string;
    description: string;
    minWords: number;
    maxWords: number;
    required: boolean;
    aiPromptHint?: string; // Hints for AI generation
}

export interface AcademicModel {
    id: string;
    name: string;
    institution: string;
    department: string;
    description: string;
    citationStyle: 'APA' | 'MLA' | 'IEEE' | 'Chicago' | 'Harvard';
    version: string;
    author: string;
    createdAt: string;

    // Structure
    chapters: ChapterDefinition[];

    // Formatting
    formatting: {
        fontFamily: string;
        fontSize: number;
        lineSpacing: number;
        marginInches: number;
    };

    // Targets
    targets: {
        totalMinWords: number;
        totalMaxWords: number;
        minReferences: number;
        abstractMaxWords: number;
    };

    // Custom fields for wizard
    wizardFields: {
        showRegNumber: boolean;
        showSupervisor: boolean;
        showCoSupervisor: boolean;
        customFields: { label: string; key: string; required: boolean }[];
    };

    // AI Configuration
    aiConfig: {
        systemPrompt: string;
        temperature: number;
        model: string;
    };
}

// Pre-built models
export const DEFAULT_MODELS: Record<string, AcademicModel> = {
    'rsu-mech-eng': {
        id: 'rsu-mech-eng',
        name: 'RSU Mechanical Engineering',
        institution: 'Rivers State University',
        department: 'Mechanical Engineering',
        description: 'Official thesis format for Mechanical Engineering students at Rivers State University, Port Harcourt. Based on department guidelines.',
        citationStyle: 'APA',
        version: '2.0.0',
        author: 'RSU Mech Eng Dept',
        createdAt: '2024-12-24',
        chapters: [
            {
                id: 'front-matter',
                name: 'Front Matter',
                description: 'Cover Page, Title Page, Abstract, Declaration, Certification, Dedication, Acknowledgements, Table of Contents, List of Tables, List of Figures, List of Appendices, Nomenclature',
                minWords: 800,
                maxWords: 2000,
                required: true,
                aiPromptHint: 'Generate formal front matter including: Abstract (250+ words with brief background, aim, methods, key findings in facts/figures, significance to end users - NO equations, references, tables, or definitions), Declaration page, Certification page format, Dedication template, Acknowledgements template. Follow APA 7th Edition formatting.'
            },
            {
                id: 'chapter-1',
                name: 'Chapter 1: Introduction',
                description: '1.1 Background of Study (motivation), 1.1.1 Case Study Facility, 1.2 Statement of Problem, 1.3 Aim and Objectives (SMART), 1.4 Scope of Study, 1.5 Significance of Study, 1.6 Limitations of Study',
                minWords: 2500,
                maxWords: 5000,
                required: true,
                aiPromptHint: 'Structure as: 1.1 Background of Study (context, motivation), 1.1.1 Case Study Facility if applicable, 1.2 Statement of the Problem, 1.3 Aim and Objectives (objectives must be SMART: Specific, Measurable, Achievable, Realistic, Time-bound - include design, fabrication/selection, assembly, testing, cost estimation), 1.4 Scope of Study (in-scope and out-of-scope boundaries), 1.5 Significance of Study (benefits if completed), 1.6 Limitations of Study (challenges, shortcomings of methods/models).'
            },
            {
                id: 'chapter-2',
                name: 'Chapter 2: Literature Review',
                description: '2.1 Extent of Past Works, 2.1.1 Conceptual & Theoretical Framework, 2.1.2 Empirical Framework, 2.2 Summary & Limitations of Reviewed Works, 2.3 Knowledge Gap and Proposed Work',
                minWords: 4000,
                maxWords: 10000,
                required: true,
                aiPromptHint: 'Structure as: 2.1 Extent of Past Works (review existing works, identify shortcomings), 2.1.1 Conceptual and Theoretical Framework (scientific theories with APA citations from journals), 2.1.2 Empirical Framework (review aims/objectives of past projects - NOT textbooks), 2.2 Summary and Limitations of Reviewed Past Works, 2.3 Knowledge Gap and Current Work. Include Table 2.1 with columns: Title/Author, Limitation, Knowledge Gap, Proposed Work.'
            },
            {
                id: 'chapter-3',
                name: 'Chapter 3: Materials and Methods',
                description: '3.1 Materials (including software), 3.2 Data Source and Collection (Primary/Secondary), 3.3 Methods (3.3.1 Theoretical Analysis, 3.3.2 Experiment)',
                minWords: 3000,
                maxWords: 8000,
                required: true,
                aiPromptHint: 'DETAILED WORK EXPECTED. Structure as: 3.1 Materials (list all materials, equipment, software), 3.2 Data Source and Collection (Primary: your experiments/fieldwork, Secondary: literature/manuals), 3.3 Methods with 3.3.1 Theoretical Analysis Methods (engineering models, scientific models, mathematical models, statistical methods, computer algorithms with flowcharts) and 3.3.2 Experiment. Number all equations (right-aligned), define all parameters, cite non-standard equations.'
            },
            {
                id: 'chapter-4',
                name: 'Chapter 4: Results and Discussion',
                description: '4.1 Results of Objective (i), 4.2 Results of Objective (ii), 4.3 Results of Objective (iii)... with discussion of each',
                minWords: 3500,
                maxWords: 8000,
                required: true,
                aiPromptHint: 'Structure results by objectives: 4.1 Results of Objective (i) - state objective then present results, 4.2 Results of Objective (ii), 4.3 Results of Objective (iii), etc. Include tables, figures, calculations. For each objective: present data, discuss findings, compare with literature, explain implications. Include Work Plan (Gantt chart) and Cost Estimate table (APA 3-line format: S/No, Item Description, Quantity, Unit Price, Amount).'
            },
            {
                id: 'chapter-5',
                name: 'Chapter 5: Conclusion and Recommendations',
                description: '5.1 Conclusion, 5.2 Recommendation(s), 5.3 Contribution to Knowledge',
                minWords: 1200,
                maxWords: 3000,
                required: true,
                aiPromptHint: 'Structure as: 5.1 Conclusion (summarize findings per objective, state if aim was achieved), 5.2 Recommendations (suggestions for future work, improvements, applications), 5.3 Contribution to Knowledge (distinct original contributions, evidence of originality, how this work fills the knowledge gap identified in Chapter 2).'
            },
            {
                id: 'references',
                name: 'References',
                description: 'List of all in-text citations in APA 7th Edition format',
                minWords: 300,
                maxWords: 1500,
                required: true,
                aiPromptHint: 'Format ALL in-text citations as a References list in APA 7th Edition style. Alphabetize by author surname. Include: Author(s), Year, Title, Journal/Source, DOI/URL if available. Minimum 20 references from peer-reviewed sources.'
            },
            {
                id: 'appendices',
                name: 'Appendices',
                description: 'Bibliography (if any), Letters, Documents, Attachments, Supplementary Data',
                minWords: 100,
                maxWords: 2000,
                required: false,
                aiPromptHint: 'Include: Bibliography (literatures consulted but not cited in-text), technical drawings, datasheets, letters, additional calculations, raw data tables, photographs of experimental setup, code listings if applicable.'
            }
        ],
        formatting: {
            fontFamily: 'Times New Roman',
            fontSize: 12,
            lineSpacing: 2.0,
            marginInches: 1.0
        },
        targets: {
            totalMinWords: 15000,
            totalMaxWords: 35000,
            minReferences: 20,
            abstractMaxWords: 350
        },
        wizardFields: {
            showRegNumber: true,
            showSupervisor: true,
            showCoSupervisor: true,
            customFields: [
                { label: 'Case Study Facility', key: 'caseStudyFacility', required: false }
            ]
        },
        aiConfig: {
            systemPrompt: 'You are an elite academic architect specializing in Rivers State University (RSU) Mechanical Engineering thesis standards. You produce publication-quality work that meets bachelor degree award standards with distinct contribution to knowledge, evidence of originality, analysis of known theories, and detailed methodology. Use APA 7th Edition throughout.',
            temperature: 0.6,
            model: 'llama-3.3-70b-versatile'
        }
    },
    'generic-undergraduate': {
        id: 'generic-undergraduate',
        name: 'Generic Undergraduate Thesis',
        institution: 'Any University',
        department: 'Any Department',
        description: 'A flexible template suitable for most undergraduate thesis requirements.',
        citationStyle: 'APA',
        version: '1.0.0',
        author: 'Eldoria Team',
        createdAt: '2024-12-01',
        chapters: [
            { id: 'abstract', name: 'Abstract', description: 'Executive summary', minWords: 150, maxWords: 300, required: true },
            { id: 'intro', name: 'Introduction', description: 'Background and objectives', minWords: 1000, maxWords: 2500, required: true },
            { id: 'literature', name: 'Literature Review', description: 'Previous research', minWords: 2000, maxWords: 6000, required: true },
            { id: 'methodology', name: 'Methodology', description: 'Research approach', minWords: 1500, maxWords: 4000, required: true },
            { id: 'results', name: 'Results', description: 'Findings', minWords: 2000, maxWords: 5000, required: true },
            { id: 'discussion', name: 'Discussion', description: 'Analysis and interpretation', minWords: 1500, maxWords: 4000, required: true },
            { id: 'conclusion', name: 'Conclusion', description: 'Summary and recommendations', minWords: 800, maxWords: 2000, required: true },
            { id: 'references', name: 'References', description: 'Bibliography in APA format', minWords: 200, maxWords: 800, required: true }
        ],
        formatting: {
            fontFamily: 'Arial',
            fontSize: 12,
            lineSpacing: 1.5,
            marginInches: 1.0
        },
        targets: {
            totalMinWords: 10000,
            totalMaxWords: 25000,
            minReferences: 15,
            abstractMaxWords: 300
        },
        wizardFields: {
            showRegNumber: true,
            showSupervisor: true,
            showCoSupervisor: false,
            customFields: []
        },
        aiConfig: {
            systemPrompt: 'You are an expert academic writer helping students craft professional undergraduate theses.',
            temperature: 0.6,
            model: 'llama-3.3-70b-versatile'
        }
    },
    'masters-thesis': {
        id: 'masters-thesis',
        name: 'Masters Thesis (Standard)',
        institution: 'Any University',
        department: 'Any Department',
        description: 'Comprehensive template for Masters degree dissertations.',
        citationStyle: 'APA',
        version: '1.0.0',
        author: 'Eldoria Team',
        createdAt: '2024-12-01',
        chapters: [
            { id: 'abstract', name: 'Abstract', description: 'Executive summary', minWords: 250, maxWords: 500, required: true },
            { id: 'intro', name: 'Chapter 1: Introduction', description: 'Research context and objectives', minWords: 2000, maxWords: 4000, required: true },
            { id: 'literature', name: 'Chapter 2: Literature Review', description: 'Comprehensive review', minWords: 5000, maxWords: 12000, required: true },
            { id: 'methodology', name: 'Chapter 3: Research Methodology', description: 'Detailed research design', minWords: 3000, maxWords: 6000, required: true },
            { id: 'findings', name: 'Chapter 4: Findings & Analysis', description: 'Results presentation', minWords: 4000, maxWords: 10000, required: true },
            { id: 'discussion', name: 'Chapter 5: Discussion', description: 'Critical analysis', minWords: 3000, maxWords: 7000, required: true },
            { id: 'conclusion', name: 'Chapter 6: Conclusion', description: 'Summary and contributions', minWords: 1500, maxWords: 3000, required: true },
            { id: 'references', name: 'References', description: 'Complete bibliography in APA format', minWords: 400, maxWords: 1500, required: true }
        ],
        formatting: {
            fontFamily: 'Times New Roman',
            fontSize: 12,
            lineSpacing: 2.0,
            marginInches: 1.25
        },
        targets: {
            totalMinWords: 25000,
            totalMaxWords: 50000,
            minReferences: 40,
            abstractMaxWords: 500
        },
        wizardFields: {
            showRegNumber: true,
            showSupervisor: true,
            showCoSupervisor: true,
            customFields: [
                { label: 'Research Focus Area', key: 'researchArea', required: true }
            ]
        },
        aiConfig: {
            systemPrompt: 'You are a distinguished academic mentor assisting with Masters-level dissertation writing with rigorous scholarly standards.',
            temperature: 0.5,
            model: 'llama-3.3-70b-versatile'
        }
    }
};

// Helper functions
export function getModelById(id: string): AcademicModel | undefined {
    return DEFAULT_MODELS[id];
}

export function getAllModels(): AcademicModel[] {
    return Object.values(DEFAULT_MODELS);
}

export function createEmptyModel(): Partial<AcademicModel> {
    return {
        id: '',
        name: '',
        institution: '',
        department: '',
        description: '',
        citationStyle: 'APA',
        version: '1.0.0',
        author: '',
        createdAt: new Date().toISOString().split('T')[0],
        chapters: [],
        formatting: {
            fontFamily: 'Times New Roman',
            fontSize: 12,
            lineSpacing: 2.0,
            marginInches: 1.0
        },
        targets: {
            totalMinWords: 15000,
            totalMaxWords: 30000,
            minReferences: 20,
            abstractMaxWords: 350
        },
        wizardFields: {
            showRegNumber: true,
            showSupervisor: true,
            showCoSupervisor: false,
            customFields: []
        },
        aiConfig: {
            systemPrompt: 'You are an expert academic writer.',
            temperature: 0.6,
            model: 'llama-3.3-70b-versatile'
        }
    };
}
