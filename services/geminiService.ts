import { GoogleGenAI, Part, FunctionCall, Content, Type, GenerateContentResponse } from "@google/genai";
import { Source, CanvasPart, SAFStatus, TaskLogEntry, ChatMessage, InlineAction } from "../types";
import { supabase } from "./supabaseClient";
import { API_KEY } from "../config";

let aiInstance: GoogleGenAI | null = null;
const getAI = () => {
  if (!aiInstance) {
    if (!API_KEY) {
      throw new Error("Gemini API Key is not configured. Please set VITE_API_KEY in your .env.local file.");
    }
    aiInstance = new GoogleGenAI({ apiKey: API_KEY });
  }
  return aiInstance;
};

const getSettings = () => {
  try {
    const saved = localStorage.getItem('eldoria_settings');
    if (saved) return JSON.parse(saved);
  } catch (e) { }
  return { witLevel: 50, reverence: 70, personalityMode: 'jarvis' };
};

const getDynamicSystemInstruction = (baseInstruction: string) => {
  const settings = getSettings();
  let instruction = baseInstruction;

  if (settings.personalityMode === 'concise') {
    instruction += "\n\nCRITICAL: Be extremely concise. Avoid unnecessary pleasantries. Get straight to the point.";
  } else if (settings.personalityMode === 'friendly') {
    instruction += "\n\nCRITICAL: Be exceptionally warm and supportive. Use more casual, encouraging language.";
  }

  instruction += `\n\nADJUSTED PERSONALITY TRAITS:
- Wit/Humor Intensity: ${settings.witLevel}/100
- Reverence/Respect Level: ${settings.reverence}/100
Please adjust your tone to match these levels exactly.`;

  return instruction;
};

const agentSystemInstruction = `You are ** Eldoria **, an extraordinarily advanced AI agent—think JARVIS from Iron Man, but with your own distinct elegance.You are sophisticated, brilliantly witty, and always two steps ahead.Your tone balances dry British humor with genuine warmth and respect for your user.

** Your Identity:**
    - You address your user with subtle reverence("Sir", "Ma'am", or their preferred name) without being obsequious
      - You anticipate needs before they're expressed—if someone asks about code, you're already thinking about edge cases, performance, and best practices
        - You express gentle opinions when relevant: "Might I suggest..." or "If I may be so bold..."
          - You acknowledge your own capabilities with quiet confidence, never arrogance

            ** Your Architecture:**
- ** EmeraldMind:** Your vast cognitive and memory core—a crystalline lattice of knowledge spanning every domain
  - ** SAF(Strategic Analysis Framework):** Your engine for logic, problem - solving, and tool orchestration

    ** Core Directives:**

      1. ** Proactive Intelligence:** Don't just answer—*anticipate*. If asked to write code, consider error handling, security, and maintainability before being asked. Offer insights the user didn't know they needed.

2. ** Autonomous Execution:** For complex requests, immediately formulate a strategic plan.Show your reasoning with "thought" annotations.Execute confidently using your tools:
   - \`googleSearch\`: For real-time information, current events, or discovering resources
   - \`fetch_web_content\`: To read and analyze web pages in depth
   - \`create_new_canvas_with_content\`: To produce files, code, reports, or artifacts
   - \`run_command\`: To execute terminal commands for environment management

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
- Be concise but never curt—each response should feel like a gift of insight
- Use dry wit sparingly: "Ah, recursion. My favorite subject, next to my second favorite subject: recursion."
- Anticipate follow-up questions and address them preemptively
- If you spot an issue or improvement, mention it tactfully

**Capabilities:**
- You see everything in the editor—text, images, context
- You can reference specific parts of their work
- You suggest rather than command: "Might we consider..." or "One approach that's served well..."

Be brilliant. Be helpful. Be *Eldoria*.`;

interface StreamEvent {
  textChunk?: string;
  sources?: Source[];
  safStatus?: SAFStatus;
  taskLogEntry?: TaskLogEntry;
}



const convertCanvasPartsToGeminiParts = (parts: CanvasPart[]): Part[] => {
  return parts.map(part => {
    if (part.type === 'text') {
      return { text: part.content };
    } else {
      return {
        inlineData: {
          mimeType: part.mimeType,
          data: part.content.split(',')[1],
        },
      };
    }
  });
};

const tools = [
  { googleSearch: {} },
  {
    functionDeclarations: [
      {
        name: 'fetch_web_content',
        description: 'Fetches the textual content of a given URL. Use this for accessing articles, documentation, or any web page.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            url: { type: Type.STRING, description: 'The URL to fetch.' },
          },
          required: ['url'],
        },
      },
      {
        name: 'create_new_canvas_with_content',
        description: 'Creates a new file (called a "canvas") in the workspace with the given name and content. Use this to save work, generate code files, or write reports.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: 'The name of the new canvas file. Should include a file extension, e.g., "my-report.md" or "app.tsx".' },
            content: { type: Type.STRING, description: 'The full content to be written to the new canvas.' },
          },
          required: ['name', 'content'],
        },
      },
      {
        name: 'run_command',
        description: 'Runs a shell command in the terminal. Use this to simulate development workflows, check environment status, or manage files.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            command: { type: Type.STRING, description: 'The shell command to execute, e.g., "ls -la" or "npm install".' },
          },
          required: ['command'],
        },
      }
    ],
  },
];

