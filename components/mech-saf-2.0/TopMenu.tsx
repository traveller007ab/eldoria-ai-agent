
import React, { useState, useRef, useEffect } from 'react';
import {
    File, FolderOpen, Save, FileJson, LogOut,
    Edit, Undo2, Redo2, Settings,
    Eye, Layout, PanelLeft, PanelRight,
    ChevronDown, Play, Plus, Trophy, Target, Zap
} from 'lucide-react';
import { useMechStore } from '../../stores/useMechStore';
import { TEMPLATE_REGISTRY } from '../../data/template-library';

interface TopMenuProps {
    onLoadTemplate: (templateId: string) => void;
    onSaveProject: () => void;
    onOpenMissions?: () => void;
    onExport?: () => void;
}

export const TopMenu: React.FC<TopMenuProps> = ({ onLoadTemplate, onSaveProject, onOpenMissions, onExport }) => {
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const { undo, redo, canUndo, canRedo, togglePropertiesPanel } = useMechStore();

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setActiveMenu(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const MenuButton = ({ id, label, icon: Icon }: any) => (
        <button
            onClick={() => setActiveMenu(activeMenu === id ? null : id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded hover:bg-white/10 transition-colors ${activeMenu === id ? 'bg-white/10 text-white' : 'text-gray-300'}`}
        >
            {Icon && <Icon className="w-3.5 h-3.5" />}
            {label}
        </button>
    );

    const Dropdown = ({ children }: { children: React.ReactNode }) => (
        <div className="absolute top-full left-0 mt-1 w-56 bg-[#1a1b26] border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden py-1">
            {children}
        </div>
    );

    const MenuItem = ({ icon: Icon, label, shortcut, onClick, disabled = false, divider = false }: any) => (
        <>
            <button
                onClick={(e) => {
                    if (disabled) return;
                    onClick?.(e);
                    setActiveMenu(null);
                }}
                disabled={disabled}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-white/5 transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : 'text-gray-300 hover:text-white'}`}
            >
                <div className="flex items-center gap-2">
                    {Icon && <Icon className="w-3.5 h-3.5 text-gray-400" />}
                    <span>{label}</span>
                </div>
                {shortcut && <span className="text-[10px] text-gray-500 font-mono">{shortcut}</span>}
            </button>
            {divider && <div className="h-px bg-white/10 my-1" />}
        </>
    );

    return (
        <div className="flex items-center gap-1 px-2 h-10 border-b border-white/10 bg-[#0f1014]" ref={menuRef}>

            {/* FILE MENU */}
            <div className="relative">
                <MenuButton id="file" label="File" icon={File} />
                {activeMenu === 'file' && (
                    <Dropdown>
                        <div className="px-3 py-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Templates</div>
                        {TEMPLATE_REGISTRY.map(t => (
                            <MenuItem
                                key={t.id}
                                icon={t.thumbnail === 'engine' ? Play : Plus}
                                label={t.name}
                                onClick={() => onLoadTemplate(t.id)}
                            />
                        ))}
                        <div className="h-px bg-white/10 my-1" />
                        <MenuItem icon={FolderOpen} label="Open Project..." shortcut="Ctrl+O" disabled />
                        <MenuItem icon={Save} label="Save Project" shortcut="Ctrl+S" onClick={onSaveProject} />
                        <MenuItem icon={FileJson} label="Export JSON" shortcut="Ctrl+E" onClick={() => onExport?.()} divider />
                        <MenuItem icon={LogOut} label="Exit to Home" />
                    </Dropdown>
                )}
            </div>

            {/* EDIT MENU */}
            <div className="relative">
                <MenuButton id="edit" label="Edit" icon={Edit} />
                {activeMenu === 'edit' && (
                    <Dropdown>
                        <MenuItem icon={Undo2} label="Undo" shortcut="Ctrl+Z" onClick={undo} disabled={!canUndo()} />
                        <MenuItem icon={Redo2} label="Redo" shortcut="Ctrl+Y" onClick={redo} disabled={!canRedo()} />
                        {/* <MenuItem icon={Settings} label="Project Settings" /> */}
                    </Dropdown>
                )}
            </div>

            {/* VIEW MENU */}
            <div className="relative">
                <MenuButton id="view" label="View" icon={Eye} />
                {activeMenu === 'view' && (
                    <Dropdown>
                        <MenuItem icon={PanelLeft} label="Toggle Sidebar" shortcut="Ctrl+B" />
                        <MenuItem icon={PanelRight} label="Toggle Properties" shortcut="Ctrl+P" onClick={togglePropertiesPanel} />
                        {/* <MenuItem icon={Layout} label="Reset Layout" divider /> */}
                        {/* <MenuItem icon={Settings} label="Interface Settings" /> */}
                    </Dropdown>
                )}
            </div>

            {/* MISSIONS MENU */}
            <div className="relative">
                <button
                    onClick={onOpenMissions}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded hover:bg-amber-500/20 transition-colors text-amber-400"
                >
                    <Trophy className="w-3.5 h-3.5" />
                    Missions
                </button>
            </div>

            {/* Spacer */}
            <div className="flex-grow" />

            {/* App Title */}
            <div className="mr-4 flex items-center gap-2 opacity-50 select-none">
                <span className="font-bold tracking-wider text-xs">SAF LAB</span>
                <span className="text-[10px] bg-white/10 px-1.5 rounded">2.0</span>
            </div>
        </div>
    );
};
