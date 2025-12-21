import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { CopyIcon, CheckIcon } from './Icons';

interface MarkdownRendererProps {
  children: string;
}

const CodeBlock: React.FC<{ language: string; value: string }> = ({ language, value }) => {
    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(value).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        });
    };

    return (
        <div className="relative group my-4 text-left">
            <button
                onClick={handleCopy}
                className="absolute top-2 right-2 p-1.5 rounded-md bg-slate-800/70 text-cyan-400 opacity-50 group-hover:opacity-100 transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500"
                aria-label={isCopied ? "Copied" : "Copy code"}
            >
                {isCopied ? (
                    <div className="flex items-center gap-1.5 text-xs text-green-400">
                        <CheckIcon className="w-4 h-4" />
                        <span>Copied!</span>
                    </div>
                ) : (
                    <CopyIcon className="w-4 h-4" />
                )}
            </button>
            <SyntaxHighlighter
                style={vscDarkPlus}
                language={language}
                PreTag="div"
                className="!bg-slate-900/70 border border-cyan-500/20"
            >
                {value}
            </SyntaxHighlighter>
        </div>
    );
};

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ children }) => {
  return (
    <ReactMarkdown
      children={children}
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({node, ...props}) => <h1 className="text-2xl font-bold mb-4 mt-6 pb-2 border-b border-cyan-500/30 text-cyan-300 text-glow" {...props} />,
        h2: ({node, ...props}) => <h2 className="text-xl font-semibold mb-3 mt-5 pb-2 border-b border-cyan-500/30 text-cyan-300" {...props} />,
        h3: ({node, ...props}) => <h3 className="text-lg font-semibold mb-3 mt-4 text-cyan-300" {...props} />,
        p: ({node, ...props}) => <p className="mb-4 leading-relaxed text-sky-200/90" {...props} />,
        ul: ({node, ...props}) => <ul className="list-disc pl-6 mb-4 space-y-2" {...props} />,
        ol: ({node, ...props}) => <ol className="list-decimal pl-6 mb-4 space-y-2" {...props} />,
        li: ({node, ...props}) => <li className="leading-relaxed text-sky-200/90" {...props} />,
        blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-cyan-500/50 pl-4 italic text-cyan-200/80 my-4" {...props} />,
        a: ({node, ...props}) => <a className="text-cyan-400 hover:underline text-glow" target="_blank" rel="noopener noreferrer" {...props} />,
        hr: ({node, ...props}) => <hr className="border-cyan-500/30 my-6" {...props} />,
        code({ node, inline, className, children, ...props }: any) {
          const match = /language-(\w+)/.exec(className || '');
          const codeString = String(children).replace(/\n$/, '');
          return !inline && match ? (
            <CodeBlock language={match[1]} value={codeString} />
          ) : (
            <code className="bg-cyan-900/50 text-amber-300 px-1.5 py-0.5 rounded-md text-sm" {...props}>
              {children}
            </code>
          );
        },
      }}
    />
  );
};