/**
 * Unified Workspace Store
 * 
 * Provides coordinated access to IDE and SAF Lab state.
 * Uses Zustand for state management with cross-store subscriptions.
 * 
 * Architecture:
 * - IDE State: Managed by WorkspaceContext (React Context)
 * - SAF State: Managed by useMechStore (Zustand)
 * - Coordination: This layer bridges both with unified selectors/actions
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { MechBlueprint, MechComponentInstance, MechConnection, MechSimulationResult, MechanicalDomain } from '../types';
import { Node, Edge } from 'reactflow';

// ============================================================================
// Cross-Store Event Bus
// ============================================================================

type StoreEventType =
    | 'blueprint:loaded'
    | 'blueprint:saved'
    | 'component:selected'
    | 'simulation:started'
    | 'simulation:completed'
    | 'ui:layout-changed';

interface StoreEvent {
    type: StoreEventType;
    payload?: any;
    timestamp: number;
}

class StoreEventBus {
    private listeners: Map<StoreEventType, Set<(event: StoreEvent) => void>> = new Map();

    emit(event: StoreEvent): void {
        const callbacks = this.listeners.get(event.type);
        if (callbacks) {
            callbacks.forEach(cb => cb(event));
        }
    }

    on(type: StoreEventType, callback: (event: StoreEvent) => void): () => void {
        if (!this.listeners.has(type)) {
            this.listeners.set(type, new Set());
        }
        this.listeners.get(type)!.add(callback);
        return () => this.listeners.get(type)?.delete(callback);
    }

    off(type: StoreEventType, callback: (event: StoreEvent) => void): void {
        this.listeners.get(type)?.delete(callback);
    }
}

export const storeEvents = new StoreEventBus();

// ============================================================================
// Unified Store State
// ============================================================================

interface UnifiedWorkspaceState {
    // Active Module
    activeModule: 'ide' | 'saf-lab' | 'academic-hub';
    setActiveModule: (module: 'ide' | 'saf-lab' | 'academic-hub') => void;

    // SAF Lab Integration State
    currentBlueprintId: string | null;
    setCurrentBlueprintId: (id: string | null) => void;

    // Cross-Store Selection
    lastSelectedComponentId: string | null;
    lastSelectedCanvasId: string | null;
    setLastSelectedComponent: (id: string | null) => void;
    setLastSelectedCanvas: (id: string | null) => void;

    // UI State
    sidebarWidth: number;
    setSidebarWidth: (width: number) => void;
    rightPanelWidth: number;
    setRightPanelWidth: (width: number) => void;

    // Performance Mode
    isLowPerfMode: boolean;
    setLowPerfMode: (enabled: boolean) => void;

    // Global Search
    globalSearchQuery: string;
    setGlobalSearchQuery: (query: string) => void;

    // Notifications
    notifications: Notification[];
    addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
    dismissNotification: (id: string) => void;
    clearNotifications: () => void;

    // Quick Actions
    quickActions: QuickAction[];
    addQuickAction: (action: QuickAction) => void;
    removeQuickAction: (id: string) => void;
}

interface Notification {
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
    timestamp: number;
    duration?: number;
    action?: () => void;
}

interface QuickAction {
    id: string;
    label: string;
    icon: string;
    action: () => void;
    shortcut?: string;
}

// ============================================================================
// Unified Store Implementation
// ============================================================================

export const useUnifiedStore = create<UnifiedWorkspaceState>()(
    subscribeWithSelector((set, get) => ({
        // Active Module
        activeModule: 'ide',
        setActiveModule: (module) => set({ activeModule: module }),

        // SAF Lab Integration
        currentBlueprintId: null,
        setCurrentBlueprintId: (id) => {
            set({ currentBlueprintId: id });
            storeEvents.emit({ type: 'blueprint:loaded', payload: { id }, timestamp: Date.now() });
        },

        // Cross-Store Selection
        lastSelectedComponentId: null,
        lastSelectedCanvasId: null,
        setLastSelectedComponent: (id) => {
            set({ lastSelectedComponentId: id });
            storeEvents.emit({ type: 'component:selected', payload: { id }, timestamp: Date.now() });
        },
        setLastSelectedCanvas: (id) => {
            set({ lastSelectedCanvasId: id });
            storeEvents.emit({ type: 'component:selected', payload: { canvasId: id }, timestamp: Date.now() });
        },

        // UI State
        sidebarWidth: 280,
        setSidebarWidth: (width) => set({ sidebarWidth: width }),
        rightPanelWidth: 320,
        setRightPanelWidth: (width) => set({ rightPanelWidth: width }),

        // Performance Mode
        isLowPerfMode: (navigator as any).deviceMemory && (navigator as any).deviceMemory < 4 || false,
        setLowPerfMode: (enabled) => {
            set({ isLowPerfMode: enabled });
            localStorage.setItem('isLowPerfMode', String(enabled));
        },

        // Global Search
        globalSearchQuery: '',
        setGlobalSearchQuery: (query) => set({ globalSearchQuery: query }),

        // Notifications
        notifications: [],
        addNotification: (notification) => {
            const id = crypto.randomUUID();
            const newNotification: Notification = {
                ...notification,
                id,
                timestamp: Date.now()
            };
            set((state) => ({
                notifications: [...state.notifications, newNotification]
            }));

            // Auto-dismiss if duration specified
            if (notification.duration !== 0) {
                setTimeout(() => {
                    get().dismissNotification(id);
                }, notification.duration || 5000);
            }
        },
        dismissNotification: (id) => set((state) => ({
            notifications: state.notifications.filter(n => n.id !== id)
        })),
        clearNotifications: () => set({ notifications: [] }),

        // Quick Actions
        quickActions: [
            { id: 'new-canvas', label: 'New Canvas', icon: 'Plus', action: () => { }, shortcut: 'Ctrl+N' },
            { id: 'new-blueprint', label: 'New Blueprint', icon: 'Box', action: () => { }, shortcut: 'Ctrl+Shift+B' },
            { id: 'search', label: 'Search', icon: 'Search', action: () => { }, shortcut: 'Ctrl+K' }
        ],
        addQuickAction: (action) => set((state) => ({
            quickActions: [...state.quickActions, action]
        })),
        removeQuickAction: (id) => set((state) => ({
            quickActions: state.quickActions.filter(a => a.id !== id)
        }))
    }))
);

// ============================================================================
// Unified Selectors
// ============================================================================

export const useActiveModule = () => useUnifiedStore(state => state.activeModule);
export const useCurrentBlueprintId = () => useUnifiedStore(state => state.currentBlueprintId);
export const useNotifications = () => useUnifiedStore(state => state.notifications);
export const useGlobalSearch = () => useUnifiedStore(state => state.globalSearchQuery);
export const useSidebarWidth = () => useUnifiedStore(state => state.sidebarWidth);
export const useRightPanelWidth = () => useUnifiedStore(state => state.rightPanelWidth);
export const useLowPerfMode = () => useUnifiedStore(state => state.isLowPerfMode);

// ============================================================================
// Bridge to Existing Stores
// ============================================================================

/**
 * Bridge actions that need to coordinate between stores
 */
