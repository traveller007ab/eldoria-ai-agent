import React, { useRef } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { processImageFile } from '../utils/imageUtils';
import { EditableTextPart } from './EditableTextPart';
import { ImagePart } from './ImagePart';

export const EditorPanel: React.FC = () => {
  const { activeCanvas, addCanvasPart, generate, isLoading } = useWorkspace();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleAddImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && activeCanvas) {
      const { dataUri, mimeType } = await processImageFile(file);
      addCanvasPart(activeCanvas.id, { type: 'image', content: dataUri, mimeType });
    }
  };
  
  const handlePaste = async (event: React.ClipboardEvent) => {
    const items = event.clipboardData.items;
    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file && activeCanvas) {
            event.preventDefault();
            const { dataUri, mimeType } = await processImageFile(file);
            addCanvasPart(activeCanvas.id, { type: 'image', content: dataUri, mimeType });
        }
      }
    }
  };

  const canGenerate = activeCanvas && activeCanvas.content && activeCanvas.content.some(part => (part.type === 'text' && part.content.trim()) || part.type === 'image');

  return (
    <div className="panel w-full md:w-1/2 flex flex-col relative" onPaste={handlePaste}>
      <div className="flex-grow p-4 flex flex-col">
        <div className="flex justify-between items-center mb-2 pb-2 border-b border-cyan-500/20">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold text-cyan-300 text-glow">Editor</h2>
              <button
                onClick={handleAddImageClick}
                className="text-xs bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 px-3 py-1 rounded-md transition-colors"
              >
                + Add Image
              </button>
              <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/png, image/jpeg, image/webp"
              />
            </div>
            <button
                onClick={generate}
                disabled={isLoading || !canGenerate}
                className={`bg-cyan-500 text-slate-900 font-bold py-2 px-6 rounded-md transition-all duration-300 shadow-[0_0_10px_var(--glow-color)] hover:shadow-[0_0_20px_var(--glow-color)] disabled:bg-cyan-500/20 disabled:text-cyan-500/50 disabled:cursor-not-allowed disabled:shadow-none flex items-center gap-2 ${isLoading ? 'animate-pulse-glow' : ''}`}
            >
                {isLoading ? (
                    <>
                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Generating...
                    </>
                ) : '⚡ Generate'}
            </button>
        </div>
        <div className="w-full h-full custom-scrollbar pr-2 overflow-y-auto">
            {activeCanvas?.content?.map((part, index) => {
                if (part.type === 'text') {
                    return <EditableTextPart key={index} part={part} partIndex={index} />;
                }
                if (part.type === 'image') {
                    return <ImagePart key={index} part={part} partIndex={index} />;
                }
                return null;
            })}
        </div>
      </div>
    </div>
  );
};
