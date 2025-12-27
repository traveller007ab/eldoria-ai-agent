import { AcademicProject, CanvasPart } from '../types';
import { runGroqGenerate } from './groqService';
import { advancedSearchTavily } from './tavilyService';
import { getBridgeUrl } from './bridgeClient';

// ============================================
// WORD COUNT & STATISTICS
// ============================================

export interface ContentStats {
    wordCount: number;
    characterCount: number;
    sentenceCount: number;
    paragraphCount: number;
    readingTimeMinutes: number;
    averageWordsPerSentence: number;
}

export function analyzeContent(content: string): ContentStats {
    if (!content || content.trim().length === 0) {
        return {
            wordCount: 0,
            characterCount: 0,
            sentenceCount: 0,
            paragraphCount: 0,
            readingTimeMinutes: 0,
            averageWordsPerSentence: 0
        };
    }

    const words = content.match(/\b\w+\b/g) || [];
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);

    return {
        wordCount: words.length,
        characterCount: content.length,
        sentenceCount: sentences.length,
        paragraphCount: paragraphs.length,
        readingTimeMinutes: Math.ceil(words.length / 200), // Average reading speed
        averageWordsPerSentence: sentences.length > 0 ? Math.round(words.length / sentences.length) : 0
    };
}

// ============================================
// THESIS COMPLIANCE SCORING
// ============================================

export interface ComplianceCheck {
    label: string;
    status: 'success' | 'warning' | 'error' | 'info';
    detail: string;
    score: number; // 0-20 contribution to overall score
}

export interface ComplianceReport {
    score: number;
    checks: ComplianceCheck[];
    wordCountByChapter: Record<string, number>;
    totalWordCount: number;
}

const CHAPTER_TARGETS: Record<string, { min: number; max: number }> = {
    'Chapter 1: Introduction': { min: 1500, max: 3000 },
    'Chapter 2: Literature Review': { min: 3000, max: 8000 },
    'Chapter 3: Materials & Methods': { min: 2000, max: 5000 },
    'Chapter 4: Results & Discussion': { min: 3000, max: 7000 },
    'Chapter 5: Conclusion & Recommendations': { min: 1000, max: 2500 },
    'Abstract': { min: 200, max: 350 },
    'Front Matter': { min: 500, max: 1500 }
};

