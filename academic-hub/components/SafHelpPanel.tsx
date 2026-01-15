import React, { useState } from 'react';
import { 
    HelpCircle, 
    Send, 
    Lightbulb, 
    Bot,
    ChevronRight,
    Sparkles
} from 'lucide-react';
import { askSaf, type SafAskResult } from '../../services/integration/ApiIntegrations';

interface SafHelpPanelProps {
    componentCount?: number;
    hasSimulationResults?: boolean;
}

export const SafHelpPanel: React.FC<SafHelpPanelProps> = ({
    componentCount = 0,
    hasSimulationResults = false
}) => {
    const [question, setQuestion] = useState('');
    const [isAsking, setIsAsking] = useState(false);
    const [result, setResult] = useState<SafAskResult | null>(null);
    const [history, setHistory] = useState<Array<{question: string; answer: SafAskResult}>>([]);

    const exampleQuestions = [
        "How do I improve pump efficiency?",
        "What causes cavitation in the system?",
        "How do I optimize pipe diameter?",
        "What is the NPSH margin for my pump?"
    ];

    const handleAsk = async () => {
        if (!question.trim()) return;
        setIsAsking(true);
        try {
            const res = await askSaf({
                question,
                componentCount,
                hasSimulationResults
            });
            setResult(res);
            setHistory([...history, { question, answer: res }]);
            setQuestion('');
        } catch (err) {
            console.error('SAF ask failed:', err);
        } finally {
            setIsAsking(false);
        }
    };

    const handleExample = (q: string) => setQuestion(q);

    return (
        <div className="saf-help-panel">
            <div className="saf-help-panel__header">
                <h3>
                    <Sparkles size={18} />
                    SAF Lab Assistant
                </h3>
                <p>Ask questions about your engineering system</p>
            </div>

            <div className="saf-help-panel__content">
                <div className="examples-section">
                    <h4>Example Questions</h4>
                    <div className="example-chips">
                        {exampleQuestions.map((q, idx) => (
                            <button key={idx} onClick={() => handleExample(q)}>
                                {q}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="question-section">
                    <div className="input-wrapper">
                        <HelpCircle size={16} />
                        <textarea
                            placeholder="Ask about your system..."
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && e.metaKey) handleAsk();
                            }}
                            rows={3}
                        />
                        <button 
                            onClick={handleAsk}
                            disabled={isAsking || !question.trim()}
                            className="send-btn"
                        >
                            <Send size={16} />
                        </button>
                    </div>
                    <span className="hint">Press ⌘+Enter to send</span>
                </div>

                {result && (
                    <div className="answer-section">
                        <div className="answer-header">
                            <Bot size={16} />
                            <span className="source-badge">{result.source === 'ai' ? 'AI Powered' : 'Demo'}</span>
                        </div>
                        <div className="answer-content">
                            {result.answer.split('\n').map((line, i) => (
                                <p key={i}>{line}</p>
                            ))}
                        </div>
                        {result.relevantComponents && result.relevantComponents.length > 0 && (
                            <div className="relevant-components">
                                <h5>Relevant Components</h5>
                                <div className="component-tags">
                                    {result.relevantComponents.map((comp, i) => (
                                        <span key={i} className="tag">{comp}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {result.suggestions.length > 0 && (
                            <div className="suggestions-section">
                                <h5>
                                    <Lightbulb size={14} />
                                    Suggestions
                                </h5>
                                <ul>
                                    {result.suggestions.map((s, i) => (
                                        <li key={i}>{s}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                {history.length > 0 && (
                    <div className="history-section">
                        <h4>Recent Questions</h4>
                        {history.slice(-3).reverse().map((item, i) => (
                            <div key={i} className="history-item" onClick={() => setResult(item.answer)}>
                                <span className="history-question">{item.question}</span>
                                <ChevronRight size={14} />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SafHelpPanel;