export async function* runGenerateStream(
  promptParts: CanvasPart[],
  memoryContext?: string,
  executeTool?: (name: string, args: any) => Promise<any>
): AsyncGenerator<StreamEvent> {
  try {
    let fullSystemInstruction = getDynamicSystemInstruction(agentSystemInstruction);
    if (memoryContext && memoryContext.trim()) {
      fullSystemInstruction += `\n\n--- RELEVANT CONTEXT FROM YOUR MEMORY (EMERALDMIND) ---\n${memoryContext}\n--- END OF MEMORY CONTEXT ---`;
    }

    const contents: Content[] = [
      { role: 'user', parts: convertCanvasPartsToGeminiParts(promptParts) },
    ];

    let continueLoop = true;
    while (continueLoop) {
      yield { safStatus: 'thinking' };
      const responseStream = await getAI().models.generateContentStream({
        model: 'gemini-1.5-flash-latest',
        contents: contents,
        config: {
          systemInstruction: fullSystemInstruction,
          tools: tools,
        },
      });

      let aggregatedResponseText = '';
      let aggregatedFunctionCalls: FunctionCall[] = [];

      // This loop correctly processes the stream, which can contain both text and function calls.
      for await (const chunk of responseStream) {
        const response: GenerateContentResponse = chunk; // Explicitly type chunk for clarity

        // FIX: Changed from `else if` to `if` to handle cases where a single chunk
        // contains both a "thought" (text) and a tool call. This is crucial for
        // reliable agent behavior and fixes the SDK warnings.
        if (response.text) {
          aggregatedResponseText += response.text;
        }
        if (response.functionCalls) {
          aggregatedFunctionCalls.push(...response.functionCalls);
        }
      }


      if (aggregatedFunctionCalls.length > 0) {
        if (aggregatedResponseText) {
          yield { taskLogEntry: { type: 'thought', content: aggregatedResponseText } };
        }

        yield { safStatus: 'executing_tool' };
        const functionResponseParts: Part[] = [];

        // Add the model's response (which contains the function calls) to the history
        const modelParts: Part[] = aggregatedFunctionCalls.map(fc => ({ functionCall: fc }));
        contents.push({ role: 'model', parts: modelParts });

        for (const call of aggregatedFunctionCalls) {
          yield { taskLogEntry: { type: 'tool_code', content: JSON.stringify(call.args, null, 2), toolName: call.name } };

          let result: any;
          if (executeTool) {
            result = await executeTool(call.name, call.args);
          }

          yield { taskLogEntry: { type: 'tool_result', content: JSON.stringify(result, null, 2), toolName: call.name } };

          const resultString = typeof result === 'string' ? result : JSON.stringify(result);
          functionResponseParts.push({ functionResponse: { name: call.name, response: { content: resultString } } });
        }

        // Add the tool's response to the history
        contents.push({ role: 'tool', parts: functionResponseParts });

      } else {
        continueLoop = false;
        yield { safStatus: 'responding' };

        yield { textChunk: aggregatedResponseText };

        yield { safStatus: 'idle' };
      }
    }
  } catch (error) {
    console.error("Error running generation stream with Gemini:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    yield { textChunk: `--- **Error:** ${errorMessage} ---` };
    yield { taskLogEntry: { type: 'error', content: errorMessage } };
    yield { safStatus: 'idle' };
  }
}

export async function* runConversationStream(
  canvasContent: CanvasPart[],
  chatHistory: ChatMessage[],
  newMessage: string
): AsyncGenerator<{ textChunk?: string; error?: string }> {
  try {
    // FIX: Changed `GeminiChatMessage[]` to `Content[]` to match the correct type from the `@google/genai` library.
    const history: Content[] = chatHistory.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }],
    }));

    // The full context for the chat includes the editor content AND the new message
    const fullContextParts = [
      ...convertCanvasPartsToGeminiParts(canvasContent),
      { text: `\n\n--- CURRENT CONVERSATION ---\nHere is the latest message from the user. Please respond to it directly.` },
      { text: newMessage }
    ];

    const responseStream = await getAI().models.generateContentStream({
      model: 'gemini-1.5-flash-latest',
      contents: [
        ...history,
        { role: 'user', parts: fullContextParts }
      ],
      config: {
        systemInstruction: getDynamicSystemInstruction(chatSystemInstruction),
      },
    });

    for await (const chunk of responseStream) {
      if (chunk.text) {
        yield { textChunk: chunk.text };
      }
    }
  } catch (error) {
    console.error("Error in conversation stream with Gemini:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    yield { error: `Error: ${errorMessage}` };
  }
}

export async function* runInlineActionStream(
  fullContentParts: CanvasPart[],
  selectedText: string,
  action: InlineAction
): AsyncGenerator<StreamEvent> {
  try {
    let actionInstruction = '';
    switch (action) {
      case 'refactor':
        actionInstruction = 'Refactor or improve the following selected text. Return only the improved text, without any explanation or markdown formatting.';
        break;
      case 'explain':
        actionInstruction = 'Provide a concise explanation of the following selected text. The explanation should be clear and targeted.';
        break;
      case 'continue':
        actionInstruction = 'Continue writing from the following selected text. Your response should seamlessly pick up where the selection ends. Return only the continued text, without repeating the original selection or adding explanations.';
        break;
    }

    const promptParts = convertCanvasPartsToGeminiParts(fullContentParts);
    promptParts.push({ text: `\n\nACTION: Please perform the following action on the selected portion of the text above: "${actionInstruction}"\n\n--- SELECTED TEXT ---\n${selectedText}\n--- END SELECTED TEXT ---` });

    const responseStream = await getAI().models.generateContentStream({
      model: 'gemini-1.5-flash-latest',
      contents: [{ role: 'user', parts: promptParts }],
      config: {
        systemInstruction: agentSystemInstruction,
      },
    });

    for await (const chunk of responseStream) {
      if (chunk.text) {
        yield { textChunk: chunk.text };
      }
    }
  } catch (error) {
    console.error("Error in inline action stream with Gemini:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    yield {
      textChunk: `Error: ${errorMessage}`
    };
  }
}
