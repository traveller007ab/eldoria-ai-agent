import React from 'react';
import { ImagePart as ImagePartType } from '../types';
import { useWorkspace } from '../context/WorkspaceContext';

interface ImagePartProps {
  part: ImagePartType;
  partIndex: number;
}

export const ImagePart: React.FC<ImagePartProps> = ({ part, partIndex }) => {
  const { activeCanvas, removeCanvasPart } = useWorkspace();

  const handleRemove = () => {
    if (activeCanvas) {
      removeCanvasPart(activeCanvas.id, partIndex);
    }
  };

  return (
    <div className="relative group my-2 p-2 border border-cyan-500/20 rounded-lg bg-cyan-900/20">
      <img 
        src={part.content} 
        alt="User upload"
        className="max-w-full h-auto rounded-md"
      />
      <button
        onClick={handleRemove}
        className="absolute top-3 right-3 p-1.5 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
        aria-label="Remove image"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};
