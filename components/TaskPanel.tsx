
import React, { useEffect, useRef } from 'react';
import { TaskLogEntry } from '../types';
import { PlanIcon, ThoughtIcon, ToolIcon } from './Icons';
import { MarkdownRenderer } from './MarkdownRenderer';

interface TaskPanelProps {
    log: TaskLogEntry[];
    isLoading: boolean;
}

const LogEntryIcon: React.FC<{ type: TaskLogEntry['type'] }> = ({ type }) => {
    switch (type) {
        case 'plan':
            return <PlanIcon className="w-4 h-4 text-cyan-400" />;
        case 'thought':
            return <ThoughtIcon className="w-4 h-4 text-cyan-400" />;
        case 'tool_code':
        case 'tool_result':
            return <ToolIcon className="w-4 h-4 text-cyan-400" />;
        default:
            return null;
    }
};

const LogEntry: React.FC<{ entry: TaskLogEntry }> = ({ entry }) => {
    let title = 'Step';
    switch (entry.type) {
        case 'plan': title = 'Plan'; break;
        case 'thought': title = 'Thought'; break;
        case 'tool_code': title = `Tool Call: ${entry.toolName}`; break;
        case 'tool_result': title = `Tool Result: ${entry.toolName}`; break;
        case 'error': title = 'Error'; break;
    }

    const isJson = (str: string) => {
        try {
            JSON.parse(str);
            return true;
        } catch (e) {
            return false;
        }
    };

    const contentIsJson = isJson(entry.content);

    return (
        <div className="mb-4 last:mb-0 animate-[slideIn_0.3s_ease-out]">
            <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300/80 mb-1">
                <LogEntryIcon type={entry.type} />
                <span className="text-glow">{title}</span>
            </div>
            <div className={`pl-6 text-sm ${entry.type === 'error' ? 'text-red-400' : 'text-sky-200/90'}`}>
                {contentIsJson ? (
                    <pre className="whitespace-pre-wrap bg-slate-900/50 p-2 rounded-md text-xs custom-scrollbar">
                        <code>{JSON.stringify(JSON.parse(entry.content), null, 2)}</code>
                    </pre>
                ) : (
                    <MarkdownRenderer>{entry.content}</MarkdownRenderer>
                )}
            </div>
        </div>
    );
};


export const TaskPanel: React.FC<TaskPanelProps> = ({ log, isLoading }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [log]);

    return (
        <div ref={scrollRef} className="h-full overflow-y-auto custom-scrollbar pr-2">
            {log.map((entry, index) => <LogEntry key={index} entry={entry} />)}
            {isLoading && log.length === 0 && (
                <div className="text-center p-4 text-cyan-400/80 text-sm">
                    <p>Awaiting task initiation...</p>
                </div>
            )}
        </div>
    );
};
