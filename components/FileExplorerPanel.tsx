import React, { useState, useRef, useEffect } from 'react';
import { Canvas, Folder } from '../types';
import { EldoriaLogo, PencilIcon, TrashIcon, CheckIcon, LoadingSpinnerIcon, FolderIcon, ChevronRightIcon } from './Icons';
import { useWorkspace } from '../context/WorkspaceContext';

interface FolderItemProps {
  folder: Folder;
  canvases: Canvas[];
  folders: Folder[];
  expandedFolderIds: Set<string>;
  toggleFolder: (id: string) => void;
  activeCanvasId: string | null;
}

const FolderItem: React.FC<FolderItemProps> = ({ folder, canvases, folders, expandedFolderIds, toggleFolder, activeCanvasId }) => {
  const isExpanded = expandedFolderIds.has(folder.id);
  const childFolders = folders.filter(f => f.parent_folder_id === folder.id);
  const childCanvases = canvases.filter(c => c.parent_folder_id === folder.id);

  return (
    <div>
      <div
        onClick={() => toggleFolder(folder.id)}
        className="flex items-center gap-2 px-3 py-3 rounded-md cursor-pointer text-cyan-200/70 hover:bg-cyan-500/10 transition-all min-h-[44px]"
      >
        <ChevronRightIcon className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
        <FolderIcon className="w-4 h-4 text-cyan-400" />
        <span className="text-sm truncate">{folder.name}</span>
      </div>
      {isExpanded && (
        <div className="ml-4 border-l border-cyan-500/10 pl-2">
          {childFolders.map(f => (
            <FolderItem key={f.id} folder={f} canvases={canvases} folders={folders} expandedFolderIds={expandedFolderIds} toggleFolder={toggleFolder} activeCanvasId={activeCanvasId} />
          ))}
          {childCanvases.map(c => (
            <CanvasItem key={c.id} canvas={c} isActive={c.id === activeCanvasId} />
          ))}
        </div>
      )}
    </div>
  );
};

interface CanvasItemProps {
  canvas: Canvas;
  isActive: boolean;
}

