import React, { useState, useMemo } from 'react';
import { SteamGame } from '../types';
import { launchSteamGame } from '../utils/steamLauncher';
import { getGameExecutableInfo } from '../utils/gamePathResolver';

const DirectSteamLauncherModal = React.lazy(() => import('./DirectSteamLauncherModal').then(m => ({ default: m.DirectSteamLauncherModal })));
import {
  parseLaunchCommandTokens,
  getLaunchCommandStats,
  ParsedLaunchToken,
  LaunchTokenType,
} from '../utils/launchSyntaxHighlighter';
import { 
  Copy, 
  Check, 
  Save, 
  Terminal, 
  Eye, 
  Play,
  HardDrive,
  DownloadCloud,
  Rocket,
  ExternalLink,
  Code2,
  SlidersHorizontal,
  Plus,
  Info,
  Layers,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Tag,
  Flame,
  HelpCircle,
} from 'lucide-react';

interface LiveCommandPreviewProps {
  commandString: string;
  selectedGame: SteamGame;
  onApplyCommand: (command: string) => void;
  activeFlagNames: string[];
  onWriteToSteamNotice?: (message: string, isSuccess: boolean) => void;
  onReadFromSteamSuccess?: (launchOptions: string) => void;
  onOpenSteamLauncher?: () => void;
  onOpenWriteToSteamModal?: () => void;
}

