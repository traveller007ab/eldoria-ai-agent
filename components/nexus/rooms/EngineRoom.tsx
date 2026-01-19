/**
 * EngineRoom - Focus Mode for SAF Blueprints
 * 
 * A distraction-free simulation environment that wraps
 * the existing MechLabLayout with minimal chrome.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, Settings2, Gauge, Zap } from 'lucide-react';
import { useNexusStore } from '../../../stores/useNexusStore';
import { MechLabLayout } from '../../mech-saf-2.0/MechLabLayout';
import { useMechStore } from '../../../stores/useMechStore';
import { ProjectService } from '../../../services/ProjectService';


interface EngineRoomProps {
    nodeId: string;
}

export const EngineRoom: React.FC<EngineRoomProps> = ({ nodeId }) => {
    const node = useNexusStore((state) => state.nodes.find((n) => n.id === nodeId));
    const setBlueprint = useMechStore((state) => state.setBlueprint);

    React.useEffect(() => {
        if (node?.data?.id) {
            const blueprint = ProjectService.loadBlueprint(node.data.id);
            if (blueprint) {
                setBlueprint(blueprint);
            }
        }
    }, [node?.data?.id, setBlueprint]);

    if (!node) return null;

    return (
        <div className="h-full w-full bg-slate-950 flex flex-col">
            <div className="flex-1 overflow-hidden">
                <MechLabLayout hideHeader />
            </div>

            {/* Context bar (Nexus specific) */}
            <div className="h-10 bg-slate-900 border-t border-slate-800 flex items-center px-4 justify-between">
                <div className="text-xs text-slate-500 uppercase tracking-widest font-bold">
                    Focus Mode: {node.data.name}
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-600">
                    <Zap className="w-3 h-3" />
                    SIMULATION KERNEL V3.0 ACTIVE
                </div>
            </div>
        </div>
    );
};

// Metric Card Component
const MetricCard: React.FC<{
    label: string;
    value: string;
    unit: string;
    color: 'cyan' | 'emerald' | 'amber' | 'purple'
}> = ({ label, value, unit, color }) => {
    const colorMap = {
        cyan: 'text-cyan-400',
        emerald: 'text-emerald-400',
        amber: 'text-amber-400',
        purple: 'text-purple-400',
    };

    return (
        <div className="bg-slate-800/50 rounded-xl p-3">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{label}</p>
            <div className="flex items-baseline gap-1">
                <span className={`text-2xl font-bold ${colorMap[color]}`}>{value}</span>
                <span className="text-xs text-slate-500">{unit}</span>
            </div>
        </div>
    );
};

export default EngineRoom;