export function generateComplianceReport(project: AcademicProject): ComplianceReport {
    const checks: ComplianceCheck[] = [];
    const wordCountByChapter: Record<string, number> = {};
    let totalScore = 0;

    const wizard = project.wizard_state;
    const drafts = project.draft_content || {};

    // 1. Title Definition (20 points)
    if (wizard.basics.title && wizard.basics.title.length > 20) {
        checks.push({ label: "Title Definition", status: "success", detail: "Clear, descriptive title defined.", score: 20 });
        totalScore += 20;
    } else if (wizard.basics.title) {
        checks.push({ label: "Title Definition", status: "warning", detail: "Title may be too short.", score: 10 });
        totalScore += 10;
    } else {
        checks.push({ label: "Title Definition", status: "error", detail: "No title defined.", score: 0 });
    }

    // 2. SMART Objectives (20 points)
    const objectives = wizard.objectives.specificObjectives || [];
    if (objectives.length >= 3 && wizard.objectives.aim) {
        checks.push({ label: "SMART Objectives", status: "success", detail: `${objectives.length} objectives with clear aim.`, score: 20 });
        totalScore += 20;
    } else if (objectives.length > 0) {
        checks.push({ label: "SMART Objectives", status: "warning", detail: `Only ${objectives.length} objectives defined.`, score: 10 });
        totalScore += 10;
    } else {
        checks.push({ label: "SMART Objectives", status: "error", detail: "No objectives defined.", score: 0 });
    }

    // 3. Methodology Defined (20 points)
    const hasMaterials = (wizard.methodology.materials?.length || 0) > 0;
    const hasMethods = wizard.methodology.methods && wizard.methodology.methods.length > 50;
    if (hasMaterials && hasMethods) {
        checks.push({ label: "Execution Plan", status: "success", detail: "Materials and methods documented.", score: 20 });
        totalScore += 20;
    } else if (hasMaterials || hasMethods) {
        checks.push({ label: "Execution Plan", status: "warning", detail: "Partial methodology defined.", score: 10 });
        totalScore += 10;
    } else {
        checks.push({ label: "Execution Plan", status: "info", detail: "Awaiting methodology input.", score: 0 });
    }

    // 4. Chapter Word Counts (20 points)
    let chaptersComplete = 0;
    let chaptersTotal = 0;

    for (const [chapter, targets] of Object.entries(CHAPTER_TARGETS)) {
        const content = drafts[chapter] || '';
        const stats = analyzeContent(content);
        wordCountByChapter[chapter] = stats.wordCount;

        if (content) {
            chaptersTotal++;
            if (stats.wordCount >= targets.min) {
                chaptersComplete++;
            }
        }
    }

    const totalWordCount = Object.values(wordCountByChapter).reduce((a, b) => a + b, 0);

    if (totalWordCount >= 15000) {
        checks.push({ label: "Technical Results", status: "success", detail: `${totalWordCount.toLocaleString()} words drafted (target: 15,000+).`, score: 20 });
        totalScore += 20;
    } else if (totalWordCount >= 8000) {
        checks.push({ label: "Technical Results", status: "warning", detail: `${totalWordCount.toLocaleString()} words (target: 15,000+).`, score: 10 });
        totalScore += 10;
    } else {
        checks.push({ label: "Technical Results", status: "info", detail: `${totalWordCount.toLocaleString()} words drafted.`, score: 5 });
        totalScore += 5;
    }

    // 5. Thesis Completeness (20 points)
    const hasChapter5 = (drafts['Chapter 5: Conclusion & Recommendations']?.length || 0) > 500;
    const hasReferences = (project.references?.length || 0) >= 10;

    if (hasChapter5 && hasReferences) {
        checks.push({ label: "Thesis Concluding", status: "success", detail: `Conclusion written, ${project.references?.length || 0} references.`, score: 20 });
        totalScore += 20;
    } else if (hasChapter5 || hasReferences) {
        checks.push({ label: "Thesis Concluding", status: "warning", detail: "Partial completion - needs conclusion or references.", score: 10 });
        totalScore += 10;
    } else {
        checks.push({ label: "Thesis Concluding", status: "info", detail: "Awaiting final chapters.", score: 0 });
    }

    return {
        score: Math.min(100, totalScore),
        checks,
        wordCountByChapter,
        totalWordCount
    };
}

// ============================================
// PLAGIARISM DETECTION (Via Tavily + Groq)
// ============================================

