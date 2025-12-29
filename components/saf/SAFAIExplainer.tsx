import React, { useState, useCallback } from 'react';
import { DeepSAFComponent, DeepSAFBlueprint } from './types';
import { MessageSquare, Loader2, Send, HelpCircle, Sparkles, AlertTriangle, Zap, BookOpen } from 'lucide-react';
import { GROQ_API_KEY, API_KEY, OPENROUTER_API_KEY } from '../../config';
import { getBridgeUrl } from '../../services/bridgeClient';

/**
 * SAFAIExplainer - Real AI-powered explanations and what-if analysis
 * Uses Bridge Proxy with OpenRouter → Groq → Gemini fallback chain
 */

interface SAFAIExplainerProps {
    component: DeepSAFComponent;
    blueprint: DeepSAFBlueprint;
    onClose?: () => void;
}

interface AIMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export const SAFAIExplainer: React.FC<SAFAIExplainerProps> = ({
    component,
    blueprint,
    onClose,
}) => {
    const [messages, setMessages] = useState<AIMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [customQuery, setCustomQuery] = useState('');

    // Generate system context for AI
    const generateSystemContext = useCallback(() => {
        const paramsStr = component.parameters
            ?.map(p => `${p.name}: ${p.value}${p.unit || ''}`)
            .join(', ') || 'None';

        const outputsStr = component.outputs
            ?.map(o => `${o.name}: ${o.value}${o.unit || ''}`)
            .join(', ') || 'None';

        const depsStr = component.dependencies.length > 0
            ? component.dependencies.join(', ')
            : 'None (root component)';

        // Include equations if available
        const equationsStr = component.equations && component.equations.length > 0
            ? component.equations.join('; ')
            : 'None (using default formulas)';

        // Include simulation results if available
        const simVarsStr = blueprint.last_simulation?.system_vars
            ? Object.entries(blueprint.last_simulation.system_vars)
                .filter(([key]) => key.startsWith(component.id) || blueprint.flows.some(f => f.id === key.split('.')[0] && (f.from === component.id || f.to === component.id)))
                .map(([key, val]) => `${key}=${val}`)
                .join(', ')
            : 'No simulation data';

        return `You are analyzing a component in a ${blueprint.domain} system called "${blueprint.project_name}".

COMPONENT DETAILS:
- Name: ${component.name}
- Type: ${component.type} (${component.type === 'core' ? 'primary system element' : component.type === 'subcore' ? 'supporting subsystem' : 'atomic unit'})
- Parameters: ${paramsStr}
- Outputs: ${outputsStr}
- Dependencies: ${depsStr}
- Custom Equations: ${equationsStr}
- Live Simulation Values: ${simVarsStr}

SYSTEM OVERVIEW:
Components: ${blueprint.components.map(c => c.name).join(' → ')}
Flows: ${blueprint.flows.map(f => `${f.from}→${f.to}(${f.type})`).join(', ')}

Provide structured responses with:
1. Hypothesis: What's happening
2. Risks: Potential issues or limitations
3. Proposed Change: Specific parameter adjustments with suggested ranges
4. Engineering Insight: Rule-of-thumb or best practice guidance

Use specific values and units.`;
    }, [component, blueprint]);

    // Query the AI via Bridge Proxy with fallback chain
    const queryAI = useCallback(async (query: string) => {
        setIsLoading(true);
        setMessages(prev => [...prev, { role: 'user', content: query, timestamp: new Date() }]);

        try {
            const systemContext = generateSystemContext();
            const bridgeUrl = await getBridgeUrl();
            let response = '';
            let provider = '';

            // 1. Try OpenRouter first (if key available)
            if (OPENROUTER_API_KEY) {
                try {
                    const res = await fetch(`${bridgeUrl}/proxy/openrouter`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            model: 'meta-llama/llama-3.3-70b-instruct',
                            messages: [
                                { role: 'system', content: systemContext },
                                { role: 'user', content: query }
                            ],
                            max_tokens: 1024,
                            stream: false,
                            apiKey: OPENROUTER_API_KEY
                        })
                    });
                    if (res.ok) {
                        const data = await res.json();
                        response = data.choices?.[0]?.message?.content || '';
                        provider = 'OpenRouter';
                    }
                } catch (e) {
                    console.warn('OpenRouter failed, trying Groq...', e);
                }
            }

            // 2. Fallback to Groq
            if (!response && GROQ_API_KEY) {
                try {
                    const res = await fetch(`${bridgeUrl}/proxy/groq`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            model: 'llama-3.3-70b-versatile',
                            messages: [
                                { role: 'system', content: systemContext },
                                { role: 'user', content: query }
                            ],
                            max_tokens: 1024,
                            stream: false,
                            apiKey: GROQ_API_KEY
                        })
                    });
                    if (res.ok) {
                        const data = await res.json();
                        response = data.choices?.[0]?.message?.content || '';
                        provider = 'Groq';
                    }
                } catch (e) {
                    console.warn('Groq failed, trying Gemini...', e);
                }
            }

            // 3. Fallback to Gemini (direct API as last resort)
            if (!response && API_KEY) {
                try {
                    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
                    const res = await fetch(geminiUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: `${systemContext}\n\n${query}` }] }],
                            generationConfig: { maxOutputTokens: 1024 }
                        })
                    });
                    if (res.ok) {
                        const data = await res.json();
                        response = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                        provider = 'Gemini';
                    }
                } catch (e) {
                    console.warn('Gemini failed', e);
                }
            }

            const assistantMessage = response
                ? response
                : 'No AI providers available. Please configure OPENROUTER_API_KEY, GROQ_API_KEY, or GEMINI_API_KEY.';

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: assistantMessage + (provider ? `\n\n_via ${provider}_` : ''),
                timestamp: new Date()
            }]);
        } catch (error) {
            console.error('AI query error:', error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `Error: ${error instanceof Error ? error.message : 'Failed to connect to AI'}`,
                timestamp: new Date()
            }]);
        } finally {
            setIsLoading(false);
        }
    }, [generateSystemContext]);

    // Quick action handlers
    const handleExplainThis = () => {
        queryAI(`Explain what the ${component.name} does in this system. Why is it important? What role does it play?`);
    };

    const handleExplainParameters = () => {
        queryAI(`Explain each parameter of the ${component.name}: what they mean, typical ranges, and how they affect system performance.`);
    };

    const handleWhatIfEfficiency = () => {
        const effParam = component.parameters?.find(p =>
            p.name.toLowerCase().includes('efficiency')
        );
        if (effParam) {
            queryAI(`What if I increase the ${component.name}'s ${effParam.name} by 10%? What are the downstream effects on system performance?`);
        } else {
            queryAI(`What would happen if I modified the ${component.name}'s main parameter by 10%? Analyze the cascading effects.`);
        }
    };

    const handleOptimize = () => {
        queryAI(`How can I optimize the ${component.name} to improve overall system efficiency? What parameter changes would you recommend?`);
    };

    const handleCustomQuery = () => {
        if (customQuery.trim()) {
            queryAI(customQuery);
            setCustomQuery('');
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-900/95 backdrop-blur-md border border-cyan-900/30 rounded-xl overflow-hidden">
            {/* Header */}
            <div className="shrink-0 px-4 py-3 border-b border-cyan-900/20 bg-gradient-to-r from-cyan-500/10 to-purple-500/10">
                <div className="flex items-center gap-3">
                    <Sparkles className="w-5 h-5 text-cyan-400" />
                    <div>
                        <h3 className="font-bold text-white text-sm">AI Explainer</h3>
                        <span className="text-xs text-gray-500">{component.name}</span>
                    </div>
                </div>
            </div>

            {/* Quick Actions - Structured Queries */}
            <div className="shrink-0 p-3 border-b border-cyan-900/10">
                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={handleExplainThis}
                        disabled={isLoading}
                        className="px-3 py-2 text-xs bg-cyan-500/10 text-cyan-400 rounded-lg hover:bg-cyan-500/20 transition-colors flex items-center gap-2 disabled:opacity-50"
                        title="Get structured explanation with hypothesis and risks"
                    >
                        <HelpCircle className="w-3 h-3" />
                        Explain
                    </button>
                    <button
                        onClick={handleExplainParameters}
                        disabled={isLoading}
                        className="px-3 py-2 text-xs bg-purple-500/10 text-purple-400 rounded-lg hover:bg-purple-500/20 transition-colors flex items-center gap-2 disabled:opacity-50"
                        title="Understand parameter ranges and effects"
                    >
                        <MessageSquare className="w-3 h-3" />
                        Parameters
                    </button>
                    <button
                        onClick={() => {
                            const simVars = blueprint.last_simulation?.system_vars;
                            if (simVars) {
                                queryAI(`Why is this component unstable or inefficient? Analyze the current simulation values: ${JSON.stringify(simVars)}. What constraints might be violated?`);
                            } else {
                                handleWhatIfEfficiency();
                            }
                        }}
                        disabled={isLoading}
                        className="px-3 py-2 text-xs bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-colors flex items-center gap-2 disabled:opacity-50"
                        title="Analyze stability and constraints"
                    >
                        <AlertTriangle className="w-3 h-3" />
                        Stability
                    </button>
                    <button
                        onClick={() => {
                            queryAI(`Design a controller or optimization strategy for ${component.name}. Provide specific parameter adjustments with suggested ranges. Include a rule-of-thumb for sizing.`);
                        }}
                        disabled={isLoading}
                        className="px-3 py-2 text-xs bg-amber-500/10 text-amber-400 rounded-lg hover:bg-amber-500/20 transition-colors flex items-center gap-2 disabled:opacity-50"
                        title="Get optimization strategy with specific recommendations"
                    >
                        <Sparkles className="w-3 h-3" />
                        Optimize
                    </button>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                    <button
                        onClick={() => {
                            const connectedFlows = blueprint.flows.filter(f => f.from === component.id || f.to === component.id);
                            queryAI(`What are the cascading effects if I modify ${component.name}? How will it affect connected flows: ${connectedFlows.map(f => f.id).join(', ')}?`);
                        }}
                        disabled={isLoading}
                        className="px-3 py-2 text-xs bg-indigo-500/10 text-indigo-400 rounded-lg hover:bg-indigo-500/20 transition-colors flex items-center gap-2 disabled:opacity-50"
                        title="Analyze cascading effects on connected components"
                    >
                        <Zap className="w-3 h-3" />
                        Cascading
                    </button>
                    <button
                        onClick={() => {
                            queryAI(`Give me a rule-of-thumb or engineering best practice for sizing and operating ${component.name} in a ${blueprint.domain} system.`);
                        }}
                        disabled={isLoading}
                        className="px-3 py-2 text-xs bg-rose-500/10 text-rose-400 rounded-lg hover:bg-rose-500/20 transition-colors flex items-center gap-2 disabled:opacity-50"
                        title="Get engineering best practices and rules-of-thumb"
                    >
                        <BookOpen className="w-3 h-3" />
                        Best Practice
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-grow overflow-y-auto p-3 space-y-3">
                {messages.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                        <HelpCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Ask AI about {component.name}</p>
                        <p className="text-xs mt-1">Uses OpenRouter → Groq → Gemini</p>
                    </div>
                )}

                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={`p-3 rounded-lg ${msg.role === 'user'
                            ? 'bg-cyan-500/10 border border-cyan-500/20 ml-8'
                            : 'bg-gray-800/50 border border-gray-700/50 mr-4'
                            }`}
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-bold ${msg.role === 'user' ? 'text-cyan-400' : 'text-purple-400'
                                }`}>
                                {msg.role === 'user' ? 'You' : 'Eldoria'}
                            </span>
                            <span className="text-[10px] text-gray-600">
                                {msg.timestamp.toLocaleTimeString()}
                            </span>
                        </div>
                        <p className="text-sm text-gray-300 whitespace-pre-wrap">{msg.content}</p>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex items-center gap-2 p-3 bg-purple-500/10 rounded-lg">
                        <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                        <span className="text-sm text-purple-400">Analyzing via Bridge...</span>
                    </div>
                )}
            </div>

            {/* Custom Query Input */}
            <div className="shrink-0 p-3 border-t border-cyan-900/20 bg-black/20">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={customQuery}
                        onChange={(e) => setCustomQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCustomQuery()}
                        placeholder="Ask a custom question..."
                        className="flex-grow px-3 py-2 bg-gray-900/50 border border-cyan-900/30 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                        disabled={isLoading}
                    />
                    <button
                        onClick={handleCustomQuery}
                        disabled={isLoading || !customQuery.trim()}
                        className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors disabled:opacity-50"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SAFAIExplainer;
