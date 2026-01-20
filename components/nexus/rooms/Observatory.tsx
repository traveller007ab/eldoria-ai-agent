import React, { useEffect, useRef } from 'react';
import { WebFrame } from '../../observatory/WebFrame';
import { BrowserOmnibox } from '../../observatory/BrowserOmnibox';
import { BrowserTabs } from '../../observatory/BrowserTabs';
import { SpeedDial } from '../../observatory/SpeedDial';
import { useBrowserStore } from '../../../stores/browserStore';
import { contextService as ContextService } from '../../../services/ContextService'; // Ensure correct import path

export const Observatory: React.FC = () => {
    const {
        tabs,
        activeTabId,
        addTab,
        updateTab,
        navigateTab,
        goBack,
        goForward,
        setLoading
    } = useBrowserStore();

    // Ensure at least one tab exists on mount
    useEffect(() => {
        if (tabs.length === 0) {
            addTab('about:blank');
        }
    }, [tabs.length, addTab]);

    const activeTab = tabs.find(t => t.id === activeTabId);

    // Sync with Context Service for AI awareness
    useEffect(() => {
        if (activeTab) {
            ContextService.updateBrowserState({
                url: activeTab.url,
                title: activeTab.title,
                isActive: true
            });
        }
    }, [activeTab?.url, activeTab?.title]);

    const handleNavigate = (url: string) => {
        if (activeTabId) {
            navigateTab(activeTabId, url);
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-slate-950 relative overflow-hidden">
            {/* 1. Tabs Bar */}
            <BrowserTabs />

            {/* 2. Navigation Toolbar */}
            <BrowserOmnibox
                currentUrl={activeTab?.url || ''}
                isLoading={activeTab?.isLoading}
                onNavigate={handleNavigate}
                onBack={() => activeTabId && goBack(activeTabId)}
                onForward={() => activeTabId && goForward(activeTabId)}
                onReload={() => {
                    // Basic reload hack: re-set URL to itself (WebFrame handles diffs, might need force reload logic later)
                    if (activeTabId && activeTab) navigateTab(activeTabId, activeTab.url);
                }}
            />

            {/* 3. Browser Content Area */}
            <div className="flex-1 relative bg-slate-900/50">

                {/* Render Speed Dial if Active Tab has no URL (and there are tabs) */}
                {activeTab && (activeTab.url === 'about:blank' || activeTab.url === '') && (
                    <div className="absolute inset-0 flex z-10">
                        <SpeedDial />
                    </div>
                )}

                {/* Render ALL WebFrames, but hide inactive ones. 
            This preserves their DOM state (scroll, form data) */}
                {tabs.map((tab) => {
                    const isActive = tab.id === activeTabId;
                    // Optimized: If it's the speed dial (empty url), we don't need to render the heavy WebFrame at all potentially,
                    // OR we render it but keep it hidden/empty. 
                    // Better: Render WebFrame always, but pass empty/null if 'about:blank' to keep it dormant.
                    // Actually, WebFrame with 'about:blank' is fine.

                    return (
                        <div
                            key={tab.id}
                            className={`absolute inset-0 w-full h-full bg-white ${isActive ? 'z-0 display-flex' : 'z-[-1] invisible'}`}
                            style={{ display: isActive ? 'flex' : 'none' }}
                        >
                            {/* Only render WebFrame if it has a real URL to avoid iframe flickering on Speed Dial? 
                    No, keep it mounted so if we nav *to* it, it's ready. 
                    But if it's 'about:blank', WebFrame might show a white box.
                    Let's hide the container if it's 'about:blank' so SpeedDial shows through (if we overlay SpeedDial).
                    Actually, we handled SpeedDial above as a separate overlay.
                    So if tab is 'about:blank', this div is hidden or covered by SpeedDial z-index.
                */}
                            <WebFrame
                                url={tab.url === 'about:blank' ? '' : tab.url}
                                isActive={isActive}
                                onLoadingStateChange={(loading) => setLoading(tab.id, loading)}
                                onUpdatePageInfo={(info) => {
                                    updateTab(tab.id, {
                                        title: info.title || tab.title,
                                        favicon: info.favicon
                                    });
                                }}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
