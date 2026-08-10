import React, { useState, useEffect } from 'react';
import { SteamGame } from '../types';
import { X, Image as ImageIcon, ExternalLink, Key, Search, Check, Sparkles, RefreshCw, Layers } from 'lucide-react';

interface SteamGridDbModalProps {
  isOpen: boolean;
  onClose: () => void;
  game: SteamGame;
  onUpdateGameCover: (gameId: string, bannerUrl: string, iconUrl?: string) => void;
  showToast?: (msg: string) => void;
}

interface GridOption {
  id: string;
  url: string;
  thumb: string;
  author?: string;
  style?: string;
  label?: string;
  isOfficial?: boolean;
}

export const SteamGridDbModal: React.FC<SteamGridDbModalProps> = ({
  isOpen,
  onClose,
  game,
  onUpdateGameCover,
  showToast,
}) => {
  const [customBannerUrl, setCustomBannerUrl] = useState(game.bannerUrl || '');
  const [customIconUrl, setCustomIconUrl] = useState(game.iconUrl || '');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('steamgriddb_api_key') || '');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [grids, setGrids] = useState<GridOption[]>([]);
  const [selectedGridUrl, setSelectedGridUrl] = useState<string>(game.bannerUrl || '');

  const sgdbSearchUrl = `https://www.steamgriddb.com/search/grids?term=${encodeURIComponent(game.name)}`;
  const sgdbGameUrl = `https://www.steamgriddb.com/game/${game.appId}`;

  useEffect(() => {
    if (isOpen) {
      setCustomBannerUrl(game.bannerUrl || '');
      setCustomIconUrl(game.iconUrl || '');
      setSelectedGridUrl(game.bannerUrl || '');
      fetchGridsForGame();
    }
  }, [isOpen, game.id, game.appId]);

  const fetchGridsForGame = async () => {
    setLoading(true);
    try {
      const storedKey = localStorage.getItem('steamgriddb_api_key') || apiKey;
      const url = `/api/steamgriddb/grids/${game.appId}${storedKey ? `?apiKey=${encodeURIComponent(storedKey)}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.success && Array.isArray(data.grids)) {
        setGrids(data.grids);
      } else {
        // Default Steam CDN Fallback grids
        setGrids([
          {
            id: 'steam_capsule',
            url: `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${game.appId}/capsule_616x353.jpg`,
            thumb: `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${game.appId}/capsule_616x353.jpg`,
            label: 'Steam Official Capsule Art (Store Cover)',
            isOfficial: true,
          },
          {
            id: 'steam_library_600x900',
            url: `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${game.appId}/library_600x900_2x.jpg`,
            thumb: `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${game.appId}/library_600x900_2x.jpg`,
            label: 'Steam Official Library Grid (Vertical 2:3)',
            isOfficial: true,
          },
          {
            id: 'steam_header',
            url: `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${game.appId}/header.jpg`,
            thumb: `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${game.appId}/header.jpg`,
            label: 'Steam Official Header (Wide)',
            isOfficial: true,
          },
        ]);
      }
    } catch (err) {
      console.warn('Error fetching SteamGridDB grids:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveApiKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem('steamgriddb_api_key', apiKey.trim());
      showToast?.('SteamGridDB API key saved!');
      fetchGridsForGame();
    } else {
      localStorage.removeItem('steamgriddb_api_key');
      showToast?.('SteamGridDB API key cleared.');
    }
    setShowApiKeyInput(false);
  };

  const handleSelectGrid = (gridUrl: string) => {
    setSelectedGridUrl(gridUrl);
    setCustomBannerUrl(gridUrl);
  };

  const handleApplyCover = () => {
    const finalBanner = customBannerUrl.trim() || selectedGridUrl;
    const finalIcon = customIconUrl.trim() || `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${game.appId}/library_600x900_2x.jpg`;
    onUpdateGameCover(game.id, finalBanner, finalIcon);
    showToast?.(`Updated artwork thumbnail for ${game.name}!`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-purple-600 to-indigo-600 p-2 rounded-xl shadow-md">
              <ImageIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-slate-100">SteamGridDB Artwork Manager</h2>
                <span className="bg-purple-950 text-purple-300 border border-purple-700/50 text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold">
                  steamgriddb.com
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Customize grid posters, header banners, and thumbnails for <strong className="text-cyan-300">{game.name}</strong>
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

        {/* Quick Actions & Search Bar */}
        <div className="p-3 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                const officialCapsule = `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${game.appId}/capsule_616x353.jpg`;
                const officialGrid = `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${game.appId}/library_600x900_2x.jpg`;
                setSelectedGridUrl(officialCapsule);
                setCustomBannerUrl(officialCapsule);
                setCustomIconUrl(officialGrid);
                showToast?.('Selected Official Steam Store Capsule Art!');
              }}
              className="bg-cyan-950 hover:bg-cyan-900/80 text-cyan-200 border border-cyan-700/60 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition shadow-sm"
              title="Use official Steam Store Capsule artwork"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Prefer Official Capsule</span>
            </button>

            <a
              href={sgdbSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-purple-900/40 hover:bg-purple-900/70 text-purple-200 border border-purple-700/50 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition"
            >
              <ExternalLink className="w-3.5 h-3.5 text-purple-400" />
              <span>Browse on SteamGridDB</span>
            </a>

            <button
              onClick={() => setShowApiKeyInput(!showApiKeyInput)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition"
              title="Add optional SteamGridDB API key to fetch custom grids automatically"
            >
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span>API Key</span>
            </button>
          </div>

          <button
            onClick={fetchGridsForGame}
            disabled={loading}
            className="text-xs text-slate-400 hover:text-white flex items-center space-x-1 font-medium"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Artwork</span>
          </button>
        </div>

        {/* API Key Drawer */}
        {showApiKeyInput && (
          <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center space-x-2 animate-fadeIn">
            <div className="flex-1">
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                SteamGridDB API Key (Optional)
              </label>
              <input
                type="password"
                placeholder="Enter SteamGridDB API Key from steamgriddb.com/profile/api..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-purple-500"
              />
            </div>
            <button
              onClick={handleSaveApiKey}
              className="mt-5 bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm"
            >
              Save Key
            </button>
          </div>
        )}

        {/* Main Content Body */}
        <div className="flex-1 overflow-auto p-4 bg-slate-950 space-y-4">
          
          {/* Active Preview Banner Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 relative overflow-hidden">
            <div className="text-[11px] font-semibold text-slate-400 mb-2 flex items-center justify-between">
              <span>Active Thumbnail Preview</span>
              <span className="font-mono text-[10px] text-cyan-400">AppID: {game.appId}</span>
            </div>

            <div className="flex items-center space-x-3">
              <div className="w-20 h-24 rounded-lg overflow-hidden bg-slate-950 border border-slate-700 flex-shrink-0 relative shadow-md">
                <img
                  src={customBannerUrl || selectedGridUrl}
                  alt={game.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${game.appId}/header.jpg`;
                  }}
                />
              </div>

              <div className="flex-1 min-w-0 space-y-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Custom Banner / Grid Image URL
                  </label>
                  <input
                    type="text"
                    placeholder="https://cdn2.steamgriddb.com/grid/... or image URL"
                    value={customBannerUrl}
                    onChange={(e) => {
                      setCustomBannerUrl(e.target.value);
                      setSelectedGridUrl(e.target.value);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Custom Vertical Poster URL (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder={`https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${game.appId}/library_600x900_2x.jpg`}
                    value={customIconUrl}
                    onChange={(e) => setCustomIconUrl(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Grids / Artwork Picker Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Available SteamGridDB & Steam Artwork</span>
              </h3>
              <span className="text-[10px] text-slate-400">Click any image to select as cover</span>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-500 text-xs flex flex-col items-center justify-center space-y-2">
                <RefreshCw className="w-5 h-5 text-purple-400 animate-spin" />
                <span>Fetching SteamGridDB artwork choices...</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {grids.map((g) => {
                  const isSelected = selectedGridUrl === g.url || customBannerUrl === g.url;
                  return (
                    <div
                      key={g.id}
                      onClick={() => handleSelectGrid(g.url)}
                      className={`group relative rounded-xl overflow-hidden cursor-pointer border transition duration-200 ${
                        isSelected
                          ? 'border-purple-500 ring-2 ring-purple-500/50 shadow-lg'
                          : 'border-slate-800 hover:border-purple-500/60'
                      }`}
                    >
                      <div className="h-32 w-full bg-slate-950 relative">
                        <img
                          src={g.thumb || g.url}
                          alt={g.label || 'SteamGridDB Grid'}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                        {g.isOfficial && (
                          <div className="absolute top-2 left-2 bg-cyan-950/90 text-cyan-300 border border-cyan-500/50 text-[9px] px-1.5 py-0.5 rounded font-mono font-bold shadow-md">
                            Official Steam
                          </div>
                        )}
                        {isSelected && (
                          <div className="absolute top-2 right-2 bg-purple-600 text-white p-1 rounded-full shadow-md">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                      <div className="p-2 bg-slate-900 text-[10px] text-slate-300 truncate font-medium">
                        {g.label || (g.author ? `By ${g.author}` : 'SteamGridDB Grid')}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            Visit <a href={sgdbSearchUrl} target="_blank" rel="noreferrer" className="text-purple-400 underline">SteamGridDB.com</a> to copy high-res custom game artwork.
          </p>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              onClick={handleApplyCover}
              className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md transition"
            >
              <Check className="w-4 h-4" />
              <span>Apply Cover Artwork</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
