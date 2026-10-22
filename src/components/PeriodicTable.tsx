import React, { useMemo } from 'react';
import {
  ELEMENTS,
  ElementData,
  ElementCategory,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
} from '../data/elements';
import { soundEngine } from '../utils/audio';

interface PeriodicTableProps {
  selectedElement: ElementData;
  onSelectElement: (el: ElementData) => void;
  hoveredElement: ElementData | null;
  onHoverElement: (el: ElementData | null) => void;
  activeCategory: ElementCategory | 'all';
  onSelectCategory: (cat: ElementCategory | 'all') => void;
  searchQuery: string;
  stateFilter: string;
}

export const PeriodicTable: React.FC<PeriodicTableProps> = ({
  selectedElement,
  onSelectElement,
  hoveredElement,
  onHoverElement,
  activeCategory,
  onSelectCategory,
  searchQuery,
  stateFilter,
}) => {
  // Pre-filter matching elements
  const matchingNumbers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const set = new Set<number>();

    ELEMENTS.forEach((el) => {
      const matchSearch =
        !q ||
        el.name.toLowerCase().includes(q) ||
        el.symbol.toLowerCase().includes(q) ||
        String(el.number) === q;

      const matchCategory = activeCategory === 'all' || el.category === activeCategory;
      const matchState = stateFilter === 'all' || el.state.toLowerCase() === stateFilter.toLowerCase();

      if (matchSearch && matchCategory && matchState) {
        set.add(el.number);
      }
    });

    return set;
  }, [searchQuery, activeCategory, stateFilter]);

  // Main 18x7 grid matrix
  const mainGrid = useMemo(() => {
    const grid: (ElementData | null)[][] = Array.from({ length: 7 }, () =>
      Array.from({ length: 18 }, () => null)
    );

    ELEMENTS.forEach((el) => {
      // Lanthanides & Actinides are placed in the bottom rows
      if (el.number >= 57 && el.number <= 71) return;
      if (el.number >= 89 && el.number <= 103) return;

      const r = el.period - 1;
      const c = el.group - 1;
      if (r >= 0 && r < 7 && c >= 0 && c < 18) {
        grid[r][c] = el;
      }
    });

    return grid;
  }, []);

  // Lanthanides (57 to 71)
  const lanthanides = useMemo(() => {
    return ELEMENTS.filter((el) => el.number >= 57 && el.number <= 71);
  }, []);

  // Actinides (89 to 103)
  const actinides = useMemo(() => {
    return ELEMENTS.filter((el) => el.number >= 89 && el.number <= 103);
  }, []);

  const handleCellClick = (el: ElementData) => {
    soundEngine.playElementChime(el.number);
    onSelectElement(el);
  };

  const handleCellHover = (el: ElementData | null) => {
    if (el) soundEngine.playClick(1400);
    onHoverElement(el);
  };

  const renderCell = (el: ElementData | null, isPlaceholder = false, placeholderText = '') => {
    if (!el && !isPlaceholder) {
      return <div className="w-full h-full min-h-[46px] pointer-events-none" />;
    }

    if (isPlaceholder) {
      return (
        <div className="w-full h-full min-h-[46px] rounded border border-dashed border-slate-700/60 bg-slate-900/30 flex items-center justify-center text-[10px] font-mono text-slate-500 font-bold">
          {placeholderText}
        </div>
      );
    }

    if (!el) return null;

    const isSelected = selectedElement.number === el.number;
    const isHovered = hoveredElement?.number === el.number;
    const isDimmed = matchingNumbers.size > 0 && !matchingNumbers.has(el.number);
    const catStyle = CATEGORY_COLORS[el.category];

    return (
      <button
        type="button"
        onClick={() => handleCellClick(el)}
        onMouseEnter={() => handleCellHover(el)}
        onMouseLeave={() => handleCellHover(null)}
        style={{
          boxShadow: isSelected
            ? `0 0 16px ${catStyle.glow}, inset 0 0 8px ${catStyle.glow}`
            : isHovered
            ? `0 0 10px ${catStyle.glow}`
            : undefined,
        }}
        className={`relative w-full min-h-[46px] rounded p-1 flex flex-col justify-between text-left transition-all duration-150 border cursor-pointer select-none ${
          catStyle.bg
        } ${catStyle.border} ${
          isSelected
            ? 'ring-2 ring-cyan-400 z-20 scale-105 bg-slate-900'
            : isHovered
            ? 'scale-105 z-10 bg-slate-800/90'
            : ''
        } ${isDimmed ? 'opacity-25 grayscale' : 'opacity-100'}`}
      >
        {/* Top: Atomic Number and Mass */}
        <div className="flex items-center justify-between w-full text-[9px] font-mono leading-none text-slate-400">
          <span className="font-bold">{el.number}</span>
          <span className="truncate hidden xl:inline">{el.atomicMass.toFixed(el.atomicMass > 100 ? 1 : 2)}</span>
        </div>

        {/* Center: Element Symbol */}
        <div className={`text-base font-black tracking-tight leading-none text-center ${catStyle.text}`}>
          {el.symbol}
        </div>

        {/* Bottom: Element Name */}
        <div className="text-[8px] truncate text-center text-slate-300/80 font-sans leading-none">
          {el.name}
        </div>
      </button>
    );
  };

  return (
    <div className="w-full bg-slate-950/90 rounded-xl border border-slate-800/90 p-4 shadow-2xl flex flex-col gap-4 overflow-hidden">
      {/* Category Filter Pills Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-thin">
        <button
          onClick={() => {
            soundEngine.playClick(1000);
            onSelectCategory('all');
          }}
          className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors ${
            activeCategory === 'all'
              ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          All Categories
        </button>
        {(Object.keys(CATEGORY_LABELS) as ElementCategory[]).map((cat) => {
          const catStyle = CATEGORY_COLORS[cat];
          const isCurrent = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => {
                soundEngine.playClick(1100);
                onSelectCategory(cat);
              }}
              className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap flex items-center gap-1.5 transition-all ${
                isCurrent
                  ? 'border ring-1 ring-cyan-400 bg-slate-900 text-white font-bold'
                  : 'bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${catStyle.text.replace('text-', 'bg-')}`}></span>
              <span>{CATEGORY_LABELS[cat]}</span>
            </button>
          );
        })}
      </div>

      {/* Main Periodic Table Matrix */}
      <div className="w-full overflow-x-auto pb-2">
        <div className="min-w-[880px] flex flex-col gap-1.5">
          {/* Group Numbers Header */}
          <div className="grid grid-cols-18 gap-1.5 text-center text-[10px] font-mono text-slate-500 mb-0.5">
            {Array.from({ length: 18 }, (_, i) => (
              <span key={i + 1}>{i + 1}</span>
            ))}
          </div>

          {/* Periods 1 to 7 */}
          {mainGrid.map((row, periodIdx) => (
            <div key={periodIdx} className="grid grid-cols-18 gap-1.5 items-center">
              {row.map((cell, colIdx) => {
                // Lanthanide placeholder at Period 6, Group 3
                if (periodIdx === 5 && colIdx === 2) {
                  return <React.Fragment key={colIdx}>{renderCell(null, true, '57-71')}</React.Fragment>;
                }
                // Actinide placeholder at Period 7, Group 3
                if (periodIdx === 6 && colIdx === 2) {
                  return <React.Fragment key={colIdx}>{renderCell(null, true, '89-103')}</React.Fragment>;
                }
                return <React.Fragment key={colIdx}>{renderCell(cell)}</React.Fragment>;
              })}
            </div>
          ))}

          {/* Divider space before Lanthanides/Actinides */}
          <div className="h-2 border-b border-dashed border-slate-800/80 my-1" />

          {/* Lanthanides Row (57-71) */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono font-bold text-cyan-400 w-16 text-right pr-2 shrink-0">
              Lanthanide
            </span>
            <div className="grid grid-cols-15 gap-1.5 flex-1">
              {lanthanides.map((el) => (
                <React.Fragment key={el.number}>{renderCell(el)}</React.Fragment>
              ))}
            </div>
          </div>

          {/* Actinides Row (89-103) */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono font-bold text-pink-400 w-16 text-right pr-2 shrink-0">
              Actinide
            </span>
            <div className="grid grid-cols-15 gap-1.5 flex-1">
              {actinides.map((el) => (
                <React.Fragment key={el.number}>{renderCell(el)}</React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
