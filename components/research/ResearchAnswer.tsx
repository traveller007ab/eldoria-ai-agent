/**
 * ResearchAnswer - Enhanced answer block with citation pills and insert actions
 */

import React, { useState } from 'react';
import { Plus, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { MarkdownRenderer } from '../MarkdownRenderer';

interface ResearchAnswerProps {
    content: string;
    isLoading?: boolean;
    onInsertToEditor?: (content: string) => void;
    onInsertParagraph?: (paragraph: string) => void;
}

// Split content into paragraphs for granular insertion
const splitIntoParagraphs = (content: string): string[] => {
    return content.split(/\n\n+/).filter(p => p.trim().length > 0);
};

const ParagraphBlock: React.FC<{
    content: string;
    onInsert?: (content: string) => void;
}> = ({ content, onInsert }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div
            className="relative group"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="prose prose-invert prose-sm max-w-none">
                <MarkdownRenderer>{content}</MarkdownRenderer>
            </div>

            {/* Hover Actions */}
            {isHovered && onInsert && (
                <div className="absolute -right-2 top-0 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => onInsert(content)}
                        className="p-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg transition-colors"
                        title="Insert to Editor"
                    >
                        <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={handleCopy}
                        className="p-1.5 bg-slate-600/50 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
                        title="Copy"
                    >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                </div>
            )}
        </div>
    );
};

const LoadingSkeleton: React.FC = () => (
    <div className="space-y-4 animate-pulse">
        <div className="h-4 bg-slate-700/50 rounded w-3/4" />
        <div className="h-4 bg-slate-700/50 rounded w-full" />
        <div className="h-4 bg-slate-700/50 rounded w-5/6" />
        <div className="h-4 bg-slate-700/50 rounded w-2/3" />
        <div className="h-4 bg-slate-700/50 rounded w-full" />
    </div>
);

export const ResearchAnswer: React.FC<ResearchAnswerProps> = ({
    content,
    isLoading = false,
    onInsertToEditor,
    onInsertParagraph
}) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [allCopied, setAllCopied] = useState(false);

    const paragraphs = splitIntoParagraphs(content);

    const handleCopyAll = async () => {
        await navigator.clipboard.writeText(content);
        setAllCopied(true);
        setTimeout(() => setAllCopied(false), 2000);
    };

    const handleInsertAll = () => {
        if (onInsertToEditor) {
            onInsertToEditor(content);
        }
    };

    if (isLoading) {
        return (
            <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-700/30">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="text-xs text-cyan-400/80 uppercase tracking-wider font-medium">
                        Researching...
                    </span>
                </div>
                <LoadingSkeleton />
            </div>
        );
    }

    if (!content) {
        return null;
    }

    return (
        <div className="bg-slate-800/20 rounded-xl border border-slate-700/30 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-3 bg-slate-800/50 border-b border-slate-700/30">
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex items-center gap-2 text-xs text-cyan-400/80 hover:text-cyan-300 uppercase tracking-wider font-medium transition-colors"
                >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    Answer
                </button>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleCopyAll}
                        className="flex items-center gap-1.5 px-2 py-1 text-[10px] text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded transition-colors uppercase tracking-wider"
                    >
                        {allCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        Copy All
                    </button>
                    {onInsertToEditor && (
                        <button
                            onClick={handleInsertAll}
                            className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded transition-colors uppercase tracking-wider font-medium"
                        >
                            <Plus className="w-3 h-3" />
                            Insert All
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            {isExpanded && (
                <div className="p-4 space-y-4">
                    {paragraphs.map((para, index) => (
                        <ParagraphBlock
                            key={index}
                            content={para}
                            onInsert={onInsertParagraph}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default ResearchAnswer;
