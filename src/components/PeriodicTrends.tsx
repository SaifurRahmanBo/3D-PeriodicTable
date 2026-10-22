import React, { useState, useMemo, useRef, useCallback } from 'react';
import { ELEMENTS, ElementData, CATEGORY_COLORS, CATEGORY_LABELS } from '../data/elements';
import { soundEngine } from '../utils/audio';
import { TrendingUp, Info, ArrowRight, Atom } from 'lucide-react';

interface PeriodicTrendsProps {
  onSelectElement: (el: ElementData) => void;
  selectedElement: ElementData;
}

type TrendMetric = 'electronegativity' | 'atomicRadius' | 'ionizationEnergy' | 'density' | 'meltingPoint';

interface MetricConfig {
  key: TrendMetric;
  label: string;
  unit: string;
  description: string;
  format: (val: number) => string;
}

const METRICS: MetricConfig[] = [
  {
    key: 'electronegativity',
    label: 'Electronegativity',
    unit: 'Pauling',
    description: 'Tendency of an atom to attract shared electrons in chemical bonds. Increases across a period, decreases down a group.',
    format: (v) => v.toFixed(2),
  },
  {
    key: 'atomicRadius',
    label: 'Atomic Radius',
    unit: 'pm',
    description: 'Distance from nucleus to outermost stable electron orbital. Decreases across a period due to increasing nuclear charge.',
    format: (v) => `${Math.round(v)} pm`,
  },
  {
    key: 'ionizationEnergy',
    label: '1st Ionization Energy',
    unit: 'kJ/mol',
    description: 'Energy required to remove the outermost valence electron. Peaks at noble gases with stable octets.',
    format: (v) => `${Math.round(v)} kJ/mol`,
  },
  {
    key: 'density',
    label: 'Density at STP',
    unit: 'g/cm³',
    description: 'Mass per unit volume. Peaks heavily in Period 6 platinum group metals (Osmium and Iridium).',
    format: (v) => `${v.toFixed(2)} g/cm³`,
  },
  {
    key: 'meltingPoint',
    label: 'Melting Point',
    unit: '°C',
    description: 'Thermal transition from solid to liquid lattice. Peaks at Tungsten (W) and Carbon (C).',
    format: (v) => `${Math.round(v)} °C`,
  },
];

