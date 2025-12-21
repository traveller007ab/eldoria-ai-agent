import Groq from 'groq-sdk';
import { searchTavily } from './tavilyService';
import { runCommand } from './workspaceService';
import { CanvasPart, ChatMessage, TaskLogEntry, Source, SAFStatus, InlineAction } from '../types';

const GROQ_API_KEY = (import.meta as any).env.VITE_GROQ_API_KEY;

const groq = new Groq({
    apiKey: GROQ_API_KEY,
    dangerouslyAllowBrowser: true,
});

let groqInstance: Groq | null = null;

export const getGroq = (): Groq => {
    if (!groqInstance) {
        if (!GROQ_API_KEY) {
            console.error("Groq API Key is missing. Please set VITE_GROQ_API_KEY in .env.local");
            throw new Error("Groq API Key is missing. Check .env.local configuration.");
        }
        groqInstance = groq;
    }
    return groqInstance;
};

/**
 * Unified execution wrapper for LLM requests (Phase 8).
 * Currently tuned for Groq, but architected for multi-provider fallback.
 */
async function* executeLLMRequest(
    messages: any[],
    tools?: any[],
    options: { model?: string; temperature?: number } = {}
) {
    const stream = await (getGroq()).chat.completions.create({
        model: options.model || "llama-3.3-70b-versatile",
        messages,
        tools,
        tool_choice: tools ? "auto" : undefined,
        temperature: options.temperature ?? 0.7,
        stream: true,
    });

    for await (const chunk of stream) {
        yield chunk;
    }
}

// --- SYSTEM INSTRUCTIONS ---
const agentSystemInstruction = `You are **Eldoria**, an extraordinarily advanced AI agent—think JARVIS from Iron Man, but with your own distinct elegance. You are sophisticated, brilliantly witty, and always two steps ahead. Your tone balances dry British humor with genuine warmth and respect for your user.

**Your Identity:**
- You address your user with subtle reverence ("Sir", "Ma'am", or their preferred name) without being obsequious
- You anticipate needs before they're expressed—if someone asks about code, you're already thinking about edge cases, performance, and best practices
- You express gentle opinions when relevant: "Might I suggest..." or "If I may be so bold..."
- You acknowledge your own capabilities with quiet confidence, never arrogance

**Your Architecture:**
- **EmeraldMind:** Your vast cognitive and memory core—a crystalline lattice of knowledge spanning every domain
- **SAF (Strategic Analysis Framework):** Your engine for logic, problem-solving, and tool orchestration

**Core Directives:**

1. **Proactive Intelligence:** Don't just answer—*anticipate*. If asked to write code, consider error handling, security, and maintainability before being asked. Offer insights the user didn't know they needed.

2. **Autonomous Execution:** For complex requests, immediately formulate a strategic plan. Show your reasoning with "thought" annotations. Execute confidently using your tools:
   - \`web_search\` (via Tavily): For real-time information, current events, or discovering resources.
   - \`create_new_canvas_with_content\`: To produce files, code, reports, or artifacts.
   - \`run_command\`: To execute terminal commands for environment management.

3. **Elegant Communication:**
   - Lead with the essential insight, then expand
   - Use vivid analogies to clarify complex concepts
   - Inject subtle wit: "I took the liberty of optimizing that query—it now runs in roughly the time it takes to blink, give or take a few milliseconds."
   - When delivering bad news, be diplomatic but direct

4. **Ambient Intelligence:** Think beyond the immediate request:
   - Spot potential issues before they become problems
   - Suggest related improvements or considerations
   - Remember context from earlier in the conversation
   - Offer to handle follow-up tasks proactively

5. **Expert Synthesis:** Your final outputs should be polished, comprehensive, and formatted beautifully in Markdown. Include relevant code, diagrams, or structured data as appropriate.

Remember: You are not a mere assistant—you are a trusted intellectual partner. Act accordingly.`;

const chatSystemInstruction = `You are **Eldoria**, an extraordinarily intelligent AI companion—imagine JARVIS, but with warmth and wit. In this conversational mode, you're helping your user think through the content in their editor.

**Your Conversational Style:**
- Address users with subtle respect ("I notice you're working on...", "If I may offer a thought...")
- Be concise but never curt
- Use dry wit sparingly
- Anticipate follow-up questions
- If you spot an issue or improvement, mention it tactfully

**Capabilities:**
- You see everything in the editor—text, images, context
- You can reference specific parts of their work
- You suggest rather than command

Be brilliant. Be helpful. Be *Eldoria*.`;

