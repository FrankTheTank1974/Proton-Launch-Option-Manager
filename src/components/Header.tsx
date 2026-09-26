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
  FileJson,
  Monitor,
  Maximize2,
  Minimize2,
  Columns
} from 'lucide-react';
import { DisplayMetrics, LayoutWidthMode } from '../utils/screenDetector';

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
  onOpenFlagScanner?: () => void;
  onOpenBackup?: () => void;
  aiEnabled?: boolean;
  metrics?: DisplayMetrics;
  layoutMode?: LayoutWidthMode;
  isEffectiveWide?: boolean;
  onOpenDisplayModal?: () => void;
  onToggleQuickLayout?: () => void;
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
  onOpenFlagScanner,
  onOpenBackup,
  aiEnabled = true,
  metrics,
  layoutMode = 'auto',
  isEffectiveWide = false,
  onOpenDisplayModal,
  onToggleQuickLayout,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-lg">
      <div className={isEffectiveWide ? "w-full px-3 sm:px-5 lg:px-6 2xl:px-8 transition-all duration-200" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-200"}>
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
            
            {/* Screen Resolution & Horizontal Display Optimizer Pill */}
            {metrics && onOpenDisplayModal && (
              <div className="flex items-center space-x-1">
                <button
                  onClick={onOpenDisplayModal}
                  className="flex items-center space-x-1.5 bg-slate-800/90 hover:bg-slate-750 text-slate-200 border border-slate-700/80 px-2.5 py-1 rounded-lg text-xs font-mono transition shadow-sm group"
                  title={`Detected Screen: ${metrics.screenWidth}×${metrics.screenHeight} | Viewport: ${metrics.viewportWidth}×${metrics.viewportHeight} (${metrics.aspectRatio} ${metrics.isLandscape ? 'Landscape' : 'Portrait'}). Click to configure full-screen horizontal display layout.`}
                >
                  <Monitor className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition shrink-0" />
                  <span className="font-semibold text-slate-200">
                    {metrics.viewportWidth}×{metrics.viewportHeight}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-semibold ${
                    metrics.isLandscape 
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60' 
                      : 'bg-amber-950 text-amber-300 border border-amber-800/60'
                  }`}>
                    {metrics.isLandscape ? 'Landscape' : 'Portrait'}
                  </span>
                  <span className="text-[10px] text-cyan-300 font-sans hidden sm:inline">
                    {layoutMode === '3-column' ? '• 3-Col' : isEffectiveWide ? '• Full Width' : '• 1280px'}
                  </span>
                </button>

                {onToggleQuickLayout && (
                  <button
                    onClick={onToggleQuickLayout}
                    className={`p-1.5 rounded-lg border text-xs font-semibold transition ${
                      isEffectiveWide 
                        ? 'bg-cyan-950/80 border-cyan-700/60 text-cyan-300 hover:bg-cyan-900' 
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                    title={
                      layoutMode === '3-column'
                        ? '3-Column Dashboard active. Click to toggle mode.'
                        : isEffectiveWide 
                        ? 'Full Screen fluid layout active. Click to switch layout.' 
                        : 'Contained 1280px box active. Click to expand to Full Screen width.'
                    }
                  >
                    {layoutMode === '3-column' ? (
                      <Columns className="w-3.5 h-3.5 text-purple-400" />
                    ) : isEffectiveWide ? (
                      <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                    ) : (
                      <Minimize2 className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </button>
                )}
              </div>
            )}

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

            {/* Runner Flag Scanner */}
            {onOpenFlagScanner && (
              <button
                onClick={onOpenFlagScanner}
                className="flex items-center space-x-1.5 bg-purple-950/80 hover:bg-purple-900/90 text-purple-200 border border-purple-700/60 px-3 py-1.5 rounded-lg text-xs font-semibold transition shadow-sm"
                title="Rescan GitHub pages of Proton runners to check for newly added flags"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Runner Flags</span>
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
            {aiEnabled && (
              <button
                onClick={onOpenAIAssistant}
                className="flex items-center space-x-1.5 bg-gradient-to-r from-purple-900/60 to-indigo-900/60 hover:from-purple-800/80 hover:to-indigo-800/80 text-purple-200 border border-purple-700/50 px-3 py-1.5 rounded-lg text-xs font-medium transition shadow-sm"
                title="Ask Gemini for Proton troubleshooting and flag advice"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                <span>AI Optimizer</span>
              </button>
            )}

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
