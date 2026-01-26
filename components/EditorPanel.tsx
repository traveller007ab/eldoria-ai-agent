import React, { useRef } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { processImageFile } from '../utils/imageUtils';
import { EditableTextPart } from './EditableTextPart';
import { ImagePart } from './ImagePart';
import { Image as ImageIcon, File as FileIcon, Folder as FolderIcon, X, Zap } from 'lucide-react';
import { bridgeClient } from '../services/bridgeClient';
import { Button } from './ui/Button';

export const EditorPanel: React.FC = () => {
  const { activeCanvas, addCanvasPart, removeCanvasPart, generate, isLoading } = useWorkspace();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddFileClick = async () => {
    if (!activeCanvas) {
      alert("Please select or create a canvas first.");
      return;
    }
    const path = await bridgeClient.openFileDialog();
    if (path) {
      const fileName = path.split('\\').pop() || 'Untitled File';
      addCanvasPart(activeCanvas.id, { type: 'file', name: fileName, path });
    }
  };

  const handleAddFolderClick = async () => {
    if (!activeCanvas) {
      alert("Please select or create a canvas first.");
      return;
    }
    const path = await bridgeClient.openFolderDialog();
    if (path) {
      const folderName = path.split('\\').pop() || 'Untitled Folder';
      addCanvasPart(activeCanvas.id, { type: 'folder', name: folderName, path });
    }
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
            <div className="flex items-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={!activeCanvas}
                className="p-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 disabled:opacity-30 disabled:cursor-not-allowed text-cyan-300 rounded-md transition-all flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest border border-cyan-500/10"
                title="Add Image to Workspace"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                Image
              </button>
              <button
                onClick={handleAddFileClick}
                disabled={!activeCanvas}
                className="p-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 disabled:opacity-30 disabled:cursor-not-allowed text-cyan-300 rounded-md transition-all flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest border border-cyan-500/10"
                title="Add Local File Reference"
              >
                <FileIcon className="w-3.5 h-3.5" />
                File
              </button>
              <button
                onClick={handleAddFolderClick}
                disabled={!activeCanvas}
                className="p-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 disabled:opacity-30 disabled:cursor-not-allowed text-cyan-300 rounded-md transition-all flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest border border-cyan-500/10"
                title="Add Local Folder Reference"
              >
                <FolderIcon className="w-3.5 h-3.5" />
                Folder
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/png, image/jpeg, image/webp"
              />
            </div>
          </div>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={generate}
          disabled={isLoading || !canGenerate}
          loading={isLoading}
          rightIcon={isLoading ? undefined : <Zap className="w-4 h-4" />}
        >
          {isLoading ? 'Generating...' : '⚡ Generate'}
        </Button>
      </div>
      <div className="w-full h-full custom-scrollbar pr-2 overflow-y-auto">
        {activeCanvas?.content?.map((part, index) => {
          if (part.type === 'text') {
            return <EditableTextPart key={index} part={part} partIndex={index} />;
          }
          if (part.type === 'image') {
            return <ImagePart key={index} part={part} partIndex={index} />;
          }
          if (part.type === 'file') {
            return (
              <div key={index} className="p-3 bg-cyan-500/5 border border-cyan-500/10 rounded-lg mb-4 flex items-center gap-3 group/part">
                <div className="p-2 bg-cyan-500/10 rounded-md">
                  <FileIcon className="w-5 h-5 text-cyan-400" />
                </div>
                <div className="flex-grow min-w-0">
                  <div className="text-xs font-bold text-cyan-200 truncate">{part.name}</div>
                  <div className="text-[10px] text-cyan-500/50 truncate font-mono">{part.path}</div>
                </div>
                <button
                  onClick={() => removeCanvasPart(activeCanvas!.id, index)}
                  className="opacity-0 group-hover/part:opacity-100 p-1.5 hover:bg-red-500/20 text-red-400/50 hover:text-red-400 rounded transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          }
          if (part.type === 'folder') {
            return (
              <div key={index} className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-lg mb-4 flex items-center gap-3 group/part">
                <div className="p-2 bg-emerald-500/10 rounded-md">
                  <FolderIcon className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex-grow min-w-0">
                  <div className="text-xs font-bold text-emerald-200 truncate">{part.name}</div>
                  <div className="text-[10px] text-emerald-500/50 truncate font-mono">{part.path}</div>
                </div>
                <button
                  onClick={() => removeCanvasPart(activeCanvas!.id, index)}
                  className="opacity-0 group-hover/part:opacity-100 p-1.5 hover:bg-red-500/20 text-red-400/50 hover:text-red-400 rounded transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          }
          return null;
        })}
      </div>
    </div>

  );
};
