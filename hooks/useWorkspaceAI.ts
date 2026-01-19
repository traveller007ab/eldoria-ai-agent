import { useCallback, useRef, useEffect } from 'react';
import { Canvas, CanvasPart, ChatMessage, InlineAction, TaskLogEntry, Attachment } from '../types';
import { WorkspaceAction, WorkspaceState } from '../context/WorkspaceContext';
import * as MemoryService from '../services/memoryService';
import { CodebaseService } from '../services/codebaseService';
import { supabase } from '../services/supabaseClient';
import { runGroqGenerateStream, runGroqConversationStream, runGroqInlineActionStream, runGroqAuditStream } from '../services/groqService';
import { contextService } from '../services/ContextService';
import * as WorkspaceService from '../services/workspaceService';

interface UseWorkspaceAIProps {
    state: WorkspaceState;
    dispatch: React.Dispatch<WorkspaceAction>;
    activeCanvas: Canvas | undefined;
    createCanvas: (name?: string, content?: CanvasPart[], shouldSwitch?: boolean) => Promise<Canvas | null>;
    updateCanvasPart: (id: string, partIndex: number, part: CanvasPart) => void;
    _updateCanvasDatabase: (id: string, updates: Partial<Omit<Canvas, 'id'>>) => void;
}

export const useWorkspaceAI = ({
    state,
    dispatch,
    activeCanvas,
    createCanvas,
    updateCanvasPart,
    _updateCanvasDatabase
}: UseWorkspaceAIProps) => {
    const lastAuditedContentRef = useRef<string>('');

    const executeTool = useCallback(async (name: string, args: any): Promise<any> => {
        if (name === 'fetch_web_content') {
            const { data, error } = await supabase.functions.invoke('scrape', { body: { url: args.url } });
            return error ? { error: error.message } : { content: data.content };
        }
        if (name === 'create_new_canvas_with_content') {
            const newCanvas = await createCanvas(args.name, [{ type: 'text', content: args.content }], false);
            return { success: !!newCanvas, canvasId: newCanvas?.id, canvasName: newCanvas?.name };
        }
        if (name === 'run_command') {
            const command = args.command;
            const currentTerminal = activeCanvas?.terminal_output || '';
            const newTerminal = currentTerminal + `\n$ ${command}\n[SIMULATED OUTPUT]: Command "${command}" executed successfully.`;

            if (state.activeCanvasId) {
                dispatch({ type: 'UPDATE_CANVAS', payload: { ...activeCanvas!, terminal_output: newTerminal } });
                _updateCanvasDatabase(state.activeCanvasId, { terminal_output: newTerminal });
            }
            return { success: true, output: `Executed: ${command}` };
        }
        if (name === 'deconstruct_system') {
            // SAF System Deconstruction Tool
            const safBlueprint = {
                project_name: args.system_name,
                modification_goal: args.modification_goal || 'Analysis only',
                components: [
                    { id: 'core', name: `${args.system_name} Core`, type: 'core', dependencies: [] },
                    { id: 'input', name: 'Input Layer', type: 'subcore', dependencies: ['core'] },
                    { id: 'processing', name: 'Processing Unit', type: 'subcore', dependencies: ['core'] },
                    { id: 'output', name: 'Output Layer', type: 'subcore', dependencies: ['processing'] }
                ],
                flows: [
                    { from: 'input', to: 'processing', type: 'data_flow' },
                    { from: 'processing', to: 'output', type: 'data_flow' }
                ],
                description: args.description
            };

            // Create a new canvas with the blueprint for visualization
            const blueprintContent = `# SAF Blueprint: ${args.system_name}\n\n## Goal\n${args.modification_goal || 'System Analysis'}\n\n## Description\n${args.description}\n\n## Component Tree\n\`\`\`json\n${JSON.stringify(safBlueprint, null, 2)}\n\`\`\`\n\n---\n*Use this blueprint to modify components and observe cascading effects.*`;
            const newCanvas = await createCanvas(`SAF: ${args.system_name}`, [{ type: 'text', content: blueprintContent }], false);

            return {
                success: true,
                blueprint: safBlueprint,
                canvasId: newCanvas?.id,
                message: `System "${args.system_name}" deconstructed. Blueprint saved to new canvas.`
            };
        }
        if (name === 'suggest_prompt') {
            // AI is recommending a prompt schema
            return {
                success: true,
                message: `Suggested prompt schema: ${args.schema_id}. Reasoning: ${args.reasoning}`,
                schema_id: args.schema_id,
                suggested_variables: args.suggested_variables || {},
                reasoning: args.reasoning
            };
        }
        // googleSearch is handled natively by the Gemini API.
        return { error: `Tool "${name}" is not implemented.` };
    }, [createCanvas, activeCanvas, state.activeCanvasId, _updateCanvasDatabase, dispatch]);

    const generate = useCallback(async () => {
        if (!state.activeCanvasId || state.isLoading || !activeCanvas) return;
        if (!activeCanvas.content || activeCanvas.content.length === 0) return;

        dispatch({ type: 'SET_LOADING', payload: true });
        dispatch({ type: 'UPDATE_CANVAS', payload: { ...activeCanvas, output: '', output_sources: [], task_log: [] } });

        dispatch({ type: 'SET_MEMORY_STATUS', payload: 'searching' });
        const queryText = activeCanvas.content.filter(p => p.type === 'text').map(p => p.content).join('\n');
        const memories = await MemoryService.searchMemories(queryText);
        const memoryContext = memories.map(m => m.content).join('\n---\n');
        dispatch({ type: 'SET_MEMORY_STATUS', payload: 'idle' });

        let finalOutput = '';
        let taskLog: TaskLogEntry[] = [];
        try {
            const projectIndex = CodebaseService.getProjectIndex();
            const enhancedMemoryContext = `${memoryContext}\n\n--- PROJECT STRUCTURE ---\n${projectIndex}`;

            const stream = runGroqGenerateStream(activeCanvas.content, enhancedMemoryContext, executeTool);
            for await (const event of stream) {
                if (event.safStatus) {
                    dispatch({ type: 'SET_SAF_STATUS', payload: event.safStatus });
                }
                if (event.taskLogEntry) {
                    taskLog = [...taskLog, event.taskLogEntry];
                    dispatch({ type: 'UPDATE_CANVAS', payload: { ...activeCanvas, task_log: [...taskLog] } });
                }
                if (event.textChunk) {
                    finalOutput += event.textChunk;
                    dispatch({ type: 'UPDATE_CANVAS', payload: { ...activeCanvas, output: finalOutput, task_log: [...taskLog] } });
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
            dispatch({ type: 'SET_SAF_STATUS', payload: 'idle' });
            _updateCanvasDatabase(state.activeCanvasId, { output: finalOutput, task_log: taskLog });
        }
    }, [state.activeCanvasId, state.isLoading, activeCanvas, executeTool, _updateCanvasDatabase, dispatch]);

    const performProactiveAudit = useCallback(async () => {
        if (!activeCanvas || state.isLoading) return;

        try {
            console.log("[AUDITOR] Starting proactive audit...");
            const projectIndex = CodebaseService.getProjectIndex();
            const stream = runGroqAuditStream(activeCanvas.content, projectIndex);

            let auditOutput = '';
            for await (const event of stream) {
                if (event.textChunk) {
                    auditOutput += event.textChunk;
                }
            }

            if (auditOutput.trim() && auditOutput.trim() !== "NO_INSIGHT") {
                // Parse metadata
                let cleanText = auditOutput;
                let metadata = null;
                const metadataMatch = auditOutput.match(/\[METADATA\](.*?)\[\/METADATA\]/s);

                if (metadataMatch) {
                    try {
                        metadata = JSON.parse(metadataMatch[1].trim());
                        cleanText = auditOutput.replace(/\[METADATA\].*?\[\/METADATA\]/s, '').trim();
                    } catch (e) {
                        console.error("Failed to parse insight metadata:", e);
                    }
                }

                const insightEntry: ChatMessage = { sender: 'bot', text: `💡 **Eldoria Insight:**\n\n${cleanText}` };

                // Push to both chat and the new dedicated insights array
                const updatedInsights = [cleanText, ...(activeCanvas.insights || [])].slice(0, 10); // Keep last 10
                const updatedMetadata = [metadata, ...(activeCanvas.insight_metadata || [])].slice(0, 10);

                dispatch({
                    type: 'UPDATE_CANVAS',
                    payload: {
                        ...activeCanvas,
                        chat_history: [...(activeCanvas.chat_history || []), insightEntry],
                        insights: updatedInsights,
                        insight_metadata: updatedMetadata
                    }
                });
            }

            // Track that we've audited this specific content
            lastAuditedContentRef.current = JSON.stringify(activeCanvas.content);
        } catch (e) {
            console.error("Proactive Audit Failed:", e);
        }
    }, [activeCanvas, state.isLoading, dispatch]);

    const sendChatMessage = useCallback(async (message: string, attachments: Attachment[] = []) => {
        if (!activeCanvas || state.isChatLoading) return;

        dispatch({ type: 'SET_CHAT_LOADING', payload: true });

        // Process attachments: Read content if not present
        const processedAttachments = await Promise.all(attachments.map(async attr => {
            if (!attr.content) {
                const content = await CodebaseService.readFileContent(attr.path);
                return { ...attr, content };
            }
            return attr;
        }));

        const userMessage: ChatMessage = { sender: 'user', text: message, attachments: processedAttachments };
        const currentHistory = activeCanvas.chat_history || [];
        const updatedHistory = [...currentHistory, userMessage];

        // Optimistically update UI
        dispatch({ type: 'UPDATE_CANVAS', payload: { ...activeCanvas, chat_history: updatedHistory } });

        let botResponse = '';
        const botMessage: ChatMessage = { sender: 'bot', text: '' };
        const finalHistory = [...updatedHistory, botMessage];

        try {
            // Build Meta-Context
            const projectIndex = CodebaseService.getProjectIndex();
            const firstPartText = activeCanvas.content[0]?.type === 'text'
                ? (activeCanvas.content[0] as any).content
                : '';

            const currentProject = state.academicProjects.find(p =>
                Object.values(p.draft_content || {}).some(c => firstPartText && c.includes(firstPartText))
            );

            let metaContext = `\n\n--- PROJECT CONTEXT ---\nFILE INDEX:\n${projectIndex.substring(0, 1000)}`;
            if (currentProject) {
                metaContext += `\n\nTHESIS PROJECT: ${currentProject.name}\nOBJECTIVES: ${currentProject.wizard_state.objectives.aim}\nKEY SOURCES: ${currentProject.references.length} references found.`;
            }

            // Add full content of attachments to context
            if (processedAttachments.length > 0) {
                metaContext += `\n\n--- ATTACHED FILES ---\n`;
                processedAttachments.forEach(attr => {
                    metaContext += `\nFILE: ${attr.name}\nCONTENT:\n${attr.content?.substring(0, 5000)}\n---`;
                });
            }

            const stream = runGroqConversationStream(activeCanvas.content, currentHistory, message, metaContext);
            for await (const event of stream) {
                if (event.textChunk) {
                    botResponse += event.textChunk;

                    // --- SAF-ISO PARSING LOGIC ---
                    let displayResponse = botResponse;
                    const safMatch = botResponse.match(/<SAF_ISO>(.*?)<\/SAF_ISO>/s);

                    if (safMatch) {
                        try {
                            const safJson = JSON.parse(safMatch[1]);
                            const newBlueprint = safJson;

                            // Only update if it's new/different to avoid render thrashing
                            const currentBlueprint = activeCanvas.saf_blueprint;
                            if (JSON.stringify(newBlueprint) !== JSON.stringify(currentBlueprint)) {
                                dispatch({
                                    type: 'UPDATE_CANVAS',
                                    payload: { ...activeCanvas, saf_blueprint: newBlueprint }
                                });
                                // Persist to DB immediately so it sticks on reload
                                _updateCanvasDatabase(activeCanvas.id, { saf_blueprint: newBlueprint });
                            }

                            // Hide the JSON block from the chat UI
                            displayResponse = botResponse.replace(safMatch[0], '').trim();
                        } catch (jsonErr) {
                            console.warn("Incomplete or invalid SAF JSON:", jsonErr);
                        }
                    }

                    // --- REASONING BLOCK PARSING (For future "Show Reasoning" toggle) ---
                    const reasoningMatch = displayResponse.match(/<REASONING>(.*?)<\/REASONING>/s);
                    if (reasoningMatch) {
                        try {
                            const reasoningJson = JSON.parse(reasoningMatch[1]);
                            // Store reasoning tree as canvas metadata
                            dispatch({
                                type: 'UPDATE_CANVAS',
                                payload: {
                                    ...activeCanvas,
                                    reasoning_tree: reasoningJson,
                                    reasoning_depth: 'deep' // Mark as deep analysis
                                }
                            });
                            // Hide from display
                            displayResponse = displayResponse.replace(reasoningMatch[0], '').trim();
                        } catch {
                            // If not valid JSON, store as string for debugging
                            console.log("Reasoning block present but not JSON:", reasoningMatch[1]);
                        }
                    }
                    // -----------------------------

                    botMessage.text = displayResponse;
                    dispatch({ type: 'UPDATE_CANVAS', payload: { ...activeCanvas, chat_history: [...finalHistory] } });
                }
                if (event.promptSuggestion) {
                    botMessage.prompt_suggestion = event.promptSuggestion;
                    dispatch({ type: 'UPDATE_CANVAS', payload: { ...activeCanvas, chat_history: [...finalHistory] } });
                }
                if (event.error) {
                    botMessage.text = event.error;
                    dispatch({ type: 'UPDATE_CANVAS', payload: { ...activeCanvas, chat_history: [...finalHistory] } });
                }
            }
        } catch (e) {
            console.error("Chat failed:", e);
            botMessage.text = "Sorry, I encountered an error. The mental bridge seems slightly taxed.";
            dispatch({ type: 'UPDATE_CANVAS', payload: { ...activeCanvas, chat_history: [...finalHistory] } });
        } finally {
            dispatch({ type: 'SET_CHAT_LOADING', payload: false });
            _updateCanvasDatabase(activeCanvas.id, { chat_history: finalHistory });
        }

    }, [activeCanvas, state.isChatLoading, state.academicProjects, _updateCanvasDatabase, dispatch]);

    const acceptOutput = useCallback(() => {
        if (!activeCanvas || !activeCanvas.output) return;
        const newContent: CanvasPart[] = [{ type: 'text', content: activeCanvas.output }];
        dispatch({ type: 'UPDATE_CANVAS', payload: { ...activeCanvas, content: newContent } });
        _updateCanvasDatabase(activeCanvas.id, { content: newContent });

        dispatch({ type: 'SET_MEMORY_STATUS', payload: 'saving' });
        MemoryService.createMemory(activeCanvas.output).finally(() => {
            dispatch({ type: 'SET_MEMORY_STATUS', payload: 'idle' });
        });
    }, [activeCanvas, _updateCanvasDatabase, dispatch]);

    const appendOutput = useCallback(() => {
        if (!activeCanvas || !activeCanvas.output) return;
        const newContent = [...activeCanvas.content, { type: 'text' as const, content: '\n\n' + activeCanvas.output }];
        dispatch({ type: 'UPDATE_CANVAS', payload: { ...activeCanvas, content: newContent } });
        _updateCanvasDatabase(activeCanvas.id, { content: newContent });

        dispatch({ type: 'SET_MEMORY_STATUS', payload: 'saving' });
        MemoryService.createMemory(activeCanvas.output).finally(() => {
            dispatch({ type: 'SET_MEMORY_STATUS', payload: 'idle' });
        });
    }, [activeCanvas, _updateCanvasDatabase, dispatch]);

    const performInlineAction = useCallback(async (action: InlineAction, selection: { text: string; start: number; end: number }, partIndex: number) => {
        if (!activeCanvas) return;

        dispatch({ type: 'SET_INLINE_LOADING', payload: true });

        try {
            const stream = runGroqInlineActionStream(activeCanvas.content, selection.text, action);
            let resultText = '';
            for await (const event of stream) {
                if (event.textChunk) resultText += event.textChunk;
            }

            const targetPart = activeCanvas.content[partIndex];
            if (targetPart.type !== 'text') return;

            if (action === 'refactor') {
                const newText = targetPart.content.substring(0, selection.start) + resultText + targetPart.content.substring(selection.end);
                updateCanvasPart(activeCanvas.id, partIndex, { ...targetPart, content: newText });
            } else if (action === 'continue') {
                const newText = targetPart.content.substring(0, selection.end) + resultText + targetPart.content.substring(selection.end);
                updateCanvasPart(activeCanvas.id, partIndex, { ...targetPart, content: newText });
            } else if (action === 'explain') {
                const newLogEntry: TaskLogEntry = { type: 'thought', content: `**Explanation for selected text:**\n\n${resultText}` };
                const newLog = [...(activeCanvas.task_log || []), newLogEntry];
                dispatch({ type: 'UPDATE_CANVAS', payload: { ...activeCanvas, task_log: newLog } });
                _updateCanvasDatabase(activeCanvas.id, { task_log: newLog });
            }
        } catch (e) {
            console.error("Inline action failed:", e);
        } finally {
            dispatch({ type: 'SET_INLINE_LOADING', payload: false });
        }
    }, [activeCanvas, updateCanvasPart, _updateCanvasDatabase, dispatch]);

    const runManualCommand = useCallback(async (command: string): Promise<{ output: string; error: string | null }> => {
        if (!activeCanvas) return { output: '', error: 'No active canvas' };

        const timestamp = new Date().toLocaleTimeString();
        const commandLog = `\n[${timestamp}] $ ${command}\n`;

        // Auto-Peek: Expand if minimized
        const wasMinimized = state.isTerminalMinimized;
        if (wasMinimized) {
            dispatch({ type: 'TOGGLE_TERMINAL_MINIMIZED' });
        }

        dispatch({ type: 'SET_TERMINAL_EXECUTING', payload: true });
        dispatch({ type: 'UPDATE_CANVAS', payload: { ...activeCanvas, terminal_output: (activeCanvas.terminal_output || '') + commandLog } });

        const result = await WorkspaceService.runCommand(command);

        dispatch({
            type: 'UPDATE_CANVAS', payload: {
                ...activeCanvas,
                terminal_output: (activeCanvas.terminal_output || '') + commandLog + result.output + (result.error ? `\n[ERROR] ${result.error}` : '') + '\n'
            }
        });

        dispatch({ type: 'SET_TERMINAL_EXECUTING', payload: false });

        // Auto-Peek: Collapse back after a delay if it was auto-expanded
        if (wasMinimized) {
            setTimeout(() => {
                dispatch({ type: 'TOGGLE_TERMINAL_MINIMIZED' });
            }, 1500);
        }

        return result;
    }, [activeCanvas, state.isTerminalMinimized, dispatch]);


    return {
        generate,
        performProactiveAudit,
        sendChatMessage,
        acceptOutput,
        appendOutput,
        performInlineAction,
        runManualCommand,
        executeTool,
        lastAuditedContentRef
    };
};
