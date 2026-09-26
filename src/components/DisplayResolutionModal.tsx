import React from 'react';
import { DisplayMetrics, LayoutWidthMode } from '../utils/screenDetector';
import { 
  Monitor, 
  Smartphone, 
  Maximize2, 
  Minimize2, 
  Columns, 
  Layout, 
  Check, 
  Laptop, 
  Tv, 
  X, 
  Sparkles,
  Info,
  Maximize,
  Compass,
  Zap
} from 'lucide-react';

interface DisplayResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  metrics: DisplayMetrics;
  layoutMode: LayoutWidthMode;
  onSelectLayoutMode?: (mode: LayoutWidthMode) => void;
  onChangeLayoutMode?: (mode: LayoutWidthMode) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export const DisplayResolutionModal: React.FC<DisplayResolutionModalProps> = ({
  isOpen,
  onClose,
  metrics,
  layoutMode,
  onSelectLayoutMode,
  onChangeLayoutMode,
  isFullscreen,
  onToggleFullscreen,
}) => {
  if (!isOpen) return null;

  const handleSelectMode = (mode: LayoutWidthMode) => {
    if (typeof onSelectLayoutMode === 'function') {
      onSelectLayoutMode(mode);
    }
    if (typeof onChangeLayoutMode === 'function') {
      onChangeLayoutMode(mode);
    }
  };

  const getDeviceIcon = () => {
    if (metrics.category === 'Mobile Portrait') return <Smartphone className="w-5 h-5 text-cyan-400" />;
    if (metrics.category === '4K UHD (2160p+)') return <Tv className="w-5 h-5 text-purple-400" />;
    if (metrics.category === 'Ultrawide (21:9+)') return <Maximize className="w-5 h-5 text-cyan-400" />;
    if (metrics.category === 'Steam Deck / Handheld (1280×800)') return <Laptop className="w-5 h-5 text-amber-400" />;
    return <Monitor className="w-5 h-5 text-cyan-400" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-cyan-950/80 border border-cyan-700/60 rounded-xl">
              {getDeviceIcon()}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>Display & Screen Resolution Detector</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                  metrics.isLandscape 
                    ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300' 
                    : 'bg-amber-950/80 border-amber-700 text-amber-300'
                }`}>
                  {metrics.isLandscape ? 'Horizontal Display' : 'Vertical Display'}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Hardware metrics and horizontal display optimization
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-slate-300">
          
          {/* Detected Real-Time Resolution Stats Grid */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-cyan-400" />
                <span>Detected Display Characteristics</span>
              </h4>
              <span className="text-[11px] text-cyan-400 font-mono">
                Live Sensor Active
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
                <span className="text-[10px] text-slate-400 block uppercase font-medium">Viewport Size</span>
                <span className="text-sm font-mono font-bold text-cyan-300">
                  {metrics.viewportWidth} × {metrics.viewportHeight}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">pixels rendered</span>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
                <span className="text-[10px] text-slate-400 block uppercase font-medium">Aspect Ratio</span>
                <span className="text-sm font-mono font-bold text-emerald-300">
                  {metrics.aspectRatio}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  {(metrics.aspectRatioValue).toFixed(2)} : 1
                </span>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
                <span className="text-[10px] text-slate-400 block uppercase font-medium">Screen Resolution</span>
                <span className="text-sm font-mono font-bold text-purple-300">
                  {metrics.screenWidth} × {metrics.screenHeight}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  DPR: {metrics.pixelRatio}x
                </span>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
                <span className="text-[10px] text-slate-400 block uppercase font-medium">Form Factor</span>
                <span className="text-xs font-semibold text-amber-300 block truncate" title={metrics.category}>
                  {metrics.category}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  {metrics.isLandscape ? 'Landscape Mode' : 'Portrait Mode'}
                </span>
              </div>
            </div>
          </div>

          {/* Horizontal Layout Modes */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Layout className="w-3.5 h-3.5 text-cyan-400" />
                <span>Horizontal Screen Layout Modes</span>
              </h4>
              <span className="text-[11px] text-slate-500">
                Choose how screen width is utilized
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Mode 1: Auto / Fluid Full Width */}
              <button
                type="button"
                onClick={() => handleSelectMode('fluid-full')}
                className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between space-y-2 ${
                  layoutMode === 'fluid-full'
                    ? 'bg-cyan-950/60 border-cyan-500 shadow-md shadow-cyan-950/30 text-white ring-1 ring-cyan-400'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center space-x-2">
                    <Maximize2 className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-bold">Fluid Full Screen</span>
                  </div>
                  {layoutMode === 'fluid-full' && (
                    <span className="p-0.5 bg-cyan-500 text-slate-950 rounded-full">
                      <Check className="w-3 h-3" />
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Uses 100% of your horizontal screen width. Flags expand into 3–4 columns with wide launch command previews.
                </p>
                <span className="text-[10px] text-cyan-300 font-mono font-semibold bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/60 w-fit">
                  Recommended for 1080p/1440p
                </span>
              </button>

              {/* Mode 2: 3-Column Ultrawide Dashboard */}
              <button
                type="button"
                onClick={() => handleSelectMode('3-column')}
                className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between space-y-2 ${
                  layoutMode === '3-column'
                    ? 'bg-purple-950/60 border-purple-500 shadow-md shadow-purple-950/30 text-white ring-1 ring-purple-400'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center space-x-2">
                    <Columns className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-bold">3-Column Dashboard</span>
                  </div>
                  {layoutMode === '3-column' && (
                    <span className="p-0.5 bg-purple-500 text-slate-950 rounded-full">
                      <Check className="w-3 h-3" />
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  3 dedicated columns: Library on the left, Flags in center, and sticky Command Preview & Steam actions pinned on right.
                </p>
                <span className="text-[10px] text-purple-300 font-mono font-semibold bg-purple-950/80 px-2 py-0.5 rounded border border-purple-800/60 w-fit">
                  Best for Ultrawide & 4K
                </span>
              </button>

              {/* Mode 3: Contained 1280px Box */}
              <button
                type="button"
                onClick={() => handleSelectMode('contained')}
                className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between space-y-2 ${
                  layoutMode === 'contained'
                    ? 'bg-slate-800 border-slate-600 shadow-md text-white ring-1 ring-slate-400'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center space-x-2">
                    <Minimize2 className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-bold">Contained (1280px)</span>
                  </div>
                  {layoutMode === 'contained' && (
                    <span className="p-0.5 bg-slate-400 text-slate-950 rounded-full">
                      <Check className="w-3 h-3" />
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Caps application width to traditional 1280px centered box with dark margins on the sides.
                </p>
                <span className="text-[10px] text-slate-400 font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800 w-fit">
                  Classic Centered
                </span>
              </button>
            </div>

            {/* Auto Mode Quick Toggle */}
            <div className="mt-3 flex items-center justify-between bg-slate-950/50 border border-slate-800 rounded-xl p-3">
              <div className="flex items-center space-x-2.5">
                <Zap className="w-4 h-4 text-cyan-400 shrink-0" />
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">
                    Automatic Responsive Optimizer
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Automatically expands to full width when a horizontal display (1080p, 1440p, 4K, Steam Deck) is detected.
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleSelectMode('auto')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  layoutMode === 'auto'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                }`}
              >
                {layoutMode === 'auto' ? 'Auto Mode Active' : 'Set to Auto'}
              </button>
            </div>
          </div>

          {/* Browser Fullscreen Integration */}
          <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center space-x-2.5">
              <Maximize className="w-4 h-4 text-amber-400" />
              <div>
                <span className="text-xs font-semibold text-slate-200 block">
                  Browser Borderless Fullscreen
                </span>
                <span className="text-[11px] text-slate-400">
                  Toggle native borderless fullscreen mode for an immersive Linux desktop experience.
                </span>
              </div>
            </div>
            <button
              onClick={onToggleFullscreen}
              className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold px-3.5 py-1.5 rounded-xl text-xs flex items-center space-x-1.5 transition shadow-sm shrink-0"
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>Exit Fullscreen</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Enter Fullscreen</span>
                </>
              )}
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            Detected resolution: {metrics.viewportWidth} × {metrics.viewportHeight} ({metrics.aspectRatio})
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-xl text-xs transition shadow-sm"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};
