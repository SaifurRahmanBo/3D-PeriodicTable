import React, { useState, useMemo } from 'react';
import { ELEMENTS, ElementData, CATEGORY_COLORS } from '../data/elements';
import { soundEngine } from '../utils/audio';
import { Plus, Minus, RotateCcw, AlertTriangle, CheckCircle, Zap } from 'lucide-react';

interface AtomBuilderProps {
  onInspectElement: (el: ElementData) => void;
}

export const AtomBuilder: React.FC<AtomBuilderProps> = ({ onInspectElement }) => {
  const [protons, setProtons] = useState<number>(6);
  const [neutrons, setNeutrons] = useState<number>(6);
  const [electrons, setElectrons] = useState<number>(6);

  // Identify matching element by proton count (Z)
  const currentElement = useMemo(() => {
    return ELEMENTS.find((e) => e.number === protons) || null;
  }, [protons]);

  // Nuclear stability ratio (N / Z)
  const stabilityInfo = useMemo(() => {
    if (protons === 0) return { stable: false, label: 'No Nucleus', desc: 'Protons required for an atomic nucleus.' };
    const ratio = neutrons / protons;

    // Hydrogen-1 has no neutrons and is stable
    if (protons === 1 && neutrons === 0) {
      return { stable: true, label: 'Protium (¹H)', desc: 'Stable non-radioactive hydrogen isotope.' };
    }
    if (protons === 1 && neutrons === 1) {
      return { stable: true, label: 'Deuterium (²H)', desc: 'Stable heavy hydrogen isotope.' };
    }
    if (protons === 1 && neutrons === 2) {
      return { stable: false, label: 'Tritium (³H)', desc: 'Beta-emitting radioactive isotope (half-life 12.3 yrs).' };
    }

    // General Belt of Stability: For light elements ~1.0, for heavy ~1.5
    const idealRatio = protons <= 20 ? 1.0 : 1.0 + ((protons - 20) / 62) * 0.54;
    const delta = Math.abs(ratio - idealRatio);

    if (protons > 82) {
      return {
        stable: false,
        label: 'Radioactive / Transuranic',
        desc: 'All nuclides with Z > 82 undergo spontaneous radioactive decay.',
      };
    }

    if (delta < 0.18) {
      return {
        stable: true,
        label: 'Stable Isotope',
        desc: `Nuclide sits firmly within the Belt of Nuclear Stability (N/Z = ${ratio.toFixed(2)}).`,
      };
    } else if (ratio > idealRatio) {
      return {
        stable: false,
        label: 'Neutron-Rich (Beta-minus emitter)',
        desc: `High neutron excess (N/Z = ${ratio.toFixed(2)}). Decay via n → p + e⁻ + ν̄ₑ.`,
      };
    } else {
      return {
        stable: false,
        label: 'Proton-Rich (Beta-plus / EC emitter)',
        desc: `High proton excess (N/Z = ${ratio.toFixed(2)}). Decay via p → n + e⁺ + νₑ.`,
      };
    }
  }, [protons, neutrons]);

  // Ion state calculation
  const netCharge = protons - electrons;
  const chargeLabel =
    netCharge === 0
      ? 'Neutral Atom (Charge: 0)'
      : netCharge > 0
      ? `Cation (${netCharge > 1 ? `+${netCharge}` : '+'})`
      : `Anion (${netCharge < -1 ? netCharge : '-'})`;

  // Compute electron shells by Aufbau principle
  const shells = useMemo(() => {
    let rem = electrons;
    const capacities = [2, 8, 18, 32, 32, 18, 8];
    const res: number[] = [];
    for (const cap of capacities) {
      if (rem <= 0) break;
      const count = Math.min(rem, cap);
      res.push(count);
      rem -= count;
    }
    return res;
  }, [electrons]);

  const handleProtonChange = (delta: number) => {
    soundEngine.playClick(delta > 0 ? 1300 : 700);
    setProtons((p) => Math.max(1, Math.min(118, p + delta)));
  };

  const handleNeutronChange = (delta: number) => {
    soundEngine.playClick(delta > 0 ? 1100 : 600);
    setNeutrons((n) => Math.max(0, Math.min(180, n + delta)));
  };

  const handleElectronChange = (delta: number) => {
    soundEngine.playClick(delta > 0 ? 1500 : 800);
    setElectrons((e) => Math.max(0, Math.min(120, e + delta)));
  };

  const handleReset = () => {
    soundEngine.playClick(900);
    setProtons(6);
    setNeutrons(6);
    setElectrons(6);
  };

  return (
    <div className="w-full rounded-xl bg-slate-950/90 border border-slate-800/90 p-5 shadow-2xl flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-cyan-400" />
            <span>Interactive Atom Builder & Nucleosynthesis Lab</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Construct custom isotopes and ions from fundamental subatomic particles
          </p>
        </div>

        <button
          onClick={handleReset}
          className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs flex items-center gap-1 transition-colors"
          title="Reset to Carbon-12"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Reset</span>
        </button>
      </div>

      {/* Stepper Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Protons Control */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-red-500/30 flex flex-col items-center">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-3 h-3 rounded-full bg-red-500 shadow-md shadow-red-500/50"></span>
            <span className="font-bold text-sm text-red-300">Protons (p⁺)</span>
          </div>
          <div className="text-3xl font-mono font-black text-white mb-3">{protons}</div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleProtonChange(-1)}
              disabled={protons <= 1}
              className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 border border-slate-700 flex items-center justify-center text-white"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleProtonChange(1)}
              disabled={protons >= 118}
              className="w-9 h-9 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 flex items-center justify-center text-red-300"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <span className="text-[10px] font-mono text-slate-400 mt-2">Determines Element (Z)</span>
        </div>

        {/* Neutrons Control */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-700/60 flex flex-col items-center">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-3 h-3 rounded-full bg-slate-300"></span>
            <span className="font-bold text-sm text-slate-200">Neutrons (n⁰)</span>
          </div>
          <div className="text-3xl font-mono font-black text-white mb-3">{neutrons}</div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleNeutronChange(-1)}
              disabled={neutrons <= 0}
              className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 border border-slate-700 flex items-center justify-center text-white"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleNeutronChange(1)}
              className="w-9 h-9 rounded-lg bg-slate-700/40 hover:bg-slate-700/60 border border-slate-600 flex items-center justify-center text-slate-200"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <span className="text-[10px] font-mono text-slate-400 mt-2">Determines Isotope Mass (A)</span>
        </div>

        {/* Electrons Control */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-sky-500/30 flex flex-col items-center">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-3 h-3 rounded-full bg-sky-400 shadow-md shadow-sky-400/50"></span>
            <span className="font-bold text-sm text-sky-300">Electrons (e⁻)</span>
          </div>
          <div className="text-3xl font-mono font-black text-white mb-3">{electrons}</div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleElectronChange(-1)}
              disabled={electrons <= 0}
              className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 border border-slate-700 flex items-center justify-center text-white"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleElectronChange(1)}
              className="w-9 h-9 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/50 flex items-center justify-center text-sky-300"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <span className="text-[10px] font-mono text-slate-400 mt-2">Determines Net Ion Charge</span>
        </div>
      </div>

      {/* Resulting Atomic Synthesis Outcome */}
      {currentElement && (
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-black text-white shadow-xl"
              style={{ backgroundColor: CATEGORY_COLORS[currentElement.category].hex }}
            >
              {currentElement.symbol}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xl font-bold text-white">{currentElement.name}</h4>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-400">
                  Mass Number A = {protons + neutrons}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono text-slate-300 mt-1">
                <span>{chargeLabel}</span>
                <span>·</span>
                <span className="text-slate-400">
                  Shells: [{shells.join(', ')}]
                </span>
              </div>
            </div>
          </div>

          {/* Stability Badge */}
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg border flex items-center gap-2 text-xs ${
              stabilityInfo.stable
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-amber-500/15 border-amber-500/40 text-amber-300'
            }`}>
              {stabilityInfo.stable ? (
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              )}
              <div>
                <strong className="block leading-none font-bold">{stabilityInfo.label}</strong>
                <span className="text-[10px] opacity-80">{stabilityInfo.desc}</span>
              </div>
            </div>

            <button
              onClick={() => onInspectElement(currentElement)}
              className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors shadow-md shadow-cyan-500/20"
            >
              Inspect in 3D →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