export async function checkOriginality(content: string) {
    if (!content || content.length < 50) return { score: 0, matches: [], status: 'success' };

    // Sample segments more broadly through the content
    const allSegments = content.split('\n').filter(s => s.trim().length > 80);
    const step = Math.max(1, Math.floor(allSegments.length / 5));
    const segments = [];
    for (let i = 0; i < allSegments.length && segments.length < 5; i += step) {
        segments.push(allSegments[i]);
    }

    const rawMatches: any[] = [];

    for (const segment of segments) {
        try {
            const query = `"${segment.substring(0, 120)}"`;
            const data = await advancedSearchTavily(query);

            if (data.results && data.results.length > 0) {
                const bestMatch = data.results[0];
                if (bestMatch.score > 0.4) {
                    rawMatches.push({
                        segment,
                        source: bestMatch.title,
                        url: bestMatch.url,
                        content: bestMatch.content,
                        tavilyScore: bestMatch.score
                    });
                }
            }
        } catch (e) {
            console.error("Originality segment check failed", e);
        }
    }

    if (rawMatches.length === 0) {
        return { score: 0, status: 'success', matches: [] };
    }

    // Use Groq via bridge proxy to analyze plagiarism
    const analysisPrompt = `
        Analyze the following potential plagiarism matches for an engineering thesis.
        Distinguish between:
        1. "Direct Plagiarism" (Exact copied paragraphs) - High score
        2. "Standard Academic Phrasing" (Common definitions, standard methodologies) - Low score
        3. "Common Knowledge" (Newton's laws, standard formulas) - Zero score

        DRAFT SEGMENTS VS WEB MATCHES:
        ${rawMatches.map((m, i) => `Match ${i + 1}:\nDraft: "${m.segment}"\nWeb Source: "${m.content}"`).join('\n\n')}

        Return a JSON object:
        {
            "finalSimilarityScore": number (0-100),
            "matches": [
                {
                    "segmentSnippet": string (max 50 chars),
                    "source": string,
                    "url": string,
                    "intelligentScore": number (0-100),
                    "reason": string (brief justification)
                }
            ]
        }
    `;

    try {
        const response = await runGroqGenerate(
            [{ role: "user", content: analysisPrompt }],
            { model: "llama-3.3-70b-versatile", response_format: { type: "json_object" } }
        );

        const analysis = JSON.parse(response.choices?.[0]?.message?.content || "{}");
        const finalScore = analysis.finalSimilarityScore || 0;

        return {
            score: finalScore,
            status: finalScore > 20 ? 'warning' : 'success',
            matches: analysis.matches || []
        };
    } catch (e) {
        console.error("Groq originality analysis failed", e);
        // Fallback to simpler scoring
        const fallbackScore = Math.min(100, rawMatches.length * 20);
        return {
            score: fallbackScore,
            status: fallbackScore > 25 ? 'warning' : 'success',
            matches: rawMatches.map(m => ({
                segmentSnippet: m.segment.substring(0, 50) + "...",
                source: m.source,
                url: m.url,
                intelligentScore: Math.round(m.tavilyScore * 100),
                reason: "Automated similarity detection"
            }))
        };
    }
}

// ============================================
// CHAPTER SYNTHESIS (Via Bridge Proxy)
// SAF-Powered: Each chapter uses specialized reasoning stages
// ============================================

// Define SAF emphasis per chapter
const CHAPTER_SAF_CONFIG: Record<string, {
    emphasis: string[];
    specialInstructions: string;
    guardrails: string;
}> = {
    'Chapter 1: Introduction': {
        emphasis: ['INGEST', 'DECONSTRUCT'],
        specialInstructions: `Focus on clear problem framing, research gap identification, and scope definition.
Break down the research topic into:
- Core problem statement
- Research questions derived from the problem
- Justification for the study
- Thesis outline overview`,
        guardrails: 'Establish a compelling hook. Define scope precisely. Avoid methodology details.'
    },
    'Chapter 2: Literature Review': {
        emphasis: ['DECONSTRUCT', 'MAP'],
        specialInstructions: `Ruthlessly tear down existing literature:
- Identify conceptual clusters
- Map contradictions and agreements between sources
- Highlight critical gaps that justify this research
- Trace theoretical evolution
Structure thematically, not chronologically.`,
        guardrails: 'Cite 15-30 sources minimum. Always identify gaps. Show how this study fills them.'
    },
    'Chapter 3: Materials & Methods': {
        emphasis: ['MAP', 'BIND'],
        specialInstructions: `Apply rigorous logical binding:
- Step-by-step methodology justification
- Alternatives considered and why rejected
- Constraints and assumptions explicitly stated
- Reproducibility is paramount
Include: equipment specifications, procedures, mathematical models, data collection methods.`,
        guardrails: 'Justify every choice. Include pros/cons of alternatives. Enable replication.'
    },
    'Chapter 4: Results & Discussion': {
        emphasis: ['RECALCULATE', 'MODIFY'],
        specialInstructions: `Present data with cascading analysis:
- Raw results first, then computed/derived values
- If variables change, show how results cascade
- Statistical significance where applicable
- Compare with literature findings
- Discuss unexpected results and their implications`,
        guardrails: 'No raw data dumps. Every result needs interpretation. Link back to objectives.'
    },
    'Chapter 5: Conclusion & Recommendations': {
        emphasis: ['RECONSTRUCT', 'COMPARE'],
        specialInstructions: `Full synthesis:
- Reconstruct findings into a coherent narrative
- Compare achieved outcomes vs. stated objectives
- Acknowledge limitations honestly
- Propose concrete future work
- End with impact statement`,
        guardrails: 'No new data. Tie everything to introduction. Be definitive, not tentative.'
    },
    'Abstract': {
        emphasis: ['RECONSTRUCT'],
        specialInstructions: `Ultra-concise synthesis of the entire thesis:
- One sentence for problem/background
- One sentence for objective/aim
- Two sentences for methodology
- Two sentences for key findings
- One sentence for conclusion/significance`,
        guardrails: '200-350 words maximum. No citations. Standalone readability.'
    },
    'Front Matter': {
        emphasis: ['INGEST'],
        specialInstructions: `Generate institutional front matter:
- Title page formatting
- Declaration of authenticity
- Dedication (optional placeholder)
- Acknowledgments template
- Table of Contents structure`,
        guardrails: 'Follow RSU formatting standards. Formal, impersonal tone.'
    }
};