export const PeriodicTrends: React.FC<PeriodicTrendsProps> = ({
  onSelectElement,
  selectedElement,
}) => {
  const [activeMetric, setActiveMetric] = useState<TrendMetric>('electronegativity');
  const [hoveredData, setHoveredData] = useState<{
    element: ElementData;
    value: number;
    cursorSvgX: number;
    pointSvgX: number;
    pointSvgY: number;
  } | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);

  const currentMetric = useMemo(
    () => METRICS.find((m) => m.key === activeMetric) || METRICS[0],
    [activeMetric]
  );

  // Extract valid points for the active metric
  const points = useMemo(() => {
    return ELEMENTS.map((el) => {
      const raw = el[activeMetric];
      const val = typeof raw === 'number' ? raw : null;
      return { element: el, value: val };
    }).filter((p): p is { element: ElementData; value: number } => p.value !== null);
  }, [activeMetric]);

  // Fast O(1) Map by atomic number
  const pointMap = useMemo(() => {
    const map = new Map<number, { element: ElementData; value: number }>();
    points.forEach((p) => map.set(p.element.number, p));
    return map;
  }, [points]);

  const { minVal, maxVal } = useMemo(() => {
    if (points.length === 0) return { minVal: 0, maxVal: 100 };
    let min = points[0].value;
    let max = points[0].value;
    points.forEach((p) => {
      if (p.value < min) min = p.value;
      if (p.value > max) max = p.value;
    });
    return { minVal: min, maxVal: max };
  }, [points]);

  // Chart dimensions
  const svgWidth = 880;
  const svgHeight = 280;
  const paddingLeft = 65;
  const paddingRight = 35;
  const paddingTop = 30;
  const paddingBottom = 40;

  const chartW = svgWidth - paddingLeft - paddingRight;
  const chartH = svgHeight - paddingTop - paddingBottom;

  const getCoordinates = useCallback(
    (atomicNum: number, val: number) => {
      const x = paddingLeft + ((atomicNum - 1) / 117) * chartW;
      const norm = (val - minVal) / (maxVal - minVal || 1);
      const y = paddingTop + chartH - norm * chartH;
      return { x, y };
    },
    [chartW, chartH, minVal, maxVal, paddingLeft, paddingTop]
  );

  // Pre-calculate polyline path
  const pathData = useMemo(() => {
    if (points.length === 0) return '';
    return points
      .map((p, idx) => {
        const { x, y } = getCoordinates(p.element.number, p.value);
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }, [points, getCoordinates]);

  // ULTRA-FAST, ZERO-LATENCY POINTER TRACKING
  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg || points.length === 0) return;

    // Fast calculation without layout thrashing
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0) return;

    const relX = e.clientX - rect.left;
    const svgX = (relX / rect.width) * svgWidth;

    const clampedSvgX = Math.max(paddingLeft, Math.min(svgWidth - paddingRight, svgX));

    // Direct O(1) mapping from continuous cursor position to atomic number
    const progress = (clampedSvgX - paddingLeft) / chartW;
    const targetZ = Math.max(1, Math.min(118, Math.round(1 + progress * 117)));

    // Look up matching or closest point
    let target = pointMap.get(targetZ);
    if (!target) {
      // Find nearest neighbor in points if targetZ is missing this metric
      let minDiff = Infinity;
      for (let i = 0; i < points.length; i++) {
        const diff = Math.abs(points[i].element.number - targetZ);
        if (diff < minDiff) {
          minDiff = diff;
          target = points[i];
        }
      }
    }

    if (target) {
      const coords = getCoordinates(target.element.number, target.value);
      setHoveredData({
        element: target.element,
        value: target.value,
        cursorSvgX: clampedSvgX, // Line stays locked directly under cursor
        pointSvgX: coords.x,
        pointSvgY: coords.y,
      });
    }
  };

  const handlePointerLeave = () => {
    setHoveredData(null);
  };

  const handleChartClick = () => {
    const target = hoveredData?.element || selectedElement;
    soundEngine.playElementChime(target.number);
    onSelectElement(target);
  };

  // Active display element: hovered element or currently selected element
  const activeElement = hoveredData ? hoveredData.element : selectedElement;
  const activeValue = hoveredData
    ? hoveredData.value
    : selectedElement[activeMetric] !== null && typeof selectedElement[activeMetric] === 'number'
    ? (selectedElement[activeMetric] as number)
    : null;

  const activeCatStyle = CATEGORY_COLORS[activeElement.category];

  return (
    <div className="w-full rounded-xl bg-slate-950/90 border border-slate-800/90 p-5 shadow-2xl flex flex-col gap-4">
      {/* Header and Metric Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            <span>Periodic Trends Across Atomic Number (Z)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">{currentMetric.description}</p>
        </div>

        {/* Metric selection buttons */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-900 border border-slate-800 flex-wrap">
          {METRICS.map((m) => (
            <button
              key={m.key}
              onClick={() => {
                soundEngine.playClick(1100);
                setActiveMetric(m.key);
                setHoveredData(null);
              }}
              className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                activeMetric === m.key
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Graph Stage */}
      <div className="relative w-full overflow-hidden select-none">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          onClick={handleChartClick}
          className="w-full h-[280px] cursor-crosshair block overflow-visible"
        >
          {/* Background Canvas Surface */}
          <rect
            x={paddingLeft}
            y={paddingTop}
            width={chartW}
            height={chartH}
            fill="#090d16"
            rx={6}
            pointerEvents="none"
          />

          {/* Horizontal Value Grid Lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
            const y = paddingTop + chartH * (1 - pct);
            const val = minVal + pct * (maxVal - minVal);
            return (
              <g key={idx} pointerEvents="none">
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={svgWidth - paddingRight}
                  y2={y}
                  stroke="#1e293b"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingLeft - 10}
                  y={y + 3.5}
                  textAnchor="end"
                  className="fill-slate-500 font-mono text-[10px]"
                >
                  {val.toFixed(val > 100 ? 0 : 1)}
                </text>
              </g>
            );
          })}

          {/* Period Demarcation Lines (End of Periods 1 to 7) */}
          {[2, 10, 18, 36, 54, 86, 118].map((z) => {
            const { x } = getCoordinates(z, minVal);
            return (
              <g key={z} pointerEvents="none">
                <line
                  x1={x}
                  y1={paddingTop}
                  x2={x}
                  y2={paddingTop + chartH}
                  stroke="#334155"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                <text
                  x={x}
                  y={svgHeight - 12}
                  textAnchor="middle"
                  className="fill-slate-400 font-mono text-[9px]"
                >
                  Z={z}
                </text>
              </g>
            );
          })}

          {/* Continuous Glowing Trend Curve */}
          <path
            d={pathData}
            fill="none"
            stroke="#06b6d4"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            pointerEvents="none"
            className="filter drop-shadow-[0_0_8px_rgba(6,182,212,0.45)]"
          />

          {/* Selected Element Static Indicator */}
          {(() => {
            const selPt = pointMap.get(selectedElement.number);
            if (!selPt) return null;
            const coords = getCoordinates(selPt.element.number, selPt.value);
            return (
              <g pointerEvents="none">
                <circle
                  cx={coords.x}
                  cy={coords.y}
                  r={8}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2"
                  strokeDasharray="2 2"
                />
                <line
                  x1={coords.x}
                  y1={paddingTop}
                  x2={coords.x}
                  y2={paddingTop + chartH}
                  stroke="#38bdf8"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                  opacity={0.4}
                />
              </g>
            );
          })()}

          {/* DYNAMIC CURSOR TRACKER (Stays locked directly with the cursor) */}
          {hoveredData && (
            <g pointerEvents="none">
              {/* Vertical Guide Line locked exactly to cursor position */}
              <line
                x1={hoveredData.cursorSvgX}
                y1={paddingTop}
                x2={hoveredData.cursorSvgX}
                y2={paddingTop + chartH}
                stroke="#22d3ee"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />

              {/* Horizontal line to point on curve */}
              <line
                x1={paddingLeft}
                y1={hoveredData.pointSvgY}
                x2={hoveredData.pointSvgX}
                y2={hoveredData.pointSvgY}
                stroke="#06b6d4"
                strokeWidth="1"
                strokeDasharray="2 2"
                opacity={0.6}
              />

              {/* High-visibility Target Point on Curve */}
              <circle
                cx={hoveredData.pointSvgX}
                cy={hoveredData.pointSvgY}
                r={7}
                fill="#22d3ee"
                stroke="#ffffff"
                strokeWidth={2}
                className="filter drop-shadow-[0_0_6px_rgba(34,211,238,0.8)]"
              />

              {/* On-Graph Floating Value Pill at top of cursor line */}
              <g transform={`translate(${Math.max(50, Math.min(svgWidth - 50, hoveredData.cursorSvgX))}, 18)`}>
                <rect
                  x="-38"
                  y="-12"
                  width="76"
                  height="20"
                  rx="10"
                  fill="#0f172a"
                  stroke="#22d3ee"
                  strokeWidth="1.2"
                />
                <text
                  textAnchor="middle"
                  y="2"
                  className="fill-cyan-300 font-mono text-[10px] font-bold"
                >
                  Z = {hoveredData.element.number} ({hoveredData.element.symbol})
                </text>
              </g>
            </g>
          )}

          {/* Full-coverage transparent interactive tracking surface */}
          <rect
            x={paddingLeft}
            y={paddingTop}
            width={chartW}
            height={chartH}
            fill="transparent"
            className="cursor-crosshair"
          />
        </svg>
      </div>

      {/* LIVE ELEMENT READOUT STRIP DIRECTLY BELOW GRAPH (Updates instantly with the line) */}
      <div className="w-full p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-4 transition-all duration-75">
        <div className="flex items-center gap-4">
          {/* Element Symbol Badge */}
          <div
            className="w-14 h-14 rounded-xl flex flex-col items-center justify-center font-mono shadow-lg text-white"
            style={{ backgroundColor: activeCatStyle.hex }}
          >
            <span className="text-[10px] font-bold opacity-80 leading-none">
              {activeElement.number}
            </span>
            <span className="text-2xl font-black leading-none">{activeElement.symbol}</span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-lg font-bold text-white tracking-tight">
                {activeElement.name}
              </h4>
              <span
                className={`text-[11px] px-2 py-0.5 rounded border font-medium ${activeCatStyle.bg} ${activeCatStyle.border} ${activeCatStyle.text}`}
              >
                {CATEGORY_LABELS[activeElement.category]}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs font-mono text-slate-400 mt-1 flex-wrap">
              <span>
                Period <strong>{activeElement.period}</strong> · Group{' '}
                <strong>{activeElement.group > 0 ? activeElement.group : '—'}</strong>
              </span>
              <span>·</span>
              <span>
                Config: <strong className="text-cyan-400">{activeElement.electronConfiguration}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Current Metric Readout & Selection Button */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-[11px] font-mono text-slate-400 uppercase">
              {currentMetric.label}
            </div>
            <div className="text-2xl font-mono font-black text-cyan-400">
              {activeValue !== null ? currentMetric.format(activeValue) : 'N/A'}
            </div>
          </div>

          <button
            onClick={() => {
              soundEngine.playElementChime(activeElement.number);
              onSelectElement(activeElement);
            }}
            className="px-4 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-lg shadow-cyan-500/20"
          >
            <Atom className="w-4 h-4" />
            <span>Select Element ({activeElement.symbol})</span>
          </button>
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 pt-1">
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-cyan-400" />
          <span>
            Move your cursor across the chart—the line and data tracking stay directly locked to your mouse. Click anywhere to select that element.
          </span>
        </div>
        <div className="font-mono text-[11px] text-slate-500">
          Tracking {points.length} authentic data points across all 118 elements
        </div>
      </div>
    </div>
  );
};
