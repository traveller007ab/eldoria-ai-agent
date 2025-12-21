import React from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { InlineAction } from '../services/geminiService';
import { RefactorIcon, ExplainIcon, ContinueIcon } from './Icons';

type Selection = {
  text: string;
  start: number;
  end: number;
  rect: DOMRect | null;
};

interface InlineActionToolbarProps {
  selection: Selection;
  onAction: (action: InlineAction) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  partIndex: number;
}

export const InlineActionToolbar: React.FC<InlineActionToolbarProps> = ({ selection, onAction, textareaRef, partIndex }) => {
  const { performInlineAction, isInlineLoading } = useWorkspace();

  const handleAction = (action: InlineAction) => {
    performInlineAction(action, selection, partIndex);
    onAction(action);
  };

  if (!selection.rect || !textareaRef.current) return null;

  const textareaRect = textareaRef.current.getBoundingClientRect();
  const top = selection.rect.top - textareaRect.top - 10;
  const left = selection.rect.left - textareaRect.left;

  return (
    <div
      className="inline-action-toolbar"
      style={{ top: `${top}px`, left: `${left}px` }}
      onMouseDown={(e) => e.preventDefault()} // Prevent textarea from losing focus
    >
      <ActionButton
        icon={<RefactorIcon className="w-4 h-4" />}
        label="Improve"
        onClick={() => handleAction('refactor')}
        disabled={isInlineLoading}
      />
      <ActionButton
        icon={<ExplainIcon className="w-4 h-4" />}
        label="Explain"
        onClick={() => handleAction('explain')}
        disabled={isInlineLoading}
      />
      <ActionButton
        icon={<ContinueIcon className="w-4 h-4" />}
        label="Continue"
        onClick={() => handleAction('continue')}
        disabled={isInlineLoading}
      />
       {isInlineLoading && <div className="w-px h-6 bg-cyan-500/30 mx-1"></div>}
       {isInlineLoading && (
            <div className="flex items-center gap-2 px-2 text-cyan-400">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-xs">Working...</span>
            </div>
        )}
    </div>
  );
};

interface ActionButtonProps {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    disabled: boolean;
}

const ActionButton: React.FC<ActionButtonProps> = ({ icon, label, onClick, disabled }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 hover:text-cyan-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
        {icon}
        <span className="text-xs font-medium">{label}</span>
    </button>
);