import { useEffect, useState, useCallback } from 'react';
import { browserService, BrowserState } from '../services/BrowserService';
import { PageMetadata } from '../../components/observatory/WebFrame';

interface UseBrowserReturn extends BrowserState {
  navigate: (url: string) => void;
  goBack: () => boolean;
  goForward: () => boolean;
  reload: () => void;
  updateMetadata: (metadata: PageMetadata) => void;
  updateScroll: (percent: number) => void;
  updateSelection: (text: string) => void;
  addBookmark: (tags?: string[]) => void;
  removeBookmark: (id: string) => void;
  isBookmarked: () => boolean;
  getBookmarks: () => ReturnType<typeof browserService.getBookmarks>;
  clearHistory: () => void;
  getHistory: () => ReturnType<typeof browserService.getHistory>;
  getAIContext: () => string;
}

export function useBrowser(): UseBrowserReturn {
  const [state, setState] = useState<BrowserState>(browserService.getState());

  useEffect(() => {
    const unsubscribe = browserService.subscribe(setState);
    return unsubscribe;
  }, []);

  const navigate = useCallback((url: string) => {
    browserService.navigate(url);
  }, []);

  const goBack = useCallback(() => {
    return browserService.goBack();
  }, []);

  const goForward = useCallback(() => {
    return browserService.goForward();
  }, []);

  const reload = useCallback(() => {
    browserService.reload();
  }, []);

  const updateMetadata = useCallback((metadata: PageMetadata) => {
    browserService.updateMetadata(metadata);
  }, []);

  const updateScroll = useCallback((percent: number) => {
    browserService.updateScroll(percent);
  }, []);

  const updateSelection = useCallback((text: string) => {
    browserService.updateSelection(text);
  }, []);

  const addBookmark = useCallback((tags?: string[]) => {
    browserService.addBookmark(undefined, undefined, tags);
  }, []);

  const removeBookmark = useCallback((id: string) => {
    browserService.removeBookmark(id);
  }, []);

  const isBookmarked = useCallback(() => {
    return browserService.isBookmarked();
  }, []);

  const getBookmarks = useCallback(() => {
    return browserService.getBookmarks();
  }, []);

  const clearHistory = useCallback(() => {
    browserService.clearHistory();
  }, []);

  const getHistory = useCallback(() => {
    return browserService.getHistory();
  }, []);

  const getAIContext = useCallback(() => {
    return browserService.getAIContext();
  }, []);

  return {
    ...state,
    navigate,
    goBack,
    goForward,
    reload,
    updateMetadata,
    updateScroll,
    updateSelection,
    addBookmark,
    removeBookmark,
    isBookmarked,
    getBookmarks,
    clearHistory,
    getHistory,
    getAIContext,
  };
}
