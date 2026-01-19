/**
 * useNexusAI - AI Integration Hook for Research Nexus
 * 
 * Provides AI chat capabilities for:
 * - Reading Room paper analysis
 * - Note summarization
 * - Research assistance
 */

import { useState, useCallback } from 'react';
import { runConversationStream } from '../../../services/geminiService';
import type { ChatMessage, CanvasPart } from '../../../types';

interface NexusMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

interface UseNexusAIOptions {
    documentTitle?: string;
    documentContent?: string;
    documentSource?: string;
}

export function useNexusAI(options: UseNexusAIOptions = {}) {
    const [messages, setMessages] = useState<NexusMessage[]>([
        {
            role: 'assistant',
            content: 'Hello! I\'m your research assistant. I can help you understand this document, summarize key points, or answer questions about the content.',
            timestamp: Date.now()
        }
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const sendMessage = useCallback(async (userMessage: string) => {
        if (!userMessage.trim() || isLoading) return;

        setError(null);
        setIsLoading(true);

        // Add user message
        const userMsg: NexusMessage = {
            role: 'user',
            content: userMessage,
            timestamp: Date.now()
        };
        setMessages(prev => [...prev, userMsg]);

        // Prepare context
        const documentContext = options.documentTitle
            ? `
--- DOCUMENT CONTEXT ---
Title: ${options.documentTitle}
Source: ${options.documentSource || 'Local file'}
${options.documentContent ? `Content Preview:\n${options.documentContent.slice(0, 2000)}...` : ''}

You are a research assistant helping the user understand this document. Be concise, insightful, and cite specific parts when relevant.
`
            : 'You are a helpful research assistant.';

        const canvasParts: CanvasPart[] = [];
        const chatHistory = messages.map((m) => ({
            sender: (m.role === 'user' ? 'user' : 'bot') as 'user' | 'bot',
            text: m.content,
        }));

        try {
            let fullResponse = '';
            const assistantMsgIndex = messages.length + 1;

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: '',
                timestamp: Date.now()
            }]);

            setIsStreaming(true);
            const stream = runConversationStream(
                canvasParts,
                chatHistory,
                userMessage,
                documentContext
            );

            for await (const event of stream) {
                if (event.textChunk) {
                    fullResponse += event.textChunk;
                    setMessages(prev => {
                        const updated = [...prev];
                        if (updated[assistantMsgIndex]) {
                            updated[assistantMsgIndex] = {
                                ...updated[assistantMsgIndex],
                                content: fullResponse
                            };
                        }
                        return updated;
                    });
                }
                if (event.error) {
                    setError(event.error);
                    break;
                }
            }
        } catch (err) {
            console.error('Error in nexus AI chat:', err);
            setError(err instanceof Error ? err.message : 'An error occurred');
            setMessages(prev => {
                const updated = [...prev];
                const lastIdx = updated.length - 1;
                if (updated[lastIdx]?.role === 'assistant' && !updated[lastIdx].content) {
                    updated[lastIdx] = {
                        role: 'assistant',
                        content: 'Sorry, I encountered an error processing your request. Please try again.',
                        timestamp: Date.now()
                    };
                }
                return updated;
            });
        } finally {
            setIsLoading(false);
            setIsStreaming(false);
        }
    }, [messages, isLoading, options]);

    const clearMessages = useCallback(() => {
        setMessages([{
            role: 'assistant',
            content: 'Hello! I\'m your research assistant. How can I help you today?',
            timestamp: Date.now()
        }]);
        setError(null);
        setIsStreaming(false);
    }, []);

    return {
        messages,
        sendMessage,
        clearMessages,
        isLoading,
        isStreaming,
        error
    };
}

export default useNexusAI;
