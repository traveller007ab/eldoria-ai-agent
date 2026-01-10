import React, { useMemo, useState } from 'react';

interface TimePlotProps {
    timePoints: number[];
    data: number[];
    color?: string;
    height?: number;
    label?: string;
    unit?: string;
}

export const TimePlot: React.FC<TimePlotProps> = ({
    timePoints,
    data,
    color = '#22d3ee',
    height = 100,
    label,
    unit
}) => {
    const [hoverValue, setHoverValue] = useState<{ t: number, v: number } | null>(null);

    const points = useMemo(() => {
        if (!timePoints.length || !data.length) return '';

        const minT = Math.min(...timePoints);
        const maxT = Math.max(...timePoints);
        const minV = Math.min(...data);
        const maxV = Math.max(...data);

        // Add 10% padding to Y range
        const rangeV = maxV - minV || 1;
        const paddedMinV = minV - rangeV * 0.1;
        const paddedMaxV = maxV + rangeV * 0.1;
        const paddedRangeV = paddedMaxV - paddedMinV || 1; // Avoid div by zero

        const timeRange = maxT - minT || 1; // Avoid div by zero

        return timePoints.map((t, i) => {
            const x = ((t - minT) / timeRange) * 100;
            const y = 100 - ((data[i] - paddedMinV) / paddedRangeV) * 100;
            return `${x},${y}`;
        }).join(' ');
    }, [timePoints, data]);

    const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const width = rect.width;

        // Find closest point
        const index = Math.min(
            Math.max(0, Math.floor((x / width) * timePoints.length)),
            timePoints.length - 1
        );

        setHoverValue({
            t: timePoints[index],
            v: data[index]
        });
    };

    const handleMouseLeave = () => setHoverValue(null);

    if (!timePoints.length) return <div className="text-xs text-slate-500">No data</div>;

    return (
        <div className="w-full relative group">
            {label && (
                <div className="flex justify-between items-end mb-1 px-1">
                    <span className="text-xs font-semibold text-slate-400">{label}</span>
                    <span className="text-xs font-mono text-cyan-400">
                        {hoverValue ? hoverValue.v.toFixed(2) : data[data.length - 1].toFixed(2)} {unit}
                    </span>
                </div>
            )}

            <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="w-full bg-slate-900/50 rounded border border-slate-700/50 overflow-visible"
                style={{ height }}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
            >
                {/* Grid lines */}
                <line x1="0" y1="25" x2="100" y2="25" stroke="#334155" strokeWidth="0.5" strokeDasharray="2" />
                <line x1="0" y1="50" x2="100" y2="50" stroke="#334155" strokeWidth="0.5" strokeDasharray="2" />
                <line x1="0" y1="75" x2="100" y2="75" stroke="#334155" strokeWidth="0.5" strokeDasharray="2" />

                {/* The Sparkline */}
                <polyline
                    points={points}
                    fill="none"
                    stroke={color}
                    strokeWidth="1.5"
                    vectorEffect="non-scaling-stroke"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                />

                {/* Hover Indicator */}
                {hoverValue && (
                    <line
                        x1={((hoverValue.t - timePoints[0]) / (timePoints[timePoints.length - 1] - timePoints[0])) * 100}
                        y1="0"
                        x2={((hoverValue.t - timePoints[0]) / (timePoints[timePoints.length - 1] - timePoints[0])) * 100}
                        y2="100"
                        stroke="white"
                        strokeWidth="1"
                        vectorEffect="non-scaling-stroke"
                        strokeDasharray="4"
                        className="opacity-50"
                    />
                )}
            </svg>
        </div>
    );
};
