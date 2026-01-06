/**
 * Performance Curve Visualization (SVG-based)
 * Lightweight charts for pump performance, efficiency maps, and system KPIs
 * No external chart library dependencies
 */

import React, { useMemo } from 'react';

export interface PumpCurveData {
  flow: number;        // m³/s
  head: number;        // m
  efficiency: number;  // %
  power: number;       // kW
}

export interface PerformanceCurveProps {
  componentId?: string;
  data?: PumpCurveData[];
  curveType?: 'head' | 'efficiency' | 'power' | 'all';
}

/**
 * Generate pump performance curve data from parameters
 */
export function generatePumpCurveData(
  Q_design: number,
  H_design: number,
  eta_BEP: number,
  power: number,
  N: number = 1450,
  points: number = 20
): PumpCurveData[] {
  const data: PumpCurveData[] = [];
  
  for (let i = 0; i <= points; i++) {
    const ratio = i / points;
    const flow = Q_design * (0.2 + ratio * 1.6);
    const head = H_design * (1.1 - 0.4 * ratio - 0.4 * ratio * ratio);
    const efficiency = eta_BEP * (1 - 0.6 * Math.pow(ratio - 0.5, 2));
    const pumpPower = (flow * head * 9810) / (efficiency / 100) / 1000;
    
    data.push({ flow: Number(flow.toFixed(4)), head: Number(head.toFixed(2)), efficiency: Number(efficiency.toFixed(1)), power: Number(pumpPower.toFixed(2)) });
  }
  
  return data;
}

interface SVGChartProps {
  width: number;
  height: number;
  data: { x: number; y: number; value?: number }[];
  color: string;
  xLabel: string;
  yLabel: string;
  xMin?: number;
  xMax?: number;
  yMin?: number;
  yMax?: number;
  showArea?: boolean;
  tooltip?: (point: { x: number; y: number }) => string;
}

/**
 * Generic SVG Line/Area Chart
 */
const SVGChart: React.FC<SVGChartProps> = ({
  width,
  height,
  data,
  color,
  xLabel,
  yLabel,
  xMin,
  xMax,
  yMin,
  yMax,
  showArea = false,
  tooltip
}) => {
  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  const xData = data.map(d => d.x);
  const yData = data.map(d => d.y);
  
  const xDomain = { min: xMin ?? Math.min(...xData), max: xMax ?? Math.max(...xData) };
  const yDomain = { min: yMin ?? Math.min(...yData), max: yMax ?? Math.max(...yData) };
  
  const xScale = (x: number) => padding.left + ((x - xDomain.min) / (xDomain.max - xDomain.min)) * chartWidth;
  const yScale = (y: number) => padding.top + chartHeight - ((y - yDomain.min) / (yDomain.max - yDomain.min)) * chartHeight;
  
  const points = data.map(d => `${xScale(d.x)},${yScale(d.y)}`).join(' ');
  const areaPoints = `${xScale(xDomain.min)},${yScale(yDomain.min)} ${points} ${xScale(xDomain.max)},${yScale(yDomain.min)}`;
  
  const [hoverPoint, setHoverPoint] = React.useState<{ x: number; y: number; value?: number } | null>(null);
  const [mousePos, setMousePos] = React.useState<{ x: number; y: number } | null>(null);
  
  return (
    <svg width={width} height={height} className="w-full" style={{ maxWidth: '100%', height: 'auto' }}>
      {/* Grid lines */}
      <g stroke="#374151" strokeWidth={0.5}>
        {/* Horizontal grid */}
        {[0, 0.25, 0.5, 0.75, 1].map(i => (
          <line
            key={`h-${i}`}
            x1={padding.left}
            y1={padding.top + chartHeight * i}
            x2={width - padding.right}
            y2={padding.top + chartHeight * i}
          />
        ))}
        {/* Vertical grid */}
        {[0, 0.25, 0.5, 0.75, 1].map(i => (
          <line
            key={`v-${i}`}
            x1={padding.left + chartWidth * i}
            y1={padding.top}
            x2={padding.left + chartWidth * i}
            y2={height - padding.bottom}
          />
        ))}
      </g>
      
      {/* Area */}
      {showArea && (
        <polygon
          points={areaPoints}
          fill={color}
          fillOpacity={0.2}
        />
      )}
      
      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={2}
      />
      
      {/* Data points */}
      {data.map((d, i) => (
        <circle
          key={i}
          cx={xScale(d.x)}
          cy={yScale(d.y)}
          r={3}
          fill={color}
          onMouseEnter={() => setHoverPoint(d)}
          onMouseLeave={() => setHoverPoint(null)}
          style={{ cursor: 'pointer' }}
        />
      ))}
      
      {/* X-axis labels */}
      <g fontSize={10} fill="#9CA3AF" textAnchor="middle">
        {[0, 0.25, 0.5, 0.75, 1].map(i => (
          <text
            key={i}
            x={padding.left + chartWidth * i}
            y={height - padding.bottom + 15}
          >
            {(xDomain.min + (xDomain.max - xDomain.min) * i).toFixed(1)}
          </text>
        ))}
      </g>
      <text x={width / 2} y={height - 5} fontSize={11} fill="#9CA3AF" textAnchor="middle">
        {xLabel}
      </text>
      
      {/* Y-axis labels */}
      <g fontSize={10} fill="#9CA3AF" textAnchor="end">
        {[0, 0.25, 0.5, 0.75, 1].map(i => (
          <text
            key={i}
            x={padding.left - 10}
            y={padding.top + chartHeight * i + 4}
          >
            {(yDomain.max - (yDomain.max - yDomain.min) * i).toFixed(1)}
          </text>
        ))}
      </g>
      <text transform={`rotate(-90)`} x={-height / 2} y={15} fontSize={11} fill="#9CA3AF" textAnchor="middle">
        {yLabel}
      </text>
      
      {/* Tooltip */}
      {hoverPoint && tooltip && (
        <g>
          <rect
            x={mousePos?.x ?? 10}
            y={mousePos?.y ?? 10}
            width={120}
            height={40}
            fill="#1F2937"
            stroke="#374151"
            rx={4}
          />
          <text x={(mousePos?.x || 10) + 10} y={(mousePos?.y || 10) + 20} fontSize={10} fill="#F9FAFB">
            {tooltip(hoverPoint)}
          </text>
        </g>
      )}
    </svg>
  );
};

