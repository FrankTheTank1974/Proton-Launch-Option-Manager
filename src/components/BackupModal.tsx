import React, { useState } from 'react';
import { SteamGame } from '../types';
import { X, Download, Upload, CheckCircle2, AlertCircle, FileJson, Copy, RefreshCw, HardDrive } from 'lucide-react';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  games: SteamGame[];
  onImportBackupGames: (importedGames: SteamGame[]) => void;
  showToast?: (msg: string) => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  games,
  onImportBackupGames,
  showToast,
}) => {
  const [importedData, setImportedData] = useState<SteamGame[] | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [rawJsonText, setRawJsonText] = useState('');

  if (!isOpen) return null;

  // Prepare backup JSON payload
  const backupObject = {
    app: 'Proton Launch Options Manager',
    backupVersion: '1.0',
    exportedAt: new Date().toISOString(),
    totalGames: games.length,
    games: games.map((g) => ({
      id: g.id,
      appId: g.appId,
      name: g.name,
      protonVersion: g.protonVersion,
      currentLaunchOptions: g.currentLaunchOptions,
      bannerUrl: g.bannerUrl,
      iconUrl: g.iconUrl,
      isFavorite: g.isFavorite,
      developer: g.developer,
      installedPath: g.installedPath,
      lastUpdated: g.lastUpdated,
    })),
  };

  const jsonString = JSON.stringify(backupObject, null, 2);

  const handleExportJson = () => {
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    a.download = `proton-launch-options-backup-${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast?.('Exported launch options JSON backup file!');
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(jsonString);
    showToast?.('JSON backup copied to clipboard!');
  };

  const processJsonFileOrText = (text: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const parsed = JSON.parse(text);
      let gameList: any[] = [];

      if (Array.isArray(parsed)) {
        gameList = parsed;
      } else if (parsed && Array.isArray(parsed.games)) {
        gameList = parsed.games;
      } else {
        throw new Error('Invalid backup structure. Could not find game array.');
      }

      const validGames: SteamGame[] = gameList.map((g, index) => ({
        id: g.id || `imported_${g.appId || index}_${Date.now()}`,
        appId: Number(g.appId) || 0,
        name: g.name || `App ${g.appId || index}`,
        protonVersion: g.protonVersion || 'Proton Experimental',
        currentLaunchOptions: g.currentLaunchOptions || '',
        bannerUrl: g.bannerUrl || `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${g.appId}/header.jpg`,
        iconUrl: g.iconUrl || `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${g.appId}/library_600x900_2x.jpg`,
        isFavorite: Boolean(g.isFavorite),
        developer: g.developer || 'Imported Game',
        installedPath: g.installedPath,
        lastUpdated: g.lastUpdated || new Date().toISOString().replace('T', ' ').substring(0, 16),
      }));

      setImportedData(validGames);
      setSuccessMsg(`Parsed backup containing ${validGames.length} game(s) with launch options.`);
    } catch (err: any) {
      setErrorMsg('Failed to parse JSON backup: ' + err.message);
      setImportedData(null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setRawJsonText(content);
        processJsonFileOrText(content);
      }
    };
    reader.readAsText(file);
  };

  const handleApplyImport = () => {
    if (importedData && importedData.length > 0) {
      onImportBackupGames(importedData);
      showToast?.(`Restored ${importedData.length} game launch options from backup!`);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center space-x-3">
            <div className="bg-cyan-500/20 p-2 rounded-xl border border-cyan-500/30">
              <FileJson className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                JSON Launch Options Backup & Restore
              </h2>
              <p className="text-xs text-slate-400">
                Export or import your game launch configurations, environment flags, and custom titles
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

        {/* Modal Action Buttons */}
        <div className="p-3 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportJson}
              className="bg-cyan-600 hover:bg-cyan-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-md transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON Backup File</span>
            </button>

            <button
              onClick={handleCopyJson}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition"
            >
              <Copy className="w-3.5 h-3.5 text-cyan-400" />
              <span>Copy JSON</span>
            </button>
          </div>

          <label className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer flex items-center space-x-1.5 transition">
            <Upload className="w-3.5 h-3.5 text-amber-400" />
            <span>Import JSON Backup File</span>
            <input type="file" accept=".json,.txt" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>

        {/* Notices */}
        {errorMsg && (
          <div className="px-4 py-2 bg-rose-950/50 border-b border-rose-800/60 text-rose-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="px-4 py-2 bg-emerald-950/50 border-b border-emerald-800/60 text-emerald-300 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button
              onClick={handleApplyImport}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded-lg text-xs font-bold transition shadow-sm"
            >
              Restore to Library Now
            </button>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 overflow-auto p-4 bg-slate-950 space-y-4">
          
          {/* Quick Summary Box */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
              <span className="text-[11px] text-slate-400 block font-medium">Backup Titles</span>
              <span className="text-lg font-bold text-cyan-400 font-mono">{games.length}</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
              <span className="text-[11px] text-slate-400 block font-medium">Configured Launch Options</span>
              <span className="text-lg font-bold text-amber-400 font-mono">
                {games.filter((g) => g.currentLaunchOptions.trim().length > 0).length}
              </span>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
              <span className="text-[11px] text-slate-400 block font-medium">Format</span>
              <span className="text-xs font-bold text-slate-200 font-mono mt-1 block">JSON (Portable)</span>
            </div>
          </div>

          {/* Code Viewer / Manual Paste */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">JSON Payload</label>
              <span className="text-[11px] text-slate-500">You can also paste raw JSON text here to import</span>
            </div>
            <textarea
              value={rawJsonText || jsonString}
              onChange={(e) => {
                setRawJsonText(e.target.value);
                processJsonFileOrText(e.target.value);
              }}
              className="w-full h-64 bg-slate-900 border border-slate-800 rounded-xl p-3 font-mono text-xs text-slate-200 focus:outline-none focus:border-cyan-500 resize-none custom-scrollbar"
            />
          </div>

          {/* Imported Games Preview Table */}
          {importedData && importedData.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-slate-200 mb-2">Import Preview ({importedData.length} games)</h3>
              <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                {importedData.map((g) => (
                  <div key={g.id} className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-200">{g.name}</span>
                      <span className="text-slate-500 font-mono ml-2">ID: {g.appId}</span>
                      <p className="text-[11px] font-mono text-cyan-400 truncate max-w-lg mt-0.5">
                        {g.currentLaunchOptions || '(Default command %command%)'}
                      </p>
                    </div>
                    <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                      {g.protonVersion}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            JSON backups can be safely transferred between Linux systems, Steam Decks, or saved as presets.
          </p>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-semibold transition"
            >
              Close
            </button>
            {importedData && importedData.length > 0 && (
              <button
                onClick={handleApplyImport}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md transition"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Restore Backup to Library</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
