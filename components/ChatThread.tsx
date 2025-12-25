
import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, Attachment } from '../types';
import { UserIcon, EldoriaLogo, SendIcon } from './Icons';
import { MarkdownRenderer } from './MarkdownRenderer';
import { Paperclip, X, FileText, Folder, Search } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { CodebaseService, FileNode } from '../services/codebaseService';
import { SAFBlueprint } from './SAFBlueprint';


interface ChatThreadProps {
    messages: ChatMessage[];
    isLoading: boolean;
    onSendMessage: (message: string, attachments?: Attachment[]) => void;
}


const ChatBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
    const isUser = message.sender === 'user';
    return (
        <div className={`flex items-start gap-3 my-4 ${isUser ? 'justify-end' : ''}`}>
            {!isUser && <EldoriaLogo className="w-7 h-7 text-cyan-400 shrink-0 mt-1 text-glow" />}
            <div className={`w-full max-w-xl p-3 rounded-lg text-sm ${isUser ? 'bg-cyan-500/10 text-cyan-200' : 'bg-transparent'}`}>
                <MarkdownRenderer>{message.text}</MarkdownRenderer>
                {message.attachments && message.attachments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                        {message.attachments.map((attr, i) => (
                            <div key={i} className="flex items-center gap-1.5 px-2 py-1 bg-white/5 border border-white/10 rounded-md text-[10px] text-cyan-400">
                                <FileText className="w-3 h-3" />
                                {attr.name}
                            </div>
                        ))}
                    </div>
                )}
            </div>
            {isUser && <UserIcon className="w-7 h-7 text-cyan-300/90 shrink-0 mt-1" />}
        </div>
    );
};

const WelcomeMessage = () => (
    <div className="text-center p-4 text-cyan-400/80 text-sm border border-cyan-500/20 rounded-lg bg-cyan-900/20 my-4">
        <EldoriaLogo className="w-8 h-8 mx-auto mb-3 text-cyan-400" />
        <h3 className="font-semibold text-cyan-300 mb-1 text-glow">Context-Aware Chat</h3>
        <p>
            This is your conversational workspace. Ask me questions about the content in the Editor Panel.
            I can explain code, suggest improvements, or brainstorm ideas based on your current work.
        </p>
    </div>
);

export const ChatThread: React.FC<ChatThreadProps> = ({ messages, isLoading, onSendMessage }) => {
    const [input, setInput] = useState('');
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = () => {
        if ((input.trim() || attachments.length > 0) && !isLoading) {
            onSendMessage(input, attachments);
            setInput('');
            setAttachments([]);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const addAttachment = (node: FileNode) => {
        if (attachments.some(a => a.path === node.path)) return;
        setAttachments(prev => [...prev, { name: node.name, path: node.path }]);
        setIsPickerOpen(false);
        setSearchQuery('');
    };

    const fileNodes = CodebaseService.getStructuredIndex();
    const filteredNodes = fileNodes.filter(n =>
        n.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.path.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 8); // Top 8 matches

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex-grow overflow-y-auto custom-scrollbar pr-2">
                {/* SAF Visualization Header */}
                {(() => {
                    const { activeCanvas } = useWorkspace();
                    if (activeCanvas?.saf_blueprint) {
                        return (
                            <div className="mb-6 animate-in fade-in slide-in-from-top-4 duration-700">
                                <SAFBlueprint data={activeCanvas.saf_blueprint} />
                            </div>
                        );
                    }
                    return null;
                })()}

                {messages.length === 0 && !isLoading && <WelcomeMessage />}
                {messages.map((msg, index) => (
                    <ChatBubble key={index} message={msg} />
                ))}
                {isLoading && messages[messages.length - 1]?.sender === 'user' && (
                    <div className="flex items-start gap-3 my-4">
                        <EldoriaLogo className="w-7 h-7 text-cyan-400 shrink-0 mt-1 animate-pulse text-glow" />
                        <div className="w-full max-w-xl p-3 rounded-lg text-sm">
                            <div className="h-2 w-4 bg-cyan-400/50 rounded-full animate-pulse"></div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            <div className="mt-2 pt-2 border-t border-cyan-500/20 shrink-0 relative">
                {/* Attachment Chips */}
                {attachments.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-2 px-1">
                        {attachments.map((attr, i) => (
                            <div key={i} className="flex items-center gap-1.5 px-2 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-md text-[10px] text-cyan-300">
                                <FileText className="w-3 h-3" />
                                <span className="max-w-[120px] truncate">{attr.name}</span>
                                <button onClick={() => removeAttachment(i)} className="hover:text-red-400">
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* File Picker Menu */}
                {isPickerOpen && (
                    <div className="absolute bottom-full left-0 w-full mb-2 bg-[#0c1a3e] border border-cyan-500/30 rounded-xl overflow-hidden shadow-2xl z-50 animate-in slide-in-from-bottom-2 duration-200">
                        <div className="p-2 border-b border-cyan-500/20 flex items-center gap-2">
                            <Search className="w-3.5 h-3.5 text-cyan-500/50" />
                            <input
                                autoFocus
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search project files..."
                                className="bg-transparent border-none outline-none text-[11px] text-cyan-200 flex-grow"
                            />
                        </div>
                        <div className="max-h-60 overflow-y-auto custom-scrollbar">
                            {filteredNodes.length > 0 ? filteredNodes.map((node, i) => (
                                <button
                                    key={i}
                                    onClick={() => addAttachment(node)}
                                    className="w-full text-left p-2 hover:bg-cyan-500/10 flex items-center gap-2 group transition-colors"
                                >
                                    <FileText className="w-3.5 h-3.5 text-cyan-500/40 group-hover:text-cyan-300" />
                                    <div className="overflow-hidden">
                                        <div className="text-[11px] text-cyan-100/80 group-hover:text-cyan-100 truncate">{node.name}</div>
                                        <div className="text-[8px] text-cyan-500/40 truncate italic">{node.path}</div>
                                    </div>
                                </button>
                            )) : (
                                <div className="p-4 text-center text-[10px] text-cyan-500/40 italic">No files found matching "{searchQuery}"</div>
                            )}
                        </div>
                    </div>
                )}

                <div className="flex items-end gap-2">
                    <button
                        onClick={() => setIsPickerOpen(!isPickerOpen)}
                        className={`p-2 rounded-md transition-all ${isPickerOpen ? 'bg-cyan-500/30 text-cyan-100' : 'bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20'}`}
                        title="Attach file for context"
                    >
                        <Paperclip className="w-5 h-5" />
                    </button>
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask about attached files or codebase..."
                        rows={1}
                        className="flex-grow bg-cyan-900/50 border border-cyan-500/30 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none text-sm custom-scrollbar max-h-40"
                    />
                    <button onClick={handleSend} disabled={isLoading || (!input.trim() && attachments.length === 0)} className="p-2 bg-cyan-500/20 hover:bg-cyan-500/30 rounded-md disabled:opacity-50 transition-all">
                        <SendIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};
