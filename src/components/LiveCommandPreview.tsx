import React, { useState } from 'react';
import { SteamGame } from '../types';
import { 
  Copy, 
  Check, 
  Save, 
  Terminal, 
  Flame, 
  AlertTriangle, 
  Cpu, 
  ShieldCheck, 
  Eye, 
  Play,
  HardDrive,
  DownloadCloud
} from 'lucide-react';

interface LiveCommandPreviewProps {
  commandString: string;
  selectedGame: SteamGame;
  onApplyCommand: (command: string) => void;
  activeFlagNames: string[];
  onWriteToSteamNotice?: (message: string, isSuccess: boolean) => void;
  onReadFromSteamSuccess?: (launchOptions: string) => void;
}

export const LiveCommandPreview: React.FC<LiveCommandPreviewProps> = ({
  commandString,
  selectedGame,
  onApplyCommand,
  activeFlagNames,
  onWriteToSteamNotice,
  onReadFromSteamSuccess,
}) => {
  const [copied, setCopied] = useState(false);
  const [applied, setApplied] = useState(false);
  const [writingSteam, setWritingSteam] = useState(false);
  const [readingSteam, setReadingSteam] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(commandString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApply = () => {
    onApplyCommand(commandString);
    setApplied(true);
    setTimeout(() => setApplied(false), 2000);
  };

  const handleWriteToSteam = async () => {
    setWritingSteam(true);
    try {
      const res = await fetch('/api/steam/write-launch-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appId: selectedGame.appId,
          launchOptions: commandString,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onWriteToSteamNotice?.(data.message + (data.instructions ? ` ${data.instructions}` : ''), true);
      } else {
        onWriteToSteamNotice?.(data.message || 'Steam localconfig.vdf file not found on standard paths.', false);
      }
    } catch (err) {
      onWriteToSteamNotice?.('Failed connecting to local Steam writer endpoint.', false);
    } finally {
      setWritingSteam(false);
    }
  };

  const handleReadFromSteam = async () => {
    setReadingSteam(true);
    try {
      const res = await fetch(`/api/steam/read-launch-options?appId=${selectedGame.appId}`);
      const data = await res.json();
      if (data.success && data.launchOptionsMap && data.launchOptionsMap[selectedGame.appId] !== undefined) {
        const steamOptions = data.launchOptionsMap[selectedGame.appId];
        onApplyCommand(steamOptions);
        onReadFromSteamSuccess?.(steamOptions);
        onWriteToSteamNotice?.(`Read settings from Steam for ${selectedGame.name}: "${steamOptions || '(Empty)'}"`, true);
      } else {
        onWriteToSteamNotice?.(`No existing launch options found in local Steam config for ${selectedGame.name}`, false);
      }
    } catch (err) {
      onWriteToSteamNotice?.('Failed reading settings from local Steam directory.', false);
    } finally {
      setReadingSteam(false);
    }
  };

  // Syntax highlighting parts
  const renderHighlightedCommand = () => {
    if (!commandString) return <span className="text-slate-500">%command%</span>;

    const parts = commandString.split('%command%');
    const prefix = parts[0] || '';
    const suffix = parts[1] || '';

    // Tokenize prefix
    const tokens = prefix.split(' ').filter(Boolean);

    return (
      <div className="font-mono text-xs leading-relaxed flex flex-wrap items-center gap-1.5 break-all">
        {tokens.map((token, idx) => {
          if (token.includes('=')) {
            const [k, v] = token.split('=');
            return (
              <span key={idx} className="bg-blue-950/80 text-blue-300 border border-blue-800/80 px-1.5 py-0.5 rounded font-mono">
                <span className="text-cyan-400">{k}</span>=<span className="text-amber-300">{v}</span>
              </span>
            );
          } else {
            return (
              <span key={idx} className="bg-amber-950/80 text-amber-300 border border-amber-800/80 px-1.5 py-0.5 rounded font-mono font-semibold">
                {token}
              </span>
            );
          }
        })}

        {/* %command% placeholder highlight */}
        <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded font-mono font-bold">
          %command%
        </span>

        {suffix && (
          <span className="bg-purple-950/80 text-purple-300 border border-purple-800/80 px-1.5 py-0.5 rounded font-mono">
            {suffix}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-3">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-emerald-400 animate-pulse" />
          <h2 className="text-xs font-bold text-slate-200">Live Generated Command String</h2>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowSimulator(!showSimulator)}
            className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-md transition"
          >
            <Eye className="w-3 h-3 text-cyan-400" />
            <span>{showSimulator ? 'Hide Test Runtime' : 'Test Runtime'}</span>
          </button>
        </div>
      </div>

      {/* Main Command Display Box & Action Toolbar */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-3">
        {/* Command Text Area */}
        <div className="w-full min-h-[48px] p-3 bg-slate-900/70 border border-slate-800/80 rounded-lg overflow-x-auto flex items-center">
          {renderHighlightedCommand()}
        </div>

        {/* Action Buttons Toolbar (No overlay, flex wrap toolbar underneath) */}
        <div className="flex flex-wrap items-center justify-end gap-2 pt-1 border-t border-slate-800/60">
          <button
            onClick={handleCopy}
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center space-x-1.5 transition shadow-sm ${
              copied
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
            title="Copy command to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>

          <button
            onClick={handleApply}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition shadow-sm ${
              applied
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
            title="Save launch options in manager state (Ctrl+S)"
          >
            {applied ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5 text-cyan-400" />}
            <span>{applied ? 'Saved!' : 'Save Game'}</span>
            <kbd className="font-mono text-[9px] bg-slate-900 text-slate-400 px-1 py-0.5 rounded border border-slate-700/80 hidden sm:inline-block">
              Ctrl+S
            </kbd>
          </button>

          <button
            onClick={handleReadFromSteam}
            disabled={readingSteam}
            className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition shadow-sm"
            title="Read current launch options for this game directly from Steam localconfig.vdf"
          >
            <DownloadCloud className={`w-3.5 h-3.5 text-cyan-400 ${readingSteam ? 'animate-bounce' : ''}`} />
            <span>{readingSteam ? 'Reading...' : 'Read from Steam'}</span>
          </button>

          <button
            onClick={handleWriteToSteam}
            disabled={writingSteam}
            className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition shadow-md shadow-cyan-950/40"
            title="Write launch options directly to Steam localconfig.vdf on disk"
          >
            <HardDrive className={`w-3.5 h-3.5 ${writingSteam ? 'animate-spin' : ''}`} />
            <span>{writingSteam ? 'Writing...' : 'Write to Steam'}</span>
          </button>
        </div>
      </div>

      {/* Active Flag Badges */}
      {activeFlagNames.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] text-slate-500 font-mono mr-1">Active Options:</span>
          {activeFlagNames.map((flag, i) => (
            <span
              key={i}
              className="bg-slate-800 text-cyan-300 border border-slate-700 text-[10px] px-2 py-0.5 rounded-md font-mono"
            >
              {flag}
            </span>
          ))}
        </div>
      )}

      {/* Simulation / Resolution View */}
      {showSimulator && (
        <div className="bg-slate-950/90 border border-cyan-500/30 rounded-xl p-3 space-y-2 mt-2">
          <div className="flex items-center space-x-2 text-cyan-400 text-xs font-semibold">
            <Play className="w-3.5 h-3.5" />
            <span>Simulated Steam Execution Command (Linux Bash):</span>
          </div>
          <div className="bg-slate-900/90 p-2.5 rounded-lg font-mono text-[11px] text-slate-300 border border-slate-800 break-all leading-relaxed">
            <span className="text-slate-500"># Steam launches game process via wrapper pipeline:</span><br />
            {commandString.replace(
              '%command%',
              `~/.local/share/Steam/steamapps/common/Proton/proton run /path/to/${selectedGame.name.replace(/\s+/g, '')}.exe`
            )}
          </div>
        </div>
      )}
    </div>
  );
};
