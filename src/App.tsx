import React, { useState, useMemo } from 'react';
import { INITIAL_STEAM_GAMES } from './data/steamGamesData';
import { SteamGame, CustomEnvVar, PresetProfile, VdfAppConfig } from './types';
import { parseCommandString, generateCommandString } from './utils/commandGenerator';
import { Header } from './components/Header';
import { GameLibraryList } from './components/GameLibraryList';
import { FlagChecklist } from './components/FlagChecklist';
import { LiveCommandPreview } from './components/LiveCommandPreview';
import { CCodeGeneratorModal } from './components/CCodeGeneratorModal';
import { VdfImportExportModal } from './components/VdfImportExportModal';
import { PresetProfilesModal } from './components/PresetProfilesModal';
import { GeminiAssistantModal } from './components/GeminiAssistantModal';
import { AddGameModal } from './components/AddGameModal';
import { ProtonDbModal } from './components/ProtonDbModal';
import { ScanLocalLibraryModal } from './components/ScanLocalLibraryModal';
import { ProtonManagerModal } from './components/ProtonManagerModal';
import { BackupModal } from './components/BackupModal';
import { SteamGridDbModal } from './components/SteamGridDbModal';
import { ProtonVersionSelector } from './components/ProtonVersionSelector';
import { PROTON_FLAGS } from './data/protonFlagsData';
import { Sparkles, Terminal, Gamepad2, ShieldCheck, CheckCircle2, MessageSquareQuote, Image as ImageIcon } from 'lucide-react';

