import React, { useMemo } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, ReferenceLine, ReferenceArea
} from 'recharts';
import { ParametricEngineModel, CurvePoint, CurveAnalysis } from '../../services/physics/engines/ParametricEngineModel';
import { EngineGeometry, FuelProperties, IntakeConfig } from '../../services/physics/engines/types';
import { Activity, Zap, Gauge, Flame, AlertTriangle } from 'lucide-react';

interface DynoGraphProps {
    geometry: EngineGeometry;
    fuel: FuelProperties;
    intake: IntakeConfig;
    redlineRpm?: number;
}

export const DynoGraph: React.FC<DynoGraphProps> = ({
    geometry,
    fuel,
    intake,
    redlineRpm = 7000
}) => {
    // Memoize curve calculation for performance
    const { curveData, analysis, knockStartRpm } = useMemo(() => {
        const engine = new ParametricEngineModel(geometry, fuel, intake);
        const curve = engine.calculateCurve(1000, 8000, 250, 1.0);
        const analysis = engine.analyzeCurve(curve);

        // Find where knock starts (knock_index > 0)
        const knockStart = curve.find(pt => pt.knock_index > 0.1);

        // Add indicated (theoretical) power for friction visualization
        // Indicated Power = Brake Power / (1 - friction_loss)
        // Friction loss is roughly 10-25% depending on RPM
        const enhancedCurve = curve.map(pt => {
            const frictionPct = 0.10 + (pt.rpm / 8000) * 0.15; // 10% at idle, 25% at redline
            const indicatedPower = pt.power_kw / (1 - frictionPct);
            return {
                ...pt,
                power_indicated_kw: indicatedPower,
                friction_loss_kw: indicatedPower - pt.power_kw
            };
        });

        return {
            curveData: enhancedCurve,
            analysis,
            knockStartRpm: knockStart?.rpm || 9000
        };
    }, [geometry, fuel, intake]);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload || !payload.length) return null;

        const data = payload[0]?.payload;
        return (
            <div className="bg-slate-900/95 border border-slate-600 rounded-lg p-3 shadow-xl backdrop-blur-sm">
                <div className="text-xs font-bold text-cyan-400 mb-2 border-b border-slate-700 pb-1">{label} RPM</div>
                <div className="space-y-1 text-xs">
                    <div className="flex justify-between gap-4">
                        <span className="text-emerald-400">Torque:</span>
                        <span className="font-mono text-white">{data?.torque_nm?.toFixed(1)} Nm</span>
                    </div>
                    <div className="flex justify-between gap-4">
                        <span className="text-amber-400">Brake Power:</span>
                        <span className="font-mono text-white">{data?.power_kw?.toFixed(1)} kW</span>
                    </div>
                    <div className="flex justify-between gap-4">
                        <span className="text-amber-600/60">Indicated Power:</span>
                        <span className="font-mono text-slate-400">{data?.power_indicated_kw?.toFixed(1)} kW</span>
                    </div>
                    <div className="flex justify-between gap-4 border-t border-slate-700 pt-1 mt-1">
                        <span className="text-slate-400">Efficiency:</span>
                        <span className="font-mono text-white">{(data?.efficiency * 100)?.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between gap-4">
                        <span className="text-slate-400">BSFC:</span>
                        <span className="font-mono text-white">{data?.bsfc?.toFixed(0)} g/kWh</span>
                    </div>
                    <div className="flex justify-between gap-4">
                        <span className="text-slate-400">MAP:</span>
                        <span className="font-mono text-white">{data?.map_kpa?.toFixed(0)} kPa</span>
                    </div>
                    {data?.knock_index > 0 && (
                        <div className="flex justify-between gap-4 text-red-400 border-t border-red-900/30 pt-1 mt-1">
                            <span>⚠️ Knock Index:</span>
                            <span className="font-mono">{data?.knock_index?.toFixed(2)}</span>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
            {/* Header */}
            <div className="p-3 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm font-semibold text-white">Live Dynamometer</span>
                </div>
                <div className="flex items-center gap-3 text-[10px]">
                    <span className="flex items-center gap-1 text-emerald-400">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" /> Torque
                    </span>
                    <span className="flex items-center gap-1 text-amber-400">
                        <div className="w-2 h-2 rounded-full bg-amber-500" /> Power
                    </span>
                    <span className="flex items-center gap-1 text-amber-400/40">
                        <div className="w-3 h-0.5 bg-amber-500/40 border-dashed" style={{ borderStyle: 'dashed' }} /> Indicated
                    </span>
                </div>
            </div>

            {/* Chart */}
            <div className="h-48 p-2">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={curveData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />

                        {/* Knock Zone */}
                        {knockStartRpm < 8000 && (
                            <ReferenceArea
                                x1={knockStartRpm}
                                x2={8000}
                                fill="#ef4444"
                                fillOpacity={0.15}
                                label={{ value: '⚠️ KNOCK', fill: '#ef4444', fontSize: 10, position: 'insideTopRight' }}
                            />
                        )}

                        {/* Redline */}
                        <ReferenceLine
                            x={redlineRpm}
                            stroke="#ef4444"
                            strokeDasharray="3 3"
                            strokeWidth={2}
                            label={{ value: 'REDLINE', fill: '#ef4444', fontSize: 9 }}
                        />

                        <XAxis
                            dataKey="rpm"
                            tick={{ fill: '#94a3b8', fontSize: 10 }}
                            tickFormatter={(v) => `${v / 1000}k`}
                            axisLine={{ stroke: '#475569' }}
                        />
                        <YAxis
                            yAxisId="torque"
                            tick={{ fill: '#10b981', fontSize: 10 }}
                            tickFormatter={(v) => `${v}`}
                            axisLine={{ stroke: '#10b981' }}
                            label={{ value: 'Nm', angle: -90, position: 'insideLeft', fill: '#10b981', fontSize: 10 }}
                        />
                        <YAxis
                            yAxisId="power"
                            orientation="right"
                            tick={{ fill: '#f59e0b', fontSize: 10 }}
                            axisLine={{ stroke: '#f59e0b' }}
                            label={{ value: 'kW', angle: 90, position: 'insideRight', fill: '#f59e0b', fontSize: 10 }}
                        />

                        <Tooltip content={<CustomTooltip />} />

                        {/* Torque Curve */}
                        <Line
                            yAxisId="torque"
                            type="monotone"
                            dataKey="torque_nm"
                            stroke="#10b981"
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 4, fill: '#10b981' }}
                        />

                        {/* Power Curve (Brake) */}
                        <Line
                            yAxisId="power"
                            type="monotone"
                            dataKey="power_kw"
                            stroke="#f59e0b"
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 4, fill: '#f59e0b' }}
                            name="Brake Power"
                        />

                        {/* Indicated Power Curve (Theoretical - shows friction loss) */}
                        <Line
                            yAxisId="power"
                            type="monotone"
                            dataKey="power_indicated_kw"
                            stroke="#f59e0b"
                            strokeWidth={1}
                            strokeDasharray="4 4"
                            strokeOpacity={0.4}
                            dot={false}
                            name="Indicated Power"
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Metrics Footer */}
            <div className="p-3 border-t border-slate-700 bg-slate-800/30 grid grid-cols-4 gap-2">
                <MetricBadge
                    icon={<Gauge className="w-3 h-3" />}
                    label="Peak Torque"
                    value={`${analysis.peakTorque.value.toFixed(0)} Nm`}
                    sub={`@ ${analysis.peakTorque.rpm} RPM`}
                    color="emerald"
                />
                <MetricBadge
                    icon={<Zap className="w-3 h-3" />}
                    label="Peak Power"
                    value={`${analysis.peakPower.value.toFixed(0)} kW`}
                    sub={`@ ${analysis.peakPower.rpm} RPM`}
                    color="amber"
                />
                <MetricBadge
                    icon={<Flame className="w-3 h-3" />}
                    label="Efficiency"
                    value={`${(curveData[Math.floor(curveData.length / 2)]?.efficiency * 100 || 0).toFixed(1)}%`}
                    sub="@ mid-range"
                    color="cyan"
                />
                <MetricBadge
                    icon={<AlertTriangle className="w-3 h-3" />}
                    label="Knock Risk"
                    value={knockStartRpm < 8000 ? 'MEDIUM' : 'LOW'}
                    sub={knockStartRpm < 8000 ? `> ${knockStartRpm} RPM` : 'Safe'}
                    color={knockStartRpm < 8000 ? 'red' : 'green'}
                />
            </div>
        </div>
    );
};

const MetricBadge: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: string;
    sub: string;
    color: 'emerald' | 'amber' | 'cyan' | 'red' | 'green';
}> = ({ icon, label, value, sub, color }) => {
    const colorMap = {
        emerald: 'text-emerald-400',
        amber: 'text-amber-400',
        cyan: 'text-cyan-400',
        red: 'text-red-400',
        green: 'text-green-400'
    };

    return (
        <div className="text-center">
            <div className={`flex items-center justify-center gap-1 text-[10px] ${colorMap[color]} mb-0.5`}>
                {icon} {label}
            </div>
            <div className="text-sm font-bold text-white">{value}</div>
            <div className="text-[9px] text-slate-500">{sub}</div>
        </div>
    );
};
