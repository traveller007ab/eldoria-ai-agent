import React, { useEffect, useRef, useState } from 'react';
import { WebFrame, WebFrameHandle, PageMetadata } from '../../observatory/WebFrame';
import { BrowserOmnibox } from '../../observatory/BrowserOmnibox';
import { BrowserTabs } from '../../observatory/BrowserTabs';
import { SpeedDial } from '../../observatory/SpeedDial';
import { BookmarksManager } from '../../observatory/BookmarksManager';
import { HistoryManager } from '../../observatory/HistoryManager';
import { useBrowserStore } from '../../../stores/browserStore';
import { contextService as ContextService } from '../../../services/ContextService';

export const Observatory: React.FC = () => {
  const {
    tabs,
    activeTabId,
    addTab,
    updateTab,
    navigateTab,
    goBack,
    goForward,
    setLoading,
    canGoBack: storeCanGoBack,
    canGoForward: storeCanGoForward
  } = useBrowserStore();

  const frameRef = useRef<WebFrameHandle>(null);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [activeMetadata, setActiveMetadata] = useState<PageMetadata | null>(null);

  useEffect(() => {
    if (tabs.length === 0) {
      addTab();
    }
  }, [tabs.length, addTab]);

  const activeTab = tabs.find(t => t.id === activeTabId);

  useEffect(() => {
    if (activeTab) {
      ContextService.updateBrowserState({
        url: activeTab.url,
        title: activeTab.title,
      });
    }
  }, [activeTab?.url, activeTab?.title]);

  const handleNavigate = (url: string) => {
    if (activeTabId) {
      navigateTab(activeTabId, url);
      setTimeout(() => frameRef.current?.reload(), 100);
    }
  };

  const handleBack = () => {
    if (activeTabId) {
      const newUrl = goBack(activeTabId);
      if (newUrl && frameRef.current) {
        frameRef.current.goBack();
      }
    }
  };

  const handleForward = () => {
    if (activeTabId) {
      const newUrl = goForward(activeTabId);
      if (newUrl && frameRef.current) {
        frameRef.current.goForward();
      }
    }
  };

  const handleReload = () => {
    frameRef.current?.reload();
  };

  const handleMetadataChange = (metadata: PageMetadata) => {
    setActiveMetadata(metadata);
    if (activeTabId) {
      updateTab(activeTabId, {
        title: metadata.title,
        favicon: metadata.ogImage
      });
    }
  };

  const handleTabClick = (tabId: string) => {
    useBrowserStore.getState().setActiveTab(tabId);
  };

  const handleCloseTab = (tabId: string) => {
    useBrowserStore.getState().closeTab(tabId);
  };

  const handlePinTab = (tabId: string) => {
    useBrowserStore.getState().pinTab(tabId);
  };

  const handleUnpinTab = (tabId: string) => {
    useBrowserStore.getState().unpinTab(tabId);
  };

  const handleMoveTab = (tabId: string, newIndex: number) => {
    useBrowserStore.getState().moveTab(tabId, newIndex);
  };

  if (!activeTab) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-900">
        <div className="text-center text-slate-400">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 relative overflow-hidden">
      <BrowserTabs />

      <BrowserOmnibox
        currentUrl={activeTab.url}
        isLoading={activeTab.isLoading}
        onNavigate={handleNavigate}
        onBack={handleBack}
        onForward={handleForward}
        onReload={handleReload}
        canGoBack={storeCanGoBack(activeTabId || '')}
        canGoForward={storeCanGoForward(activeTabId || '')}
      />

      <div className="flex-1 relative bg-slate-900/50">
        {activeTab.url === 'about:blank' || activeTab.url === '' ? (
          <SpeedDial onNavigate={handleNavigate} />
        ) : (
          <div className="absolute inset-0 w-full h-full">
            <WebFrame
              ref={frameRef}
              url={activeTab.url}
              isActive={true}
              onLoadStart={() => setLoading(activeTabId || '', true)}
              onLoadStop={() => setLoading(activeTabId || '', false)}
              onTitleChange={(title) => {
                if (activeTabId) {
                  updateTab(activeTabId, { title });
                }
              }}
              onMetadataChange={handleMetadataChange}
            />
          </div>
        )}
      </div>

      <BookmarksManager
        isOpen={showBookmarks}
        onClose={() => setShowBookmarks(false)}
        onNavigate={handleNavigate}
      />

      <HistoryManager
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        onNavigate={handleNavigate}
      />
    </div>
  );
};
