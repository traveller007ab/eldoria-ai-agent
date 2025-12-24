
import { AcademicProject } from '../types';
import { runGroqGenerate } from './groqService';
import { getModelById, DEFAULT_MODELS, AcademicModel, ChapterDefinition } from '../models/AcademicModels';
import { getBridgeUrl } from './bridgeClient';

export interface GenerationProgress {
    chapter: string;
    progress: number;
    status: string;
}

/**
 * Advanced Thesis Generator Service
 * Implements chained synthesis, scaling for page counts, and real-time progress.
 * Now uses DYNAMIC MODEL CHAPTERS from the project's assigned model.
 */
export class ThesisGenerator {

    /**
     * Get the model for a project (falls back to RSU Mech Eng)
     */
    private static getProjectModel(project: AcademicProject): AcademicModel {
        const modelId = project.modelId || project.format || 'rsu-mech-eng';

        // Check built-in models
        let model = getModelById(modelId);
        if (model) return model;

        // Check custom models from localStorage
        try {
            const customModels = localStorage.getItem('eldoria-custom-models');
            if (customModels) {
                const parsed = JSON.parse(customModels) as AcademicModel[];
                model = parsed.find(m => m.id === modelId);
                if (model) return model;
            }
        } catch { }

        // Fallback
        return DEFAULT_MODELS['rsu-mech-eng'];
    }

    /**
     * Entry point for voluminous thesis generation.
     * Dynamically reads chapters from the project's assigned model.
     */
    static async* generateFullThesis(
        project: AcademicProject,
        targetPageCount: number,
        onProgress?: (progress: GenerationProgress) => void
    ): AsyncGenerator<{ chapter: string; content: string }> {

        const model = this.getProjectModel(project);
        const chapters = model.chapters;

        // Scale token budgets based on target page count (approx 300 words per page)
        const totalWords = targetPageCount * 300;
        const totalMinWords = chapters.reduce((sum, ch) => sum + ch.minWords, 0);

        let cumulativeContext = ""; // Used to maintain flow between chapters

        for (const chapter of chapters) {
            onProgress?.({ chapter: chapter.name, progress: 0, status: `Synthesizing ${chapter.name}...` });

            // Calculate word budget proportionally or use chapter's max
            const chapterBudget = Math.min(
                chapter.maxWords,
                Math.max(chapter.minWords, Math.floor(totalWords * (chapter.minWords / totalMinWords)))
            );

            let chapterContent = "";

            const stream = this.synthesizeSegment(project, model, chapter, chapterBudget, cumulativeContext);

            for await (const chunk of stream) {
                chapterContent += chunk;
                yield { chapter: chapter.name, content: chapterContent };
            }

            cumulativeContext += `\n\nSUMMARY OF ${chapter.name}:\n${chapterContent.substring(0, 500)}...`;
            onProgress?.({ chapter: chapter.name, progress: 100, status: `${chapter.name} Complete.` });
        }
    }

    private static async* synthesizeSegment(
        project: AcademicProject,
        model: AcademicModel,
        chapter: ChapterDefinition,
        wordBudget: number,
        context: string
    ) {
        const wizard = project.wizard_state;

        const systemPrompt = model.aiConfig.systemPrompt || `You are a Senior Academic Supervisor. 
        Your goal is to produce a high-caliber, voluminous thesis section. 
        Target Length: ${wordBudget} words. 
        Style: ${model.citationStyle} format. 
        Tone: Sophisticated, Analytical, Professional.`;

        const userPrompt = `
        PRODUCING: ${chapter.name}
        CHAPTER DESCRIPTION: ${chapter.description}
        ${chapter.aiPromptHint ? `SPECIAL INSTRUCTIONS: ${chapter.aiPromptHint}` : ''}
        
        THESIS TITLE: ${wizard.basics.title}
        AUTHOR: ${wizard.basics.author}
        INSTITUTION: ${model.institution}
        DEPARTMENT: ${model.department}
        
        WIZARD DATA:
        Aim: ${wizard.objectives.aim}
        Specific Objectives: ${wizard.objectives.specificObjectives.join('; ')}
        Methodology Data: ${wizard.methodology.results_data}
        References Available: ${project.references?.length || 0}
        
        PREVIOUS CHAPTER CONTEXT:
        ${context}
        
        TARGET WORD COUNT: ${wordBudget} words minimum.
        
        INSTRUCTIONS:
        - Ensure a logical bridge from the previous summary.
        - Use complex sentence structures and rigorous domain-specific vocabulary.
        - Format in Markdown with proper headings.
        - Output ONLY the Markdown content for this section.
        `;

        try {
            const bridgeUrl = await getBridgeUrl();
            const response = await fetch(`${bridgeUrl}/proxy/groq`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: userPrompt }
                    ],
                    model: model.aiConfig.model || "llama-3.3-70b-versatile",
                    temperature: model.aiConfig.temperature || 0.5,
                    stream: true,
                    apiKey: (window as any).GROQ_API_KEY || ''
                })
            });

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) {
                yield "Error: Could not initialize stream reader.";
                return;
            }

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n').filter(line => line.startsWith('data:'));

                for (const line of lines) {
                    const data = line.replace('data: ', '').trim();
                    if (data === '[DONE]') continue;
                    try {
                        const parsed = JSON.parse(data);
                        const content = parsed.choices?.[0]?.delta?.content || '';
                        if (content) yield content;
                    } catch {
                        // Ignore parse errors
                    }
                }
            }
        } catch (e) {
            console.error("Synthesis segment failed", e);
            yield `Error synthesizing ${chapter.name}. Please check your connection.`;
        }
    }
}

