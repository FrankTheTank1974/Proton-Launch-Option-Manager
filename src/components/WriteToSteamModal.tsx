import React, { useState, useEffect } from 'react';
import { SteamGame } from '../types';
import { updateVdfLaunchOptions, generateSampleVdf } from '../utils/vdfParser';
import {
  X,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  Download,
  Copy,
  Check,
  ExternalLink,
  FileText,
  Sparkles,
  RefreshCw,
  FolderOpen,
  HelpCircle,
  Play,
  Terminal,
  Layers,
  ArrowRight,
  ShieldCheck,
  Info,
} from 'lucide-react';

interface WriteToSteamModalProps {
  isOpen: boolean;
  onClose: () => void;
  game: SteamGame;
  launchOptions: string;
  allGames: SteamGame[];
  onGameUpdated?: (updatedGame: SteamGame) => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const WriteToSteamModal: React.FC<WriteToSteamModalProps> = ({
  isOpen,
  onClose,
  game,
  launchOptions,
  allGames,
  onGameUpdated,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<'auto' | 'browser_fs' | 'gui' | 'launch'>('auto');
  const [isWriting, setIsWriting] = useState(false);
  const [customPath, setCustomPath] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [writeResult, setWriteResult] = useState<{
    success: boolean;
    message: string;
    updatedFiles?: string[];
    backupFiles?: string[];
    instructions?: string;
  } | null>(null);

  // Browser File System API state
  const [browserFsStatus, setBrowserFsStatus] = useState<{
    type: 'idle' | 'success' | 'error';
    message: string;
  }>({ type: 'idle', message: '' });

  // Update in-memory game state whenever this modal opens with current options
  useEffect(() => {
    if (isOpen && onGameUpdated) {
      onGameUpdated({
        ...game,
        currentLaunchOptions: launchOptions,
      });
    }
  }, [isOpen, game.appId, launchOptions]);

  if (!isOpen) return null;

  const handleCopyCommand = () => {
    navigator.clipboard.writeText(launchOptions);
    setCopied(true);
    showToast?.('Launch options copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCopyPath = (pathText: string) => {
    navigator.clipboard.writeText(pathText);
    setCopiedPath(pathText);
    showToast?.('Path copied to clipboard!', 'info');
    setTimeout(() => setCopiedPath(null), 2500);
  };

  // Method 1: Local Host Server Direct Write
  const handleHostDirectWrite = async () => {
    setIsWriting(true);
    setWriteResult(null);

    try {
      const res = await fetch('/api/steam/write-launch-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appId: game.appId,
          launchOptions,
          customPath: customPath.trim() || undefined,
        }),
      });

      const data = await res.json();
      setWriteResult(data);

      if (data.success) {
        showToast?.('Successfully written to Steam configuration!', 'success');
      } else {
        showToast?.(data.message || 'No local Steam configuration found on standard host paths.', 'error');
      }
    } catch (err: any) {
      setWriteResult({
        success: false,
        message: 'Could not connect to local Steam writer service.',
      });
      showToast?.('Error communicating with write service.', 'error');
    } finally {
      setIsWriting(false);
    }
  };

