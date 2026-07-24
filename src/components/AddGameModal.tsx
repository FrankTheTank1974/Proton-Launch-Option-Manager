import React, { useState } from 'react';
import { SteamGame } from '../types';
import { X, Plus, Gamepad2 } from 'lucide-react';

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

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !appId.trim()) return;

    const numAppId = parseInt(appId.trim(), 10) || Math.floor(Math.random() * 900000) + 100000;

    const newGame: SteamGame = {
      id: `custom_${numAppId}_${Date.now()}`,
      appId: numAppId,
      name: name.trim(),
      bannerUrl: `https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=800&auto=format&fit=crop`,
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
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center space-x-2">
            <Gamepad2 className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-slate-100">Add Custom Steam Title</h2>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Game Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Black Myth: Wukong"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
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
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Proton Runner Version</label>
            <select
              value={protonVersion}
              onChange={(e) => setProtonVersion(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
            >
              <option value="Proton Experimental">Proton Experimental</option>
              <option value="Proton 9.0-2">Proton 9.0-2</option>
              <option value="Proton GE-Custom 9-10">Proton GE-Custom 9-10</option>
              <option value="Proton 8.0-5">Proton 8.0-5</option>
              <option value="Proton Hotfix">Proton Hotfix</option>
            </select>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs py-2 rounded-xl flex items-center justify-center space-x-1.5 shadow-md transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add to Steam Library</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
