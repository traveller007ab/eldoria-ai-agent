// Removed groq-sdk import - all API calls go through bridge proxy
// import Groq from 'groq-sdk';
import { searchTavily } from './tavilyService';
import { CanvasPart, ChatMessage, TaskLogEntry, Source, SAFStatus, InlineAction } from '../types';
import { contextService } from './ContextService';

import { GROQ_API_KEY, API_KEY as GEMINI_API_KEY, OPENROUTER_API_KEY } from '../config';
import { getBridgeUrl } from './bridgeClient';

// No direct Groq SDK - all calls go through bridge proxy
// This prevents the SDK from throwing at import time when env vars are missing
export const getGroq = (): any => {
    console.warn('[GROQ] Direct SDK disabled - all calls go through bridge proxy');
    return null;
};


async function* streamFromBridge(body: any): AsyncGenerator<string> {
    const bridgeUrl = await getBridgeUrl();

    // Determine target proxy based on model or explicit provider
    const isOpenRouter = body.model?.startsWith('openrouter/') || body.provider === 'openrouter';
    const endpoint = isOpenRouter ? '/proxy/openrouter' : '/proxy/groq';

    const response = await fetch(`${bridgeUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, apiKey: GROQ_API_KEY, geminiApiKey: GEMINI_API_KEY, openRouterApiKey: OPENROUTER_API_KEY })
    });

    if (!response.ok) {
        let detail = response.statusText;
        try {
            const err = await response.json();
            if (err.detail) detail = err.detail;
        } catch (e) {}
        throw new Error(`Bridge Error: ${detail}`);
    }

    const reader = response.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);

        // Parse SSE format: "data: {...}"
        const lines = chunk.split('\n');
        for (const line of lines) {
            if (line.startsWith('data: ')) {
                const jsonStr = line.replace('data: ', '').trim();
                if (jsonStr === '[DONE]') break;
                try {
                    const data = JSON.parse(jsonStr);
                    const content = data.choices[0]?.delta?.content || data.choices[0]?.message?.content || "";
                    if (content) yield content;
                } catch (e) { }
            }
        }
    }
}

// Reuse system instructions and tools from previous version...
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

interface StreamEvent {
    textChunk?: string;
    sources?: Source[];
    safStatus?: SAFStatus;
    taskLogEntry?: TaskLogEntry;
    error?: string;
}

export async function* runGroqGenerateStream(
    promptParts: CanvasPart[],
    memoryContext?: string,
    executeTool?: (name: string, args: any) => Promise<any>
): AsyncGenerator<StreamEvent> {
    try {
        let systemPrompt = agentSystemInstruction;
        const ambientContext = contextService.getSystemContextString();
        if (ambientContext) {
            systemPrompt += `\n\n${ambientContext}`;
        }
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

            // For tool calls, we don't stream to simplify parsing in this prototype
            const bridgeUrl = await getBridgeUrl();
            const response = await fetch(`${bridgeUrl}/proxy/groq`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages,
                    model: "llama-3.3-70b-versatile",
                    temperature: 0.7,
                    stream: false,
                    apiKey: GROQ_API_KEY,
                    geminiApiKey: GEMINI_API_KEY,
                    openRouterApiKey: OPENROUTER_API_KEY,
                    tools: tools as any,
                    tool_choice: "auto"
                })
            });

            if (!response.ok) throw new Error(`Bridge Error: ${response.statusText}`);
            const data = await response.json();
            const message = data.choices[0]?.message;
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
    } catch (error: any) {
        console.error("Groq Proxy Error:", error);
        yield { safStatus: 'idle' };
        let msg = error.message;
        if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
            msg = "The Eldoria Bridge Hub is offline. Please open a terminal and run 'npm run bridge' to enable AI generation and terminal orchestration.";
        }
        yield { textChunk: `\n\n**System Connection Error:** ${msg}` };
    }
}

export async function* runGroqConversationStream(
    canvasContent: CanvasPart[],
    chatHistory: ChatMessage[],
    newMessage: string,
    metaContext?: string
): AsyncGenerator<{ textChunk?: string; error?: string }> {
    try {
        const ambientContext = contextService.getSystemContextString();
        const systemPrompt = chatSystemInstruction +
            (ambientContext ? `\n\n${ambientContext}` : "") +
            (metaContext ? `\n\n--- ADDITIONAL CONTEXT ---\n${metaContext}` : "");
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

        const stream = streamFromBridge({
            messages,
            model: "llama-3.3-70b-versatile",
            temperature: 0.7,
            stream: true
        });

        for await (const chunk of stream) {
            yield { textChunk: chunk };
        }

    } catch (error: any) {
        console.error("Groq Proxy Chat Error:", error);
        let msg = error.message;
        if (msg.includes('Failed to fetch')) {
            msg = "Bridge Hub offline. Run 'npm run bridge' in your terminal.";
        }
        yield { error: msg };
    }
}

export async function* runGroqInlineActionStream(
    fullContentParts: CanvasPart[],
    selectedText: string,
    action: InlineAction
): AsyncGenerator<StreamEvent> {
    try {
        let actionInstruction = '';
        switch (action) {
            case 'refactor': actionInstruction = 'Refactor or improve the following selected text. Return only the improved text.'; break;
            case 'explain': actionInstruction = 'Provide a concise explanation of the following selected text.'; break;
            case 'continue': actionInstruction = 'Continue writing based on the following text.'; break;
        }

        const systemPrompt = "You are an intelligent code assistant. Follow the user's instructions precisely.";
        const fullContent = fullContentParts.filter(p => p.type === 'text').map(p => (p as any).content).join('\n');

        const userPrompt = `Context:\n${fullContent}\n\nSELECTION:\n${selectedText}\n\nACTION: ${actionInstruction}`;

        const stream = streamFromBridge({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.5,
            stream: true
        });

        for await (const chunk of stream) {
            yield { textChunk: chunk };
        }
    } catch (error: any) {
        console.error("Groq Proxy Inline Error:", error);
        let msg = error.message;
        if (msg.includes('Failed to fetch')) {
            msg = "Bridge Offline. Run 'npm run bridge'.";
        }
        yield { textChunk: `Error: ${msg}` };
    }
}

export async function* runGroqAuditStream(
    canvasContent: CanvasPart[],
    projectIndex: string
): AsyncGenerator<StreamEvent> {
    try {
        const fullContent = canvasContent.filter(p => p.type === 'text').map(p => (p as any).content).join('\n');
        const systemPrompt = `You are Eldoria's Background Auditor. Analyze the active file in the context of the project index. Output "NO_INSIGHT" if no critical issues found.`;

        const stream = streamFromBridge({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Index:\n${projectIndex}\n\nContent:\n${fullContent}` }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.4,
            stream: true
        });

        for await (const chunk of stream) {
            yield { textChunk: chunk };
        }
    } catch (error) {
        console.error("Groq Proxy Audit Error:", error);
    }
}

export async function* runOpenRouterGenerateStream(
    promptParts: CanvasPart[],
    model: string,
    memoryContext?: string
): AsyncGenerator<StreamEvent> {
    // Re-use the existing logic but force the provider
    const generator = runGroqGenerateStream(promptParts, memoryContext);

    // We need to intercept the fetch call effectively. 
    // Since runGroqGenerateStream hardcodes the model in the body, we need a slight refactor 
    // OR we can just implement a simplified version here.
    // Given the architecture, let's implement a clean call:

    try {
        const ambientContext = contextService.getSystemContextString();
        let systemPrompt = agentSystemInstruction + (ambientContext ? `\n\n${ambientContext}` : "");

        const userMessage = promptParts.filter(p => p.type === 'text').map(p => (p as any).content).join('\n');

        const messages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage }
        ];

        yield { safStatus: 'thinking' };

        const stream = streamFromBridge({
            messages,
            model: model, // e.g. "anthropic/claude-3-opus"
            provider: 'openrouter',
            temperature: 0.7,
            stream: true,
            apiKey: OPENROUTER_API_KEY
        });

        for await (const chunk of stream) {
            yield { textChunk: chunk };
        }
        yield { safStatus: 'idle' };

    } catch (error: any) {
        console.error("OpenRouter Stream Error:", error);
        yield { safStatus: 'idle', error: error.message };
    }
}

export async function runGroqGenerate(
    messages: { role: string; content: string }[],
    options: {
        model?: string;
        temperature?: number;
        response_format?: { type: "json_object" };
    } = {}
): Promise<any> {
    try {
        const bridgeUrl = await getBridgeUrl();
        const model = options.model || "llama-3.3-70b-versatile";

        // Determine target proxy based on model
        const isOpenRouter = model.startsWith('openrouter/');
        const endpoint = isOpenRouter ? '/proxy/openrouter' : '/proxy/groq';

        const response = await fetch(`${bridgeUrl}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages,
                model,
                temperature: options.temperature ?? 0.7,
                stream: false,
                response_format: options.response_format,
                apiKey: GROQ_API_KEY,
                geminiApiKey: GEMINI_API_KEY,
                openRouterApiKey: OPENROUTER_API_KEY
            })
        });

        if (!response.ok) {
            let detail = response.statusText;
            try {
                const err = await response.json();
                if (err.detail) detail = err.detail;
            } catch (e) {}
            throw new Error(`Bridge Error: ${detail}`);
        }

        const data = await response.json();
        return data; // Returns standard OpenAI-compatible response object
    } catch (error: any) {
        console.error("Groq Generate Error:", error);
        throw error;
    }
}
