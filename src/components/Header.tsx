import React from 'react';
import { 
  Terminal, 
  Code2, 
  FileText, 
  Sparkles, 
  Sliders, 
  Cpu, 
  Plus, 
  Flame,
  HardDrive,
  FileJson
} from 'lucide-react';

interface HeaderProps {
  distro: string;
  setDistro: (distro: string) => void;
  onOpenCCode: () => void;
  onOpenVdfSync: () => void;
  onOpenPresets: () => void;
  onOpenAIAssistant: () => void;
  onOpenAddGame: () => void;
  onOpenScanLocalLibrary?: () => void;
  onOpenProtonManager?: () => void;
  onOpenBackup?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  distro,
  setDistro,
  onOpenCCode,
  onOpenVdfSync,
  onOpenPresets,
  onOpenAIAssistant,
  onOpenAddGame,
  onOpenScanLocalLibrary,
  onOpenProtonManager,
  onOpenBackup,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between py-3 gap-3">
          
          {/* Logo & Main Title */}
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-2.5 rounded-xl shadow-md flex items-center justify-center">
              <Terminal className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-100">
                  Proton Launch Options Manager
                </h1>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                <span>Optimize Steam Proton titles, DXVK & kernel synchronization flags</span>
              </p>
            </div>
          </div>

          {/* Controls & Quick Modals */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Distro Selector */}
            <div className="flex items-center bg-slate-800/80 border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs">
              <span className="text-slate-400 mr-2 flex items-center gap-1 font-medium">
                <HardDrive className="w-3.5 h-3.5 text-cyan-400" /> Distro:
              </span>
              <select
                value={distro}
                onChange={(e) => setDistro(e.target.value)}
                className="bg-transparent text-slate-200 font-semibold focus:outline-none cursor-pointer"
              >
                <option value="Arch / SteamOS" className="bg-slate-900 text-white">Arch / SteamOS</option>
                <option value="Ubuntu / Debian" className="bg-slate-900 text-white">Ubuntu / Debian</option>
                <option value="Fedora" className="bg-slate-900 text-white">Fedora Linux</option>
                <option value="Gentoo / Void" className="bg-slate-900 text-white">Gentoo / Void</option>
              </select>
            </div>

            {/* Scan Local Library */}
            {onOpenScanLocalLibrary && (
              <button
                onClick={onOpenScanLocalLibrary}
                className="flex items-center space-x-1.5 bg-cyan-950/80 hover:bg-cyan-900/90 text-cyan-200 border border-cyan-700/60 px-3 py-1.5 rounded-lg text-xs font-semibold transition shadow-sm"
                title="Scan and import all installed Steam games from local directory"
              >
                <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                <span>Scan Steam Games</span>
              </button>
            )}

            {/* Proton Runner Manager */}
            {onOpenProtonManager && (
              <button
                onClick={onOpenProtonManager}
                className="flex items-center space-x-1.5 bg-amber-950/80 hover:bg-amber-900/90 text-amber-200 border border-amber-700/60 px-3 py-1.5 rounded-lg text-xs font-semibold transition shadow-sm"
                title="Download and update Proton GE, CachyOS, EM-Proton & DW-Proton versions"
              >
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>Proton Versions</span>
              </button>
            )}

            {/* Presets */}
            <button
              onClick={onOpenPresets}
              className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 px-3 py-1.5 rounded-lg text-xs font-medium transition shadow-sm"
              title="Load hardware performance preset profiles"
            >
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              <span>Presets</span>
            </button>

            {/* VDF Sync */}
            <button
              onClick={onOpenVdfSync}
              className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 px-3 py-1.5 rounded-lg text-xs font-medium transition shadow-sm"
              title="Parse and sync localconfig.vdf file"
            >
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              <span>VDF File</span>
            </button>

            {/* JSON Backup & Restore */}
            {onOpenBackup && (
              <button
                onClick={onOpenBackup}
                className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 px-3 py-1.5 rounded-lg text-xs font-semibold transition shadow-sm"
                title="Export or import current state of game launch options as a JSON backup file"
              >
                <FileJson className="w-3.5 h-3.5 text-cyan-400" />
                <span>JSON Backup</span>
              </button>
            )}

            {/* AI Assistant */}
            <button
              onClick={onOpenAIAssistant}
              className="flex items-center space-x-1.5 bg-gradient-to-r from-purple-900/60 to-indigo-900/60 hover:from-purple-800/80 hover:to-indigo-800/80 text-purple-200 border border-purple-700/50 px-3 py-1.5 rounded-lg text-xs font-medium transition shadow-sm"
              title="Ask Gemini for Proton troubleshooting and flag advice"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
              <span>AI Optimizer</span>
            </button>

            {/* C Source Code Generator */}
            <button
              onClick={onOpenCCode}
              className="flex items-center space-x-1.5 bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-md transition"
              title="View, edit, compile and export portable C code source project"
            >
              <Code2 className="w-3.5 h-3.5 text-cyan-100" />
              <span>C Source Code</span>
            </button>

            {/* Add Custom Title */}
            <button
              onClick={onOpenAddGame}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 hover:text-white transition"
              title="Add Custom Steam Title"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