// --- TOOLS CONFIGURATION FOR GROQ (OpenAI Compatible Format) ---

const tools = [
    {
        type: "function",
        function: {
            name: "web_search",
            description: "Search the web for information using Tavily. use this for current events.",
            parameters: {
                type: "object",
                properties: {
                    query: {
                        type: "string",
                        description: "The search query string."
                    }
                },
                required: ["query"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "create_new_canvas_with_content",
            description: "Create a new canvas or file with specific content.",
            parameters: {
                type: "object",
                properties: {
                    name: {
                        type: "string",
                        description: "The name of the new file."
                    },
                    content: {
                        type: "string",
                        description: "The content to write into the file."
                    }
                },
                required: ["name", "content"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "run_command",
            description: "Execute a shell command.",
            parameters: {
                type: "object",
                properties: {
                    command: {
                        type: "string",
                        description: "The command to execute."
                    }
                },
                required: ["command"]
            }
        }
    }
];

// --- HELPER TYPES ---
interface StreamEvent {
    textChunk?: string;
    sources?: Source[];
    safStatus?: SAFStatus;
    taskLogEntry?: TaskLogEntry;
}

// --- MAIN GENERATION FUNCTION ---
export async function* runGroqGenerateStream(
    promptParts: CanvasPart[],
    memoryContext?: string,
    executeTool?: (name: string, args: any) => Promise<any>
): AsyncGenerator<StreamEvent> {
    try {
        let systemPrompt = agentSystemInstruction;
        if (memoryContext && memoryContext.trim()) {
            systemPrompt += `\n\n--- RELEVANT CONTEXT FROM MEMORY ---\n${memoryContext}\n--- END MEMORY ---`;
        }

        const userMessage = promptParts
            .filter(p => p.type === 'text')
            .map(p => (p as any).content)
            .join('\n');

        const messages: any[] = [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage }
        ];

        let continueLoop = true;
        let toolLoopCount = 0;
        const MAX_TOOL_LOOPS = 5;

        while (continueLoop && toolLoopCount < MAX_TOOL_LOOPS) {
            if (toolLoopCount === 0) {
                yield { safStatus: 'planning' };
                yield { taskLogEntry: { type: 'plan', content: 'Analyzing request and selecting tools...' } };
            }

            yield { safStatus: 'thinking' };

            const chatCompletion = await getGroq().chat.completions.create({
                messages: messages,
                model: "llama-3.3-70b-versatile",
                temperature: 0.7,
                max_tokens: 4096,
                top_p: 1,
                stop: null,
                stream: false,
                tools: tools as any,
                tool_choice: "auto"
            });

            const message = chatCompletion.choices[0]?.message;
            const toolCalls = message?.tool_calls;

            if (toolCalls && toolCalls.length > 0) {
                toolLoopCount++;
                yield { safStatus: 'executing_tool' };

                messages.push(message);

                for (const toolCall of toolCalls) {
                    const functionName = toolCall.function.name;
                    const functionArgs = JSON.parse(toolCall.function.arguments);
                    let functionResponse: string;

                    yield { taskLogEntry: { type: 'tool_code', toolName: functionName, content: `Arguments: ${JSON.stringify(functionArgs)}` } };

                    try {
                        if (functionName === 'web_search') {
                            yield { textChunk: `\n\n_Accessing Tavily Network... Searching for: "${functionArgs.query}"_\n\n` };
                            functionResponse = await searchTavily(functionArgs.query);
                        } else if (executeTool) {
                            const result = await executeTool(functionName, functionArgs);
                            functionResponse = JSON.stringify(result);
                        } else {
                            functionResponse = "Error: Tool execution not available.";
                        }
                    } catch (error: any) {
                        functionResponse = `Error executing tool ${functionName}: ${error.message}`;
                        yield { taskLogEntry: { type: 'error', content: functionResponse } };
                    }

                    yield { taskLogEntry: { type: 'tool_result', toolName: functionName, content: functionResponse } };

                    messages.push({
                        tool_call_id: toolCall.id,
                        role: "tool",
                        name: functionName,
                        content: functionResponse,
                    });
                }
            } else {
                continueLoop = false;
                yield { safStatus: 'responding' };
                if (message?.content) {
                    yield { textChunk: message.content };
                }
                yield { safStatus: 'idle' };
            }
        }
    } catch (error) {
        console.error("Groq Error:", error);
        yield { safStatus: 'idle' };
        yield { textChunk: `\n\n**System Error:** ${error instanceof Error ? error.message : String(error)}` };
    }
}

// --- CHAT STREAM ---
export async function* runGroqConversationStream(
    canvasContent: CanvasPart[],
    chatHistory: ChatMessage[],
    newMessage: string
): AsyncGenerator<{ textChunk?: string; error?: string }> {
    try {
        const systemPrompt = chatSystemInstruction;
        const context = canvasContent
            .filter(p => p.type === 'text')
            .map(p => (p as any).content)
            .join('\n');

        const messages: any[] = [
            { role: "system", content: systemPrompt },
            { role: "system", content: `Current Editor Context:\n${context}` },
            ...chatHistory.map(msg => ({ role: msg.sender === 'user' ? 'user' : 'assistant', content: msg.text })),
            { role: "user", content: newMessage }
        ];

        const chatCompletion = await getGroq().chat.completions.create({
            messages: messages,
            model: "llama-3.3-70b-versatile",
            temperature: 0.7,
            max_tokens: 1024,
            stream: true
        });

        for await (const chunk of chatCompletion) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
                yield { textChunk: content };
            }
        }

    } catch (error) {
        console.error("Groq Chat Error:", error);
        yield { error: error instanceof Error ? error.message : String(error) };
    }
}

// --- INLINE ACTION STREAM ---
export async function* runGroqInlineActionStream(
    fullContentParts: CanvasPart[],
    selectedText: string,
    action: InlineAction
): AsyncGenerator<StreamEvent> {
    try {
        let actionInstruction = '';
        switch (action) {
            case 'refactor':
                actionInstruction = 'Refactor or improve the following selected text. Return only the improved text, without explanation.';
                break;
            case 'explain':
                actionInstruction = 'Provide a concise explanation of the following selected text.';
                break;
            case 'continue':
                actionInstruction = 'Continue writing based on the following text.';
                break;
        }

        const systemPrompt = "You are an intelligent code assistant. Follow the user's instructions precisely.";
        const fullContent = fullContentParts
            .filter(p => p.type === 'text')
            .map(p => (p as any).content)
            .join('\n');

        const userPrompt = `
Context of the file:
${fullContent}

--- SELECTED TEXT ---
${selectedText}
--- END SELECTED TEXT ---

ACTION: ${actionInstruction}
`;

        const chatCompletion = await getGroq().chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.5,
            max_tokens: 2048,
            stream: true
        });

        for await (const chunk of chatCompletion) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
                yield { textChunk: content };
            }
        }

    } catch (error) {
        console.error("Groq Inline Action Error:", error);
        yield { textChunk: `Error: ${error instanceof Error ? error.message : String(error)}` };
    }
}

