import { getGroq } from './groqService';
import { AcademicProject } from '../types';

/**
 * Transforms full thesis drafts into a structured presentation outline.
 */
export const generateDefenseDeck = async (project: AcademicProject): Promise<string> => {
    const groq = getGroq();
    const drafts = project.draft_content;
    const basics = project.wizard_state.basics;

    const prompt = `
        You are an elite academic presentation specialist. 
        Transform the following unified thesis content into a structured, slide-by-slide outline for a Final Thesis Defense.
        
        PROJECT DATA:
        Title: ${basics.title}
        Author: ${basics.author}
        Department: Mechanical Engineering
        
        THESIS NARRATIVE:
        ${JSON.stringify(drafts)}
        
        OUTPUT REQUIREMENTS:
        - Use professional, punchy bullet points suitable for slides.
        - Create exactly 12-15 slides.
        - Include a "Question & Answer" slide at the end.
        - Format in valid Markdown with H2 for Slide Titles.
    `;

    try {
        const response = await groq.chat.completions.create({
            messages: [
                { role: "system", content: "You are an expert in academic presentations and defense strategies." },
                { role: "user", content: prompt }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.5,
        });

        return response.choices[0].message.content || "Failed to generate presentation outline.";
    } catch (e) {
        console.error("Defense deck generation failed", e);
        throw new Error("Eldoria failed to synthesize the defense deck.");
    }
};
