import React, { useState } from 'react';
import { SteamGame } from '../types';
import { Search, Star, Gamepad2, Plus, HardDrive, Image as ImageIcon, ArrowUpDown, ArrowUp, ArrowDown, CheckCircle2 } from 'lucide-react';

interface GameLibraryListProps {
  games: SteamGame[];
  selectedGameId: string;
  onSelectGame: (game: SteamGame) => void;
  onToggleFavorite: (id: string) => void;
  onOpenAddGame: () => void;
  onOpenScanLocalLibrary?: () => void;
  onOpenSteamGridDb?: (game: SteamGame) => void;
}

export const GameLibraryList: React.FC<GameLibraryListProps> = ({
  games,
  selectedGameId,
  onSelectGame,
  onToggleFavorite,
  onOpenAddGame,
  onOpenScanLocalLibrary,
  onOpenSteamGridDb,
}) => {
  const [search, setSearch] = useState('');
  const [filterFavorite, setFilterFavorite] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'id'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const filteredAndSortedGames = games
    .filter((game) => {
      const matchesSearch =
        game.name.toLowerCase().includes(search.toLowerCase()) ||
        game.appId.toString().includes(search);
      const matchesFav = filterFavorite ? game.isFavorite : true;
      return matchesSearch && matchesFav;
    })
    .sort((a, b) => {
      let comp = 0;
      if (sortBy === 'name') {
        comp = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
      } else if (sortBy === 'id') {
        comp = a.appId - b.appId;
      }
      return sortOrder === 'asc' ? comp : -comp;
    });

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col h-full shadow-lg">
      
      {/* Header & Search */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Gamepad2 className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-bold text-slate-200">Steam Library</h2>
          <span className="bg-slate-800 text-slate-400 text-xs px-2 py-0.5 rounded-full font-mono">
            {games.length}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          {onOpenScanLocalLibrary && (
            <button
              onClick={onOpenScanLocalLibrary}
              className="text-xs bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-700/60 px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-semibold transition shadow-sm"
              title="Detect and add all games installed in your local Steam library"
            >
              <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
              <span>Detect Local Library</span>
            </button>
          )}

          <button
            onClick={onOpenAddGame}
            className="text-xs text-slate-400 hover:text-cyan-300 flex items-center gap-1 font-medium hover:underline px-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Custom</span>
          </button>
        </div>
      </div>

      {/* Search Input, Sort Selector & Favorite Filter */}
      <div className="flex flex-col space-y-2 mb-3">
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search game or AppID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none transition"
            />
          </div>

          <button
            onClick={() => setFilterFavorite(!filterFavorite)}
            className={`p-1.5 rounded-lg border transition ${
              filterFavorite
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            title="Filter favorites"
          >
            <Star className={`w-4 h-4 ${filterFavorite ? 'fill-amber-400' : ''}`} />
          </button>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-950/60 border border-slate-800/80 rounded-lg px-2.5 py-1">
          <div className="flex items-center space-x-1.5">
            <ArrowUpDown className="w-3 h-3 text-cyan-400" />
            <span className="text-[11px] text-slate-400 font-medium">Sort:</span>
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded p-0.5 space-x-0.5">
              <button
                onClick={() => setSortBy('name')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                  sortBy === 'name'
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/60 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Name
              </button>
              <button
                onClick={() => setSortBy('id')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                  sortBy === 'id'
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/60 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                App ID
              </button>
            </div>
          </div>

          <button
            onClick={toggleSortOrder}
            className="flex items-center space-x-1 text-[11px] text-slate-300 hover:text-cyan-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 px-2 py-0.5 rounded transition"
            title={`Sort order: ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
          >
            {sortOrder === 'asc' ? (
              <>
                <ArrowUp className="w-3 h-3 text-cyan-400" />
                <span>Asc</span>
              </>
            ) : (
              <>
                <ArrowDown className="w-3 h-3 text-cyan-400" />
                <span>Desc</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Games List */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-[calc(100vh-220px)] custom-scrollbar">
        {filteredAndSortedGames.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            No Proton titles match filter
          </div>
        ) : (
          filteredAndSortedGames.map((game) => {
            const isSelected = game.id === selectedGameId;
            const hasCustomOptions = game.currentLaunchOptions.trim().length > 0;

            return (
              <div
                key={game.id}
                onClick={() => onSelectGame(game)}
                className={`group relative flex items-center p-2 rounded-lg cursor-pointer transition border ${
                  isSelected
                    ? 'bg-gradient-to-r from-cyan-950/80 to-slate-900 border-cyan-500/50 text-white shadow-md'
                    : 'bg-slate-950/60 hover:bg-slate-800/60 border-slate-800/80 text-slate-300'
                }`}
              >
                {/* Game Thumbnail / Icon */}
                <div 
                  className="w-10 h-10 rounded-md overflow-hidden bg-slate-800 flex-shrink-0 mr-2.5 relative border border-slate-700/50 group/thumb"
                  title="Click to manage artwork from SteamGridDB"
                  onClick={(e) => {
                    if (onOpenSteamGridDb) {
                      e.stopPropagation();
                      onOpenSteamGridDb(game);
                    }
                  }}
                >
                  <img
                    src={game.bannerUrl}
                    alt={game.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${game.appId}/header.jpg`;
                    }}
                  />
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition">
                    <ImageIcon className="w-4 h-4 text-purple-300" />
                  </div>
                </div>

                {/* Game Details */}
                <div className="flex-1 min-w-0 pr-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold truncate text-slate-100 group-hover:text-cyan-300 transition">
                      {game.name}
                    </h3>
                  </div>

                  <div className="flex items-center space-x-2 mt-0.5 text-[11px] text-slate-400 font-mono">
                    <span className="text-slate-500">ID: {game.appId}</span>
                    <span>•</span>
                    <span className="truncate text-cyan-400/90">{game.protonVersion}</span>
                  </div>

                  {hasCustomOptions && (
                    <div className="flex items-center space-x-1 mt-1">
                      <span className="inline-flex items-center text-[10px] bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 px-1.5 py-0.5 rounded font-mono truncate max-w-full">
                        <CheckCircle2 className="w-3 h-3 mr-1 text-cyan-400 flex-shrink-0" />
                        <span className="truncate">{game.currentLaunchOptions}</span>
                      </span>
                    </div>
                  )}
                </div>

                {/* Favorite Star Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(game.id);
                  }}
                  className="absolute right-2 top-2 text-slate-600 hover:text-amber-400 transition"
                  title="Toggle favorite"
                >
                  <Star
                    className={`w-3.5 h-3.5 ${
                      game.isFavorite ? 'fill-amber-400 text-amber-400' : ''
                    }`}
                  />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