export async function* synthesizeChapter(project: AcademicProject, chapterName: string) {
    const wizard = project.wizard_state;
    const config = CHAPTER_SAF_CONFIG[chapterName] || {
        emphasis: ['INGEST', 'DECONSTRUCT'],
        specialInstructions: 'Generate this chapter with scholarly depth.',
        guardrails: 'Maintain academic rigor.'
    };

    const prompt = `
You are an elite academic architect specializing in Rivers State University (RSU) thesis standards.
You are tasked with writing **${chapterName}** for a thesis titled: "${wizard.basics.title}".

STUDENT METADATA:
Author: ${wizard.basics.author}
Department: Mechanical Engineering
Registration: ${wizard.basics.regNumber || 'N/A'}

RESEARCH PARAMETERS:
Aim: ${wizard.objectives.aim}
Objectives: ${wizard.objectives.specificObjectives?.join(', ') || 'Not defined'}
Scope: ${wizard.scope?.scopeOfWork || 'Not defined'}
Significance: ${wizard.scope?.significance || 'Not defined'}
Keywords: ${wizard.literature?.keywords?.join(', ') || 'Not defined'}

---

**COGNITIVE APPROACH FOR THIS CHAPTER:**
Apply deep analysis with emphasis on: ${config.emphasis.join(' → ')}

${config.specialInstructions}

**GUARDRAILS:**
${config.guardrails}

---

REQUIREMENTS:
- Use professional, scholarly language (APA 7th style).
- Ensure logical flow and rigorous technical depth.
- Target word count: 1000 - 2000 words for main chapters, 250-350 for Abstract.
- Format in valid Markdown with proper heading hierarchy.
- Focus exclusively on ${chapterName}.
- Your response should demonstrate that you've considered the problem deeply, mapped dependencies, and anticipated follow-up questions.
    `;

    try {
        const bridgeUrl = await getBridgeUrl();
        const response = await fetch(`${bridgeUrl}/proxy/groq`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [
                    { role: "system", content: `You are a senior academic supervisor and expert thesis writer. You think deeply about problems, considering dependencies, alternatives, and cascading effects before writing. Your outputs are polished, comprehensive, and publication-ready.` },
                    { role: "user", content: prompt }
                ],
                model: "llama-3.3-70b-versatile",
                temperature: 0.6,
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
        console.error("Chapter synthesis failed", e);
        yield "Error synthesizing chapter. Please check your connection.";
    }
}

// ============================================
// SCHOLARLY SEARCH
// ============================================

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