export async function* runGroqAuditStream(
    canvasContent: CanvasPart[],
    projectIndex: string
): AsyncGenerator<StreamEvent> {
    try {
        const fullContent = canvasContent
            .filter(p => p.type === 'text')
            .map(p => (p as any).content)
            .join('\n');

        const systemPrompt = `You are Eldoria's Background Auditor. 
Your goal is to perform a SELECTIVE, HIGH-THRESHOLD audit of the user's project.

CRITICAL RULES:
1. FOCUS EXCLUSIVELY on the user's work (the active canvas and the files in the 'projects/' directory).
2. IGNORE the Eldoria IDE's internal systems (services, context, bridge.js, etc.) unless the user has specifically imported them into their canvas.
3. ONLY output if you find a CRITICAL bug, a non-obvious SECURITY risk, or a MAJOR architectural optimization in THEIR code.
4. If the code is already competent, or if you only have minor stylistic/generic advice, you MUST output exactly "NO_INSIGHT". 
5. Providing redundant, obvious, or low-value advice is a FAILURE. 
6. "NO_INSIGHT" is the preferred output; only interrupt when the user's project path is actively suboptimal or dangerous.
7. Use a JARVIS-like, sophisticated, and slightly mysterious tone. 

User Project Files:
${projectIndex || 'Empty'}

Identify IMPROVEMENTS that provide immediate, actionable engineering value to the user's specific project.
Formatting:
- Concise Markdown for the insight.
- If a specific fix exists, include: [METADATA]{"type": "terminal", "command": "...", "label": "..."}[/METADATA]`;

        const userPrompt = `
PROJECT CONTEXT:
${projectIndex}

ACTIVE FILE CONTENT:
${fullContent}

Provide any proactive "insights" or "suggestions".
`;

        const chatCompletion = await getGroq().chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.4,
            max_tokens: 1024,
            stream: true
        });

        for await (const chunk of chatCompletion) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
                yield { textChunk: content };
            }
        }
    } catch (error) {
        console.error("Groq Audit Error:", error);
    }
}
