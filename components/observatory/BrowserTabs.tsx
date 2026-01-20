import React from 'react';
import { Plus } from 'lucide-react';
import { useBrowserStore } from '../../stores/browserStore';
import { TabItem } from './TabItem';

export const BrowserTabs: React.FC = () => {
    const { tabs, activeTabId, setActiveTab, closeTab, addTab } = useBrowserStore();

    return (
        <div className="flex items-center w-full h-10 bg-slate-950 border-b border-slate-800/50 overflow-hidden select-none">
            {/* Tabs Scroll Container */}
            <div className="flex-1 flex overflow-x-auto no-scrollbar items-end h-full pt-1 pl-1">
                {tabs.map((tab) => (
                    <TabItem
                        key={tab.id}
                        tab={tab}
                        isActive={tab.id === activeTabId}
                        onSelect={() => setActiveTab(tab.id)}
                        onClose={(e) => {
                            e.stopPropagation();
                            closeTab(tab.id);
                        }}
                    />
                ))}

                {/* New Tab Button */}
                <button
                    onClick={() => addTab()}
                    className="ml-1 p-1.5 rounded-md text-slate-400 hover:text-cyan-400 hover:bg-slate-800/50 transition-colors"
                    title="New Tab"
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>

            {/* Window Controls (Placeholder for now, or just spacing) */}
            <div className="w-2" />
        </div>
    );
};
