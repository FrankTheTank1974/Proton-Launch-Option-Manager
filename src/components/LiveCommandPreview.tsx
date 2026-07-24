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
  Play
} from 'lucide-react';

interface LiveCommandPreviewProps {
  commandString: string;
  selectedGame: SteamGame;
  onApplyCommand: (command: string) => void;
  activeFlagNames: string[];
}

export const LiveCommandPreview: React.FC<LiveCommandPreviewProps> = ({
  commandString,
  selectedGame,
  onApplyCommand,
  activeFlagNames,
}) => {
  const [copied, setCopied] = useState(false);
  const [applied, setApplied] = useState(false);
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

      {/* Main Command Box */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 relative group">
        <div className="pr-20 min-h-[42px] flex items-center">
          {renderHighlightedCommand()}
        </div>

        {/* Action Buttons */}
        <div className="absolute right-2 top-2.5 flex items-center space-x-1.5">
          <button
            onClick={handleCopy}
            className={`p-1.5 rounded-lg border text-xs font-medium flex items-center space-x-1 transition shadow-sm ${
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
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 transition shadow-md ${
              applied
                ? 'bg-emerald-600 text-white'
                : 'bg-cyan-600 hover:bg-cyan-500 text-white'
            }`}
            title="Apply command options to selected Steam game"
          >
            {applied ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            <span>{applied ? 'Applied!' : 'Save Game'}</span>
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
