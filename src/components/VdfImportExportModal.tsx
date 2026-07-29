import React, { useState } from 'react';
import { parseLocalConfigVdf, updateVdfLaunchOptions, generateSampleVdf } from '../utils/vdfParser';
import { VdfAppConfig, SteamGame } from '../types';
import { X, FileText, Upload, Download, CheckCircle2, RefreshCw, Layers, HardDrive, AlertCircle, Sparkles } from 'lucide-react';

interface VdfImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  games: SteamGame[];
  onImportVdfGames: (vdfApps: VdfAppConfig[]) => void;
  showToast?: (msg: string) => void;
}

export const VdfImportExportModal: React.FC<VdfImportExportModalProps> = ({
  isOpen,
  onClose,
  games,
  onImportVdfGames,
  showToast,
}) => {
  const [vdfText, setVdfText] = useState(() => generateSampleVdf(games));
  const [parsedApps, setParsedApps] = useState<VdfAppConfig[]>(() => parseLocalConfigVdf(vdfText));
  const [activeTab, setActiveTab] = useState<'view' | 'edit'>('view');
  const [isWriting, setIsWriting] = useState(false);
  const [writeResult, setWriteResult] = useState<{ type: 'success' | 'error'; message: string; instructions?: string } | null>(null);

  if (!isOpen) return null;

  const handleTextChange = (text: string) => {
    setVdfText(text);
    const parsed = parseLocalConfigVdf(text);
    setParsedApps(parsed);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        handleTextChange(content);
      }
    };
    reader.readAsText(file);
  };

  const handleApplyToLibrary = () => {
    onImportVdfGames(parsedApps);
    onClose();
  };

  const handleDownloadVdf = () => {
    const blob = new Blob([vdfText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'localconfig.vdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleWriteDirectToSteam = async () => {
    setIsWriting(true);
    setWriteResult(null);

    try {
      const updates = parsedApps.map((app) => ({
        appId: app.appId,
        launchOptions: app.launchOptions || '',
      }));

      const res = await fetch('/api/steam/write-launch-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });

      const data = await res.json();
      if (data.success) {
        setWriteResult({
          type: 'success',
          message: data.message,
          instructions: data.instructions,
        });
        showToast?.('Written directly to Steam configuration!');
      } else {
        setWriteResult({
          type: 'error',
          message: data.message || 'Could not find local Steam path to update.',
        });
      }
    } catch (err: any) {
      setWriteResult({
        type: 'error',
        message: 'Error communicating with local server write service.',
      });
    } finally {
      setIsWriting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-500/20 p-2 rounded-xl border border-blue-500/30">
              <FileText className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                Steam localconfig.vdf Manager
              </h2>
              <p className="text-xs text-slate-400">
                Path: <span className="font-mono text-cyan-400">~/.local/share/Steam/userdata/&lt;user_id&gt;/config/localconfig.vdf</span>
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

        {/* View / Edit Tabs & Upload Action */}
        <div className="flex items-center justify-between p-3 bg-slate-950/50 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('view')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'view'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Parsed Games ({parsedApps.length})
            </button>
            <button
              onClick={() => setActiveTab('edit')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'edit'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Raw VDF Editor
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <label className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer flex items-center space-x-1.5 transition">
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              <span>Upload localconfig.vdf</span>
              <input type="file" accept=".vdf,.txt" onChange={handleFileUpload} className="hidden" />
            </label>

            <button
              onClick={handleDownloadVdf}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span>Download .vdf</span>
            </button>

            <button
              onClick={handleWriteDirectToSteam}
              disabled={isWriting}
              className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition shadow-sm"
              title="Write launch options directly to local Steam files on your computer"
            >
              <HardDrive className={`w-3.5 h-3.5 ${isWriting ? 'animate-spin' : ''}`} />
              <span>Write Directly to Steam</span>
            </button>
          </div>
        </div>

        {/* Status Notice */}
        {writeResult && (
          <div className={`px-4 py-2 text-xs flex items-center justify-between border-b ${
            writeResult.type === 'success'
              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60'
              : 'bg-amber-950/40 text-amber-300 border-amber-800/60'
          }`}>
            <div className="flex items-center space-x-2">
              {writeResult.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              )}
              <span>{writeResult.message} {writeResult.instructions}</span>
            </div>
            <button onClick={() => setWriteResult(null)} className="text-slate-400 hover:text-white text-xs ml-2">
              Dismiss
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-auto p-4 bg-slate-950">
          {activeTab === 'view' ? (
            <div className="space-y-2">
              {parsedApps.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  No LaunchOptions block found in current VDF file.
                </div>
              ) : (
                parsedApps.map((app) => (
                  <div
                    key={app.appId}
                    className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-xs text-slate-200">{app.appName || `App ${app.appId}`}</span>
                        <span className="font-mono text-[10px] text-slate-500">AppID: {app.appId}</span>
                      </div>
                      <p className="font-mono text-xs text-cyan-400 mt-1 truncate max-w-2xl">
                        {app.launchOptions || '(No launch flags configured)'}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <textarea
              value={vdfText}
              onChange={(e) => handleTextChange(e.target.value)}
              className="w-full h-full bg-slate-900 border border-slate-800 rounded-xl p-3 font-mono text-xs text-slate-200 focus:outline-none focus:border-blue-500 resize-none custom-scrollbar"
            />
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            Modifying VDF updates launch options stored locally for your Linux Steam account.
          </p>

          <button
            onClick={handleApplyToLibrary}
            className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-md transition"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Apply VDF Options to Library</span>
          </button>
        </div>
      </div>
    </div>
  );
};