export const LiveCommandPreview: React.FC<LiveCommandPreviewProps> = ({
  commandString,
  selectedGame,
  onApplyCommand,
  activeFlagNames,
  onWriteToSteamNotice,
  onReadFromSteamSuccess,
  onOpenSteamLauncher,
  onOpenWriteToSteamModal,
}) => {
  const [copied, setCopied] = useState(false);
  const [applied, setApplied] = useState(false);
  const [writingSteam, setWritingSteam] = useState(false);
  const [readingSteam, setReadingSteam] = useState(false);
  const [launchingSteam, setLaunchingSteam] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);
  const [isLauncherModalOpen, setIsLauncherModalOpen] = useState(false);

  // Syntax highlighting state
  const [viewMode, setViewMode] = useState<'badges' | 'terminal'>('badges');
  const [activeFilter, setActiveFilter] = useState<LaunchTokenType | 'all'>('all');
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [customArgInput, setCustomArgInput] = useState('');
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);
  const [inspectedToken, setInspectedToken] = useState<ParsedLaunchToken | null>(null);

  // Parse command tokens and compile syntax statistics
  const tokens = useMemo(() => {
    return parseLaunchCommandTokens(commandString);
  }, [commandString]);

  const stats = useMemo(() => {
    return getLaunchCommandStats(tokens);
  }, [tokens]);

  const handleQuickLaunch = async () => {
    setLaunchingSteam(true);
    try {
      await launchSteamGame(selectedGame.appId, selectedGame.name);
      onWriteToSteamNotice?.(`🚀 Dispatched Steam launch for ${selectedGame.name} (steam://rungameid/${selectedGame.appId})`, true);
    } catch {
      onWriteToSteamNotice?.(`Triggered steam://rungameid/${selectedGame.appId}`, true);
    } finally {
      setLaunchingSteam(false);
    }
  };

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

  const handleCopySingleToken = (token: ParsedLaunchToken, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(token.raw);
    setCopiedTokenId(token.id);
    setTimeout(() => setCopiedTokenId(null), 1500);
  };

  const handleAddCustomArgument = (argToAdd: string) => {
    const trimmed = argToAdd.trim();
    if (!trimmed) return;

    let updatedCmd = commandString.trim();
    if (!updatedCmd.includes('%command%')) {
      updatedCmd = updatedCmd ? `${updatedCmd} %command% ${trimmed}` : `%command% ${trimmed}`;
    } else {
      updatedCmd = `${updatedCmd} ${trimmed}`;
    }

    onApplyCommand(updatedCmd);
    setCustomArgInput('');
    onWriteToSteamNotice?.(`Appended custom argument: "${trimmed}"`, true);
  };

  const handleWriteToSteam = async () => {
    // 1. Immediately apply & save to game in library state
    onApplyCommand(commandString);

    // 2. If dedicated modal handler provided, trigger full interactive write & sync hub
    if (onOpenWriteToSteamModal) {
      onOpenWriteToSteamModal();
      return;
    }

    // Fallback: direct API call
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
    } catch {
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
    } catch {
      onWriteToSteamNotice?.('Failed reading settings from local Steam directory.', false);
    } finally {
      setReadingSteam(false);
    }
  };

  // Quick preset args
  const QUICK_ARGS = [
    { label: '-novid', desc: 'Skip intro cinematic', arg: '-novid' },
    { label: '-high', desc: 'High CPU priority', arg: '-high' },
    { label: '+fps_max 0', desc: 'Uncap engine framerate', arg: '+fps_max 0' },
    { label: '-dx11', desc: 'Direct3D 11 via DXVK', arg: '-dx11' },
    { label: '-vulkan', desc: 'Native Vulkan backend', arg: '-vulkan' },
    { label: '--skip-launcher', desc: 'Bypass proprietary splash', arg: '--skip-launcher' },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-3">
      
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-emerald-400 animate-pulse" />
          <h2 className="text-xs font-bold text-slate-200">Live Generated Command String</h2>
          <span className="text-[10px] bg-slate-800 text-slate-400 border border-slate-700/80 px-1.5 py-0.5 rounded font-mono">
            {tokens.length} {tokens.length === 1 ? 'token' : 'tokens'}
          </span>
        </div>

        {/* View mode toggle & helper buttons */}
        <div className="flex items-center space-x-1.5">
          {/* Badges / Terminal Toggle */}
          <div className="bg-slate-950 border border-slate-800 p-0.5 rounded-lg flex items-center space-x-0.5 text-[11px]">
            <button
              onClick={() => setViewMode('badges')}
              className={`px-2 py-0.5 rounded-md font-medium flex items-center space-x-1 transition ${
                viewMode === 'badges'
                  ? 'bg-slate-800 text-cyan-300 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Tokenized badges view with categorized syntax coloring"
            >
              <Layers className="w-3 h-3" />
              <span>Badges</span>
            </button>
            <button
              onClick={() => setViewMode('terminal')}
              className={`px-2 py-0.5 rounded-md font-medium flex items-center space-x-1 transition ${
                viewMode === 'terminal'
                  ? 'bg-slate-800 text-emerald-300 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Terminal shell syntax highlighting view"
            >
              <Code2 className="w-3 h-3" />
              <span>Terminal</span>
            </button>
          </div>

          {/* Breakdown Toggle */}
          <button
            onClick={() => setShowBreakdown(!showBreakdown)}
            className={`text-[11px] px-2 py-1 rounded-md flex items-center space-x-1 border transition ${
              showBreakdown
                ? 'bg-cyan-950/80 text-cyan-300 border-cyan-700/70'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border-slate-700'
            }`}
            title="Inspect syntax token breakdown"
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span className="hidden sm:inline">Breakdown</span>
          </button>

          {/* Test Runtime Simulator Toggle */}
          <button
            onClick={() => setShowSimulator(!showSimulator)}
            className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-md transition border border-slate-700"
            title="Simulate resolved Steam process and game binary pipeline"
          >
            <Eye className="w-3 h-3 text-cyan-400" />
            <span className="hidden sm:inline">{showSimulator ? 'Hide Runtime' : 'Test Runtime'}</span>
          </button>
        </div>
      </div>

      {/* Syntax Highlighting Color Legend & Filter Bar */}
      <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2 flex flex-wrap items-center justify-between gap-1.5 text-[11px]">
        <div className="flex items-center space-x-1.5 text-slate-400 font-mono text-[10px] uppercase tracking-wider">
          <Tag className="w-3 h-3 text-slate-500" />
          <span>Syntax:</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {/* Environment Variables */}
          <button
            onClick={() => setActiveFilter(activeFilter === 'env_var' ? 'all' : 'env_var')}
            className={`px-2 py-0.5 rounded border text-[10px] font-mono transition flex items-center space-x-1 ${
              activeFilter === 'env_var'
                ? 'bg-sky-500/30 text-sky-200 border-sky-400 shadow-sm'
                : 'bg-sky-950/60 text-sky-300 border-sky-800/60 hover:bg-sky-900/60'
            }`}
            title="Filter/highlight Environment Variables (e.g. PROTON_ENABLE_NVAPI=1)"
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span>Env Variables</span>
            <span className="bg-sky-900/80 px-1 rounded text-[9px] text-sky-200">{stats.envVars}</span>
          </button>

          {/* Wrappers */}
          {stats.wrappers > 0 && (
            <button
              onClick={() => setActiveFilter(activeFilter === 'wrapper' ? 'all' : 'wrapper')}
              className={`px-2 py-0.5 rounded border text-[10px] font-mono transition flex items-center space-x-1 ${
                activeFilter === 'wrapper'
                  ? 'bg-orange-500/30 text-orange-200 border-orange-400 shadow-sm'
                  : 'bg-orange-950/60 text-orange-300 border-orange-800/60 hover:bg-orange-900/60'
              }`}
              title="Filter/highlight Command Wrappers (e.g. gamemoderun, mangohud)"
            >
              <span className="w-2 h-2 rounded-full bg-orange-400" />
              <span>Wrappers</span>
              <span className="bg-orange-900/80 px-1 rounded text-[9px] text-orange-200">{stats.wrappers}</span>
            </button>
          )}

          {/* Command Flags */}
          <button
            onClick={() => setActiveFilter(activeFilter === 'command_flag' ? 'all' : 'command_flag')}
            className={`px-2 py-0.5 rounded border text-[10px] font-mono transition flex items-center space-x-1 ${
              activeFilter === 'command_flag'
                ? 'bg-purple-500/30 text-purple-200 border-purple-400 shadow-sm'
                : 'bg-purple-950/60 text-purple-300 border-purple-800/60 hover:bg-purple-900/60'
            }`}
            title="Filter/highlight Command Flags (e.g. -novid, -high, --skip-launcher, -W)"
          >
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            <span>Command Flags</span>
            <span className="bg-purple-900/80 px-1 rounded text-[9px] text-purple-200">{stats.commandFlags}</span>
          </button>

          {/* Custom Arguments */}
          <button
            onClick={() => setActiveFilter(activeFilter === 'custom_arg' ? 'all' : 'custom_arg')}
            className={`px-2 py-0.5 rounded border text-[10px] font-mono transition flex items-center space-x-1 ${
              activeFilter === 'custom_arg'
                ? 'bg-amber-500/30 text-amber-200 border-amber-400 shadow-sm'
                : 'bg-amber-950/60 text-amber-300 border-amber-800/60 hover:bg-amber-900/60'
            }`}
            title="Filter/highlight Custom Arguments and Engine Console Variables (e.g. +fps_max 0, values)"
          >
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>Custom Args</span>
            <span className="bg-amber-900/80 px-1 rounded text-[9px] text-amber-200">{stats.customArgs}</span>
          </button>

          {/* Steam Target */}
          <button
            onClick={() => setActiveFilter(activeFilter === 'command' ? 'all' : 'command')}
            className={`px-2 py-0.5 rounded border text-[10px] font-mono transition flex items-center space-x-1 ${
              activeFilter === 'command'
                ? 'bg-emerald-500/30 text-emerald-200 border-emerald-400 shadow-sm'
                : 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60 hover:bg-emerald-900/60'
            }`}
            title="Filter/highlight %command% Steam Target"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>%command%</span>
          </button>

          {/* Reset Filter Button */}
          {activeFilter !== 'all' && (
            <button
              onClick={() => setActiveFilter('all')}
              className="text-[10px] text-slate-400 hover:text-slate-200 underline pl-1"
            >
              Show all
            </button>
          )}
        </div>
      </div>

      {/* Main Command Display Box */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-3">
        {/* Command Display View: Badges vs Terminal */}
        <div className="w-full min-h-[54px] p-3 bg-slate-900/80 border border-slate-800/90 rounded-lg overflow-x-auto flex items-center select-text">
          {tokens.length === 0 ? (
            <span className="font-mono text-xs text-slate-500">%command%</span>
          ) : viewMode === 'badges' ? (
            /* 1. Interactive Syntax Badges Mode */
            <div className="font-mono text-xs leading-relaxed flex flex-wrap items-center gap-1.5">
              {tokens.map((token) => {
                const isDimmed = activeFilter !== 'all' && activeFilter !== token.type;
                const isCopied = copiedTokenId === token.id;

                if (token.type === 'env_var') {
                  return (
                    <div
                      key={token.id}
                      onClick={(e) => handleCopySingleToken(token, e)}
                      onMouseEnter={() => setInspectedToken(token)}
                      className={`group relative cursor-pointer border px-2 py-1 rounded-md font-mono text-xs transition duration-150 flex items-center space-x-1 shadow-sm ${
                        token.colors.badgeBg
                      } ${token.colors.badgeBorder} ${isDimmed ? 'opacity-25 filter grayscale-[50%]' : ''}`}
                      title={`${token.title}\nClick to copy parameter`}
                    >
                      <span className="text-[9px] uppercase tracking-wider text-sky-400 font-semibold mr-0.5 select-none opacity-60 group-hover:opacity-100">
                        ENV
                      </span>
                      <span className="text-cyan-300 font-semibold">{token.envKey}</span>
                      <span className="text-slate-400">=</span>
                      <span className="text-amber-200 font-mono">{token.envValue}</span>
                      {isCopied && (
                        <span className="ml-1 text-[9px] text-emerald-400 flex items-center">
                          <Check className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                  );
                }

                if (token.type === 'command_flag') {
                  return (
                    <div
                      key={token.id}
                      onClick={(e) => handleCopySingleToken(token, e)}
                      onMouseEnter={() => setInspectedToken(token)}
                      className={`group relative cursor-pointer border px-2 py-1 rounded-md font-mono text-xs transition duration-150 flex items-center space-x-1 shadow-sm ${
                        token.colors.badgeBg
                      } ${token.colors.badgeBorder} ${isDimmed ? 'opacity-25 filter grayscale-[50%]' : ''}`}
                      title={`${token.title}\nClick to copy parameter`}
                    >
                      <span className="text-[9px] uppercase tracking-wider text-purple-400 font-semibold mr-0.5 select-none opacity-60 group-hover:opacity-100">
                        FLAG
                      </span>
                      <span className="text-purple-400 font-bold">{token.flagPrefix}</span>
                      <span className="text-purple-200 font-medium">{token.flagBody}</span>
                      {isCopied && (
                        <span className="ml-1 text-[9px] text-emerald-400 flex items-center">
                          <Check className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                  );
                }

                if (token.type === 'custom_arg') {
                  return (
                    <div
                      key={token.id}
                      onClick={(e) => handleCopySingleToken(token, e)}
                      onMouseEnter={() => setInspectedToken(token)}
                      className={`group relative cursor-pointer border px-2 py-1 rounded-md font-mono text-xs transition duration-150 flex items-center space-x-1 shadow-sm ${
                        token.colors.badgeBg
                      } ${token.colors.badgeBorder} ${isDimmed ? 'opacity-25 filter grayscale-[50%]' : ''}`}
                      title={`${token.title}\nClick to copy parameter`}
                    >
                      <span className="text-[9px] uppercase tracking-wider text-amber-400 font-semibold mr-0.5 select-none opacity-60 group-hover:opacity-100">
                        ARG
                      </span>
                      <span className="text-amber-300 font-mono font-medium">{token.raw}</span>
                      {isCopied && (
                        <span className="ml-1 text-[9px] text-emerald-400 flex items-center">
                          <Check className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                  );
                }

                if (token.type === 'wrapper') {
                  return (
                    <div
                      key={token.id}
                      onClick={(e) => handleCopySingleToken(token, e)}
                      onMouseEnter={() => setInspectedToken(token)}
                      className={`group relative cursor-pointer border px-2 py-1 rounded-md font-mono text-xs transition duration-150 flex items-center space-x-1 shadow-sm ${
                        token.colors.badgeBg
                      } ${token.colors.badgeBorder} ${isDimmed ? 'opacity-25 filter grayscale-[50%]' : ''}`}
                      title={`${token.title}\nClick to copy parameter`}
                    >
                      <span className="text-[9px] uppercase tracking-wider text-orange-400 font-semibold mr-0.5 select-none opacity-60 group-hover:opacity-100">
                        WRAP
                      </span>
                      <span className="text-orange-300 font-semibold">{token.raw}</span>
                      {isCopied && (
                        <span className="ml-1 text-[9px] text-emerald-400 flex items-center">
                          <Check className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                  );
                }

                if (token.type === 'command') {
                  return (
                    <div
                      key={token.id}
                      onClick={(e) => handleCopySingleToken(token, e)}
                      onMouseEnter={() => setInspectedToken(token)}
                      className={`group relative cursor-pointer border px-2.5 py-1 rounded-md font-mono text-xs transition duration-150 flex items-center space-x-1.5 shadow-sm ${
                        token.colors.badgeBg
                      } ${token.colors.badgeBorder} ${isDimmed ? 'opacity-25 filter grayscale-[50%]' : ''}`}
                      title="Steam Executable Target Placeholder (%command%)"
                    >
                      <span className="text-[9px] uppercase tracking-wider text-emerald-400 font-bold mr-0.5 select-none">
                        STEAM
                      </span>
                      <span className="text-emerald-300 font-bold tracking-wide">%command%</span>
                      {isCopied && (
                        <span className="ml-1 text-[9px] text-emerald-400 flex items-center">
                          <Check className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                  );
                }

                return null;
              })}
            </div>
          ) : (
            /* 2. Terminal Shell Code View */
            <div className="font-mono text-xs leading-relaxed flex flex-wrap items-center gap-x-2 gap-y-1 w-full">
              <span className="text-emerald-400 font-bold select-none">$</span>
              {tokens.map((token, idx) => {
                const isDimmed = activeFilter !== 'all' && activeFilter !== token.type;

                if (token.type === 'env_var') {
                  return (
                    <span
                      key={idx}
                      onMouseEnter={() => setInspectedToken(token)}
                      className={`cursor-pointer hover:underline underline-offset-4 transition ${
                        isDimmed ? 'opacity-25' : ''
                      }`}
                      title={token.title}
                    >
                      <span className="text-cyan-400 font-semibold">{token.envKey}</span>
                      <span className="text-slate-500">=</span>
                      <span className="text-sky-200">{token.envValue}</span>
                    </span>
                  );
                }

                if (token.type === 'wrapper') {
                  return (
                    <span
                      key={idx}
                      onMouseEnter={() => setInspectedToken(token)}
                      className={`text-orange-300 font-semibold cursor-pointer hover:underline underline-offset-4 transition ${
                        isDimmed ? 'opacity-25' : ''
                      }`}
                      title={token.title}
                    >
                      {token.raw}
                    </span>
                  );
                }

                if (token.type === 'command') {
                  return (
                    <span
                      key={idx}
                      onMouseEnter={() => setInspectedToken(token)}
                      className={`text-emerald-400 font-bold underline decoration-emerald-500/70 underline-offset-4 transition ${
                        isDimmed ? 'opacity-25' : ''
                      }`}
                      title={token.title}
                    >
                      %command%
                    </span>
                  );
                }

                if (token.type === 'command_flag') {
                  return (
                    <span
                      key={idx}
                      onMouseEnter={() => setInspectedToken(token)}
                      className={`text-purple-300 font-medium cursor-pointer hover:underline underline-offset-4 transition ${
                        isDimmed ? 'opacity-25' : ''
                      }`}
                      title={token.title}
                    >
                      <span className="text-purple-400 font-bold">{token.flagPrefix}</span>
                      <span>{token.flagBody}</span>
                    </span>
                  );
                }

                return (
                  <span
                    key={idx}
                    onMouseEnter={() => setInspectedToken(token)}
                    className={`text-amber-300 font-mono cursor-pointer hover:underline underline-offset-4 transition ${
                      isDimmed ? 'opacity-25' : ''
                    }`}
                    title={token.title}
                  >
                    {token.raw}
                  </span>
                );
              })}
              <span className="inline-block w-1.5 h-3.5 bg-emerald-400/80 animate-pulse align-middle ml-1" />
            </div>
          )}
        </div>

        {/* Inspected Token Mini-Banner (hover details) */}
        {inspectedToken && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2 flex items-center justify-between text-[11px] animate-fadeIn">
            <div className="flex items-center space-x-2 min-w-0">
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold border ${inspectedToken.colors.categoryTagBg}`}>
                {inspectedToken.categoryLabel}
              </span>
              <span className="text-slate-200 font-semibold font-mono truncate">{inspectedToken.raw}</span>
              <span className="text-slate-400 truncate hidden md:inline">— {inspectedToken.description}</span>
            </div>
            <button
              onClick={() => setInspectedToken(null)}
              className="text-slate-500 hover:text-slate-300 text-xs px-1"
            >
              ×
            </button>
          </div>
        )}

        {/* Action Buttons Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
          
          {/* Steam Direct Launcher Trigger & Quick Arg */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleQuickLaunch}
              disabled={launchingSteam}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition shadow-md shadow-emerald-950/40 active:scale-95"
              title={`Directly launch ${selectedGame.name} via Steam URI protocol (steam://rungameid/${selectedGame.appId})`}
            >
              <Rocket className={`w-3.5 h-3.5 ${launchingSteam ? 'animate-spin' : ''}`} />
              <span>{launchingSteam ? 'Launching...' : 'Launch via Steam'}</span>
            </button>

            <button
              onClick={() => setIsLauncherModalOpen(true)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-2 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1 transition"
              title="Open Direct Steam Launcher details (CLI commands, .desktop shortcut export)"
            >
              <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Launch Hub</span>
            </button>

            {/* Quick Add Custom Argument Button */}
            <button
              onClick={() => setShowQuickAdd(!showQuickAdd)}
              className={`border px-2 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1 transition ${
                showQuickAdd
                  ? 'bg-amber-950/70 text-amber-300 border-amber-700/80'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title="Add custom command flags, arguments, or in-game cvars"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Add Flag / Arg</span>
            </button>
          </div>

          {/* Core Controls */}
          <div className="flex flex-wrap items-center gap-2">
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

        {/* Quick Add Custom Argument / Flag Tray */}
        {showQuickAdd && (
          <div className="bg-slate-900/90 border border-amber-900/50 rounded-xl p-3 space-y-2.5 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 flex items-center space-x-1.5">
                <Plus className="w-3.5 h-3.5 text-amber-400" />
                <span>Quick-Insert Command Flags & Arguments:</span>
              </span>
              <span className="text-[10px] text-slate-400">Appended to launch string</span>
            </div>

            {/* Common Flag Buttons */}
            <div className="flex flex-wrap gap-1.5">
              {QUICK_ARGS.map((qa, i) => (
                <button
                  key={i}
                  onClick={() => handleAddCustomArgument(qa.arg)}
                  className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-200 hover:text-amber-100 text-[11px] font-mono px-2 py-1 rounded-md transition flex items-center space-x-1"
                  title={qa.desc}
                >
                  <span>{qa.label}</span>
                  <span className="text-[9px] text-slate-400">({qa.desc})</span>
                </button>
              ))}
            </div>

            {/* Custom Input */}
            <div className="flex items-center space-x-2 pt-1">
              <input
                type="text"
                value={customArgInput}
                onChange={(e) => setCustomArgInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomArgument(customArgInput);
                  }
                }}
                placeholder="Type custom switch or cvar (e.g. +exec autoexec.cfg or --set /Config/...)"
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
              <button
                onClick={() => handleAddCustomArgument(customArgInput)}
                disabled={!customArgInput.trim()}
                className="bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs transition"
              >
                Append
              </button>
            </div>
          </div>
        )}

        {/* Syntax Token Breakdown Table (Expandable) */}
        {showBreakdown && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2 animate-fadeIn text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center space-x-2 text-cyan-300 font-semibold">
                <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
                <span>Launch Options Syntax Breakdown ({tokens.length} Elements)</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {stats.envVars} Env • {stats.wrappers} Wrapper • {stats.commandFlags} Flag • {stats.customArgs} Arg
              </span>
            </div>

            <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1 font-mono text-[11px]">
              {tokens.map((token, i) => (
                <div
                  key={token.id}
                  className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 hover:border-slate-700 transition"
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <span className="text-[10px] text-slate-500 w-4 select-none">#{i + 1}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border ${token.colors.categoryTagBg}`}>
                      {token.categoryLabel}
                    </span>
                    <span className="font-semibold text-slate-200 truncate">{token.raw}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 sm:text-right truncate sm:max-w-xs font-sans">
                    {token.title}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Direct Steam Launcher Modal */}
      {isLauncherModalOpen && (
        <React.Suspense fallback={null}>
          <DirectSteamLauncherModal
            isOpen={isLauncherModalOpen}
            onClose={() => setIsLauncherModalOpen(false)}
            game={selectedGame}
            currentLaunchOptions={commandString}
            onShowToast={(msg) => onWriteToSteamNotice?.(msg, true)}
          />
        </React.Suspense>
      )}

      {/* Active Flag Badges */}
      {activeFlagNames.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] text-slate-500 font-mono mr-1">Active Presets & Options:</span>
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
      {showSimulator && (() => {
        const exeInfo = getGameExecutableInfo(
          selectedGame.appId,
          selectedGame.name,
          selectedGame.installedPath,
          selectedGame.executablePath,
          selectedGame.installDirName
        );

        // Proton binary path based on selected runner
        const runnerPath = selectedGame.protonVersion.includes('GE')
          ? `~/.local/share/Steam/compatibilitytools.d/${selectedGame.protonVersion.replace(/\s+/g, '_')}/proton`
          : `~/.local/share/Steam/steamapps/common/${selectedGame.protonVersion.replace(/[\s-]+/g, ' ')}/proton`;

        const fullProcessCommand = `"${runnerPath}" run "${exeInfo.fullExePath}"`;
        const renderedFullBash = commandString.replace('%command%', fullProcessCommand);

        return (
          <div className="bg-slate-950/95 border border-cyan-500/30 rounded-xl p-3.5 space-y-2.5 mt-2 shadow-inner">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-cyan-400 text-xs font-semibold">
                <Play className="w-3.5 h-3.5 text-emerald-400" />
                <span>Resolved Steam Process & Executable Pipeline:</span>
              </div>
              <span className="text-[10px] bg-cyan-950/80 text-cyan-300 px-2 py-0.5 rounded border border-cyan-800/80 font-mono">
                {exeInfo.executableName}
              </span>
            </div>

            {/* Path breakdown details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase tracking-wider">Install Directory</span>
                <span className="text-slate-300 font-semibold truncate block" title={exeInfo.installDirName}>
                  {exeInfo.installDirName}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase tracking-wider">Game Executable Path</span>
                <span className="text-emerald-400 font-semibold truncate block" title={exeInfo.relativeExePath}>
                  {exeInfo.relativeExePath}
                </span>
              </div>
            </div>

            <div className="bg-slate-900/90 p-2.5 rounded-lg font-mono text-[11px] text-slate-300 border border-slate-800 break-all leading-relaxed">
              <span className="text-slate-500"># Native Linux Bash command evaluated by Steam runtime at launch:</span><br />
              <span className="text-amber-300">{renderedFullBash}</span>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

