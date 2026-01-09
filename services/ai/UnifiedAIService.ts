/**
 * Unified AI Service for Eldoria
 * 
 * Provides a single interface for all AI providers (Groq, Gemini, OpenRouter, Bridge)
 * with automatic routing, fallback, and load balancing.
 * 
 * Architecture:
 * - AIServiceProvider: Interface for each AI backend
 * - UnifiedAIService: Main entry point with routing logic
 * - ProviderRegistry: Manages available providers
 */

import { GROQ_API_KEY, API_KEY as GEMINI_API_KEY, OPENROUTER_API_KEY } from '../../config';
import { getBridgeUrl } from '../bridgeClient';

// ============================================================================
// Types & Interfaces
// ============================================================================

export type AIProvider = 'groq' | 'gemini' | 'openrouter' | 'bridge';

export interface AIRequest {
    model?: string;
    messages: Array<{
        role: 'system' | 'user' | 'assistant' | 'tool';
        content: string;
        name?: string;
    }>;
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
    tools?: any[];
    provider?: AIProvider;
    priority?: number;
}

export interface AIResponse {
    content: string;
    provider: AIProvider;
    model: string;
    usage?: {
        promptTokens?: number;
        completionTokens?: number;
        totalTokens?: number;
    };
    metadata?: Record<string, any>;
}

export interface AIProviderInfo {
    name: AIProvider;
    displayName: string;
    capabilities: string[];
    models: string[];
    maxContextLength: number;
    streamingSupported: boolean;
    isAvailable: boolean;
}

export interface StreamingCallback {
    (chunk: string, partial: boolean): void;
}

// ============================================================================
// Base Provider Interface
// ============================================================================

interface BaseAIProvider {
    readonly name: AIProvider;
    readonly displayName: string;
    readonly models: string[];
    readonly maxContextLength: number;
    readonly streamingSupported: boolean;
    complete(request: AIRequest, onStream?: StreamingCallback): Promise<AIResponse>;
    isAvailable(): boolean;
}

// ============================================================================
// Provider Implementations
// ============================================================================

class GroqProvider implements BaseAIProvider {
    readonly name: AIProvider = 'groq';
    readonly displayName = 'Groq';
    readonly models = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it'];
    readonly maxContextLength = 128000;
    readonly streamingSupported = true;

    async complete(request: AIRequest, onStream?: StreamingCallback): Promise<AIResponse> {
        const model = request.model || 'llama-3.3-70b-versatile';
        const bridgeUrl = await getBridgeUrl();

        const response = await fetch(`${bridgeUrl}/proxy/groq`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                messages: request.messages,
                temperature: request.temperature ?? 0.7,
                stream: request.stream ?? true,
                tools: request.tools
            })
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({ detail: response.statusText }));
            throw new Error(`Groq Error: ${err.detail || response.statusText}`);
        }

        if (request.stream && onStream) {
            return this.streamResponse(response, this.name, model, onStream);
        }

        const data = await response.json();
        return { content: data.choices?.[0]?.message?.content || '', provider: this.name, model, usage: data.usage };
    }

    private async streamResponse(response: Response, provider: AIProvider, model: string, onStream: StreamingCallback): Promise<AIResponse> {
        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response stream');

        const decoder = new TextDecoder();
        let buffer = '';
        let content = '';
        let receivedContent = false;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('data: ')) {
                    const jsonStr = trimmed.replace('data: ', '').trim();
                    if (jsonStr === '[DONE]') continue;
                    try {
                        const data = JSON.parse(jsonStr);
                        const chunk = data.choices?.[0]?.delta?.content || '';
                        if (chunk) {
                            receivedContent = true;
                            content += chunk;
                            onStream(chunk, false);
                        }
                    } catch (e) { /* ignore */ }
                }
            }
        }

        if (!receivedContent) { onStream('[Empty response]', true); content = '[Empty response]'; }
        return { content, provider, model };
    }

    isAvailable(): boolean {
        return !!GROQ_API_KEY && !GROQ_API_KEY.includes('your_');
    }
}

class GeminiProvider implements BaseAIProvider {
    readonly name: AIProvider = 'gemini';
    readonly displayName = 'Google Gemini';
    readonly models = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.0-pro'];
    readonly maxContextLength = 2000000;
    readonly streamingSupported = true;

