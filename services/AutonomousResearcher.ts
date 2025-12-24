import { AcademicProject } from '../types';
import { runGroqGenerate } from './groqService';
import { advancedSearchTavily } from './tavilyService';

export interface ResearchEvidence {
    query: string;
    findings: string;
    sources: { title: string; url: string }[];
}

export interface DeepResearchResult {
    analysis: string;
    evidenceChain: ResearchEvidence[];
    suggestedUpdates: string[];
}

export const runAutonomousResearch = async (project: AcademicProject): Promise<DeepResearchResult> => {
    const wizard = project.wizard_state;

    // Step 1: Initial Analysis & Strategy Generation
    const strategyPrompt = `
        You are a Deep Research Orchestrator. 
        Thesis Title: "${wizard.basics.title}"
        Aim: "${wizard.objectives.aim}"
        Objectives: ${wizard.objectives.specificObjectives.join(', ')}
        
        Generate 3 highly specific, technical search queries to build a rigorous engineering evidence base for this research.
        Output as JSON: { queries: string[] }
    `;

    const strategyCompletion = await runGroqGenerate(
        [{ role: "user", content: strategyPrompt }],
        { model: "llama-3.3-70b-versatile", response_format: { type: "json_object" } }
    );

    const { queries } = JSON.parse(strategyCompletion.choices[0].message.content || '{"queries":[]}');

    // Step 2: Parallel Deep Searches
    const evidenceChain: ResearchEvidence[] = [];
    for (const query of queries.slice(0, 3)) {
        try {
            const searchData = await advancedSearchTavily(query);
            const synthesisPrompt = `
                Synthesize the following research data for an engineering thesis.
                Query: ${query}
                Data: ${JSON.stringify(searchData.results)}
                
                Provide a technical summary of findings and how they support the thesis objectives.
            `;

            const synthCompletion = await runGroqGenerate(
                [{ role: "user", content: synthesisPrompt }],
                { model: "llama-3.3-70b-versatile", temperature: 0.5 }
            );

            evidenceChain.push({
                query,
                findings: synthCompletion.choices[0].message.content || 'No findings synthesized.',
                sources: searchData.results.map(r => ({ title: r.title, url: r.url }))
            });
        } catch (e) {
            console.error(`Research step failed for query: ${query}`, e);
        }
    }

    // Step 3: Final Synthesis & Suggested Updates
    const finalPrompt = `
        Consolidate the following research evidence for the thesis "${wizard.basics.title}".
        Evidence: ${JSON.stringify(evidenceChain)}
        
        Provide:
        1. A high-level research analysis (2 paragraphs).
        2. 3 concrete suggested updates for Chapter 2 (Literature Review) or Chapter 3 (Methodology).
        
        Output as JSON: { analysis: string, suggestedUpdates: string[] }
    `;

    const finalCompletion = await runGroqGenerate(
        [{ role: "user", content: finalPrompt }],
        { model: "llama-3.3-70b-versatile", response_format: { type: "json_object" } }
    );

    const finalResult = JSON.parse(finalCompletion.choices[0].message.content || '{"analysis": "", "suggestedUpdates": []}');

    return {
        ...finalResult,
        evidenceChain
    };
};
