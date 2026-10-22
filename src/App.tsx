import React, { useState } from 'react';
import { ELEMENTS, ElementData, ElementCategory } from './data/elements';
import { NavigationHeader, MainView } from './components/NavigationHeader';
import { PeriodicTable } from './components/PeriodicTable';
import { AtomicViewer, ModelMode } from './components/AtomicViewer';
import { OrbitalViewer } from './components/OrbitalViewer';
import { ElementProfile } from './components/ElementProfile';
import { ElementComparison } from './components/ElementComparison';
import { PeriodicTrends } from './components/PeriodicTrends';
import { ElementQuiz } from './components/ElementQuiz';
import { AtomBuilder } from './components/AtomBuilder';
import { soundEngine } from './utils/audio';
import { Atom, Box, Layers, ArrowRightLeft, Sparkles, SlidersHorizontal, FlaskConical } from 'lucide-react';

export default function App() {
  const [selectedElement, setSelectedElement] = useState<ElementData>(ELEMENTS[0]); // Hydrogen
  const [comparedElement, setComparedElement] = useState<ElementData>(ELEMENTS[5]); // Carbon
  const [hoveredElement, setHoveredElement] = useState<ElementData | null>(null);
  const [activeCategory, setActiveCategory] = useState<ElementCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [currentView, setCurrentView] = useState<MainView>('table');
  const [atomicMode, setAtomicMode] = useState<ModelMode>('bohr');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  const handleSelectElement = (el: ElementData) => {
    setSelectedElement(el);
  };

  const handleCompareWith = (el: ElementData) => {
    setComparedElement(el);
    setCurrentView('compare');
  };

  const handleFocus3D = () => {
    setCurrentView('3d-focus');
  };

  const handleExploreOrbitals = () => {
    setCurrentView('orbitals');
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-200 ${
        isDarkMode
          ? 'bg-[#07090e] text-slate-100'
          : 'bg-slate-100 text-slate-900'
      }`}
    >
      {/* Sticky Global Top Bar Contract */}
      <NavigationHeader
        currentView={currentView}
        onSelectView={setCurrentView}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
      />

      {/* Main Workspace Stage */}
      <main className="max-w-[1580px] mx-auto p-4 sm:p-6 flex flex-col gap-6">
        {/* VIEW 1: COMPLETE PERIODIC TABLE DASHBOARD (Matching User Blueprint Layout) */}
        {currentView === 'table' && (
          <div className="flex flex-col gap-6">
            {/* Top Workspace Bar: Quick Filters & Status */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-mono text-slate-400">Matter State:</span>
                {['all', 'Solid', 'Liquid', 'Gas', 'Synthetic'].map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      soundEngine.playClick(1100);
                      setStateFilter(st);
                    }}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      stateFilter === st
                        ? 'bg-cyan-500 text-slate-950 font-bold'
                        : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {st === 'all' ? 'All States' : st}
                  </button>
                ))}
              </div>

              {/* Quick Jump Action Pills */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentView('compare')}
                  className="px-3 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 flex items-center gap-1.5 transition-colors"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Compare Tool</span>
                </button>
                <button
                  onClick={() => setCurrentView('trends')}
                  className="px-3 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 flex items-center gap-1.5 transition-colors"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Periodic Trends</span>
                </button>
                <button
                  onClick={() => setCurrentView('quiz')}
                  className="px-3 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 flex items-center gap-1.5 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Interactive Quiz</span>
                </button>
              </div>
            </div>

            {/* Main Upper Section: 118-Element Periodic Grid + Right Element Profile */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left/Center: Full Periodic Table Grid */}
              <div className="lg:col-span-8 xl:col-span-9 flex flex-col gap-6">
                <PeriodicTable
                  selectedElement={selectedElement}
                  onSelectElement={handleSelectElement}
                  hoveredElement={hoveredElement}
                  onHoverElement={setHoveredElement}
                  activeCategory={activeCategory}
                  onSelectCategory={setActiveCategory}
                  searchQuery={searchQuery}
                  stateFilter={stateFilter}
                />

                {/* Lower Dual 3D Stage (Matching Blueprint bottom row: 3D Atomic Model + 3D Orbitals) */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {/* Bottom Left: Real-Time 3D Atomic Model */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs px-1">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <Atom className="w-4 h-4 text-cyan-400" />
                        <span>3D Atomic Model Visualization</span>
                      </span>
                      <button
                        onClick={handleFocus3D}
                        className="text-cyan-400 hover:underline font-mono text-[11px]"
                      >
                        Expand View ↗
                      </button>
                    </div>
                    <AtomicViewer
                      element={selectedElement}
                      activeMode={atomicMode}
                      onModeChange={setAtomicMode}
                    />
                  </div>

                  {/* Bottom Right: 3D Electron Orbitals Gallery */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs px-1">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <Box className="w-4 h-4 text-purple-400" />
                        <span>Electron Orbitals & Wavefunctions</span>
                      </span>
                      <button
                        onClick={handleExploreOrbitals}
                        className="text-cyan-400 hover:underline font-mono text-[11px]"
                      >
                        Expand View ↗
                      </button>
                    </div>
                    <OrbitalViewer initialOrbital={selectedElement.block} />
                  </div>
                </div>
              </div>

              {/* Right Column: Complete Element Profile Card */}
              <div className="lg:col-span-4 xl:col-span-3 sticky top-20">
                <ElementProfile
                  element={selectedElement}
                  onCompareWith={handleCompareWith}
                  onExploreOrbitals={handleExploreOrbitals}
                  onFocus3D={handleFocus3D}
                />
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: EXPANDED 3D ATOMIC STAGE */}
        {currentView === '3d-focus' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Atom className="w-5 h-5 text-cyan-400" />
                  <span>3D Atomic Structure Studio: {selectedElement.name} ({selectedElement.symbol})</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Rotate, zoom, and inspect nuclear composition, electron shells, and quantum spin vectors
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedElement.number}
                  onChange={(e) => {
                    const found = ELEMENTS.find((el) => el.number === parseInt(e.target.value));
                    if (found) handleSelectElement(found);
                  }}
                  className="py-1.5 px-3 rounded-lg bg-slate-900 border border-slate-700 text-xs font-semibold text-white outline-none cursor-pointer"
                >
                  {ELEMENTS.map((el) => (
                    <option key={el.number} value={el.number}>
                      {el.number}. {el.name} ({el.symbol})
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setCurrentView('table')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300"
                >
                  ← Back to Table
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-3">
                <AtomicViewer
                  element={selectedElement}
                  activeMode={atomicMode}
                  onModeChange={setAtomicMode}
                />
              </div>
              <div className="lg:col-span-1">
                <ElementProfile
                  element={selectedElement}
                  onCompareWith={handleCompareWith}
                  onExploreOrbitals={handleExploreOrbitals}
                  onFocus3D={() => {}}
                />
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: 3D ELECTRON ORBITALS LABORATORY */}
        {currentView === 'orbitals' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Box className="w-5 h-5 text-purple-400" />
                  <span>Quantum Orbitals & Spherical Harmonics Explorer</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Detailed 3D mathematical isosurfaces of s, p, d, and f electron wavefunctions
                </p>
              </div>
              <button
                onClick={() => setCurrentView('table')}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300"
              >
                ← Back to Table
              </button>
            </div>
            <div className="h-[620px]">
              <OrbitalViewer initialOrbital={selectedElement.block} />
            </div>
          </div>
        )}

        {/* VIEW 4: SIDE-BY-SIDE ELEMENT COMPARISON */}
        {currentView === 'compare' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5 text-cyan-400" />
                  <span>Element Comparison Laboratory</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Side-by-side delta analysis of atomic radii, electronegativity, melting points, and valence
                </p>
              </div>
              <button
                onClick={() => setCurrentView('table')}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300"
              >
                ← Back to Table
              </button>
            </div>
            <ElementComparison
              initialElementA={selectedElement}
              initialElementB={comparedElement}
              onSelectElement={handleSelectElement}
            />
          </div>
        )}

        {/* VIEW 5: PERIODIC TRENDS GRAPHICAL ANALYTICS */}
        {currentView === 'trends' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-cyan-400" />
                  <span>Periodic Law & Trends Visualizer</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Interactive multi-property charting across atomic numbers 1 to 118
                </p>
              </div>
              <button
                onClick={() => setCurrentView('table')}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300"
              >
                ← Back to Table
              </button>
            </div>
            <PeriodicTrends
              selectedElement={selectedElement}
              onSelectElement={(el) => {
                handleSelectElement(el);
              }}
            />
          </div>
        )}

        {/* VIEW 6: EDUCATIONAL QUIZ MODULE */}
        {currentView === 'quiz' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  <span>Interactive Chemistry & Atomic Physics Quiz</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Test and expand your understanding of elemental properties and quantum electron configurations
                </p>
              </div>
              <button
                onClick={() => setCurrentView('table')}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300"
              >
                ← Back to Table
              </button>
            </div>
            <ElementQuiz />
          </div>
        )}

        {/* VIRTUAL ATOM BUILDER SECTION AT BOTTOM OF HOME WORKSPACE */}
        {currentView === 'table' && (
          <div className="mt-4">
            <AtomBuilder
              onInspectElement={(el) => {
                handleSelectElement(el);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </div>
        )}
      </main>

      {/* Quiet Publication-Grade Scientific Footer */}
      <footer className="w-full mt-12 py-6 border-t border-slate-800/80 bg-slate-950/80 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-mono">
            <span className="font-bold text-white">QuantumElements</span>
            <span>·</span>
            <span>IUPAC & NIST Ground-State Atomic Data</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-mono text-slate-400">
            <span>118 Elements Verified</span>
            <span>·</span>
            <span>Three.js WebGL Real-Time Graphics</span>
            <span>·</span>
            <span>Web Audio Synthesizer</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
