import React, { useState } from 'react';
import { soundEngine } from '../utils/audio';
import { Search, Volume2, VolumeX, Moon, Sun, Table, Box, ArrowRightLeft, TrendingUp, HelpCircle } from 'lucide-react';

export type MainView = 'table' | '3d-focus' | 'orbitals' | 'compare' | 'trends' | 'quiz';

interface NavigationHeaderProps {
  currentView: MainView;
  onSelectView: (view: MainView) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export const NavigationHeader: React.FC<NavigationHeaderProps> = ({
  currentView,
  onSelectView,
  searchQuery,
  onSearchChange,
  isDarkMode,
  onToggleDarkMode,
}) => {
  const [isMuted, setIsMuted] = useState<boolean>(soundEngine.getMuted());
  const [volume, setVolume] = useState<number>(soundEngine.getVolume());

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    soundEngine.setMuted(next);
    if (!next) soundEngine.playClick(1000);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    soundEngine.setVolume(vol);
  };

  const navItems: { id: MainView; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'table', label: 'Periodic Table', icon: Table },
    { id: '3d-focus', label: '3D Atom', icon: Box },
    { id: 'orbitals', label: 'Orbitals (s,p,d,f)', icon: Box },
    { id: 'compare', label: 'Compare', icon: ArrowRightLeft },
    { id: 'trends', label: 'Trends', icon: TrendingUp },
    { id: 'quiz', label: 'Quiz', icon: HelpCircle },
  ];

  return (
    <header className="w-full bg-slate-950/95 border-b border-slate-800/80 sticky top-0 z-50 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Brand Zone */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-black text-slate-950 text-base shadow-lg shadow-cyan-500/20 select-none">
            QE
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight leading-none">
              QuantumElements
            </h1>
            <p className="text-[11px] font-mono text-slate-400 mt-0.5">
              Interactive 3D Periodic Table & Atomic Physics
            </p>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="relative flex-1 max-w-sm min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search element... (e.g. H, He, Carbon, 79)"
            className="w-full py-1.5 pl-9 pr-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
            >
              ×
            </button>
          )}
        </div>

        {/* View Switcher Tabs */}
        <nav className="flex items-center gap-1 p-1 rounded-lg bg-slate-900 border border-slate-800/80 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  soundEngine.playClick(1100);
                  onSelectView(item.id);
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Audio & Settings Zone */}
        <div className="flex items-center gap-2">
          {/* Audio volume & mute */}
          <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-400">
            <button
              onClick={handleToggleMute}
              className={`p-1 rounded hover:text-white transition-colors ${
                isMuted ? 'text-rose-400' : 'text-cyan-400'
              }`}
              title={isMuted ? 'Unmute Sound FX' : 'Mute Sound FX'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              disabled={isMuted}
              onChange={handleVolumeChange}
              className="w-14 h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-cyan-400"
              title={`Sound Volume: ${Math.round(volume * 100)}%`}
            />
          </div>

          {/* Theme Toggle */}
          <button
            onClick={() => {
              soundEngine.playClick(900);
              onToggleDarkMode();
            }}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            title={isDarkMode ? 'Switch to Light Laboratory Mode' : 'Switch to Dark Deep Space Mode'}
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-cyan-400" />}
          </button>
        </div>
      </div>
    </header>
  );
};
