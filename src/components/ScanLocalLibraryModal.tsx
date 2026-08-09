import React, { useState, useEffect } from 'react';
import { SteamGame } from '../types';
import { parseAppManifestAcf, parseLocalConfigVdf, isSteamRuntimeOrTool } from '../utils/vdfParser';
import { X, HardDrive, FolderSearch, RefreshCw, CheckCircle2, FolderInput, AlertCircle, Gamepad2, Upload, Sparkles } from 'lucide-react';

interface ScanLocalLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportGames: (newGames: SteamGame[], replaceSampleGames?: boolean) => void;
}

interface DetectedGameItem {
  appId: number;
  name: string;
  currentLaunchOptions: string;
  bannerUrl: string;
  bannerHeroUrl: string;
  protonVersion: string;
  selected: boolean;
  source: 'host-scan' | 'folder-picker' | 'vdf-file';
}

export const ScanLocalLibraryModal: React.FC<ScanLocalLibraryModalProps> = ({
  isOpen,
  onClose,
  onImportGames,
}) => {
  const [scanning, setScanning] = useState(false);
  const [detectedGames, setDetectedGames] = useState<DetectedGameItem[]>([]);
  const [steamFolderPaths, setSteamFolderPaths] = useState<string[]>([]);
  const [scanMessage, setScanMessage] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [replaceSampleGames, setReplaceSampleGames] = useState(true);

  const runHostScan = async () => {
    setScanning(true);
    setErrorMsg(null);
    setScanMessage('Scanning host system & Steam Deck directories...');
    try {
      const res = await fetch('/api/steam/scan-local');
      if (res.ok) {
        const data = await res.json();
        if (data.detectedGames && data.detectedGames.length > 0) {
          setSteamFolderPaths(data.steamAppsFolders || []);
          const formatted: DetectedGameItem[] = data.detectedGames
            .filter((g: any) => !isSteamRuntimeOrTool(g.name))
            .map((g: any) => ({
              appId: g.appId,
              name: g.name,
              currentLaunchOptions: g.currentLaunchOptions || '',
              bannerUrl: g.bannerUrl,
              bannerHeroUrl: g.bannerHeroUrl,
              protonVersion: 'Proton Experimental',
              selected: true,
              source: 'host-scan',
            }));
          setDetectedGames(formatted);
          setScanMessage(`Successfully found ${formatted.length} installed Steam games on system!`);
        } else {
          setScanMessage('No default Steam library found on system path. You can browse your Steam folder directly below!');
        }
      } else {
        throw new Error('API request failed');
      }
    } catch (err) {
      setErrorMsg('Direct host path scan unreadable or restricted. Use the directory picker below to select your Steam folder!');
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      runHostScan();
    }
  }, [isOpen]);

  // Handle HTML5 Webkit Directory Upload
  const handleFolderUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setScanning(true);
    setErrorMsg(null);
    setScanMessage('Parsing selected Steam folder files...');

    const gameMap = new Map<string, DetectedGameItem>();
    const launchOptsMap = new Map<string, string>();

    let acfCount = 0;

    const fileArray: File[] = Array.from(files);

    fileArray.forEach((file: File) => {
      const fileName = file.name.toLowerCase();

      // Read localconfig.vdf if uploaded
      if (fileName === 'localconfig.vdf') {
        const reader = new FileReader();
        reader.onload = (evt) => {
          const content = evt.target?.result as string;
          if (content) {
            const parsedVdf = parseLocalConfigVdf(content);
            parsedVdf.forEach((item) => {
              if (item.launchOptions) {
                launchOptsMap.set(item.appId, item.launchOptions);
              }
            });
          }
        };
        reader.readAsText(file);
      }

      // Read appmanifest_*.acf
      if (fileName.startsWith('appmanifest_') && fileName.endsWith('.acf')) {
        acfCount++;
        const reader = new FileReader();
        reader.onload = (evt) => {
          const content = evt.target?.result as string;
          if (content) {
            const parsed = parseAppManifestAcf(content);
            if (parsed && !isSteamRuntimeOrTool(parsed.name)) {
              const appIdNum = parseInt(parsed.appId, 10);
              gameMap.set(parsed.appId, {
                appId: appIdNum,
                name: parsed.name,
                currentLaunchOptions: launchOptsMap.get(parsed.appId) || '',
                bannerUrl: `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appIdNum}/header.jpg`,
                bannerHeroUrl: `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appIdNum}/library_hero.jpg`,
                protonVersion: 'Proton Experimental',
                selected: true,
                source: 'folder-picker',
              });
            }
          }
        };
        reader.readAsText(file);
      }
    });

    // Short delay to let FileReaders finish async processing
    setTimeout(() => {
      const items = Array.from(gameMap.values());
      setDetectedGames((prev) => {
        // Merge with existing detected games
        const mergedMap = new Map<number, DetectedGameItem>();
        prev.forEach((g) => mergedMap.set(g.appId, g));
        items.forEach((g) => {
          if (launchOptsMap.has(g.appId.toString())) {
            g.currentLaunchOptions = launchOptsMap.get(g.appId.toString())!;
          }
          mergedMap.set(g.appId, g);
        });
        return Array.from(mergedMap.values());
      });
      setScanMessage(`Processed directory! Found ${items.length} Steam manifest game files.`);
      setScanning(false);
    }, 400);
  };

  // Modern File System Access API (showDirectoryPicker)
  const handleShowDirectoryPicker = async () => {
    if (!('showDirectoryPicker' in window)) {
      setErrorMsg('Directory Picker API not supported by this browser. Use the folder upload input button!');
      return;
    }

    try {
      setScanning(true);
      setErrorMsg(null);
      // @ts-ignore
      const dirHandle = await window.showDirectoryPicker();
      setScanMessage(`Scanning directory "${dirHandle.name}"...`);

      const gameMap = new Map<string, DetectedGameItem>();

      async function scanDirectory(handle: any) {
        for await (const entry of handle.values()) {
          if (entry.kind === 'file') {
            const file = await entry.getFile();
            const fileName = file.name.toLowerCase();

            if (fileName.startsWith('appmanifest_') && fileName.endsWith('.acf')) {
              const text = await file.text();
              const parsed = parseAppManifestAcf(text);
              if (parsed && !isSteamRuntimeOrTool(parsed.name)) {
                const appIdNum = parseInt(parsed.appId, 10);
                gameMap.set(parsed.appId, {
                  appId: appIdNum,
                  name: parsed.name,
                  currentLaunchOptions: '',
                  bannerUrl: `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appIdNum}/header.jpg`,
                  bannerHeroUrl: `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appIdNum}/library_hero.jpg`,
                  protonVersion: 'Proton Experimental',
                  selected: true,
                  source: 'folder-picker',
                });
              }
            }
          } else if (entry.kind === 'directory' && (entry.name === 'steamapps' || entry.name === 'userdata')) {
            await scanDirectory(entry);
          }
        }
      }

      await scanDirectory(dirHandle);

      const items = Array.from(gameMap.values());
      setDetectedGames((prev) => {
        const mergedMap = new Map<number, DetectedGameItem>();
        prev.forEach((g) => mergedMap.set(g.appId, g));
        items.forEach((g) => mergedMap.set(g.appId, g));
        return Array.from(mergedMap.values());
      });
      setScanMessage(`Successfully imported ${items.length} games from selected folder!`);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setErrorMsg('Error reading selected directory: ' + err.message);
      }
    } finally {
      setScanning(false);
    }
  };

  const toggleSelectAll = (select: boolean) => {
    setDetectedGames((prev) => prev.map((g) => ({ ...g, selected: select })));
  };

  const toggleGameSelection = (appId: number) => {
    setDetectedGames((prev) =>
      prev.map((g) => (g.appId === appId ? { ...g, selected: !g.selected } : g))
    );
  };

  const handleImportSelected = () => {
    const selected = detectedGames.filter((g) => g.selected);
    const formattedGames: SteamGame[] = selected.map((g) => ({
      id: g.appId.toString(),
      appId: g.appId,
      name: g.name,
      bannerUrl: g.bannerUrl,
      bannerHeroUrl: g.bannerHeroUrl,
      protonVersion: g.protonVersion,
      currentLaunchOptions: g.currentLaunchOptions,
      isFavorite: false,
    }));

    onImportGames(formattedGames, replaceSampleGames);
    onClose();
  };

  if (!isOpen) return null;

  const selectedCount = detectedGames.filter((g) => g.selected).length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center space-x-3">
            <div className="bg-cyan-500/20 p-2.5 rounded-xl border border-cyan-500/30">
              <HardDrive className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-slate-100">Steam Local Library Auto-Detector</h2>
                <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full font-semibold border border-cyan-500/30">
                  Auto Scan & Import
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Detect all games installed in your Steam Library and import them into the manager
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scan Actions & Path Info Bar */}
        <div className="p-4 bg-slate-950/60 border-b border-slate-800 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <button
                onClick={runHostScan}
                disabled={scanning}
                className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition shadow-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
                <span>Rescan System Steam Paths</span>
              </button>

              <button
                onClick={handleShowDirectoryPicker}
                disabled={scanning}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3.5 py-1.5 rounded-xl text-xs font-medium flex items-center space-x-1.5 transition"
              >
                <FolderSearch className="w-3.5 h-3.5 text-amber-400" />
                <span>Select Steam Folder</span>
              </button>

              <label className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer flex items-center space-x-1.5 transition">
                <FolderInput className="w-3.5 h-3.5 text-cyan-400" />
                <span>Upload steamapps Directory</span>
                <input
                  type="file"
                  // @ts-ignore
                  webkitdirectory=""
                  directory=""
                  multiple
                  onChange={handleFolderUpload}
                  className="hidden"
                />
              </label>
            </div>

            {detectedGames.length > 0 && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => toggleSelectAll(true)}
                  className="text-xs text-cyan-400 hover:underline font-medium"
                >
                  Select All ({detectedGames.length})
                </button>
                <span className="text-slate-600">•</span>
                <button
                  onClick={() => toggleSelectAll(false)}
                  className="text-xs text-slate-400 hover:underline font-medium"
                >
                  Deselect All
                </button>
              </div>
            )}
          </div>

          {/* Path Status Banner */}
          {scanMessage && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-300 flex items-center justify-between">
              <div className="flex items-center space-x-2 truncate">
                <Sparkles className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                <span className="truncate">{scanMessage}</span>
              </div>
              {steamFolderPaths.length > 0 && (
                <span className="font-mono text-[10px] text-cyan-400/80 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 truncate max-w-xs">
                  {steamFolderPaths[0]}
                </span>
              )}
            </div>
          )}

          {errorMsg && (
            <div className="bg-amber-950/40 border border-amber-800/60 rounded-xl px-3.5 py-2 text-xs text-amber-300 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Detected Games List */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-950 space-y-2">
          {scanning && (
            <div className="flex flex-col items-center justify-center py-16 text-cyan-400 space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin" />
              <p className="text-sm font-semibold text-slate-200">Scanning Steam Library manifest files...</p>
            </div>
          )}

          {!scanning && detectedGames.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 space-y-3 text-slate-500">
              <Gamepad2 className="w-12 h-12 text-slate-700" />
              <p className="text-sm font-medium text-slate-300">No installed Steam games detected yet</p>
              <p className="text-xs text-slate-500 max-w-md text-center">
                Click <strong>"Select Steam Folder"</strong> or <strong>"Upload steamapps Directory"</strong> above to point to your Steam installation directory (e.g. <code className="text-cyan-400 font-mono">~/.local/share/Steam/steamapps</code>).
              </p>
            </div>
          )}

          {!scanning && detectedGames.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {detectedGames.map((game) => (
                <div
                  key={game.appId}
                  onClick={() => toggleGameSelection(game.appId)}
                  className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                    game.selected
                      ? 'bg-slate-900 border-cyan-500/50 text-slate-100 shadow-md'
                      : 'bg-slate-950/50 border-slate-800/80 text-slate-400 hover:bg-slate-900/50'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1 pr-2">
                    <img
                      src={game.bannerUrl}
                      alt={game.name}
                      className="w-14 h-10 object-cover rounded-lg border border-slate-700/60 bg-slate-800 flex-shrink-0"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-xs truncate text-slate-100">{game.name}</h4>
                      <p className="font-mono text-[10px] text-slate-500 mt-0.5">AppID: {game.appId}</p>
                      {game.currentLaunchOptions && (
                        <p className="font-mono text-[10px] text-cyan-400 truncate mt-1 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                          {game.currentLaunchOptions}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex-shrink-0 ml-2">
                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition ${
                        game.selected
                          ? 'bg-cyan-500 border-cyan-400 text-slate-950'
                          : 'border-slate-700 bg-slate-900'
                      }`}
                    >
                      {game.selected && <CheckCircle2 className="w-4 h-4 text-slate-950 stroke-[3]" />}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4">
            <p className="text-xs text-slate-400">
              Selected: <strong className="text-cyan-300 font-bold">{selectedCount}</strong> / {detectedGames.length} games
            </p>

            <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer select-none bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg hover:border-slate-700 transition">
              <input
                type="checkbox"
                checked={replaceSampleGames}
                onChange={(e) => setReplaceSampleGames(e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-cyan-500/20 w-3.5 h-3.5"
              />
              <span className="font-medium text-slate-200">Replace example games with detected library</span>
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              onClick={handleImportSelected}
              disabled={selectedCount === 0}
              className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition shadow-lg shadow-cyan-900/30"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Import {selectedCount} Games into Library</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