/**
 * Pump Head Curve
 */
export const PumpHeadCurve: React.FC<PerformanceCurveProps> = ({ data }) => {
  if (!data || data.length === 0) return null;
  
  const chartData = data.map(d => ({ x: d.flow * 1000, y: d.head }));
  
  return (
    <div className="w-full">
      <h4 className="text-sm font-medium text-gray-300 mb-3">Head-Flow Curve</h4>
      <SVGChart
        width={500}
        height={250}
        data={chartData}
        color="#22D3EE"
        xLabel="Flow Rate (L/s)"
        yLabel="Head (m)"
        tooltip={d => `Flow: ${d.x.toFixed(1)} L/s, Head: ${d.y.toFixed(1)} m`}
      />
    </div>
  );
};

/**
 * Pump Efficiency Curve
 */
export const PumpEfficiencyCurve: React.FC<PerformanceCurveProps> = ({ data }) => {
  if (!data || data.length === 0) return null;
  
  const chartData = data.map(d => ({ x: d.flow * 1000, y: d.efficiency }));
  
  return (
    <div className="w-full">
      <h4 className="text-sm font-medium text-gray-300 mb-3">Efficiency Curve</h4>
      <SVGChart
        width={500}
        height={250}
        data={chartData}
        color="#A78BFA"
        xLabel="Flow Rate (L/s)"
        yLabel="Efficiency (%)"
        yMin={0}
        yMax={100}
        tooltip={d => `Flow: ${d.x.toFixed(1)} L/s, Eff: ${d.y.toFixed(1)}%`}
      />
    </div>
  );
};

/**
 * Pump Power Curve
 */
export const PumpPowerCurve: React.FC<PerformanceCurveProps> = ({ data }) => {
  if (!data || data.length === 0) return null;
  
  const chartData = data.map(d => ({ x: d.flow * 1000, y: d.power }));
  
  return (
    <div className="w-full">
      <h4 className="text-sm font-medium text-gray-300 mb-3">Power Curve</h4>
      <SVGChart
        width={500}
        height={250}
        data={chartData}
        color="#FBBF24"
        xLabel="Flow Rate (L/s)"
        yLabel="Power (kW)"
        showArea={true}
        tooltip={d => `Flow: ${d.x.toFixed(1)} L/s, Power: ${d.y.toFixed(2)} kW`}
      />
    </div>
  );
};

/**
 * Combined Pump Performance Curves
 */
