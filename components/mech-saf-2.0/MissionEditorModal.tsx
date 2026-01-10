import React, { useState, useCallback } from 'react';
import { X, Plus, Trash2, Clock, Target, Zap, Settings, ChevronRight, ChevronDown, GripVertical, Play, Pause, RotateCcw } from 'lucide-react';
import { MissionEvent, MissionConstraint, MissionScenario, MissionSession } from '../../services/scenarios/types';

interface MissionEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    scenario?: MissionScenario;
    onSave: (scenario: Partial<MissionScenario>) => void;
}

type EventType = 'step' | 'ramp' | 'conditional' | 'periodic';

interface EventFormData {
    id: string;
    type: EventType;
    name: string;
    description: string;
    triggerTime: number;
    targetComponentId: string;
    targetParameter: string;
    value?: number;
    duration?: number;
    condition?: string;
    period?: number;
    maxRepeats?: number;
    color: string;
    icon: string;
}

const EVENT_COLORS: Record<EventType, string> = {
    step: '#22c55e',
    ramp: '#3b82f6',
    conditional: '#f59e0b',
    periodic: '#8b5cf6'
};

const EVENT_ICONS: Record<EventType, string> = {
    step: 'Target',
    ramp: 'Zap',
    conditional: 'Settings',
    periodic: 'Clock'
};

const INITIAL_EVENT_FORM: EventFormData = {
    id: '',
    type: 'step',
    name: '',
    description: '',
    triggerTime: 0,
    targetComponentId: '',
    targetParameter: '',
    value: undefined,
    duration: undefined,
    condition: '',
    period: undefined,
    maxRepeats: undefined,
    color: EVENT_COLORS.step,
    icon: 'Target'
};

