/**
 * Ask System Panel
 * 
 * A conversational interface to query your engineering model.
 * "Why is pressure dropping here?" → Get physics-aware answers.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
    Send, Bot, User, Sparkles, Loader2,
    AlertCircle, Lightbulb, ArrowRight, X,
    MessageSquare, Zap
} from 'lucide-react';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    relevantComponents?: string[];
    suggestions?: string[];
}

interface AskSystemPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onQuerySubmit?: (query: string) => Promise<{
        answer: string;
        relevantComponents?: string[];
        suggestions?: string[];
    }>;
    systemContext?: {
        componentCount: number;
        hasSimulationResults: boolean;
        lastError?: string;
    };
}

const SUGGESTED_QUESTIONS = [
    "Why is the pressure dropping in this line?",
    "What happens if I double the flow rate?",
    "Is there a risk of cavitation?",
    "How can I improve system efficiency?",
    "What are the critical parameters?",
    "Explain the heat balance in this system."
];

export const AskSystemPanel: React.FC<AskSystemPanelProps> = ({
    isOpen,
    onClose,
    onQuerySubmit,
    systemContext
}) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            inputRef.current?.focus();
        }
    }, [isOpen]);

    const handleSubmit = async (query: string) => {
        if (!query.trim() || isLoading) return;

        const userMessage: Message = {
            id: `user_${Date.now()}`,
            role: 'user',
            content: query,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            if (onQuerySubmit) {
                const response = await onQuerySubmit(query);

                const assistantMessage: Message = {
                    id: `assistant_${Date.now()}`,
                    role: 'assistant',
                    content: response.answer,
                    timestamp: new Date(),
                    relevantComponents: response.relevantComponents,
                    suggestions: response.suggestions
                };

                setMessages(prev => [...prev, assistantMessage]);
            } else {
                // Demo response when no handler provided
                const demoResponse = generateDemoResponse(query);

                const assistantMessage: Message = {
                    id: `assistant_${Date.now()}`,
                    role: 'assistant',
                    content: demoResponse.answer,
                    timestamp: new Date(),
                    relevantComponents: demoResponse.relevantComponents,
                    suggestions: demoResponse.suggestions
                };

                setMessages(prev => [...prev, assistantMessage]);
            }
        } catch (error) {
            const errorMessage: Message = {
                id: `error_${Date.now()}`,
                role: 'assistant',
                content: "I couldn't process that query. Please try rephrasing your question.",
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSuggestionClick = (suggestion: string) => {
        setInput(suggestion);
        inputRef.current?.focus();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed right-4 bottom-4 w-96 h-[500px] bg-slate-800 border border-cyan-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50">
            {/* Header */}
            <div className="p-3 border-b border-slate-700 bg-gradient-to-r from-cyan-900/30 to-purple-900/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-br from-cyan-500 to-purple-500 rounded-lg">
                        <MessageSquare className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white">Ask the System</h3>
                        <p className="text-xs text-slate-400">
                            {systemContext?.componentCount || 0} components loaded
                        </p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                >
                    <X className="w-4 h-4 text-slate-400" />
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4">
                        <div className="p-3 bg-cyan-500/10 rounded-full mb-3">
                            <Sparkles className="w-6 h-6 text-cyan-400" />
                        </div>
                        <h4 className="text-sm font-bold text-white mb-1">Ask About Your System</h4>
                        <p className="text-xs text-slate-400 mb-4">
                            I can explain calculations, suggest improvements, and diagnose issues.
                        </p>

                        <div className="w-full space-y-2">
                            <p className="text-xs text-slate-500">Try asking:</p>
                            {SUGGESTED_QUESTIONS.slice(0, 4).map((q, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleSuggestionClick(q)}
                                    className="w-full flex items-center gap-2 p-2 text-left text-xs bg-slate-900/50 hover:bg-cyan-500/10 border border-slate-700 hover:border-cyan-500/30 rounded-lg transition-all"
                                >
                                    <Lightbulb className="w-3 h-3 text-amber-400 shrink-0" />
                                    <span className="text-slate-300">{q}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <>
                        {messages.map(msg => (
                            <MessageBubble key={msg.id} message={msg} />
                        ))}
                        {isLoading && (
                            <div className="flex items-center gap-2 text-slate-400 text-xs">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Analyzing your system...</span>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-slate-700 bg-slate-900/50">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSubmit(input);
                    }}
                    className="flex items-center gap-2"
                >
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask about your system..."
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="p-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg transition-colors"
                    >
                        <Send className="w-4 h-4 text-white" />
                    </button>
                </form>
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════
// MESSAGE BUBBLE
// ═══════════════════════════════════════════════════════════════

interface MessageBubbleProps {
    message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
    const isUser = message.role === 'user';

    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] ${isUser ? 'order-2' : 'order-1'}`}>
                <div className={`
          px-3 py-2 rounded-2xl text-sm
          ${isUser
                        ? 'bg-cyan-600 text-white rounded-br-md'
                        : 'bg-slate-700 text-slate-100 rounded-bl-md'}
        `}>
                    {message.content}
                </div>

                {/* Suggestions after assistant message */}
                {!isUser && message.suggestions && message.suggestions.length > 0 && (
                    <div className="mt-2 space-y-1">
                        {message.suggestions.map((s, i) => (
                            <div key={i} className="flex items-center gap-1 text-xs text-cyan-400">
                                <ArrowRight className="w-3 h-3" />
                                <span>{s}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Relevant components */}
                {!isUser && message.relevantComponents && message.relevantComponents.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                        {message.relevantComponents.map((c, i) => (
                            <span key={i} className="px-1.5 py-0.5 bg-purple-500/20 text-purple-300 text-xs rounded">
                                {c}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* Avatar */}
            <div className={`
        w-6 h-6 rounded-full flex items-center justify-center shrink-0
        ${isUser ? 'order-1 mr-2 bg-slate-600' : 'order-2 ml-2 bg-gradient-to-br from-cyan-500 to-purple-500'}
      `}>
                {isUser ? (
                    <User className="w-3 h-3 text-white" />
                ) : (
                    <Bot className="w-3 h-3 text-white" />
                )}
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════
// DEMO RESPONSE GENERATOR
// ═══════════════════════════════════════════════════════════════

function generateDemoResponse(query: string): {
    answer: string;
    relevantComponents?: string[];
    suggestions?: string[];
} {
    const q = query.toLowerCase();

    if (q.includes('pressure') && (q.includes('drop') || q.includes('low'))) {
        return {
            answer: "The pressure drop is likely due to friction losses in the piping. The 50m pipe run with a 2-inch diameter creates approximately 12m of friction head. Consider upsizing to 3-inch pipe to reduce losses by 75%.",
            relevantComponents: ['Pipe_1', 'Pump_1'],
            suggestions: ['Increase pipe diameter', 'Add booster pump', 'Check for obstructions']
        };
    }

    if (q.includes('cavitation')) {
        return {
            answer: "Your current NPSH margin is 2.1m (21% above the pump's NPSH required of 1.7m). This is safe for steady-state operation, but transient startup conditions may cause brief cavitation. Consider installing a suction stabilizer.",
            relevantComponents: ['Pump_1', 'Suction_Line'],
            suggestions: ['Increase suction pressure', 'Lower fluid temperature', 'Add suction stabilizer']
        };
    }

    if (q.includes('efficiency') || q.includes('improve')) {
        return {
            answer: "System efficiency is currently 78%. The main losses are: pump (8%), heat exchanger (7%), and piping friction (7%). The most cost-effective improvement would be optimizing the heat exchanger fouling factor — cleaning could recover 4% efficiency.",
            relevantComponents: ['HX_1', 'Pump_1'],
            suggestions: ['Clean heat exchanger', 'Upgrade pump VFD', 'Insulate hot lines']
        };
    }

    if (q.includes('flow') && q.includes('double')) {
        return {
            answer: "Doubling the flow rate would:\n• Increase pressure drop by 4× (quadratic relationship)\n• Increase pump power by ~8× (cubic relationship)\n• Reduce heat exchanger effectiveness by 15%\n\nThe current pump would not be able to handle this — you'd need to upgrade to a larger unit.",
            relevantComponents: ['Pump_1', 'HX_1', 'Pipe_1'],
            suggestions: ['Select larger pump', 'Add parallel pump', 'Increase pipe sizes']
        };
    }

    // Default response
    return {
        answer: "I analyzed your system and found it's operating within normal parameters. The outlet temperature is 65°C with a flow rate of 2.5 kg/s. Is there something specific you'd like me to examine?",
        suggestions: ['Check pressure balance', 'Analyze heat losses', 'Review component sizing']
    };
}

export default AskSystemPanel;