const CanvasItem: React.FC<CanvasItemProps> = ({ canvas, isActive }) => {
  const {
    selectCanvas,
    deleteCanvas,
    renameCanvas,
    initiateDelete,
    cancelDelete,
    isDeleting,
    pendingDeletionCanvasId
  } = useWorkspace();

  const [isRenaming, setIsRenaming] = useState(false);
  const [name, setName] = useState(canvas.name);
  const inputRef = useRef<HTMLInputElement>(null);

  const isPendingDeletion = pendingDeletionCanvasId === canvas.id;

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  const handleRename = () => {
    if (name.trim() && name !== canvas.name) {
      renameCanvas(canvas.id, name.trim());
    } else {
      setName(canvas.name);
    }
    setIsRenaming(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRename();
    } else if (e.key === 'Escape') {
      setName(canvas.name);
      setIsRenaming(false);
    }
  };

  const handleConfirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteCanvas(canvas.id);
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    cancelDelete();
  };

  const handleInitiateDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    initiateDelete(canvas.id);
  };

  const baseClasses = `flex justify-between items-center px-3 py-3 rounded-md cursor-pointer group transition-all duration-300 relative border min-h-[44px]`;
  const activeClasses = `bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-[0_0_15px_var(--glow-color)]`;
  const inactiveClasses = `text-cyan-200/70 border-transparent hover:bg-cyan-500/10`;
  const pendingDeleteClasses = `bg-red-500/20 border-red-500/50 text-red-300`;

  const getDynamicClasses = () => {
    if (isPendingDeletion) return pendingDeleteClasses;
    if (isActive) return activeClasses;
    return inactiveClasses;
  };

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/reactflow', JSON.stringify({
          type: 'canvas-import',
          id: canvas.id,
          name: canvas.name
        }));
        e.dataTransfer.effectAllowed = 'move';
      }}
      onClick={() => !isRenaming && !isPendingDeletion && selectCanvas(canvas.id)}
      onDoubleClick={() => !isPendingDeletion && setIsRenaming(true)}
      className={`${baseClasses} ${getDynamicClasses()}`}
    >
      {isRenaming ? (
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleRename}
          onKeyDown={handleKeyDown}
          className="w-full bg-transparent text-cyan-200 outline-none border border-cyan-500 rounded-sm px-1 text-sm"
        />
      ) : isPendingDeletion ? (
        <div className="flex justify-between items-center w-full">
          <span className="text-sm font-semibold animate-pulse">Delete?</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancelDelete}
              className="p-1 text-cyan-300/80 hover:text-cyan-200"
              aria-label="Cancel deletion"
            >
              ✕
            </button>
            <button
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="p-1 text-green-400 hover:text-green-300 disabled:opacity-50"
              aria-label="Confirm deletion"
            >
              {isDeleting ? <LoadingSpinnerIcon className="w-4 h-4" /> : <CheckIcon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      ) : (
        <>
          <span className="truncate pr-2 text-sm">{canvas.name}</span>
          <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={(e) => { e.stopPropagation(); setIsRenaming(true); }} className="p-1 mr-1 text-cyan-400/70 hover:text-cyan-300">
              <PencilIcon className="w-3 h-3" />
            </button>
            <button
              onClick={handleInitiateDelete}
              className="p-1 text-cyan-500/50 hover:text-red-400"
              aria-label={`Delete ${canvas.name}`}
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export const FileExplorerPanel: React.FC = () => {
  const { canvases, folders, activeCanvasId, createCanvas, createFolder, toggleFolder, expandedFolderIds } = useWorkspace();
  const [showNewFolderInput, setShowNewFolderInput] = React.useState(false);
  const [newFolderName, setNewFolderName] = React.useState('');
  const folderInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (showNewFolderInput && folderInputRef.current) {
      folderInputRef.current.focus();
    }
  }, [showNewFolderInput]);

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      createFolder(newFolderName.trim());
      setNewFolderName('');
      setShowNewFolderInput(false);
    }
  };

  // Root level items (no parent folder)
  const rootCanvases = canvases.filter(c => !c.parent_folder_id);
  const rootFolders = folders.filter(f => !f.parent_folder_id);

  return (
    <div className="panel w-full md:w-64 lg:w-72 p-4 flex flex-col shrink-0">
      <div className="flex items-center gap-3 pb-4 mb-4 border-b border-cyan-500/20">
        <EldoriaLogo className="w-9 h-9 text-cyan-400 text-glow" />
        <div>
          <h1 className="text-xl font-bold text-cyan-300 text-glow">
            Eldoria IDE
          </h1>
          <p className="text-xs text-cyan-400/80">Holographic Workspace</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => createCanvas()}
          className="flex-1 text-center bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-medium py-3 px-3 rounded-md transition-all text-xs min-h-[44px]"
        >
          + File
        </button>
        <button
          onClick={() => setShowNewFolderInput(true)}
          className="flex-1 text-center bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-medium py-3 px-3 rounded-md transition-all text-xs min-h-[44px]"
        >
          + Folder
        </button>
      </div>

      {showNewFolderInput && (
        <div className="mb-4 flex gap-2">
          <input
            ref={folderInputRef}
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
            placeholder="Folder name..."
            className="flex-1 bg-cyan-950/50 border border-cyan-500/30 text-cyan-200 rounded-md px-2 py-1 text-sm outline-none focus:border-cyan-400"
          />
          <button onClick={handleCreateFolder} className="text-cyan-300 hover:text-cyan-200 text-sm px-2">✓</button>
          <button onClick={() => setShowNewFolderInput(false)} className="text-cyan-500/50 hover:text-red-400 text-sm px-2">✕</button>
        </div>
      )}

      <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar">
        <div className="space-y-1">
          {rootFolders.map(folder => (
            <FolderItem key={folder.id} folder={folder} canvases={canvases} folders={folders} expandedFolderIds={expandedFolderIds} toggleFolder={toggleFolder} activeCanvasId={activeCanvasId} />
          ))}
          {rootCanvases.map(canvas => (
            <CanvasItem
              key={canvas.id}
              canvas={canvas}
              isActive={canvas.id === activeCanvasId}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