export const MissionEditorModal: React.FC<MissionEditorModalProps> = ({
    isOpen,
    onClose,
    scenario,
    onSave
}) => {
    const [activeTab, setActiveTab] = useState<'events' | 'constraints' | 'scoring'>('events');
    const [events, setEvents] = useState<MissionEvent[]>(scenario?.events || []);
    const [constraints, setConstraints] = useState<MissionConstraint[]>(scenario?.constraints || []);
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
    const [editingEvent, setEditingEvent] = useState<EventFormData | null>(null);
    const [showEventForm, setShowEventForm] = useState(false);
    const [timeScale, setTimeScale] = useState(10); // pixels per second

    if (!isOpen) return null;

    const handleAddEvent = () => {
        const newEvent: EventFormData = {
            ...INITIAL_EVENT_FORM,
            id: `event_${Date.now()}`,
            name: `Event ${events.length + 1}`,
        };
        setEditingEvent(newEvent);
        setShowEventForm(true);
        setSelectedEventId(newEvent.id);
    };

    const handleEditEvent = (event: MissionEvent) => {
        setEditingEvent({
            ...event,
            id: event.id,
            type: event.type as EventType,
            color: EVENT_COLORS[event.type as EventType],
            icon: EVENT_ICONS[event.type as EventType]
        });
        setShowEventForm(true);
        setSelectedEventId(event.id);
    };

    const handleDeleteEvent = (eventId: string) => {
        setEvents(events.filter(e => e.id !== eventId));
        if (selectedEventId === eventId) {
            setSelectedEventId(null);
            setShowEventForm(false);
            setEditingEvent(null);
        }
    };

    const handleSaveEvent = (event: EventFormData) => {
        const missionEvent: MissionEvent = {
            id: event.id,
            type: event.type,
            name: event.name,
            description: event.description,
            triggerTime: event.triggerTime,
            targetComponentId: event.targetComponentId,
            targetParameter: event.targetParameter,
            value: event.value,
            duration: event.duration,
            condition: event.condition,
            period: event.period,
            maxRepeats: event.maxRepeats,
            color: EVENT_COLORS[event.type],
            icon: EVENT_ICONS[event.type]
        };

        const existingIndex = events.findIndex(e => e.id === event.id);
        if (existingIndex >= 0) {
            const updated = [...events];
            updated[existingIndex] = missionEvent;
            setEvents(updated);
        } else {
            setEvents([...events, missionEvent]);
        }

        setShowEventForm(false);
        setEditingEvent(null);
    };

    const handleCancelEdit = () => {
        setShowEventForm(false);
        setEditingEvent(null);
        setSelectedEventId(null);
    };

    const handleAddConstraint = () => {
        const newConstraint: MissionConstraint = {
            id: `constraint_${Date.now()}`,
            type: 'cost',
            name: 'New Constraint',
            operator: 'less_than',
            value: 1000,
            unit: 'USD',
            penalty: 50
        };
        setConstraints([...constraints, newConstraint]);
    };

    const handleUpdateConstraint = (constraint: MissionConstraint) => {
        setConstraints(constraints.map(c => c.id === constraint.id ? constraint : c));
    };

    const handleDeleteConstraint = (constraintId: string) => {
        setConstraints(constraints.filter(c => c.id !== constraintId));
    };

    const handleSave = () => {
        onSave({
            events,
            constraints,
            scoring: scenario?.scoring || {
                timeBonus: 10,
                efficiencyBonus: 50,
                budgetBonus: 30,
                perfectScore: 1000
            },
            grades: scenario?.grades || {
                platinum: 95,
                gold: 85,
                silver: 70,
                bronze: 50
            }
        });
        onClose();
    };

    const maxTime = Math.max(
        60,
        ...events.map(e => e.triggerTime + (e.duration || 0) + (e.period && e.maxRepeats ? e.period * e.maxRepeats : 0))
    );

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-6xl max-h-[85vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-800/50">
                    <div className="flex items-center gap-3">
                        <Clock className="w-6 h-6 text-cyan-400" />
                        <div>
                            <h2 className="text-lg font-bold text-white">Mission Editor</h2>
                            <p className="text-xs text-slate-400">
                                {scenario ? `Editing: ${scenario.title}` : 'Create a new mission'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleSave}
                            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                            Save Mission
                        </button>
                        <button onClick={onClose} className="text-slate-400 hover:text-white p-1.5 hover:bg-slate-700 rounded-lg transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="px-4 pt-3 border-b border-slate-700 flex gap-1">
                    {[
                        { id: 'events', label: 'Timeline Events', icon: Clock },
                        { id: 'constraints', label: 'Constraints', icon: Target },
                        { id: 'scoring', label: 'Scoring & Grading', icon: Zap }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
                                activeTab === tab.id
                                    ? 'bg-slate-800 text-cyan-400 border-t-2 border-cyan-400'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                            }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden flex">
                    {activeTab === 'events' && (
                        <div className="flex-1 flex overflow-hidden">
                            {/* Timeline Visualization */}
                            <div className="flex-1 p-4 overflow-auto">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-semibold text-white">Mission Timeline</h3>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-400">Zoom:</span>
                                        <button
                                            onClick={() => setTimeScale(Math.max(5, timeScale - 5))}
                                            className="p-1 bg-slate-700 rounded hover:bg-slate-600 text-slate-300"
                                        >
                                            <ChevronDown className="w-4 h-4" />
                                        </button>
                                        <span className="text-xs text-white w-8 text-center">{timeScale}px/s</span>
                                        <button
                                            onClick={() => setTimeScale(Math.min(50, timeScale + 5))}
                                            className="p-1 bg-slate-700 rounded hover:bg-slate-600 text-slate-300"
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Timeline Header */}
                                <div className="flex border-b border-slate-700 pb-2 mb-2">
                                    <div className="w-48 flex-shrink-0" />
                                    <div className="flex-1 relative h-6">
                                        {Array.from({ length: Math.ceil(maxTime / 10) + 1 }).map((_, i) => (
                                            <div
                                                key={i}
                                                className="absolute top-0 text-[10px] text-slate-500"
                                                style={{ left: `${(i * 10) / maxTime * 100}%` }}
                                            >
                                                {i * 10}s
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Timeline Track */}
                                <div className="relative h-32 bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
                                    {/* Time markers */}
                                    <div className="absolute inset-0 flex">
                                        {Array.from({ length: Math.ceil(maxTime / 5) + 1 }).map((_, i) => (
                                            <div
                                                key={i}
                                                className="flex-shrink-0 border-l border-slate-700 h-full"
                                                style={{ width: `${(5 / maxTime) * 100}%` }}
                                            />
                                        ))}
                                    </div>

                                    {/* Events */}
                                    {events.map((event, index) => {
                                        const left = (event.triggerTime / maxTime) * 100;
                                        const width = ((event.duration || (event.period && event.maxRepeats ? event.period * event.maxRepeats : 5)) / maxTime) * 100;
                                        const isSelected = selectedEventId === event.id;

                                        return (
                                            <div
                                                key={event.id}
                                                className={`absolute top-4 h-12 rounded-lg cursor-pointer transition-all ${
                                                    isSelected ? 'ring-2 ring-cyan-400 z-10' : 'hover:z-5'
                                                }`}
                                                style={{
                                                    left: `${left}%`,
                                                    width: `${Math.max(width, 2)}%`,
                                                    backgroundColor: EVENT_COLORS[event.type as EventType] + '40',
                                                    borderLeft: `3px solid ${EVENT_COLORS[event.type as EventType]}`
                                                }}
                                                onClick={() => handleEditEvent(event)}
                                            >
                                                <div className="px-2 py-1 overflow-hidden">
                                                    <div className="text-xs font-medium text-white truncate">
                                                        {event.name}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400">
                                                        {event.triggerTime}s
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Current time indicator placeholder */}
                                    <div className="absolute top-0 bottom-0 w-0.5 bg-cyan-500/50 dashed" style={{ left: '30%' }}>
                                        <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-cyan-500 rounded-full" />
                                    </div>
                                </div>

                                {/* Event List */}
                                <div className="mt-4 space-y-1">
                                    {events.length === 0 ? (
                                        <div className="text-center py-8 text-slate-500">
                                            <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                            <p className="text-sm">No events yet</p>
                                            <p className="text-xs">Click "Add Event" to create your first timeline event</p>
                                        </div>
                                    ) : (
                                        events.sort((a, b) => a.triggerTime - b.triggerTime).map(event => (
                                            <div
                                                key={event.id}
                                                onClick={() => handleEditEvent(event)}
                                                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                                                    selectedEventId === event.id
                                                        ? 'bg-cyan-500/20 border border-cyan-500/50'
                                                        : 'bg-slate-800/50 hover:bg-slate-700/50 border border-transparent'
                                                }`}
                                            >
                                                <GripVertical className="w-4 h-4 text-slate-500 cursor-grab" />
                                                <div
                                                    className="w-3 h-3 rounded-full"
                                                    style={{ backgroundColor: EVENT_COLORS[event.type as EventType] }}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-medium text-white truncate">{event.name}</div>
                                                    <div className="text-xs text-slate-400">
                                                        {event.type} @ {event.triggerTime}s
                                                    </div>
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    {event.targetComponentId ? `${event.targetComponentId}.${event.targetParameter}` : 'No target'}
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteEvent(event.id);
                                                    }}
                                                    className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Event Form Panel */}
                            {showEventForm && editingEvent && (
                                <div className="w-80 border-l border-slate-700 bg-slate-800/30 p-4 overflow-auto">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-sm font-semibold text-white">
                                            {events.find(e => e.id === editingEvent.id) ? 'Edit Event' : 'New Event'}
                                        </h3>
                                        <button
                                            onClick={handleCancelEdit}
                                            className="text-slate-400 hover:text-white"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        {/* Event Type */}
                                        <div>
                                            <label className="block text-xs font-medium text-slate-400 mb-1">Event Type</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {(['step', 'ramp', 'conditional', 'periodic'] as EventType[]).map(type => (
                                                    <button
                                                        key={type}
                                                        onClick={() => {
                                                            setEditingEvent({
                                                                ...editingEvent,
                                                                type,
                                                                color: EVENT_COLORS[type],
                                                                icon: EVENT_ICONS[type]
                                                            });
                                                        }}
                                                        className={`px-2 py-1.5 text-xs rounded border transition-colors ${
                                                            editingEvent.type === type
                                                                ? 'bg-slate-700 border-cyan-500 text-cyan-400'
                                                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                                                        }`}
                                                    >
                                                        {type.charAt(0).toUpperCase() + type.slice(1)}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Name */}
                                        <div>
                                            <label className="block text-xs font-medium text-slate-400 mb-1">Name</label>
                                            <input
                                                type="text"
                                                value={editingEvent.name}
                                                onChange={e => setEditingEvent({ ...editingEvent, name: e.target.value })}
                                                className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                                                placeholder="Event name"
                                            />
                                        </div>

                                        {/* Trigger Time */}
                                        <div>
                                            <label className="block text-xs font-medium text-slate-400 mb-1">Trigger Time (seconds)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="1"
                                                value={editingEvent.triggerTime}
                                                onChange={e => setEditingEvent({ ...editingEvent, triggerTime: Number(e.target.value) })}
                                                className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-white focus:outline-none focus:border-cyan-500"
                                            />
                                        </div>

                                        {/* Target Component */}
                                        <div>
                                            <label className="block text-xs font-medium text-slate-400 mb-1">Target Component ID</label>
                                            <input
                                                type="text"
                                                value={editingEvent.targetComponentId}
                                                onChange={e => setEditingEvent({ ...editingEvent, targetComponentId: e.target.value })}
                                                className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                                                placeholder="e.g., pump_1"
                                            />
                                        </div>

                                        {/* Target Parameter */}
                                        <div>
                                            <label className="block text-xs font-medium text-slate-400 mb-1">Target Parameter</label>
                                            <input
                                                type="text"
                                                value={editingEvent.targetParameter}
                                                onChange={e => setEditingEvent({ ...editingEvent, targetParameter: e.target.value })}
                                                className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                                                placeholder="e.g., speed"
                                            />
                                        </div>

                                        {/* Type-specific fields */}
                                        {(editingEvent.type === 'step' || editingEvent.type === 'ramp') && (
                                            <div>
                                                <label className="block text-xs font-medium text-slate-400 mb-1">
                                                    {editingEvent.type === 'step' ? 'Target Value' : 'End Value'}
                                                </label>
                                                <input
                                                    type="number"
                                                    value={editingEvent.value || ''}
                                                    onChange={e => setEditingEvent({ ...editingEvent, value: Number(e.target.value) })}
                                                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                                                    placeholder={editingEvent.type === 'step' ? 'New value' : 'Value to ramp to'}
                                                />
                                            </div>
                                        )}

                                        {editingEvent.type === 'ramp' && (
                                            <div>
                                                <label className="block text-xs font-medium text-slate-400 mb-1">Duration (seconds)</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={editingEvent.duration || ''}
                                                    onChange={e => setEditingEvent({ ...editingEvent, duration: Number(e.target.value) })}
                                                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                                                    placeholder="Transition time"
                                                />
                                            </div>
                                        )}

                                        {editingEvent.type === 'conditional' && (
                                            <div>
                                                <label className="block text-xs font-medium text-slate-400 mb-1">Condition</label>
                                                <input
                                                    type="text"
                                                    value={editingEvent.condition || ''}
                                                    onChange={e => setEditingEvent({ ...editingEvent, condition: e.target.value })}
                                                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                                                    placeholder="e.g., temperature > 100"
                                                />
                                            </div>
                                        )}

                                        {editingEvent.type === 'periodic' && (
                                            <>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Period (seconds)</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={editingEvent.period || ''}
                                                        onChange={e => setEditingEvent({ ...editingEvent, period: Number(e.target.value) })}
                                                        className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                                                        placeholder="Repeat interval"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-400 mb-1">Max Repeats</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={editingEvent.maxRepeats || ''}
                                                        onChange={e => setEditingEvent({ ...editingEvent, maxRepeats: Number(e.target.value) })}
                                                        className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                                                        placeholder="0 = infinite"
                                                    />
                                                </div>
                                            </>
                                        )}

                                        {/* Action Buttons */}
                                        <div className="pt-4 flex gap-2">
                                            <button
                                                onClick={handleCancelEdit}
                                                className="flex-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={() => handleSaveEvent(editingEvent)}
                                                className="flex-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded transition-colors"
                                            >
                                                Save Event
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Add Event Button (when not editing) */}
                            {!showEventForm && (
                                <div className="w-16 border-l border-slate-700 flex flex-col items-center pt-4 gap-2">
                                    <button
                                        onClick={handleAddEvent}
                                        className="w-10 h-10 bg-cyan-600 hover:bg-cyan-500 rounded-lg flex items-center justify-center text-white transition-colors"
                                        title="Add Event"
                                    >
                                        <Plus className="w-5 h-5" />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'constraints' && (
                        <div className="flex-1 p-4 overflow-auto">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-semibold text-white">Mission Constraints</h3>
                                <button
                                    onClick={handleAddConstraint}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium rounded transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Constraint
                                </button>
                            </div>

                            <div className="space-y-3">
                                {constraints.length === 0 ? (
                                    <div className="text-center py-12 text-slate-500">
                                        <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">No constraints defined</p>
                                        <p className="text-xs">Add constraints to define mission requirements</p>
                                    </div>
                                ) : (
                                    constraints.map(constraint => (
                                        <ConstraintEditor
                                            key={constraint.id}
                                            constraint={constraint}
                                            onUpdate={handleUpdateConstraint}
                                            onDelete={handleDeleteConstraint}
                                        />
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'scoring' && (
                        <div className="flex-1 p-4 overflow-auto">
                            <h3 className="text-sm font-semibold text-white mb-4">Scoring & Grading Configuration</h3>

                            <div className="grid grid-cols-2 gap-6">
                                {/* Scoring */}
                                <div className="space-y-4">
                                    <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider">Scoring Points</h4>

                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Time Bonus (points/second saved)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={scenario?.scoring?.timeBonus || 10}
                                            onChange={e => onSave({ scoring: { ...scenario?.scoring!, timeBonus: Number(e.target.value) } })}
                                            className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-white focus:outline-none focus:border-cyan-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Efficiency Bonus</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={scenario?.scoring?.efficiencyBonus || 50}
                                            onChange={e => onSave({ scoring: { ...scenario?.scoring!, efficiencyBonus: Number(e.target.value) } })}
                                            className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-white focus:outline-none focus:border-cyan-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Budget Bonus</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={scenario?.scoring?.budgetBonus || 30}
                                            onChange={e => onSave({ scoring: { ...scenario?.scoring!, budgetBonus: Number(e.target.value) } })}
                                            className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-white focus:outline-none focus:border-cyan-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Perfect Score</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={scenario?.scoring?.perfectScore || 1000}
                                            onChange={e => onSave({ scoring: { ...scenario?.scoring!, perfectScore: Number(e.target.value) } })}
                                            className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-white focus:outline-none focus:border-cyan-500"
                                        />
                                    </div>
                                </div>

                                {/* Grading Thresholds */}
                                <div className="space-y-4">
                                    <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider">Grade Thresholds (% of max)</h4>

                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">
                                            <span className="text-purple-400">Platinum</span> threshold
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={scenario?.grades?.platinum || 95}
                                            onChange={e => onSave({ grades: { ...scenario?.grades!, platinum: Number(e.target.value) } })}
                                            className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-white focus:outline-none focus:border-purple-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">
                                            <span className="text-amber-400">Gold</span> threshold
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={scenario?.grades?.gold || 85}
                                            onChange={e => onSave({ grades: { ...scenario?.grades!, gold: Number(e.target.value) } })}
                                            className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-white focus:outline-none focus:border-amber-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">
                                            <span className="text-slate-300">Silver</span> threshold
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={scenario?.grades?.silver || 70}
                                            onChange={e => onSave({ grades: { ...scenario?.grades!, silver: Number(e.target.value) } })}
                                            className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-white focus:outline-none focus:border-slate-400"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">
                                            <span className="text-orange-400">Bronze</span> threshold
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={scenario?.grades?.bronze || 50}
                                            onChange={e => onSave({ grades: { ...scenario?.grades!, bronze: Number(e.target.value) } })}
                                            className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-white focus:outline-none focus:border-orange-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Preview */}
                            <div className="mt-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                                <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Grade Preview</h4>
                                <div className="flex gap-2">
                                    {[
                                        { grade: 'Platinum', threshold: scenario?.grades?.platinum || 95, color: 'bg-purple-500' },
                                        { grade: 'Gold', threshold: scenario?.grades?.gold || 85, color: 'bg-amber-500' },
                                        { grade: 'Silver', threshold: scenario?.grades?.silver || 70, color: 'bg-slate-400' },
                                        { grade: 'Bronze', threshold: scenario?.grades?.bronze || 50, color: 'bg-orange-600' }
                                    ].map((item, i, arr) => (
                                        <div key={item.grade} className="flex-1 text-center">
                                            <div className={`w-full h-2 rounded-t ${item.color} opacity-80`} />
                                            <div className="text-xs text-white mt-1">{item.grade}</div>
                                            <div className="text-[10px] text-slate-500">≥{item.threshold}%</div>
                                            {i < arr.length - 1 && (
                                                <div className="text-[10px] text-slate-600 mt-0.5">to {arr[i + 1].threshold}%</div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

interface ConstraintEditorProps {
    constraint: MissionConstraint;
    onUpdate: (c: MissionConstraint) => void;
    onDelete: (id: string) => void;
}

const ConstraintEditor: React.FC<ConstraintEditorProps> = ({ constraint, onUpdate, onDelete }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    return (
        <div className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
            <div
                className="flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-700/50"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <button className="text-slate-400">
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white">{constraint.name}</div>
                    <div className="text-xs text-slate-400">
                        {constraint.value} {constraint.unit} {constraint.operator.replace('_', ' ')}
                    </div>
                </div>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(constraint.id);
                    }}
                    className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

            {isExpanded && (
                <div className="p-3 pt-0 border-t border-slate-700/50 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Type</label>
                            <select
                                value={constraint.type}
                                onChange={e => onUpdate({ ...constraint, type: e.target.value as any })}
                                className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white"
                            >
                                <option value="cost">Cost</option>
                                <option value="weight">Weight</option>
                                <option value="size">Size</option>
                                <option value="efficiency">Efficiency</option>
                                <option value="emissions">Emissions</option>
                                <option value="power">Power</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Operator</label>
                            <select
                                value={constraint.operator}
                                onChange={e => onUpdate({ ...constraint, operator: e.target.value as any })}
                                className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white"
                            >
                                <option value="less_than">Less than</option>
                                <option value="greater_than">Greater than</option>
                                <option value="equals">Equals</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Value</label>
                            <input
                                type="number"
                                value={constraint.value}
                                onChange={e => onUpdate({ ...constraint, value: Number(e.target.value) })}
                                className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Unit</label>
                            <input
                                type="text"
                                value={constraint.unit}
                                onChange={e => onUpdate({ ...constraint, unit: e.target.value })}
                                className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Penalty</label>
                            <input
                                type="number"
                                min="0"
                                value={constraint.penalty || 0}
                                onChange={e => onUpdate({ ...constraint, penalty: Number(e.target.value) })}
                                className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
