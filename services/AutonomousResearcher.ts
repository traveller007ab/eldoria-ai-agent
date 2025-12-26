import { AcademicProject } from '../types';
import { runGroqGenerate } from './groqService';
import { advancedSearchTavily } from './tavilyService';
import { ResearchService, ResearchResult } from './researchService';
import { MediaExtractor, ExtractedMedia } from './mediaExtractor';

export interface ResearchEvidence {
    query: string;
    findings: string;
    sources: (ResearchResult | { title: string; url: string })[];
    media?: ExtractedMedia;
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
        You are a Deep Research Orchestrator for Academic Engineering. 
        Thesis Title: "${wizard.basics.title}"
        Aim: "${wizard.objectives.aim}"
        Objectives: ${wizard.objectives.specificObjectives.join(', ')}
        
        Generate 3 highly specific, technical search queries to build a rigorous engineering evidence base for this research.
        Focus on finding peer-reviewed papers, experimental data, and mathematical models.
        Output as JSON: { queries: string[] }
    `;

    const strategyCompletion = await runGroqGenerate(
        [{ role: "user", content: strategyPrompt }],
        { model: "llama-3.3-70b-versatile", response_format: { type: "json_object" } }
    );

    const { queries } = JSON.parse(strategyCompletion.choices?.[0]?.message?.content || '{"queries":[]}');

    // Step 2: Parallel Deep Searches across multiple sources
    const evidenceChain: ResearchEvidence[] = [];
    for (const query of queries.slice(0, 3)) {
        try {
            // Core Academic Search (Semantic Scholar + arXiv)
            const academicResults = await ResearchService.searchResearch(query, 'all', { limit: 5 });

            // Web Search for cutting edge/industry developments
            const webSearchData = await advancedSearchTavily(query);

            const combinedSources = [
                ...academicResults,
                ...webSearchData.results.map(r => ({
                    title: r.title,
                    url: r.url,
                    type: 'web' as const,
                    abstract: r.content
                }))
            ];

            const synthesisPrompt = `
                Synthesize the following research data for an engineering thesis.
                Query: ${query}
                Sources: ${JSON.stringify(combinedSources.map(s => ({ title: s.title, abstract: s.abstract || (s as any).content })))}
                
                Provide a technical summary of findings (limit 150 words) and how they support the thesis objectives.
            `;

            const synthCompletion = await runGroqGenerate(
                [{ role: "user", content: synthesisPrompt }],
                { model: "llama-3.3-70b-versatile", temperature: 0.5 }
            );

            // Extract media from the top academic source if available
            let media: ExtractedMedia | undefined = undefined;
            const topPaper = academicResults.find(p => p.url && p.openAccess);
            if (topPaper) {
                console.log(`[Researcher] Extracting media from top paper: ${topPaper.title}`);
                media = await MediaExtractor.extractMediaFromUrl(topPaper.url);
            } else if (webSearchData.results.length > 0) {
                console.log(`[Researcher] Extracting media from top web result`);
                media = await MediaExtractor.extractMediaFromUrl(webSearchData.results[0].url);
            }

            evidenceChain.push({
                query,
                findings: synthCompletion.choices?.[0]?.message?.content || 'No findings synthesized.',
                sources: combinedSources,
                media
            });
        } catch (e) {
            console.error(`Research step failed for query: ${query}`, e);
        }
    }

    // Step 3: Final Synthesis & Suggested Updates
    const finalPrompt = `
        Consolidate the following research evidence for the thesis "${wizard.basics.title}".
        Evidence: ${JSON.stringify(evidenceChain.map(e => ({ query: e.query, findings: e.findings })))}
        
        Provide:
        1. A high-level research analysis (2 paragraphs).
        2. 3 concrete suggested updates for Chapter 2 (Literature Review) or Chapter 3 (Methodology).
        
        Output as JSON: { analysis: string, suggestedUpdates: string[] }
    `;

    const finalCompletion = await runGroqGenerate(
        [{ role: "user", content: finalPrompt }],
        { model: "llama-3.3-70b-versatile", response_format: { type: "json_object" } }
    );

    const finalResult = JSON.parse(finalCompletion.choices?.[0]?.message?.content || '{"analysis": "", "suggestedUpdates": []}');

    return {
        ...finalResult,
        evidenceChain
    };
};

