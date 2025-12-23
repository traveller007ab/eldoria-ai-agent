
import { AcademicProject } from '../types';
import { getGroq } from './groqService';

export interface GenerationProgress {
    chapter: string;
    progress: number;
    status: string;
}

/**
 * Advanced Thesis Generator Service
 * Implements chained synthesis, scaling for page counts, and real-time progress.
 */
export class ThesisGenerator {

    /**
     * Entry point for voluminous thesis generation.
     */
    static async* generateFullThesis(
        project: AcademicProject,
        targetPageCount: number,
        onProgress?: (progress: GenerationProgress) => void
    ): AsyncGenerator<{ chapter: string; content: string }> {

        const chapters = [
            'Front Matter',
            'Abstract',
            'Chapter 1: Introduction',
            'Chapter 2: Literature Review',
            'Chapter 3: Materials & Methods',
            'Chapter 4: Results & Discussion',
            'Chapter 5: Conclusion & Recommendations',
            'References'
        ];

        // Scale token budgets based on target page count (approx 300 words per page)
        const totalWords = targetPageCount * 300;
        const chapterBudgets: Record<string, number> = {
            'Front Matter': 500,
            'Abstract': 350,
            'Chapter 1: Introduction': Math.floor(totalWords * 0.15),
            'Chapter 2: Literature Review': Math.floor(totalWords * 0.35),
            'Chapter 3: Materials & Methods': Math.floor(totalWords * 0.20),
            'Chapter 4: Results & Discussion': Math.floor(totalWords * 0.20),
            'Chapter 5: Conclusion & Recommendations': Math.floor(totalWords * 0.10),
            'References': 500
        };

        let cumulativeContext = ""; // Used to maintain flow between chapters

        for (const chapter of chapters) {
            onProgress?.({ chapter, progress: 0, status: `Synthesizing ${chapter}...` });

            let chapterContent = "";
            const budget = chapterBudgets[chapter];

            // For large chapters, we might need multiple passes or deeper prompts
            const stream = this.synthesizeSegment(project, chapter, budget, cumulativeContext);

            for await (const chunk of stream) {
                chapterContent += chunk;
                yield { chapter, content: chapterContent };
            }

            cumulativeContext += `\n\nSUMMARY OF ${chapter}:\n${chapterContent.substring(0, 500)}...`;
            onProgress?.({ chapter, progress: 100, status: `${chapter} Complete.` });
        }
    }

    private static async* synthesizeSegment(
        project: AcademicProject,
        chapter: string,
        wordBudget: number,
        context: string
    ) {
        const groq = getGroq();
        const wizard = project.wizard_state;

        const systemPrompt = `You are a Senior Academic Supervisor at Rivers State University. 
        Your goal is to produce a high-caliber, voluminous thesis section. 
        Target Length: ${wordBudget} words. 
        Style: APA 7th Edition. 
        Tone: Sophisticated, Analytical, Engineering-focused.`;

        const userPrompt = `
        PRODUCING: ${chapter}
        THESIS TITLE: ${wizard.basics.title}
        AUTHOR: ${wizard.basics.author}
        
        WIZARD DATA:
        Aim: ${wizard.objectives.aim}
        Specific Objectives: ${wizard.objectives.specificObjectives.join('; ')}
        Methodology Data: ${wizard.methodology.results_data}
        References Available: ${project.references?.length || 0}
        
        PREVIOUS CHAPTER CONTEXT:
        ${context}
        
        INSTRUCTIONS FOR ${chapter}:
        - If Chapter 2, perform a deep synthesis of theoretical frameworks. 
        - If Chapter 3, use technical materials: ${wizard.methodology.materials.join(', ')}.
        - Ensure a logical bridge from the previous summary.
        - Use complex sentence structures and rigorous domain-specific vocabulary.
        - Output ONLY the Markdown content for this section.
        `;

        const stream = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.5,
            stream: true,
        });

        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) yield content;
        }
    }
}
