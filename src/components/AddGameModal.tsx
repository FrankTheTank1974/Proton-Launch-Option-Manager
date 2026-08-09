import React, { useState, useEffect } from 'react';
import { SteamGame } from '../types';
import { ProtonVersionSelector } from './ProtonVersionSelector';
import { X, Plus, Gamepad2, Image as ImageIcon, Sparkles, RefreshCw } from 'lucide-react';

interface AddGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddGame: (game: SteamGame) => void;
}

export const AddGameModal: React.FC<AddGameModalProps> = ({
  isOpen,
  onClose,
  onAddGame,
}) => {
  const [name, setName] = useState('');
  const [appId, setAppId] = useState('');
  const [protonVersion, setProtonVersion] = useState('Proton Experimental');
  const [developer, setDeveloper] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  const [loadingGrid, setLoadingGrid] = useState(false);
  const [sgdbSource, setSgdbSource] = useState<string>('SteamGridDB / Steam CDN');

  useEffect(() => {
    if (appId.trim()) {
      const numAppId = parseInt(appId.trim(), 10);
      if (numAppId > 0) {
        fetchSteamGridDbArtwork(numAppId);
      }
    } else {
      setBannerUrl('');
      setIconUrl('');
    }
  }, [appId]);

  const fetchSteamGridDbArtwork = async (numAppId: number) => {
    setLoadingGrid(true);
    try {
      const apiKey = localStorage.getItem('steamgriddb_api_key') || '';
      const url = `/api/steamgriddb/grids/${numAppId}${apiKey ? `?apiKey=${encodeURIComponent(apiKey)}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.success && Array.isArray(data.grids) && data.grids.length > 0) {
        // First grid is selected for banner
        const topGrid = data.grids[0];
        setBannerUrl(topGrid.url);
        // Default 2:3 vertical grid or icon
        setIconUrl(`https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${numAppId}/library_600x900_2x.jpg`);
        setSgdbSource(data.source === 'steamgriddb' ? 'SteamGridDB Live API' : 'SteamGridDB Artwork');
      } else {
        setBannerUrl(`https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${numAppId}/header.jpg`);
        setIconUrl(`https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${numAppId}/library_600x900_2x.jpg`);
        setSgdbSource('Steam Artwork CDN');
      }
    } catch {
      setBannerUrl(`https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${numAppId}/header.jpg`);
      setIconUrl(`https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${numAppId}/library_600x900_2x.jpg`);
      setSgdbSource('Steam Artwork CDN');
    } finally {
      setLoadingGrid(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !appId.trim()) return;

    const numAppId = parseInt(appId.trim(), 10) || Math.floor(Math.random() * 900000) + 100000;

    const finalBanner = bannerUrl.trim() || `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${numAppId}/header.jpg`;
    const finalIcon = iconUrl.trim() || `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${numAppId}/library_600x900_2x.jpg`;

    const newGame: SteamGame = {
      id: `custom_${numAppId}_${Date.now()}`,
      appId: numAppId,
      name: name.trim(),
      bannerUrl: finalBanner,
      iconUrl: finalIcon,
      protonVersion: protonVersion.trim(),
      currentLaunchOptions: 'gamemoderun %command%',
      lastUpdated: new Date().toISOString().replace('T', ' ').substring(0, 16),
      isFavorite: false,
      developer: developer.trim() || 'Custom Title',
    };

    onAddGame(newGame);
    onClose();
    setName('');
    setAppId('');
    setBannerUrl('');
    setIconUrl('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center space-x-3">
            <div className="bg-purple-600/20 p-2 rounded-xl border border-purple-500/30">
              <Gamepad2 className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Add Game with SteamGridDB Artwork</h2>
              <p className="text-xs text-slate-400">
                Adds game with auto-resolved SteamGridDB thumbnail covers
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Game Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Black Myth: Wukong"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Steam App ID</label>
              <input
                type="number"
                required
                placeholder="e.g. 2358720"
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none"
              />
            </div>
          </div>

          {/* SteamGridDB Thumbnail Preview Box */}
          {appId.trim() && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-purple-400 flex items-center space-x-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{sgdbSource}</span>
                </span>
                {loadingGrid && <RefreshCw className="w-3.5 h-3.5 text-purple-400 animate-spin" />}
              </div>

              <div className="flex items-center space-x-3">
                <div className="w-20 h-16 rounded-lg overflow-hidden bg-slate-900 border border-slate-800 flex-shrink-0 relative">
                  <img
                    src={bannerUrl || `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`}
                    alt="Game Banner"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`;
                    }}
                  />
                </div>
                <div className="flex-1 text-[11px] text-slate-400 space-y-1">
                  <p className="truncate text-slate-200 font-medium">Auto-assigned thumbnail grid</p>
                  <p className="text-[10px] text-slate-500 font-mono truncate">{bannerUrl}</p>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Custom Banner / Grid URL (Optional)</label>
            <input
              type="text"
              placeholder="Leave empty to use SteamGridDB default..."
              value={bannerUrl}
              onChange={(e) => setBannerUrl(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Developer / Studio</label>
              <input
                type="text"
                placeholder="e.g. Game Science"
                value={developer}
                onChange={(e) => setDeveloper(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Proton Runner</label>
              <ProtonVersionSelector
                value={protonVersion}
                onChange={(ver) => setProtonVersion(ver)}
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs py-2 rounded-xl flex items-center justify-center space-x-1.5 shadow-md transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add to Library with SteamGridDB Cover</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

