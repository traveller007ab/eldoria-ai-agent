import React, { useState, useEffect, useRef } from 'react';
import { TextPart } from '../types';
import { useWorkspace } from '../context/WorkspaceContext';
import { InlineActionToolbar } from './InlineActionToolbar';

interface EditableTextPartProps {
  part: TextPart;
  partIndex: number;
}

type Selection = {
  text: string;
  start: number;
  end: number;
  rect: DOMRect | null;
};

export const EditableTextPart: React.FC<EditableTextPartProps> = ({ part, partIndex }) => {
  const { activeCanvas, updateCanvasPart } = useWorkspace();
  const [content, setContent] = useState(part.content);
  const [selection, setSelection] = useState<Selection | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setContent(part.content);
  }, [part.content]);
  
  useEffect(() => {
    // Auto-resize textarea
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  const handleLocalContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);

    if (activeCanvas) {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      
      saveTimeoutRef.current = setTimeout(() => {
        updateCanvasPart(activeCanvas.id, partIndex, { ...part, content: newContent });
      }, 500);
    }
  };
  
  const handleMouseUp = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd } = textarea;
    const selectedText = textarea.value.substring(selectionStart, selectionEnd);

    if (selectedText) {
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.visibility = 'hidden';
      tempDiv.style.whiteSpace = 'pre-wrap';
      tempDiv.style.font = window.getComputedStyle(textarea).font;
      tempDiv.style.width = textarea.clientWidth + 'px';
      tempDiv.innerHTML = textarea.value.substring(0, selectionEnd).replace(/\n/g, '<br/>') + '<span id="caret-pos"></span>';
      document.body.appendChild(tempDiv);
      const caret = document.getElementById('caret-pos');
      const rect = caret?.getBoundingClientRect() ?? null;
      document.body.removeChild(tempDiv);

      setSelection({ text: selectedText, start: selectionStart, end: selectionEnd, rect: rect });
    } else {
      setSelection(null);
    }
  };

  return (
    <div className="relative my-2">
      {selection && selection.rect && (
        <InlineActionToolbar
          selection={selection}
          onAction={() => setSelection(null)}
          textareaRef={textareaRef}
          partIndex={partIndex}
        />
      )}
      <textarea
        ref={textareaRef}
        value={content}
        onChange={handleLocalContentChange}
        onMouseUp={handleMouseUp}
        onScroll={() => setSelection(null)}
        placeholder="Initiate innovation sequence..."
        className="w-full bg-transparent text-cyan-300 focus:outline-none resize-none text-base leading-relaxed"
        rows={1}
      />
    </div>
  );
};
