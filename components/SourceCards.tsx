/**
 * SourceCards - Beautiful, Interactive Source Display
 * 
 * Displays research sources in a visually appealing grid format
 * with favicons, domains, and expandable previews.
 */

import React, { useState } from 'react';
import {
    ExternalLink, Globe, ChevronDown, ChevronUp,
    Copy, Check, Plus, BookOpen
} from 'lucide-react';
import { Source } from '../types';

interface SourceCardsProps {
    sources: Source[];
    onInsertCitation?: (source: Source, index: number) => void;
    compact?: boolean;
}

// Extract domain from URL
const getDomain = (url: string): string => {
    try {
        const u = new URL(url);
        return u.hostname.replace('www.', '');
    } catch {
        return url.slice(0, 30);
    }
};

// Get favicon URL using Google's service
const getFavicon = (url: string): string => {
    try {
        const u = new URL(url);
        return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=32`;
    } catch {
        return '';
    }
};

// Get color based on domain type
const getDomainColor = (domain: string): string => {
    if (domain.includes('wikipedia')) return 'bg-slate-500';
    if (domain.includes('github')) return 'bg-slate-800';
    if (domain.includes('arxiv') || domain.includes('scholar')) return 'bg-orange-500';
    if (domain.includes('gov')) return 'bg-blue-600';
    if (domain.includes('edu')) return 'bg-purple-500';
    return 'bg-cyan-500';
};

const SourceCard: React.FC<{
    source: Source;
    index: number;
    onInsert?: () => void;
    expanded?: boolean;
    onToggleExpand?: () => void;
}> = ({ source, index, onInsert, expanded, onToggleExpand }) => {
    const [copied, setCopied] = useState(false);
    const [imageError, setImageError] = useState(false);

    const domain = getDomain(source.uri);
    const favicon = getFavicon(source.uri);
    const domainColor = getDomainColor(domain);

    const handleCopy = async (e: React.MouseEvent) => {
        e.stopPropagation();
        await navigator.clipboard.writeText(`[${index + 1}] ${source.title}\n${source.uri}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="group relative">
            <div
                onClick={onToggleExpand}
                className={`
                    relative overflow-hidden rounded-xl
                    bg-gradient-to-br from-slate-800/80 to-slate-900/80
                    border border-slate-700/50
                    hover:border-cyan-500/30
                    transition-all duration-300
                    cursor-pointer
                    ${expanded ? 'ring-1 ring-cyan-500/30' : ''}
                `}
            >
                {/* Header */}
                <div className="p-3 flex items-start gap-3">
                    {/* Index Badge */}
                    <div className={`
                        shrink-0 w-6 h-6 rounded-lg ${domainColor}
                        flex items-center justify-center
                        text-[10px] font-bold text-white
                        shadow-lg
                    `}>
                        {index + 1}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        {/* Domain + Favicon */}
                        <div className="flex items-center gap-1.5 mb-1">
                            {favicon && !imageError ? (
                                <img
                                    src={favicon}
                                    alt=""
                                    className="w-3.5 h-3.5 rounded-sm"
                                    onError={() => setImageError(true)}
                                />
                            ) : (
                                <Globe className="w-3.5 h-3.5 text-slate-500" />
                            )}
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium truncate">
                                {domain}
                            </span>
                        </div>

                        {/* Title */}
                        <h4 className={`
                            text-sm font-medium text-slate-200
                            group-hover:text-cyan-200
                            transition-colors
                            ${expanded ? '' : 'line-clamp-2'}
                        `}>
                            {source.title}
                        </h4>

                        {/* Expanded Content */}
                        {expanded && (
                            <div className="mt-3 pt-3 border-t border-slate-700/50 animate-in slide-in-from-top-2 duration-200">
                                {/* URL */}
                                <a
                                    href={source.uri}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-xs text-cyan-400/70 hover:text-cyan-300 truncate block mb-2"
                                >
                                    {source.uri}
                                </a>

                                {/* Actions */}
                                <div className="flex items-center gap-2">
                                    <a
                                        href={source.uri}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-[10px] text-slate-300 transition-colors"
                                    >
                                        <ExternalLink className="w-3 h-3" />
                                        Open
                                    </a>
                                    <button
                                        onClick={handleCopy}
                                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-[10px] text-slate-300 transition-colors"
                                    >
                                        {copied ? (
                                            <>
                                                <Check className="w-3 h-3 text-emerald-400" />
                                                Copied
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="w-3 h-3" />
                                                Copy
                                            </>
                                        )}
                                    </button>
                                    {onInsert && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onInsert();
                                            }}
                                            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-lg text-[10px] text-emerald-300 transition-colors"
                                        >
                                            <Plus className="w-3 h-3" />
                                            Cite
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Expand Icon */}
                    <div className="shrink-0 text-slate-500 group-hover:text-slate-300 transition-colors">
                        {expanded ? (
                            <ChevronUp className="w-4 h-4" />
                        ) : (
                            <ChevronDown className="w-4 h-4" />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export const SourceCards: React.FC<SourceCardsProps> = ({
    sources,
    onInsertCitation,
    compact = false
}) => {
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

    if (sources.length === 0) return null;

    return (
        <div className="mb-6">
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-cyan-500/10 rounded-lg">
                    <BookOpen className="w-4 h-4 text-cyan-400" />
                </div>
                <span className="text-sm font-medium text-cyan-300">
                    Sources
                </span>
                <span className="text-xs text-slate-500">
                    ({sources.length} found)
                </span>
            </div>

            {/* Grid */}
            <div className={`grid gap-3 ${compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
                {sources.map((source, index) => (
                    <SourceCard
                        key={source.uri + index}
                        source={source}
                        index={index}
                        expanded={expandedIndex === index}
                        onToggleExpand={() => setExpandedIndex(expandedIndex === index ? null : index)}
                        onInsert={onInsertCitation ? () => onInsertCitation(source, index) : undefined}
                    />
                ))}
            </div>
        </div>
    );
};

/**
 * Inline Citation Pill
 * Small inline reference marker that links to a source
 */
export const CitationPill: React.FC<{
    index: number;
    source: Source;
}> = ({ index, source }) => {
    const [isHovered, setIsHovered] = useState(false);
    const domain = getDomain(source.uri);

    return (
        <span className="relative inline-block">
            <a
                href={source.uri}
                target="_blank"
                rel="noopener noreferrer"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className="
                    inline-flex items-center justify-center
                    w-4 h-4 rounded
                    bg-cyan-500/20 text-cyan-400
                    text-[9px] font-bold
                    hover:bg-cyan-500/30
                    transition-colors
                    cursor-pointer
                    ml-0.5
                "
            >
                {index + 1}
            </a>

            {/* Tooltip */}
            {isHovered && (
                <div className="
                    absolute bottom-full left-1/2 -translate-x-1/2 mb-2
                    px-2 py-1 rounded-lg
                    bg-slate-800 border border-slate-700
                    text-[10px] text-slate-300
                    whitespace-nowrap
                    z-50
                    animate-in fade-in slide-in-from-bottom-1 duration-150
                ">
                    {domain}: {source.title.slice(0, 50)}...
                </div>
            )}
        </span>
    );
};

export default SourceCards;
