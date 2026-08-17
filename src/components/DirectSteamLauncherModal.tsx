import React, { useState } from 'react';
import { SteamGame } from '../types';
import { 
  launchSteamGame, 
  downloadLinuxDesktopShortcut, 
  downloadBashLauncherScript 
} from '../utils/steamLauncher';
import {
  X,
  Play,
  Rocket,
  Terminal,
  ExternalLink,
  Download,
  CheckCircle2,
  Copy,
  Check,
  ShieldCheck,
  Monitor,
  HardDrive
} from 'lucide-react';

interface DirectSteamLauncherModalProps {
  isOpen: boolean;
  onClose: () => void;
  game: SteamGame;
  currentLaunchOptions: string;
  onShowToast: (message: string) => void;
}

export const DirectSteamLauncherModal: React.FC<DirectSteamLauncherModalProps> = ({
  isOpen,
  onClose,
  game,
  currentLaunchOptions,
  onShowToast,
}) => {
  const [isLaunching, setIsLaunching] = useState(false);
  const [lastLaunchStatus, setLastLaunchStatus] = useState<string | null>(null);
  const [copiedUri, setCopiedUri] = useState(false);

  if (!isOpen) return null;

  const steamUri = `steam://rungameid/${game.appId}`;
  const nativeCmd = `steam "${steamUri}"`;
  const flatpakCmd = `flatpak run com.valvesoftware.Steam "${steamUri}"`;

  const handleLaunchNow = async () => {
    setIsLaunching(true);
    setLastLaunchStatus('Sending launch signal to Steam...');
    try {
      const result = await launchSteamGame(game.appId, game.name);
      setLastLaunchStatus(result.message);
      onShowToast(`🚀 Launched "${game.name}" via Steam!`);
    } catch (err: any) {
      setLastLaunchStatus(`Launch triggered: ${steamUri}`);
      onShowToast(`Dispatched steam://rungameid/${game.appId}`);
    } finally {
      setIsLaunching(false);
    }
  };

  const handleCopyUri = () => {
    navigator.clipboard.writeText(steamUri);
    setCopiedUri(true);
    onShowToast('Copied steam:// URI to clipboard');
    setTimeout(() => setCopiedUri(false), 2000);
  };

  const handleDownloadDesktop = () => {
    downloadLinuxDesktopShortcut(game.appId, game.name, game.iconUrl);
    onShowToast(`Exported ${game.name}.desktop shortcut!`);
  };

  const handleDownloadBash = () => {
    downloadBashLauncherScript(game.appId, game.name, currentLaunchOptions);
    onShowToast(`Exported launch bash script (.sh)!`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 p-2.5 rounded-xl border border-cyan-500/30">
              <Rocket className="w-5 h-5 text-cyan-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">Direct Steam URI Launcher</h2>
                <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[11px] font-mono px-2 py-0.5 rounded-full font-semibold">
                  Protocol: steam://
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Launch directly into Steam client or generate native Linux launcher shortcuts
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 space-y-4 overflow-y-auto max-h-[75vh]">
          
          {/* Game Banner Header Card */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex items-center space-x-3.5">
            <img
              src={game.bannerUrl}
              alt={game.name}
              className="w-20 h-12 object-cover rounded-lg border border-slate-700/60 flex-shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${game.appId}/header.jpg`;
              }}
            />
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-slate-100 truncate">{game.name}</h3>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400 font-mono">
                <span className="text-cyan-400 font-semibold">AppID: {game.appId}</span>
                <span>•</span>
                <span className="truncate">{game.protonVersion || 'Proton'}</span>
              </div>
            </div>

            {/* Big Launch Button */}
            <button
              onClick={handleLaunchNow}
              disabled={isLaunching}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-950/50 flex items-center space-x-2 transition transform active:scale-95 disabled:opacity-50 shrink-0"
            >
              <Play className={`w-4 h-4 fill-white ${isLaunching ? 'animate-spin' : ''}`} />
              <span>{isLaunching ? 'Launching...' : 'Launch via Steam'}</span>
            </button>
          </div>

          {lastLaunchStatus && (
            <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3 flex items-center space-x-2.5 text-xs text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-mono">{lastLaunchStatus}</span>
            </div>
          )}

          {/* Steam URI Box */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                Direct Steam Protocol URI:
              </span>
              <button
                onClick={handleCopyUri}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono transition"
              >
                {copiedUri ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedUri ? 'Copied' : 'Copy URI'}</span>
              </button>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 font-mono text-xs text-cyan-300 flex items-center justify-between select-all">
              <span>{steamUri}</span>
            </div>
          </div>

          {/* Quick CLI Execution Commands */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
            <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              <span>Terminal & System Launch Commands:</span>
            </div>

            <div className="space-y-2 font-mono text-xs">
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-2 flex items-center justify-between">
                <div className="truncate mr-2">
                  <span className="text-slate-500 text-[10px] uppercase mr-2 font-sans">Native:</span>
                  <span className="text-slate-300">{nativeCmd}</span>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(nativeCmd);
                    onShowToast('Copied native steam command');
                  }}
                  className="text-slate-400 hover:text-slate-200 p-1 hover:bg-slate-800 rounded"
                  title="Copy command"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-lg p-2 flex items-center justify-between">
                <div className="truncate mr-2">
                  <span className="text-slate-500 text-[10px] uppercase mr-2 font-sans">Flatpak:</span>
                  <span className="text-slate-300">{flatpakCmd}</span>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(flatpakCmd);
                    onShowToast('Copied Flatpak steam command');
                  }}
                  className="text-slate-400 hover:text-slate-200 p-1 hover:bg-slate-800 rounded"
                  title="Copy command"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Desktop Shortcuts Export Section */}
          <div className="border-t border-slate-800 pt-3">
            <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Export Standalone Launchers:</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                onClick={handleDownloadDesktop}
                className="bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 p-3 rounded-xl flex items-start space-x-2.5 text-left transition group"
              >
                <div className="bg-blue-500/10 p-2 rounded-lg border border-blue-500/20 text-blue-400 group-hover:scale-105 transition">
                  <Monitor className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300">
                    Linux .desktop Shortcut
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Double-clickable desktop icon for GNOME / KDE / SteamOS
                  </div>
                </div>
              </button>

              <button
                onClick={handleDownloadBash}
                className="bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 p-3 rounded-xl flex items-start space-x-2.5 text-left transition group"
              >
                <div className="bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20 text-emerald-400 group-hover:scale-105 transition">
                  <Terminal className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-200 group-hover:text-emerald-300">
                    Standalone Bash Script (.sh)
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Portable shell script with Steam client auto-detection
                  </div>
                </div>
              </button>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Opens safely through official Valve Steam client protocols</span>
          </div>
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium transition"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