    async complete(request: AIRequest, onStream?: StreamingCallback): Promise<AIResponse> {
        const model = request.model || 'gemini-1.5-flash';
        const bridgeUrl = await getBridgeUrl();

        const contents = request.messages.map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] }));

        const response = await fetch(`${bridgeUrl}/proxy/gemini`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                contents,
                generationConfig: { temperature: request.temperature ?? 0.7, maxOutputTokens: request.maxTokens },
                stream: request.stream ?? true
            })
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(`Gemini Error: ${err.detail || response.statusText}`);
        }

        const data = await response.json();
        return { content: data.candidates?.[0]?.content?.parts?.[0]?.text || '', provider: this.name, model, usage: { totalTokens: data.usageMetadata?.totalTokenCount } };
    }

    isAvailable(): boolean {
        return !!GEMINI_API_KEY && !GEMINI_API_KEY.includes('your_');
    }
}

class OpenRouterProvider implements BaseAIProvider {
    readonly name: AIProvider = 'openrouter';
    readonly displayName = 'OpenRouter';
    readonly models = ['meta-llama/llama-3.3-70b-instruct', 'anthropic/claude-3.5-sonnet', 'openai/gpt-4o'];
    readonly maxContextLength = 200000;
    readonly streamingSupported = true;

    async complete(request: AIRequest, onStream?: StreamingCallback): Promise<AIResponse> {
        const model = request.model || 'meta-llama/llama-3.3-70b-instruct';
        const bridgeUrl = await getBridgeUrl();

        const response = await fetch(`${bridgeUrl}/proxy/openrouter`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, messages: request.messages, temperature: request.temperature ?? 0.7, stream: request.stream ?? true })
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({ error: { message: response.statusText } }));
            throw new Error(`OpenRouter Error: ${err.error?.message || response.statusText}`);
        }

        const data = await response.json();
        return { content: data.choices?.[0]?.message?.content || '', provider: this.name, model, usage: data.usage };
    }

    isAvailable(): boolean {
        return !!OPENROUTER_API_KEY && !OPENROUTER_API_KEY.includes('your_');
    }
}

// ============================================================================
// Unified Service
// ============================================================================

class UnifiedAIService {
    private groq = new GroqProvider();
    private gemini = new GeminiProvider();
    private openrouter = new OpenRouterProvider();
    private providerOrder: AIProvider[] = ['groq', 'gemini', 'openrouter'];

    getProviders(): AIProviderInfo[] {
        const providers: Record<AIProvider, BaseAIProvider> = { groq: this.groq, gemini: this.gemini, openrouter: this.openrouter, bridge: null as any };
        return this.providerOrder.map(p => {
            const provider = providers[p];
            return { name: p, displayName: provider.displayName, capabilities: ['text', provider.streamingSupported ? 'streaming' : 'none'].filter(c => c !== 'none'), models: provider.models, maxContextLength: provider.maxContextLength, streamingSupported: provider.streamingSupported, isAvailable: provider.isAvailable() };
        });
    }

    isProviderAvailable(provider: AIProvider): boolean {
        const providers: Record<AIProvider, BaseAIProvider> = { groq: this.groq, gemini: this.gemini, openrouter: this.openrouter, bridge: null as any };
        return providers[provider]?.isAvailable() ?? false;
    }

    getBestProvider(task?: 'reasoning' | 'fast' | 'creative' | 'coding'): AIProvider {
        if (task === 'fast') return 'groq';
        if (task === 'coding') return 'groq';
        if (task === 'creative') return 'openrouter';
        for (const p of this.providerOrder) { if (this.isProviderAvailable(p)) return p; }
        throw new Error('No AI providers available');
    }

    async complete(request: AIRequest, onStream?: StreamingCallback): Promise<AIResponse> {
        const providerName = request.provider || this.getBestProvider();
        const providers: Record<AIProvider, BaseAIProvider> = { groq: this.groq, gemini: this.gemini, openrouter: this.openrouter, bridge: null as any };
        const provider = providers[providerName];

        if (!provider) throw new Error(`Unknown provider: ${providerName}`);
        if (!provider.isAvailable()) {
            for (const p of this.providerOrder) { if (this.isProviderAvailable(p)) return providers[p].complete(request, onStream); }
            throw new Error(`Provider ${providerName} is not configured`);
        }

        return provider.complete(request, onStream);
    }

    async quickComplete(prompt: string): Promise<string> {
        const response = await this.complete({ messages: [{ role: 'user', content: prompt }], temperature: 0.7 });
        return response.content;
    }

    setProviderOrder(providers: AIProvider[]): void {
        this.providerOrder = providers.filter(p => 
            p === 'groq' || p === 'gemini' || p === 'openrouter' || p === 'bridge'
        );
    }
}

export const unifiedAI = new UnifiedAIService();
export const getAIProviders = () => unifiedAI.getProviders();
export const isProviderAvailable = (p: AIProvider) => unifiedAI.isProviderAvailable(p);
export const completeAI = (req: AIRequest, onStream?: StreamingCallback) => unifiedAI.complete(req, onStream);
export const quickComplete = (prompt: string) => unifiedAI.quickComplete(prompt);
