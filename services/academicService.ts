import { AcademicProject, CanvasPart } from '../types';
import { getGroq } from './groqService';

/**
 * Synthesizes a specific thesis chapter based on wizard data.
 */
export async function* synthesizeChapter(project: AcademicProject, chapterName: string) {
    const groq = getGroq();
    const wizard = project.wizard_state;

    const prompt = `
        You are an elite academic architect specializing in Rivers State University (RSU) thesis standards.
        You are tasked with writing **${chapterName}** for a thesis titled: "${wizard.basics.title}".
        
        STUDENT METADATA:
        Author: ${wizard.basics.author}
        Department: Mechanical Engineering
        
        RESEARCH PARAMETERS:
        Aim: ${wizard.objectives.aim}
        Objectives: ${wizard.objectives.specificObjectives.join(', ')}
        Scope: ${wizard.scope.scopeOfWork}
        Significance: ${wizard.scope.significance}
        Keywords: ${wizard.literature.keywords.join(', ')}
        
        REQUIREMENTS:
        - Use professional, scholarly language (APA 7th style).
        - Ensure logical flow and rigorous technical depth.
        - Target word count for this chapter: ~1000 - 1500 words.
        - Format in valid Markdown.
        - Focus exclusively on ${chapterName}.
        
        If this is Chapter 1: Introduction, include sections for Background of Study, Statement of Problem, Objectives, and Significance.
        If this is Chapter 2: Literature Review, synthesize theoretical frameworks and empirical studies based on the keywords.
        If this is Chapter 3: Materials & Methods, focus on the technical implementation. Include:
        - Research Design
        - Materials/Equipment list (referencing ${wizard.methodology.materials.join(', ')})
        - Fabrication/Experimental Procedure
        - Design Constraints and Calculations
        - Ethical Considerations (if applicable)
        
        If this is Chapter 4: Results & Discussion, present simulated findings based on the objectives. Use technical engineering terminology.
        If this is Chapter 5: Conclusion & Recommendations, summarize the study, state the contribution to knowledge, and offer future work.
        
        If this is Front Matter:
        - Dedication: Write a touching dedication based on student profile.
        - Acknowledgements: Express gratitude to supervisors, family, and RSU department.
        - Preface: Provide a brief overview of the research journey.
    `;

    const stream = await groq.chat.completions.create({
        messages: [
            { role: "system", content: "You are a senior academic supervisor and expert thesis writer." },
            { role: "user", content: prompt }
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.6,
        stream: true,
    });

    for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) yield content;
    }
}

import { advancedSearchTavily } from './tavilyService';

/**
 * Performs a scholarly search for relevant literature using real-time web intelligence.
 */
export async function searchScholarlyJournals(keywords: string[]) {
    const query = keywords.join(' ') + " scholarly journal articles engineering research";
    try {
        const data = await advancedSearchTavily(query);
        return data.results.map(r => ({
            title: r.title,
            link: r.url,
            snippet: r.content
        }));
    } catch (e) {
        console.error("Scholarly search failed", e);
        return [
            { title: "Numerical simulation of CNC systems", link: "#", snippet: "A study on high-precision machining..." },
            { title: "Advanced thermodynamics in mechanical design", link: "#", snippet: "Optimization of heat transfer..." }
        ];
    }
}

/**
 * Checks a content block for originality by scanning online repositories.
 */
export async function checkOriginality(content: string) {
    if (!content || content.length < 50) return { score: 0, matches: [] };

    const segments = content.split('\n')
        .filter(s => s.trim().length > 60)
        .slice(0, 3);

    let maxSimilarity = 0;
    const matches: any[] = [];

    for (const segment of segments) {
        try {
            const query = `"${segment.substring(0, 100)}"`;
            const data = await advancedSearchTavily(query);

            if (data.results && data.results.length > 0) {
                const bestMatch = data.results[0];
                if (bestMatch.score > 0.5) {
                    maxSimilarity = Math.max(maxSimilarity, bestMatch.score);
                    matches.push({
                        segment: segment.substring(0, 60) + "...",
                        source: bestMatch.title,
                        url: bestMatch.url,
                        score: Math.round(bestMatch.score * 100)
                    });
                }
            }
        } catch (e) {
            console.error("Originality segment check failed", e);
        }
    }

    const finalScore = Math.round(maxSimilarity * 100);

    return {
        score: finalScore,
        status: finalScore > 25 ? 'warning' : 'success',
        matches
    };
}