export const unifiedActions = {
    // Load a blueprint from IDE to SAF Lab
    loadBlueprintToSAF: (blueprint: MechBlueprint) => {
        useUnifiedStore.getState().setCurrentBlueprintId(blueprint.id);
        return blueprint;
    },

    // Navigate from component to related canvas
    navigateFromComponent: (componentId: string) => {
        useUnifiedStore.getState().setLastSelectedComponent(componentId);
        useUnifiedStore.getState().setActiveModule('saf-lab');
    },

    // Navigate from canvas to related component
    navigateFromCanvas: (canvasId: string) => {
        useUnifiedStore.getState().setLastSelectedCanvas(canvasId);
        useUnifiedStore.getState().setActiveModule('ide');
    },

    // Show notification with action
    notifyWithAction: (notification: Omit<Notification, 'id' | 'timestamp'>, action: () => void) => {
        useUnifiedStore.getState().addNotification({
            ...notification,
            duration: 0, // Don't auto-dismiss
            action
        });
    },

    // Performance mode toggle with store sync
    togglePerformanceMode: () => {
        const current = useUnifiedStore.getState().isLowPerfMode;
        useUnifiedStore.getState().setLowPerfMode(!current);
    }
};

// ============================================================================
// Event Subscribers
// ============================================================================

// Subscribe to simulation events for notifications
if (typeof window !== 'undefined') {
    storeEvents.on('simulation:started', () => {
        useUnifiedStore.getState().addNotification({
            type: 'info',
            title: 'Simulation Started',
            message: 'Your simulation is running...',
            duration: 3000
        });
    });

    storeEvents.on('simulation:completed', (event) => {
        const result = event.payload?.result;
        if (result?.status === 'completed') {
            useUnifiedStore.getState().addNotification({
                type: 'success',
                title: 'Simulation Complete',
                message: `Completed in ${result.duration}ms`,
                duration: 5000
            });
        } else {
            useUnifiedStore.getState().addNotification({
                type: 'warning',
                title: 'Simulation Issues',
                message: 'Some components had warnings during simulation',
                duration: 5000
            });
        }
    });

    storeEvents.on('blueprint:loaded', () => {
        console.log('[UnifiedStore] Blueprint loaded - ready for simulation');
    });
}
