import { useState, useCallback } from 'react';

export interface DesktopBrowserState {
  isAvailable: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useDesktopBrowser() {
  const [state, setState] = useState<DesktopBrowserState>({
    isAvailable: false,
    isLoading: false,
    error: null,
  });

  const checkAvailability = useCallback(async () => {
    const isElectron = !!(window as any).eldoriaDesktop?.isElectron;
    
    if (isElectron) {
      setState(prev => ({ ...prev, isAvailable: true }));
      return true;
    }

    try {
      const response = await fetch('/browser/status');
      if (response.ok) {
        const data = await response.json();
        setState(prev => ({ ...prev, isAvailable: data.browser_available }));
        return data.browser_available;
      }
    } catch (e) {
      console.warn('[useDesktopBrowser] Bridge not available:', e);
    }
    
    return false;
  }, []);

  const openBrowser = useCallback(async (url?: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const isElectron = !!(window as any).eldoriaDesktop?.isElectron;

      if (isElectron) {
        await (window as any).eldoriaDesktop.openBrowser(url);
        setState(prev => ({ ...prev, isLoading: false }));
        return true;
      }

      const response = await fetch('/browser/launch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: url || '' }),
      });

      if (!response.ok) {
        throw new Error('Failed to launch desktop browser');
      }

      const data = await response.json();
      setState(prev => ({ ...prev, isLoading: false }));
      return data.success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMessage 
      }));
      console.error('[useDesktopBrowser] Error:', error);
      return false;
    }
  }, []);

  const navigateTo = useCallback(async (url: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const isElectron = !!(window as any).eldoriaDesktop?.isElectron;

      if (isElectron) {
        await (window as any).eldoriaDesktop.browserNavigate(url);
        setState(prev => ({ ...prev, isLoading: false }));
        return true;
      }

      const response = await fetch('/browser/launch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error('Failed to navigate desktop browser');
      }

      setState(prev => ({ ...prev, isLoading: false }));
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMessage 
      }));
      console.error('[useDesktopBrowser] Navigate error:', error);
      return false;
    }
  }, []);

  return {
    ...state,
    checkAvailability,
    openBrowser,
    navigateTo,
  };
}