export const PumpPerformanceChart: React.FC<PerformanceCurveProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 bg-gray-800/30 rounded-lg">
        <div className="text-center">
          <svg className="w-12 h-12 mx-auto mb-2 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-sm">No simulation data available</p>
          <p className="text-xs mt-1">Run a simulation to see performance curves</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <PumpHeadCurve data={data} />
      <PumpEfficiencyCurve data={data} />
      <PumpPowerCurve data={data} />
    </div>
  );
};

/**
 * System KPI Dashboard
 */
export interface SystemKPIs {
  totalPower: number;
  totalEfficiency: number;
  flowRate: number;
  pressureDrop: number;
  componentCount: number;
  connectionCount: number;
  simulationTime: number;
}

export interface KPIDashboardProps {
  kpis: SystemKPIs;
}

export const KPIDashboard: React.FC<KPIDashboardProps> = ({ kpis }) => {
  const kpiCards = [
    { label: 'Total Power', value: `${kpis.totalPower.toFixed(2)} kW`, color: 'cyan', icon: '⚡', desc: 'Sum of all power consumption' },
    { label: 'System Efficiency', value: `${kpis.totalEfficiency.toFixed(1)}%`, color: 'purple', icon: '📊', desc: 'Average component efficiency' },
    { label: 'Flow Rate', value: `${kpis.flowRate.toFixed(1)} L/s`, color: 'green', icon: '💧', desc: 'System fluid flow rate' },
    { label: 'Pressure Drop', value: `${kpis.pressureDrop.toFixed(1)} kPa`, color: 'orange', icon: '📈', desc: 'System pressure loss' },
    { label: 'Components', value: kpis.componentCount.toString(), color: 'blue', icon: '🔧', desc: 'Total components in system' },
    { label: 'Connections', value: kpis.connectionCount.toString(), color: 'pink', icon: '🔗', desc: 'Total connections' }
  ];
  
  const colorMap: Record<string, { border: string; bg: string; text: string }> = {
    cyan: { border: 'border-cyan-500', bg: 'bg-cyan-500/10', text: 'text-cyan-400' },
    purple: { border: 'border-purple-500', bg: 'bg-purple-500/10', text: 'text-purple-400' },
    green: { border: 'border-green-500', bg: 'bg-green-500/10', text: 'text-green-400' },
    orange: { border: 'border-orange-500', bg: 'bg-orange-500/10', text: 'text-orange-400' },
    blue: { border: 'border-blue-500', bg: 'bg-blue-500/10', text: 'text-blue-400' },
    pink: { border: 'border-pink-500', bg: 'bg-pink-500/10', text: 'text-pink-400' }
  };
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {kpiCards.map((kpi, idx) => {
        const colors = colorMap[kpi.color];
        return (
          <div
            key={idx}
            className={`p-4 rounded-lg border-l-4 ${colors.border} ${colors.bg} hover:scale-105 transition-transform cursor-help`}
            title={kpi.desc}
          >
            <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
              <span>{kpi.icon}</span>
              <span>{kpi.label}</span>
            </div>
            <div className={`text-2xl font-bold ${colors.text}`}>{kpi.value}</div>
          </div>
        );
      })}
    </div>
  );
};

/**
 * Calculate system KPIs from simulation results
 */
export function calculateSystemKPIs(
  simulationVariables: Record<string, number>,
  components: any[],
  connections: any[],
  simulationTime: number
): SystemKPIs {
  let totalPower = 0;
  let totalEfficiency = 0;
  let pumpCount = 0;
  
  components.forEach(comp => {
    const compVars = Object.entries(simulationVariables).filter(([key]) => key.startsWith(comp.id));
    
    compVars.forEach(([key, value]) => {
      if (key.includes('.power')) {
        totalPower += Math.abs(value);
        pumpCount++;
      }
      if (key.includes('.efficiency')) {
        totalEfficiency += value;
      }
    });
  });
  
  const avgEfficiency = pumpCount > 0 ? totalEfficiency / pumpCount : 0;
  
  const flowVars = Object.entries(simulationVariables).filter(([key]) => key.includes('.flow'));
  const totalFlow = flowVars.length > 0 ? flowVars[0][1] : 0;
  
  const pressureVars = Object.entries(simulationVariables).filter(([key]) => key.includes('.pressure'));
  let pressureDrop = 0;
  if (pressureVars.length >= 2) {
    const pressures = pressureVars.map(([_, val]) => val);
    pressureDrop = Math.abs(pressures[0] - pressures[pressures.length - 1]);
  }
  
  return {
    totalPower,
    totalEfficiency: avgEfficiency,
    flowRate: totalFlow,
    pressureDrop,
    componentCount: components.length,
    connectionCount: connections.length,
    simulationTime
  };
}