  // Method 2: Modern Web File System Access API (Direct Local File Picker & Write)
  const handleBrowserFileSystemWrite = async () => {
    setBrowserFsStatus({ type: 'idle', message: '' });

    if (!('showOpenFilePicker' in window)) {
      setBrowserFsStatus({
        type: 'error',
        message: 'Your current browser does not support the File System Access API. Please use the Download .vdf or Copy options below, or try Google Chrome / Microsoft Edge / Chromium.',
      });
      return;
    }

    try {
      // Prompt user to pick localconfig.vdf
      const [fileHandle] = await (window as any).showOpenFilePicker({
        types: [
          {
            description: 'Steam localconfig.vdf',
            accept: {
              'text/plain': ['.vdf', '.txt'],
            },
          },
        ],
        multiple: false,
      });

      const file = await fileHandle.getFile();
      const content = await file.text();

      // Update the launch options inside the VDF text using brace-aware parser
      const updatedVdf = updateVdfLaunchOptions(content, String(game.appId), launchOptions);

      // Write back to the local file
      const writable = await fileHandle.createWritable();
      await writable.write(updatedVdf);
      await writable.close();

      setBrowserFsStatus({
        type: 'success',
        message: `Successfully wrote launch options for "${game.name}" directly to "${file.name}"! Please restart Steam to load the updated settings.`,
      });
      showToast?.(`Directly synced launch options to ${file.name}!`, 'success');
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setBrowserFsStatus({
          type: 'error',
          message: `File write error: ${err.message || 'Permission denied or file locked.'}`,
        });
      }
    }
  };

  // Method 3: Download Complete Patched localconfig.vdf
  const handleDownloadPatchedVdf = () => {
    const updatedGames = allGames.map((g) =>
      g.appId === game.appId ? { ...g, currentLaunchOptions: launchOptions } : g
    );
    const vdfContent = generateSampleVdf(updatedGames);

    const blob = new Blob([vdfContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'localconfig.vdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast?.('Downloaded localconfig.vdf! Move it to your Steam config folder.', 'info');
  };

  // Method 4: Launch via Steam URL protocol
  const handleDirectSteamLaunch = async () => {
    try {
      const res = await fetch('/api/steam/launch-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appId: game.appId,
          gameName: game.name,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast?.(`Dispatched Steam launch for ${game.name}!`, 'success');
      } else {
        // Fallback to window steam:// protocol
        window.location.href = `steam://rungameid/${game.appId}`;
        showToast?.(`Opening steam://rungameid/${game.appId}`, 'info');
      }
    } catch {
      window.location.href = `steam://rungameid/${game.appId}`;
    }
  };

  // Download Linux .desktop launcher file
  const handleDownloadDesktopFile = () => {
    const desktopFileContent = `[Desktop Entry]
Name=${game.name} (Proton Optimized)
Comment=Launch ${game.name} with custom Proton launch options
Exec=env ${launchOptions.replace(/%command%/g, '')} steam steam://rungameid/${game.appId}
Icon=steam_icon_${game.appId}
Terminal=false
Type=Application
Categories=Game;
`;
    const blob = new Blob([desktopFileContent], { type: 'application/x-desktop' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${game.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_Proton.desktop`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast?.('Downloaded .desktop shortcut launcher!', 'success');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl flex flex-col shadow-2xl overflow-hidden max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-2.5 rounded-xl shadow-md flex items-center justify-center">
              <HardDrive className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-slate-100">Write to Steam Configuration</h2>
                <span className="bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 text-[10px] font-mono px-2 py-0.5 rounded-md font-semibold">
                  AppID: {game.appId}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Synchronize Proton launch flags to your Steam client and <span className="font-mono text-slate-300">localconfig.vdf</span>
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

        {/* Selected Game & Command Banner */}
        <div className="bg-slate-950/60 p-3.5 border-b border-slate-800/80 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-slate-300">Target Game:</span>
              <span className="text-xs font-bold text-white bg-slate-800 px-2.5 py-0.5 rounded-md border border-slate-700">
                {game.name}
              </span>
            </div>
            <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> Saved in App Library
            </span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between gap-2">
            <div className="font-mono text-xs text-cyan-300 truncate select-all">
              {launchOptions || '%command%'}
            </div>
            <button
              onClick={handleCopyCommand}
              className="flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2.5 py-1 rounded-lg text-xs font-medium transition shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Method Navigation Tabs */}
        <div className="flex items-center border-b border-slate-800 bg-slate-950/40 px-3 pt-2 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('auto')}
            className={`flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition border-b-2 ${
              activeTab === 'auto'
                ? 'border-cyan-500 text-cyan-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Direct System Write</span>
          </button>

          <button
            onClick={() => setActiveTab('browser_fs')}
            className={`flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition border-b-2 ${
              activeTab === 'browser_fs'
                ? 'border-cyan-500 text-cyan-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Browser File Sync (1-Click)</span>
          </button>

          <button
            onClick={() => setActiveTab('gui')}
            className={`flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition border-b-2 ${
              activeTab === 'gui'
                ? 'border-cyan-500 text-cyan-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Steam GUI / Export</span>
          </button>

          <button
            onClick={() => setActiveTab('launch')}
            className={`flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition border-b-2 ${
              activeTab === 'launch'
                ? 'border-cyan-500 text-cyan-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            <span>Instant Launch</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto max-h-[50vh] space-y-4 bg-slate-900 custom-scrollbar">
          
          {/* TAB 1: Direct System Write */}
          {activeTab === 'auto' && (
            <div className="space-y-3">
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-cyan-400" />
                    Automatic Steam Path Detector
                  </span>
                  <span className="text-[11px] text-slate-400">Scans Native, Flatpak, Snap & Steam Deck paths</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  When running locally on your Linux PC or Steam Deck, clicking below immediately backs up and updates your <span className="font-mono text-cyan-300">localconfig.vdf</span> file.
                </p>

                {/* Custom Path Override */}
                <div className="pt-2">
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Custom Steam Path / localconfig.vdf Override (Optional):
                  </label>
                  <input
                    type="text"
                    placeholder="/home/deck/.local/share/Steam/userdata/12345/config/localconfig.vdf"
                    value={customPath}
                    onChange={(e) => setCustomPath(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="pt-1 flex items-center gap-2">
                  <button
                    onClick={handleHostDirectWrite}
                    disabled={isWriting}
                    className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 shadow-md transition"
                  >
                    <HardDrive className={`w-4 h-4 ${isWriting ? 'animate-spin' : ''}`} />
                    <span>{isWriting ? 'Writing to Disk...' : 'Write Directly to Steam Configuration'}</span>
                  </button>
                </div>
              </div>

              {/* Write Result Feedback */}
              {writeResult && (
                <div
                  className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                    writeResult.success
                      ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
                      : 'bg-amber-950/40 border-amber-800 text-amber-200'
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    {writeResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="font-semibold">{writeResult.message}</p>
                      {writeResult.instructions && (
                        <p className="text-slate-300 mt-1">{writeResult.instructions}</p>
                      )}
                      {writeResult.updatedFiles && writeResult.updatedFiles.length > 0 && (
                        <div className="mt-2 text-[11px] font-mono text-slate-300 bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                          <span className="text-emerald-400 font-bold block mb-0.5">Updated Files:</span>
                          {writeResult.updatedFiles.map((f, i) => (
                            <div key={i} className="truncate">• {f}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Steam Restart Notice */}
              <div className="bg-blue-950/30 border border-blue-800/40 rounded-xl p-3 flex items-start space-x-2.5 text-xs text-blue-300">
                <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <p>
                  <strong>Important Steam Note:</strong> Valve Steam caches configuration in memory while running. Please <strong>restart Steam</strong> (or exit Steam before applying) so it reloads the modified <span className="font-mono text-blue-200">localconfig.vdf</span>.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: Browser Direct File Sync (Web File System Access API) */}
          {activeTab === 'browser_fs' && (
            <div className="space-y-3">
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-xs font-bold text-slate-200">
                    Direct Browser File System Sync (Zero-Install)
                  </h3>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  If you are accessing this tool via a web browser (Chrome, Edge, Chromium, Brave, or Steam Deck desktop browser), you can grant permission to select your <span className="font-mono text-cyan-300">localconfig.vdf</span> file once. The browser will update the file directly on your local hard drive!
                </p>

                <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg space-y-2 text-xs">
                  <span className="text-slate-300 font-semibold block">Quick Standard Paths to find your file:</span>
                  
                  <div className="flex items-center justify-between bg-slate-950 p-1.5 rounded font-mono text-[11px] text-slate-300">
                    <span className="truncate">Linux Native: ~/.local/share/Steam/userdata/&lt;user_id&gt;/config/localconfig.vdf</span>
                    <button
                      onClick={() => handleCopyPath('~/.local/share/Steam/userdata/')}
                      className="text-cyan-400 hover:text-cyan-300 text-xs px-2 py-0.5 bg-slate-800 rounded"
                    >
                      {copiedPath === '~/.local/share/Steam/userdata/' ? 'Copied' : 'Copy'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between bg-slate-950 p-1.5 rounded font-mono text-[11px] text-slate-300">
                    <span className="truncate">Steam Deck: /home/deck/.local/share/Steam/userdata/&lt;user_id&gt;/config/localconfig.vdf</span>
                    <button
                      onClick={() => handleCopyPath('/home/deck/.local/share/Steam/userdata/')}
                      className="text-cyan-400 hover:text-cyan-300 text-xs px-2 py-0.5 bg-slate-800 rounded"
                    >
                      {copiedPath === '/home/deck/.local/share/Steam/userdata/' ? 'Copied' : 'Copy'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between bg-slate-950 p-1.5 rounded font-mono text-[11px] text-slate-300">
                    <span className="truncate">Flatpak: ~/.var/app/com.valvesoftware.Steam/.local/share/Steam/userdata/</span>
                    <button
                      onClick={() => handleCopyPath('~/.var/app/com.valvesoftware.Steam/.local/share/Steam/userdata/')}
                      className="text-cyan-400 hover:text-cyan-300 text-xs px-2 py-0.5 bg-slate-800 rounded"
                    >
                      {copiedPath === '~/.var/app/com.valvesoftware.Steam/.local/share/Steam/userdata/' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    onClick={handleBrowserFileSystemWrite}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 shadow-md transition"
                  >
                    <FolderOpen className="w-4 h-4" />
                    <span>Select & Sync localconfig.vdf on this PC</span>
                  </button>
                </div>

                {/* Status message */}
                {browserFsStatus.type !== 'idle' && (
                  <div
                    className={`p-3 rounded-xl border text-xs flex items-start space-x-2 ${
                      browserFsStatus.type === 'success'
                        ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
                        : 'bg-amber-950/40 border-amber-800 text-amber-200'
                    }`}
                  >
                    {browserFsStatus.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    )}
                    <span>{browserFsStatus.message}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Steam GUI / Manual Export */}
          {activeTab === 'gui' && (
            <div className="space-y-3">
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-3">
                <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  Apply via Official Steam Client GUI (3 Clicks)
                </h3>

                <div className="space-y-2 text-xs text-slate-300">
                  <div className="flex items-start space-x-2.5">
                    <span className="bg-slate-800 text-cyan-400 font-bold px-2 py-0.5 rounded text-[11px] shrink-0">1</span>
                    <span>Open your <strong>Steam Client</strong> and find <strong>{game.name}</strong> in your library.</span>
                  </div>
                  <div className="flex items-start space-x-2.5">
                    <span className="bg-slate-800 text-cyan-400 font-bold px-2 py-0.5 rounded text-[11px] shrink-0">2</span>
                    <span>Right-click <strong>{game.name}</strong> &rarr; Select <strong>Properties...</strong> &rarr; <strong>General</strong> tab.</span>
                  </div>
                  <div className="flex items-start space-x-2.5">
                    <span className="bg-slate-800 text-cyan-400 font-bold px-2 py-0.5 rounded text-[11px] shrink-0">3</span>
                    <span>Paste the command string into the <strong>Launch Options</strong> text field.</span>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between gap-2">
                  <div className="font-mono text-xs text-cyan-300 truncate select-all">
                    {launchOptions || '%command%'}
                  </div>
                  <button
                    onClick={handleCopyCommand}
                    className="flex items-center space-x-1.5 bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition shrink-0"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied!' : 'Copy String'}</span>
                  </button>
                </div>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Download Patched localconfig.vdf</h4>
                  <p className="text-[11px] text-slate-400">Downloads ready-to-use configuration file for drop-in replacement.</p>
                </div>
                <button
                  onClick={handleDownloadPatchedVdf}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5 text-blue-400" />
                  <span>Download .vdf</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: Instant Launch & Shortcuts */}
          {activeTab === 'launch' && (
            <div className="space-y-3">
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-3">
                <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Play className="w-4 h-4 text-emerald-400" />
                  Direct Steam Protocol & Desktop Shortcuts
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Trigger Steam directly via the <span className="font-mono text-cyan-300">steam://rungameid/{game.appId}</span> protocol handler or download a standalone Linux Desktop shortcut.
                </p>

                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    onClick={handleDirectSteamLaunch}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 shadow-md transition"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Launch {game.name} via Steam URI</span>
                  </button>

                  <button
                    onClick={handleDownloadDesktopFile}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition"
                  >
                    <Download className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Download .desktop Launcher</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <p className="text-xs text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Options saved in Proton Manager session for AppID {game.appId}</span>
          </p>

          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-1.5 rounded-xl text-xs font-semibold transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
