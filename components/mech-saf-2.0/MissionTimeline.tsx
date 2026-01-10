import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Plus, Trash2, GripVertical, Clock, ChevronRight, ChevronDown, Edit2, Save, X } from 'lucide-react';
import { useMechStore } from '../../stores/useMechStore';
import { ScenarioSession, MissionEvent } from '../../services/scenarios/types';

interface MissionTimelineProps {
    isOpen?: boolean;
    onClose?: () => void;
}

interface TimelineEvent {
    id: string;
    name: string;
    startTime: number;
    duration: number;
    type: 'load' | 'steady' | 'transient' | 'unload' | 'rest';
    description?: string;
    parameters?: Record<string, number>;
    isExpanded?: boolean;
}

export const MissionTimeline: React.FC<MissionTimelineProps> = ({ isOpen = true, onClose }) => {
    const { lastSimulationResult } = useMechStore();
    const [events, setEvents] = useState<TimelineEvent[]>([
        { id: 'e1', name: 'Cold Start', startTime: 0, duration: 10, type: 'transient', description: 'Engine start-up phase', parameters: { rpm: 800, throttle: 0.1 } },
        { id: 'e2', name: 'Warm Up', startTime: 10, duration: 20, type: 'load', description: 'Bring engine to operating temperature', parameters: { rpm: 1500, throttle: 0.2 } },
        { id: 'e3', name: 'Cruise', startTime: 30, duration: 40, type: 'steady', description: 'Maintain cruise conditions', parameters: { rpm: 2500, throttle: 0.4 } },
        { id: 'e4', name: 'Acceleration', startTime: 70, duration: 15, type: 'transient', description: 'Full throttle acceleration', parameters: { rpm: 5500, throttle: 1.0 } },
        { id: 'e5', name: 'Cooldown', startTime: 85, duration: 15, type: 'unload', description: 'Reduce load gradually', parameters: { rpm: 1500, throttle: 0.1 } }
    ]);
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(null);
    const [dragState, setDragState] = useState<{ eventId: string; type: 'move' | 'resize-start' | 'resize-end'; startX: number; originalTime: number } | null>(null);
    const timelineRef = useRef<HTMLDivElement>(null);

    const totalDuration = Math.max(100, events.reduce((max, e) => Math.max(max, e.startTime + e.duration), 0) + 20);

    const getEventColor = (type: TimelineEvent['type']) => {
        switch (type) {
            case 'load': return 'bg-amber-500';
            case 'steady': return 'bg-emerald-500';
            case 'transient': return 'bg-blue-500';
            case 'unload': return 'bg-orange-500';
            case 'rest': return 'bg-slate-500';
            default: return 'bg-slate-500';
        }
    };

    const getEventBorderColor = (type: TimelineEvent['type']) => {
        switch (type) {
            case 'load': return 'border-amber-400';
            case 'steady': return 'border-emerald-400';
            case 'transient': return 'border-blue-400';
            case 'unload': return 'border-orange-400';
            case 'rest': return 'border-slate-400';
            default: return 'border-slate-400';
        }
    };

    const handleMouseDown = useCallback((event: React.MouseEvent, eventId: string, action: 'move' | 'resize-start' | 'resize-end') => {
        if (!timelineRef.current) return;
        const rect = timelineRef.current.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const eventObj = events.find(e => e.id === eventId);
        if (!eventObj) return;

        setDragState({
            eventId,
            type: action,
            startX: x,
            originalTime: action === 'move' ? eventObj.startTime : action === 'resize-start' ? eventObj.startTime : eventObj.startTime + eventObj.duration
        });
    }, [events]);

    const handleMouseMove = useCallback((event: React.MouseEvent) => {
        if (!dragState || !timelineRef.current) return;
        const rect = timelineRef.current.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const deltaX = x - dragState.startX;
        const deltaTime = (deltaX / rect.width) * totalDuration;

        setEvents(prev => prev.map(e => {
            if (e.id !== dragState.eventId) return e;

            switch (dragState.type) {
                case 'move':
                    return { ...e, startTime: Math.max(0, Math.min(totalDuration - e.duration, dragState.originalTime + deltaTime)) };
                case 'resize-start':
                    const newStart = Math.max(0, Math.min(e.startTime + e.duration - 1, dragState.originalTime + deltaTime));
                    return { ...e, startTime: newStart, duration: e.duration + (e.startTime - newStart) };
                case 'resize-end':
                    return { ...e, duration: Math.max(1, (dragState.originalTime - e.startTime) + deltaTime) };
                default:
                    return e;
            }
        }));
    }, [dragState, totalDuration]);

    const handleMouseUp = useCallback(() => {
        setDragState(null);
    }, []);

    useEffect(() => {
        if (dragState) {
            window.addEventListener('mousemove', handleMouseMove as any);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove as any);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [dragState, handleMouseMove, handleMouseUp]);

    const addEvent = () => {
        const newEvent: TimelineEvent = {
            id: `e${Date.now()}`,
            name: 'New Event',
            startTime: events.length > 0 ? events[events.length - 1].startTime + events[events.length - 1].duration : 0,
            duration: 10,
            type: 'steady',
            description: 'Description'
        };
        setEvents([...events, newEvent]);
        setSelectedEventId(newEvent.id);
        setEditingEvent(newEvent);
        setIsEditing(true);
    };

    const deleteEvent = (id: string) => {
        setEvents(events.filter(e => e.id !== id));
        if (selectedEventId === id) setSelectedEventId(null);
    };

    const updateEvent = (updated: TimelineEvent) => {
        setEvents(events.map(e => e.id === updated.id ? updated : e));
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 w-[700px] bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
                <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm font-semibold text-slate-200">Mission Timeline</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Total: {formatTime(totalDuration)}</span>
                    <button onClick={addEvent} className="p-1 rounded hover:bg-slate-700 text-emerald-400">
                        <Plus className="w-4 h-4" />
                    </button>
                    {onClose && (
                        <button onClick={onClose} className="p-1 rounded hover:bg-slate-700 text-slate-400">
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            <div className="p-4">
                <div 
                    ref={timelineRef}
                    className="relative h-32 bg-slate-950 rounded border border-slate-800 overflow-hidden"
                >
                    <div className="absolute inset-0 flex">
                        {Array.from({ length: Math.ceil(totalDuration / 10) }).map((_, i) => (
                            <div 
                                key={i} 
                                className="flex-1 border-r border-slate-800/50"
                                style={{ minWidth: `${100 / Math.ceil(totalDuration / 10)}%` }}
                            >
                                <span className="text-[8px] text-slate-600 px-1">{formatTime(i * 10)}</span>
                            </div>
                        ))}
                    </div>

                    {events.map(event => {
                        const left = (event.startTime / totalDuration) * 100;
                        const width = (event.duration / totalDuration) * 100;
                        const isSelected = selectedEventId === event.id;

                        return (
                            <div
                                key={event.id}
                                className={`absolute top-8 h-16 rounded cursor-pointer transition-all ${getEventColor(event.type)} ${isSelected ? 'ring-2 ring-white' : ''} ${dragState?.eventId === event.id ? 'opacity-80' : ''}`}
                                style={{ left: `${left}%`, width: `${width}%` }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedEventId(event.id);
                                }}
                            >
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-xs font-medium text-white truncate px-2">{event.name}</span>
                                </div>

                                <div 
                                    className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20"
                                    onMouseDown={(e) => handleMouseDown(e, event.id, 'resize-start')}
                                />
                                <div 
                                    className="absolute top-0 bottom-0 left-0 right-0 cursor-move"
                                    onMouseDown={(e) => handleMouseDown(e, event.id, 'move')}
                                />
                                <div 
                                    className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20"
                                    onMouseDown={(e) => handleMouseDown(e, event.id, 'resize-end')}
                                />
                            </div>
                        );
                    })}
                </div>

                {selectedEventId && (() => {
                    const event = events.find(e => e.id === selectedEventId);
                    if (!event) return null;

                    return (
                        <div className="mt-4 p-3 bg-slate-800 rounded border border-slate-700">
                            {isEditing && editingEvent?.id === selectedEventId ? (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={editingEvent.name}
                                            onChange={(e) => setEditingEvent({ ...editingEvent, name: e.target.value })}
                                            className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white"
                                            placeholder="Event Name"
                                        />
                                        <select
                                            value={editingEvent.type}
                                            onChange={(e) => setEditingEvent({ ...editingEvent, type: e.target.value as any })}
                                            className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white"
                                        >
                                            <option value="load">Load</option>
                                            <option value="steady">Steady</option>
                                            <option value="transient">Transient</option>
                                            <option value="unload">Unload</option>
                                            <option value="rest">Rest</option>
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div>
                                            <label className="text-xs text-slate-400">Start (s)</label>
                                            <input
                                                type="number"
                                                value={editingEvent.startTime}
                                                onChange={(e) => setEditingEvent({ ...editingEvent, startTime: Number(e.target.value) })}
                                                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-400">Duration (s)</label>
                                            <input
                                                type="number"
                                                value={editingEvent.duration}
                                                onChange={(e) => setEditingEvent({ ...editingEvent, duration: Number(e.target.value) })}
                                                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-400">RPM</label>
                                            <input
                                                type="number"
                                                value={editingEvent.parameters?.rpm || 0}
                                                onChange={(e) => setEditingEvent({ ...editingEvent, parameters: { ...editingEvent.parameters, rpm: Number(e.target.value) } })}
                                                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-400">Description</label>
                                        <input
                                            type="text"
                                            value={editingEvent.description || ''}
                                            onChange={(e) => setEditingEvent({ ...editingEvent, description: e.target.value })}
                                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => {
                                                if (editingEvent) {
                                                    updateEvent(editingEvent);
                                                    setIsEditing(false);
                                                    setEditingEvent(null);
                                                }
                                            }}
                                            className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 rounded text-xs text-white"
                                        >
                                            <Save className="w-3 h-3" />
                                            Save
                                        </button>
                                        <button
                                            onClick={() => {
                                                setIsEditing(false);
                                                setEditingEvent(null);
                                            }}
                                            className="flex items-center gap-1 px-3 py-1 bg-slate-600 hover:bg-slate-500 rounded text-xs text-white"
                                        >
                                            <X className="w-3 h-3" />
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => deleteEvent(event.id)}
                                            className="flex items-center gap-1 px-3 py-1 bg-red-600 hover:bg-red-500 rounded text-xs text-white ml-auto"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-white">{event.name}</span>
                                            <span className={`px-2 py-0.5 rounded text-xs ${getEventColor(event.type)} text-white`}>{event.type}</span>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setEditingEvent(event);
                                                setIsEditing(true);
                                            }}
                                            className="p-1 hover:bg-slate-700 rounded text-slate-400"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-4 gap-4 text-sm text-slate-400">
                                        <div>
                                            <span className="text-xs">Start</span>
                                            <div className="text-white">{formatTime(event.startTime)}</div>
                                        </div>
                                        <div>
                                            <span className="text-xs">Duration</span>
                                            <div className="text-white">{event.duration}s</div>
                                        </div>
                                        <div>
                                            <span className="text-xs">End</span>
                                            <div className="text-white">{formatTime(event.startTime + event.duration)}</div>
                                        </div>
                                        <div>
                                            <span className="text-xs">RPM</span>
                                            <div className="text-white">{event.parameters?.rpm || 'N/A'}</div>
                                        </div>
                                    </div>
                                    {event.description && (
                                        <p className="mt-2 text-xs text-slate-500">{event.description}</p>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })()}

                <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-amber-500" />
                        <span>Load</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-emerald-500" />
                        <span>Steady</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-blue-500" />
                        <span>Transient</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-orange-500" />
                        <span>Unload</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-slate-500" />
                        <span>Rest</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
