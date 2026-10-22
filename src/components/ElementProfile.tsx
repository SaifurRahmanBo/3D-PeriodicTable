import React from 'react';
import { ElementData, CATEGORY_LABELS, CATEGORY_COLORS } from '../data/elements';
import { soundEngine } from '../utils/audio';
import { Sparkles, ArrowRightLeft, Atom, Layers, Flame, Droplets, Gauge } from 'lucide-react';

interface ElementProfileProps {
  element: ElementData;
  onCompareWith: (el: ElementData) => void;
  onExploreOrbitals: () => void;
  onFocus3D: () => void;
}

export const ElementProfile: React.FC<ElementProfileProps> = ({
  element,
  onCompareWith,
  onExploreOrbitals,
  onFocus3D,
}) => {
  const catStyle = CATEGORY_COLORS[element.category];

  return (
    <div className="w-full h-full rounded-xl bg-slate-950/90 border border-slate-800/90 p-5 shadow-2xl flex flex-col justify-between gap-4 overflow-y-auto">
      {/* Top Header Card */}
      <div>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-mono font-bold text-slate-400">
              {element.number}
            </span>
            <span className="text-xs font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
              Period {element.period} · Group {element.group > 0 ? element.group : '—'}
            </span>
          </div>

          <span
            className={`text-xs px-2.5 py-1 rounded font-medium border ${catStyle.bg} ${catStyle.border} ${catStyle.text}`}
          >
            {CATEGORY_LABELS[element.category]}
          </span>
        </div>

        {/* Hero Symbol & Name */}
        <div className="mt-3 flex items-baseline gap-3">
          <span className={`text-6xl font-black tracking-tight ${catStyle.text}`}>
            {element.symbol}
          </span>
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">{element.name}</h2>
            <div className="text-sm font-mono text-cyan-400 font-semibold">
              {element.atomicMass.toFixed(3)} <span className="text-xs text-slate-400">u</span>
            </div>
          </div>
        </div>

        {/* Tags Row */}
        <div className="mt-3 flex items-center gap-2 flex-wrap text-xs font-mono">
          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
            Block: <strong className="text-cyan-400 uppercase">{element.block}</strong>
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
            State: <strong className="text-emerald-400">{element.state}</strong>
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
            Discovered: <strong className="text-amber-400">{element.discoveryYear}</strong>
          </span>
        </div>
      </div>

      {/* Electron Configuration & Shell Distribution */}
      <div className="space-y-3 py-3 border-y border-slate-800/80">
        <div>
          <div className="text-xs font-mono text-slate-400 uppercase mb-1">
            Electron Configuration
          </div>
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-sm text-cyan-300 tracking-wide font-semibold">
            {element.electronConfiguration}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 uppercase mb-1">
            <span>Electrons per Shell (K, L, M, N...)</span>
            <span className="text-slate-300 font-bold">{element.electrons} e⁻ total</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {element.shells.map((count, idx) => {
              const shellLetters = ['K', 'L', 'M', 'N', 'O', 'P', 'Q'];
              return (
                <div
                  key={idx}
                  className="px-2.5 py-1 rounded bg-slate-900/90 border border-slate-800 text-center font-mono"
                >
                  <div className="text-[10px] text-slate-500 font-bold">{shellLetters[idx]}</div>
                  <div className="text-xs font-bold text-sky-400">{count}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <div className="text-xs font-mono text-slate-400 uppercase mb-1">
            Oxidation States
          </div>
          <div className="font-mono text-sm text-slate-200">
            {element.oxidationStates || 'None known'}
          </div>
        </div>
      </div>

      {/* Physical & Chemical Constants Table */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
          <div className="text-[10px] font-mono text-slate-400 uppercase flex items-center gap-1">
            <Flame className="w-3 h-3 text-rose-400" /> Melting Point
          </div>
          <div className="text-sm font-mono font-bold text-slate-200 mt-0.5">
            {element.meltingPoint !== null ? `${element.meltingPoint} °C` : 'N/A'}
          </div>
        </div>

        <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
          <div className="text-[10px] font-mono text-slate-400 uppercase flex items-center gap-1">
            <Droplets className="w-3 h-3 text-sky-400" /> Boiling Point
          </div>
          <div className="text-sm font-mono font-bold text-slate-200 mt-0.5">
            {element.boilingPoint !== null ? `${element.boilingPoint} °C` : 'N/A'}
          </div>
        </div>

        <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
          <div className="text-[10px] font-mono text-slate-400 uppercase flex items-center gap-1">
            <Gauge className="w-3 h-3 text-amber-400" /> Electronegativity
          </div>
          <div className="text-sm font-mono font-bold text-slate-200 mt-0.5">
            {element.electronegativity !== null ? element.electronegativity : 'N/A'}
          </div>
        </div>

        <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
          <div className="text-[10px] font-mono text-slate-400 uppercase flex items-center gap-1">
            <Atom className="w-3 h-3 text-emerald-400" /> Atomic Radius
          </div>
          <div className="text-sm font-mono font-bold text-slate-200 mt-0.5">
            {element.atomicRadius !== null ? `${element.atomicRadius} pm` : 'N/A'}
          </div>
        </div>

        <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 col-span-2">
          <div className="text-[10px] font-mono text-slate-400 uppercase">
            Density at STP
          </div>
          <div className="text-sm font-mono font-bold text-slate-200 mt-0.5">
            {element.density !== null ? `${element.density} g/cm³` : 'N/A'}
          </div>
        </div>
      </div>

      {/* Summary Narrative */}
      <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800 text-xs text-slate-300 leading-relaxed">
        {element.summary}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
        <button
          onClick={() => {
            soundEngine.playClick(1000);
            onFocus3D();
          }}
          className="flex-1 py-2 px-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-cyan-500/20"
        >
          <Atom className="w-3.5 h-3.5" />
          <span>Inspect 3D Atom</span>
        </button>

        <button
          onClick={() => {
            soundEngine.playClick(1100);
            onCompareWith(element);
          }}
          className="py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors"
          title="Compare with another element"
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
          <span>Compare</span>
        </button>
      </div>
    </div>
  );
};
