import React, { useState } from 'react';
import { ELEMENTS, ElementData, CATEGORY_COLORS } from '../data/elements';
import { soundEngine } from '../utils/audio';
import { ArrowRightLeft, Sparkles } from 'lucide-react';

interface ElementComparisonProps {
  initialElementA: ElementData;
  initialElementB?: ElementData;
  onSelectElement: (el: ElementData) => void;
}

export const ElementComparison: React.FC<ElementComparisonProps> = ({
  initialElementA,
  initialElementB,
  onSelectElement,
}) => {
  const [elementA, setElementA] = useState<ElementData>(initialElementA);
  const [elementB, setElementB] = useState<ElementData>(
    initialElementB || ELEMENTS.find((e) => e.number === 8) || ELEMENTS[1]
  );

  const handleSelectA = (num: number) => {
    soundEngine.playElementChime(num);
    const found = ELEMENTS.find((e) => e.number === num);
    if (found) setElementA(found);
  };

  const handleSelectB = (num: number) => {
    soundEngine.playElementChime(num);
    const found = ELEMENTS.find((e) => e.number === num);
    if (found) setElementB(found);
  };

  // Helper to render mini 2D Bohr SVG with spinning CSS orbits
  const renderMiniBohr = (el: ElementData) => {
    const catStyle = CATEGORY_COLORS[el.category];
    const baseRadius = 18;
    const step = 14;

    return (
      <div className="relative w-36 h-36 flex items-center justify-center my-2">
        {/* Pulsing Nucleus */}
        <div
          className="absolute w-6 h-6 rounded-full flex items-center justify-center font-bold font-mono text-[10px] text-white z-10 shadow-lg"
          style={{ backgroundColor: catStyle.hex }}
        >
          {el.symbol}
        </div>

        {/* Concentric shell rings */}
        {el.shells.map((count, sIdx) => {
          const r = baseRadius + sIdx * step;
          return (
            <div
              key={sIdx}
              className="absolute rounded-full border border-slate-700/80 pointer-events-none"
              style={{
                width: `${r * 2}px`,
                height: `${r * 2}px`,
                animation: `spin ${8 + sIdx * 4}s linear infinite`,
              }}
            >
              {/* Electron dots spaced evenly */}
              {Array.from({ length: count }).map((_, eIdx) => {
                const angle = (eIdx / count) * 2 * Math.PI;
                const x = Math.cos(angle) * r;
                const y = Math.sin(angle) * r;
                return (
                  <div
                    key={eIdx}
                    className="absolute w-2 h-2 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/80"
                    style={{
                      left: `calc(50% + ${x}px - 4px)`,
                      top: `calc(50% + ${y}px - 4px)`,
                    }}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    );
  };

  const getDeltaBadge = (
    valA: number | null,
    valB: number | null,
    unit = '',
    higherIsBetter = true
  ) => {
    if (valA === null || valB === null) return null;
    const diff = Number((valB - valA).toFixed(2));
    if (diff === 0) return <span className="text-slate-500 font-mono text-[10px]">Identical</span>;

    const bIsGreater = diff > 0;
    const isPositive = higherIsBetter ? bIsGreater : !bIsGreater;

    return (
      <span
        className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
          isPositive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
        }`}
      >
        {diff > 0 ? `+${diff}` : diff} {unit}
      </span>
    );
  };

  return (
    <div className="w-full h-full rounded-xl bg-slate-950/90 border border-slate-800/90 p-5 shadow-2xl flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-cyan-400" />
            <span>Side-by-Side Element Comparison</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Compare atomic structure, radii, electronegativity, and valence
          </p>
        </div>

        <button
          onClick={() => {
            soundEngine.playClick(1000);
            const temp = elementA;
            setElementA(elementB);
            setElementB(temp);
          }}
          className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition-colors"
          title="Swap Elements"
        >
          <ArrowRightLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Selectors and Dual Bohr View */}
      <div className="grid grid-cols-2 gap-4">
        {/* Element A Column */}
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col items-center text-center">
          <label className="text-[11px] font-mono text-slate-400 mb-1">Element A</label>
          <select
            value={elementA.number}
            onChange={(e) => handleSelectA(parseInt(e.target.value))}
            className="w-full py-1.5 px-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-semibold text-white outline-none cursor-pointer mb-2"
          >
            {ELEMENTS.map((el) => (
              <option key={el.number} value={el.number}>
                {el.number}. {el.name} ({el.symbol})
              </option>
            ))}
          </select>

          <div className="text-xs font-mono text-slate-400 font-bold">
            Z = {elementA.number} · Mass {elementA.atomicMass.toFixed(2)}
          </div>

          {renderMiniBohr(elementA)}

          <div className="w-full mt-2 p-2 rounded bg-slate-950 border border-slate-800/80 font-mono text-xs text-cyan-300 font-semibold truncate">
            {elementA.electronConfiguration}
          </div>
        </div>

        {/* Element B Column */}
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col items-center text-center">
          <label className="text-[11px] font-mono text-slate-400 mb-1">Element B</label>
          <select
            value={elementB.number}
            onChange={(e) => handleSelectB(parseInt(e.target.value))}
            className="w-full py-1.5 px-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-semibold text-white outline-none cursor-pointer mb-2"
          >
            {ELEMENTS.map((el) => (
              <option key={el.number} value={el.number}>
                {el.number}. {el.name} ({el.symbol})
              </option>
            ))}
          </select>

          <div className="text-xs font-mono text-slate-400 font-bold">
            Z = {elementB.number} · Mass {elementB.atomicMass.toFixed(2)}
          </div>

          {renderMiniBohr(elementB)}

          <div className="w-full mt-2 p-2 rounded bg-slate-950 border border-slate-800/80 font-mono text-xs text-cyan-300 font-semibold truncate">
            {elementB.electronConfiguration}
          </div>
        </div>
      </div>

      {/* Comparative Properties Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-[11px] font-mono text-slate-400 uppercase">
              <th className="py-2 text-left">Property</th>
              <th className="py-2 text-center">{elementA.symbol}</th>
              <th className="py-2 text-center">{elementB.symbol}</th>
              <th className="py-2 text-right">Delta (B - A)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            <tr>
              <td className="py-2.5 text-slate-300 font-sans">Atomic Radius</td>
              <td className="py-2.5 text-center text-slate-200">
                {elementA.atomicRadius ? `${elementA.atomicRadius} pm` : 'N/A'}
              </td>
              <td className="py-2.5 text-center text-slate-200">
                {elementB.atomicRadius ? `${elementB.atomicRadius} pm` : 'N/A'}
              </td>
              <td className="py-2.5 text-right">
                {getDeltaBadge(elementA.atomicRadius, elementB.atomicRadius, 'pm', false)}
              </td>
            </tr>

            <tr>
              <td className="py-2.5 text-slate-300 font-sans">Electronegativity</td>
              <td className="py-2.5 text-center text-slate-200">
                {elementA.electronegativity ?? 'N/A'}
              </td>
              <td className="py-2.5 text-center text-slate-200">
                {elementB.electronegativity ?? 'N/A'}
              </td>
              <td className="py-2.5 text-right">
                {getDeltaBadge(elementA.electronegativity, elementB.electronegativity, '', true)}
              </td>
            </tr>

            <tr>
              <td className="py-2.5 text-slate-300 font-sans">First Ionization Energy</td>
              <td className="py-2.5 text-center text-slate-200">
                {elementA.ionizationEnergy ? `${elementA.ionizationEnergy} kJ/mol` : 'N/A'}
              </td>
              <td className="py-2.5 text-center text-slate-200">
                {elementB.ionizationEnergy ? `${elementB.ionizationEnergy} kJ/mol` : 'N/A'}
              </td>
              <td className="py-2.5 text-right">
                {getDeltaBadge(elementA.ionizationEnergy, elementB.ionizationEnergy, 'kJ/mol', true)}
              </td>
            </tr>

            <tr>
              <td className="py-2.5 text-slate-300 font-sans">Melting Point</td>
              <td className="py-2.5 text-center text-slate-200">
                {elementA.meltingPoint !== null ? `${elementA.meltingPoint} °C` : 'N/A'}
              </td>
              <td className="py-2.5 text-center text-slate-200">
                {elementB.meltingPoint !== null ? `${elementB.meltingPoint} °C` : 'N/A'}
              </td>
              <td className="py-2.5 text-right">
                {getDeltaBadge(elementA.meltingPoint, elementB.meltingPoint, '°C', true)}
              </td>
            </tr>

            <tr>
              <td className="py-2.5 text-slate-300 font-sans">Boiling Point</td>
              <td className="py-2.5 text-center text-slate-200">
                {elementA.boilingPoint !== null ? `${elementA.boilingPoint} °C` : 'N/A'}
              </td>
              <td className="py-2.5 text-center text-slate-200">
                {elementB.boilingPoint !== null ? `${elementB.boilingPoint} °C` : 'N/A'}
              </td>
              <td className="py-2.5 text-right">
                {getDeltaBadge(elementA.boilingPoint, elementB.boilingPoint, '°C', true)}
              </td>
            </tr>

            <tr>
              <td className="py-2.5 text-slate-300 font-sans">Density</td>
              <td className="py-2.5 text-center text-slate-200">
                {elementA.density !== null ? `${elementA.density} g/cm³` : 'N/A'}
              </td>
              <td className="py-2.5 text-center text-slate-200">
                {elementB.density !== null ? `${elementB.density} g/cm³` : 'N/A'}
              </td>
              <td className="py-2.5 text-right">
                {getDeltaBadge(elementA.density, elementB.density, 'g/cm³', true)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