export default function App() {
  const [games, setGames] = useState<SteamGame[]>(INITIAL_STEAM_GAMES);
  const [selectedGameId, setSelectedGameId] = useState<string>(INITIAL_STEAM_GAMES[0].id);
  const [distro, setDistro] = useState<string>('Arch / SteamOS');

  // Currently selected game object
  const selectedGame = useMemo(() => {
    return games.find((g) => g.id === selectedGameId) || games[0];
  }, [games, selectedGameId]);

  // Initial command state parsed from selected game's launch options
  const initialCommandState = useMemo(() => {
    return parseCommandString(selectedGame.currentLaunchOptions);
  }, [selectedGame.id]);

  // Active flag states
  const [enabledFlags, setEnabledFlags] = useState<Record<string, string | boolean>>(
    () => initialCommandState.enabledFlags
  );
  const [customEnvVars, setCustomEnvVars] = useState<CustomEnvVar[]>(
    () => initialCommandState.customEnvVars
  );
  const [extraArgs, setExtraArgs] = useState<string>(
    () => initialCommandState.extraArgs
  );
  const [wrapperOrder, setWrapperOrder] = useState<string[]>(
    () => initialCommandState.wrapperOrder
  );

  // Modals state
  const [isCCodeOpen, setIsCCodeOpen] = useState(false);
  const [isVdfSyncOpen, setIsVdfSyncOpen] = useState(false);
  const [isPresetsOpen, setIsPresetsOpen] = useState(false);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [isProtonDbModalOpen, setIsProtonDbModalOpen] = useState(false);
  const [isAddGameOpen, setIsAddGameOpen] = useState(false);
  const [isScanLocalLibraryOpen, setIsScanLocalLibraryOpen] = useState(false);
  const [isProtonManagerOpen, setIsProtonManagerOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [isSteamGridDbOpen, setIsSteamGridDbOpen] = useState(false);

  // Restore games from JSON backup
  const handleImportBackupGames = (importedGames: SteamGame[]) => {
    setGames(importedGames);
    if (importedGames.length > 0) {
      setSelectedGameId(importedGames[0].id);
      handleSelectGame(importedGames[0]);
    }
  };

  // Auto-fetch missing official Steam release dates and metadata from Steam Store API
  React.useEffect(() => {
    const missingDates = games.filter((g) => !g.releaseDate && g.appId > 0);
    if (missingDates.length === 0) return;

    const appIds = missingDates.map((g) => g.appId);
    fetch('/api/steam/batch-app-details', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appIds }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.details) {
          setGames((prev) =>
            prev.map((g) => {
              const detail = data.details[g.appId];
              if (detail && detail.releaseDate) {
                return {
                  ...g,
                  releaseDate: detail.releaseDate,
                  developer: (!g.developer || g.developer === 'Custom Title') ? (detail.developer || g.developer) : g.developer,
                };
              }
              return g;
            })
          );
        }
      })
      .catch((e) => console.warn('Failed fetching Steam release dates:', e));
  }, [games.length]);

  // Update custom artwork cover for a game
  const handleUpdateGameCover = (gameId: string, bannerUrl: string, iconUrl?: string) => {
    setGames((prev) =>
      prev.map((g) =>
        g.id === gameId ? { ...g, bannerUrl, iconUrl: iconUrl || g.iconUrl } : g
      )
    );
  };

  // Import detected games from local scan or directory picker
  const handleImportLocalGames = (newGames: SteamGame[], replaceSampleGames: boolean = true) => {
    if (newGames.length === 0) return;

    setGames((prev) => {
      if (replaceSampleGames) {
        // Replace current sample games with user's detected local library
        return newGames;
      } else {
        const existingAppIds = new Set(prev.map((g) => g.appId));
        const filteredNew = newGames.filter((g) => !existingAppIds.has(g.appId));
        
        // Update existing games if new launch options detected
        const updatedPrev = prev.map((existing) => {
          const foundNew = newGames.find((n) => n.appId === existing.appId);
          if (foundNew && foundNew.currentLaunchOptions && !existing.currentLaunchOptions) {
            return { ...existing, currentLaunchOptions: foundNew.currentLaunchOptions };
          }
          return existing;
        });

        return [...updatedPrev, ...filteredNew];
      }
    });

    if (newGames.length > 0) {
      handleSelectGame(newGames[0]);
      showToast(
        replaceSampleGames
          ? `Replaced sample library with ${newGames.length} detected local games!`
          : `Imported ${newGames.length} games into Steam library`
      );
    }
  };

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Switch selected game and reset form state to game's stored launch options
  const handleSelectGame = (game: SteamGame) => {
    setSelectedGameId(game.id);
    const parsed = parseCommandString(game.currentLaunchOptions);
    setEnabledFlags(parsed.enabledFlags);
    setCustomEnvVars(parsed.customEnvVars);
    setExtraArgs(parsed.extraArgs);
    setWrapperOrder(parsed.wrapperOrder);
  };

  // Toggle flag callback
  const handleToggleFlag = (flagId: string, value: string | boolean) => {
    setEnabledFlags((prev) => ({
      ...prev,
      [flagId]: value,
    }));
  };

  // Custom Env Vars callbacks
  const handleAddCustomEnvVar = (key: string, value: string) => {
    setCustomEnvVars((prev) => [
      ...prev,
      { id: Math.random().toString(36).substring(2, 9), key, value, enabled: true },
    ]);
  };

  const handleRemoveCustomEnvVar = (id: string) => {
    setCustomEnvVars((prev) => prev.filter((env) => env.id !== id));
  };

  const handleToggleCustomEnvVar = (id: string, enabled: boolean) => {
    setCustomEnvVars((prev) =>
      prev.map((env) => (env.id === id ? { ...env, enabled } : env))
    );
  };

  // Generate real-time live command string
  const currentCommandString = useMemo(() => {
    return generateCommandString(enabledFlags, customEnvVars, extraArgs, wrapperOrder);
  }, [enabledFlags, customEnvVars, extraArgs, wrapperOrder]);

  // Apply command to current selected game
  const handleApplyCommandToGame = (newCommand: string) => {
    setGames((prev) =>
      prev.map((g) =>
        g.id === selectedGame.id
          ? {
              ...g,
              currentLaunchOptions: newCommand,
              lastUpdated: new Date().toISOString().replace('T', ' ').substring(0, 16),
            }
          : g
      )
    );
    showToast(`Updated launch options for ${selectedGame.name}`);
  };

  // Handle Preset selection
  const handleSelectPreset = (preset: PresetProfile) => {
    setEnabledFlags(preset.enabledFlags);
    setCustomEnvVars(
      preset.customEnvVars.map((e) => ({
        id: Math.random().toString(36).substring(2, 9),
        key: e.key,
        value: e.value,
        enabled: true,
      }))
    );
    setExtraArgs(preset.extraArgs);
    if (preset.wrapperOrder.length > 0) {
      setWrapperOrder(preset.wrapperOrder);
    }
    showToast(`Applied hardware preset: ${preset.title}`);
  };

  // Handle VDF Import
  const handleImportVdfGames = (vdfApps: VdfAppConfig[]) => {
    let updatedCount = 0;
    setGames((prev) =>
      prev.map((g) => {
        const match = vdfApps.find((v) => parseInt(v.appId, 10) === g.appId);
        if (match) {
          updatedCount++;
          return {
            ...g,
            currentLaunchOptions: match.launchOptions,
            lastUpdated: new Date().toISOString().replace('T', ' ').substring(0, 16),
          };
        }
        return g;
      })
    );
    showToast(`Synced ${updatedCount} games from localconfig.vdf`);
  };

  // Handle Favorite toggle
  const handleToggleFavorite = (id: string) => {
    setGames((prev) =>
      prev.map((g) => (g.id === id ? { ...g, isFavorite: !g.isFavorite } : g))
    );
  };

  // Handle Add custom game
  const handleAddGame = (newGame: SteamGame) => {
    setGames((prev) => [newGame, ...prev]);
    setSelectedGameId(newGame.id);
    handleSelectGame(newGame);
    showToast(`Added ${newGame.name} to library`);
  };

  // Compute active flag names for chip display
  const activeFlagNames = useMemo(() => {
    const names: string[] = [];
    PROTON_FLAGS.forEach((f) => {
      const val = enabledFlags[f.id];
      if (val === true) names.push(f.name);
      else if (typeof val === 'string' && val.length > 0) names.push(`${f.name}=${val}`);
    });
    customEnvVars.forEach((e) => {
      if (e.enabled && e.key) names.push(`${e.key}=${e.value}`);
    });
    return names;
  }, [enabledFlags, customEnvVars]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-cyan-600 text-white px-4 py-2.5 rounded-xl shadow-2xl border border-cyan-400/40 flex items-center space-x-2 animate-bounce text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 text-cyan-200" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Header */}
      <Header
        distro={distro}
        setDistro={setDistro}
        onOpenCCode={() => setIsCCodeOpen(true)}
        onOpenVdfSync={() => setIsVdfSyncOpen(true)}
        onOpenPresets={() => setIsPresetsOpen(true)}
        onOpenAIAssistant={() => setIsAIAssistantOpen(true)}
        onOpenAddGame={() => setIsAddGameOpen(true)}
        onOpenScanLocalLibrary={() => setIsScanLocalLibraryOpen(true)}
        onOpenProtonManager={() => setIsProtonManagerOpen(true)}
        onOpenBackup={() => setIsBackupOpen(true)}
      />

      {/* Primary Layout Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Sidebar: Game Selector */}
        <div className="lg:col-span-4 h-full">
          <GameLibraryList
            games={games}
            selectedGameId={selectedGame.id}
            onSelectGame={handleSelectGame}
            onToggleFavorite={handleToggleFavorite}
            onOpenAddGame={() => setIsAddGameOpen(true)}
            onOpenScanLocalLibrary={() => setIsScanLocalLibraryOpen(true)}
            onOpenSteamGridDb={(g) => {
              setSelectedGameId(g.id);
              setIsSteamGridDbOpen(true);
            }}
          />
        </div>

        {/* Right Area: Proton Checklist & Live Command Preview */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          
          {/* Currently Selected Game Info Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-md">
            <div className="flex items-center space-x-3">
              <div 
                className="w-12 h-12 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0 border border-slate-700 cursor-pointer relative group/cover"
                title="Click to edit SteamGridDB artwork"
                onClick={() => setIsSteamGridDbOpen(true)}
              >
                <img
                  src={selectedGame.bannerUrl}
                  alt={selectedGame.name}
                  className="w-full h-full object-cover group-hover/cover:scale-105 transition duration-200"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${selectedGame.appId}/header.jpg`;
                  }}
                />
                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover/cover:opacity-100 flex items-center justify-center transition">
                  <ImageIcon className="w-4 h-4 text-purple-300" />
                </div>
              </div>

              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-base font-bold text-slate-100">{selectedGame.name}</h2>
                  <span className="bg-slate-800 text-slate-400 font-mono text-xs px-2 py-0.5 rounded-md border border-slate-700">
                    AppID: {selectedGame.appId}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-2">
                  <div className="flex items-center space-x-1">
                    <span className="text-slate-400 font-medium">Runner:</span>
                    <ProtonVersionSelector
                      value={selectedGame.protonVersion || 'Proton Experimental'}
                      onChange={(newVersion) => {
                        setGames((prev) =>
                          prev.map((g) =>
                            g.id === selectedGame.id ? { ...g, protonVersion: newVersion } : g
                          )
                        );
                        showToast(`Set Proton version for "${selectedGame.name}" to ${newVersion}`);
                      }}
                    />
                  </div>
                  <span>•</span>
                  <span>Developer: {selectedGame.developer || 'Valve / Community'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsSteamGridDbOpen(true)}
                className="bg-purple-900/40 hover:bg-purple-900/70 text-purple-200 border border-purple-700/50 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition shadow-sm"
                title="Manage SteamGridDB artwork covers"
              >
                <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
                <span>SteamGridDB Artwork</span>
              </button>
              <button
                onClick={() => setIsProtonDbModalOpen(true)}
                className="bg-amber-900/40 hover:bg-amber-900/70 text-amber-200 border border-amber-700/50 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition shadow-sm"
              >
                <MessageSquareQuote className="w-3.5 h-3.5 text-amber-400" />
                <span>ProtonDB Advice</span>
              </button>
              <button
                onClick={() => setIsAIAssistantOpen(true)}
                className="bg-purple-900/40 hover:bg-purple-900/70 text-purple-200 border border-purple-700/50 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>AI Optimizer</span>
              </button>
            </div>
          </div>

          {/* Live Command Preview Box */}
          <LiveCommandPreview
            commandString={currentCommandString}
            selectedGame={selectedGame}
            onApplyCommand={handleApplyCommandToGame}
            activeFlagNames={activeFlagNames}
            onWriteToSteamNotice={(msg) => showToast(msg)}
          />

          {/* Proton Flag Checklist Component */}
          <FlagChecklist
            enabledFlags={enabledFlags}
            onToggleFlag={handleToggleFlag}
            customEnvVars={customEnvVars}
            onAddCustomEnvVar={handleAddCustomEnvVar}
            onRemoveCustomEnvVar={handleRemoveCustomEnvVar}
            onToggleCustomEnvVar={handleToggleCustomEnvVar}
            extraArgs={extraArgs}
            onChangeExtraArgs={setExtraArgs}
            distro={distro}
          />
        </div>
      </main>

      {/* Modals */}
      <CCodeGeneratorModal
        isOpen={isCCodeOpen}
        onClose={() => setIsCCodeOpen(false)}
        selectedGame={selectedGame}
        currentCommand={currentCommandString}
        games={games}
      />

      <VdfImportExportModal
        isOpen={isVdfSyncOpen}
        onClose={() => setIsVdfSyncOpen(false)}
        games={games}
        onImportVdfGames={handleImportVdfGames}
        showToast={showToast}
      />

      <PresetProfilesModal
        isOpen={isPresetsOpen}
        onClose={() => setIsPresetsOpen(false)}
        onSelectPreset={handleSelectPreset}
      />

      <GeminiAssistantModal
        isOpen={isAIAssistantOpen}
        onClose={() => setIsAIAssistantOpen(false)}
        selectedGame={selectedGame}
        distro={distro}
        onApplyRecommendedFlags={(cmd) => {
          handleApplyCommandToGame(cmd);
          const parsed = parseCommandString(cmd);
          setEnabledFlags(parsed.enabledFlags);
          setCustomEnvVars(parsed.customEnvVars);
          setExtraArgs(parsed.extraArgs);
        }}
      />

      <AddGameModal
        isOpen={isAddGameOpen}
        onClose={() => setIsAddGameOpen(false)}
        onAddGame={handleAddGame}
      />

      <ProtonDbModal
        isOpen={isProtonDbModalOpen}
        onClose={() => setIsProtonDbModalOpen(false)}
        selectedGame={selectedGame}
        distro={distro}
        onApplyRecommendedFlags={(cmd) => {
          handleApplyCommandToGame(cmd);
          const parsed = parseCommandString(cmd);
          setEnabledFlags(parsed.enabledFlags);
          setCustomEnvVars(parsed.customEnvVars);
          setExtraArgs(parsed.extraArgs);
          showToast('Applied ProtonDB community flags');
        }}
      />

      <ScanLocalLibraryModal
        isOpen={isScanLocalLibraryOpen}
        onClose={() => setIsScanLocalLibraryOpen(false)}
        onImportGames={handleImportLocalGames}
      />

      <ProtonManagerModal
        isOpen={isProtonManagerOpen}
        onClose={() => setIsProtonManagerOpen(false)}
        showToast={showToast}
      />

      <BackupModal
        isOpen={isBackupOpen}
        onClose={() => setIsBackupOpen(false)}
        games={games}
        onImportBackupGames={handleImportBackupGames}
        showToast={showToast}
      />

      <SteamGridDbModal
        isOpen={isSteamGridDbOpen}
        onClose={() => setIsSteamGridDbOpen(false)}
        game={selectedGame}
        onUpdateGameCover={handleUpdateGameCover}
        showToast={showToast}
      />
    </div>
  );
}
