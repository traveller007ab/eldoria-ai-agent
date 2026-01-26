/**
 * SourcesGrid - Perplexity-style horizontal source cards
 * Displays search sources at the top of the Research panel
 */

import React from 'react';
import { ExternalLink, Globe } from 'lucide-react';

export interface Source {
    title: string;
    uri: string;
    favicon?: string;
    domain?: string;
}

interface SourcesGridProps {
    sources: Source[];
    isLoading?: boolean;
    onSourceClick?: (url: string) => void;
}

// Extract domain from URL
const getDomain = (url: string): string => {
    try {
        const u = new URL(url);
        return u.hostname.replace('www.', '');
    } catch {
        return url;
    }
};

// Get favicon URL
const getFavicon = (url: string): string => {
    try {
        const u = new URL(url);
        return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=32`;
    } catch {
        return '';
    }
};

const SourceCard: React.FC<{ source: Source; index: number; onClick?: () => void }> = ({
    source,
    index,
    onClick
}) => {
    const domain = source.domain || getDomain(source.uri);
    const favicon = source.favicon || getFavicon(source.uri);

    return (
        <a
            href={source.uri}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
                if (onClick) {
                    e.preventDefault();
                    onClick();
                }
            }}
            className="group flex flex-col gap-2 p-3 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-cyan-500/30 rounded-xl min-w-[180px] max-w-[220px] transition-all duration-200 cursor-pointer"
        >
            <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 text-[10px] font-bold">
                    {index + 1}
                </span>
                {favicon ? (
                    <img src={favicon} alt="" className="w-4 h-4 rounded" />
                ) : (
                    <Globe className="w-4 h-4 text-slate-400" />
                )}
                <span className="text-[10px] text-slate-400 truncate uppercase tracking-wider font-medium">
                    {domain}
                </span>
            </div>
            <div className="text-xs text-slate-200 line-clamp-2 group-hover:text-cyan-200 transition-colors leading-relaxed">
                {source.title}
            </div>
            <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-cyan-400 transition-colors ml-auto" />
        </a>
    );
};

const SourceSkeleton: React.FC = () => (
    <div className="flex flex-col gap-2 p-3 bg-slate-800/30 border border-slate-700/30 rounded-xl min-w-[180px] animate-pulse">
        <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-slate-700" />
            <div className="w-4 h-4 rounded bg-slate-700" />
            <div className="w-16 h-3 rounded bg-slate-700" />
        </div>
        <div className="w-full h-4 rounded bg-slate-700" />
        <div className="w-3/4 h-4 rounded bg-slate-700" />
    </div>
);

export const SourcesGrid: React.FC<SourcesGridProps> = ({
    sources,
    isLoading = false,
    onSourceClick
}) => {
    if (!isLoading && sources.length === 0) {
        return null;
    }

    return (
        <div className="mb-4">
            <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-bold text-cyan-500/60 uppercase tracking-widest">
                    Sources
                </span>
                {sources.length > 0 && (
                    <span className="text-[10px] text-slate-500">
                        ({sources.length} found)
                    </span>
                )}
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                {isLoading ? (
                    <>
                        <SourceSkeleton />
                        <SourceSkeleton />
                        <SourceSkeleton />
                        <SourceSkeleton />
                    </>
                ) : (
                    sources.map((source, index) => (
                        <SourceCard
                            key={source.uri + index}
                            source={source}
                            index={index}
                            onClick={onSourceClick ? () => onSourceClick(source.uri) : undefined}
                        />
                    ))
                )}
            </div>
        </div>
    );
};

export default SourcesGrid;
