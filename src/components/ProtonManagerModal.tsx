import React, { useState, useEffect } from 'react';
import { 
  X, 
  Download, 
  Trash2, 
  RefreshCw, 
  Flame, 
  Sparkles, 
  HardDrive, 
  CheckCircle2, 
  ExternalLink, 
  AlertCircle,
  FolderCheck,
  ChevronDown,
  ChevronUp,
  Cpu,
  Layers
} from 'lucide-react';

interface ProtonManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast?: (msg: string) => void;
}

interface ProtonRelease {
  id: number | string;
  provider: string;
  providerName: string;
  tagName: string;
  title: string;
  publishedAt: string;
  body: string;
  htmlUrl: string;
  repo: string;
  asset: {
    name: string;
    downloadUrl: string;
    sizeBytes: number;
    downloadCount: number;
  } | null;
}

interface InstalledRunner {
  folderName: string;
  displayTitle: string;
  fullPath: string;
  modifiedTime: string;
  approxSizeMb: number;
}

export const ProtonManagerModal: React.FC<ProtonManagerModalProps> = ({
  isOpen,
  onClose,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<'releases' | 'installed'>('releases');
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [releases, setReleases] = useState<ProtonRelease[]>([]);
  const [installedRunners, setInstalledRunners] = useState<InstalledRunner[]>([]);
  const [searchedDirs, setSearchedDirs] = useState<string[]>([]);
  
  const [loadingReleases, setLoadingReleases] = useState<boolean>(false);
  const [loadingInstalled, setLoadingInstalled] = useState<boolean>(false);
  const [installingId, setInstallingId] = useState<string | number | null>(null);
  const [uninstallingFolder, setUninstallingFolder] = useState<string | null>(null);
  const [expandedReleaseId, setExpandedReleaseId] = useState<string | number | null>(null);
  
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  // Fetch installed runners
  const fetchInstalled = async () => {
    setLoadingInstalled(true);
    try {
      const res = await fetch('/api/proton-runners/installed');
      const data = await res.json();
      if (data.success) {
        setInstalledRunners(data.installedRunners || []);
        setSearchedDirs(data.searchedDirs || []);
      }
    } catch (err) {
      console.error('Failed fetching installed runners:', err);
    } finally {
      setLoadingInstalled(false);
    }
  };

  // Fetch available releases from GitHub API
  const fetchReleases = async (provider = 'all') => {
    setLoadingReleases(true);
    try {
      const res = await fetch(`/api/proton-runners/releases?provider=${provider}`);
      const data = await res.json();
      if (data.success) {
        setReleases(data.releases || []);
      }
    } catch (err) {
      console.error('Failed fetching Proton releases:', err);
      setStatusMessage({ text: 'Error connecting to release repository.', isError: true });
    } finally {
      setLoadingReleases(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchInstalled();
      fetchReleases(providerFilter);
    }
  }, [isOpen, providerFilter]);

  if (!isOpen) return null;

  // Install a runner
  const handleInstall = async (rel: ProtonRelease) => {
    if (!rel.asset?.downloadUrl) {
      setStatusMessage({ text: 'No downloadable archive found for this release.', isError: true });
      return;
    }

    setInstallingId(rel.id);
    setStatusMessage({ text: `Downloading and extracting ${rel.tagName}... This may take 1-2 minutes.` });

    try {
      const res = await fetch('/api/proton-runners/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          downloadUrl: rel.asset.downloadUrl,
          fileName: rel.asset.name,
          runnerName: rel.tagName,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMessage({ text: data.message });
        showToast?.(`Installed ${rel.tagName} to Steam compatibilitytools.d!`);
        fetchInstalled(); // Refresh installed list
      } else {
        setStatusMessage({ text: data.error || 'Failed installing Proton runner.', isError: true });
      }
    } catch (err) {
      setStatusMessage({ text: 'Network error downloading release archive.', isError: true });
    } finally {
      setInstallingId(null);
    }
  };

  // Uninstall a runner
  const handleUninstall = async (runner: InstalledRunner) => {
    if (!window.confirm(`Are you sure you want to uninstall and remove "${runner.displayTitle || runner.folderName}" from disk?`)) {
      return;
    }

    setUninstallingFolder(runner.folderName);
    try {
      const res = await fetch('/api/proton-runners/uninstall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullPath: runner.fullPath,
          folderName: runner.folderName,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast?.(`Removed ${runner.folderName} from disk`);
        fetchInstalled();
      } else {
        setStatusMessage({ text: data.error || 'Failed removing folder.', isError: true });
      }
    } catch (err) {
      setStatusMessage({ text: 'Error executing folder removal.', isError: true });
    } finally {
      setUninstallingFolder(null);
    }
  };

  const isRunnerInstalled = (tagName: string) => {
    return installedRunners.some(
      (inst) =>
        inst.folderName.toLowerCase().includes(tagName.toLowerCase()) ||
        tagName.toLowerCase().includes(inst.folderName.toLowerCase())
    );
  };

  const formatMb = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const mb = Math.round(bytes / (1024 * 1024));
    return `${mb} MB`;
  };

  const getProviderBadge = (providerKey: string) => {
    switch (providerKey) {
      case 'ge':
        return <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">🔥 GE-Proton</span>;
      case 'cachyos':
        return <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">⚡ Proton-CachyOS</span>;
      case 'em':
        return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">🐺 Proton-EM</span>;
      case 'dw':
        return <span className="bg-purple-500/10 text-purple-400 border border-purple-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">🛠️ Proton-DW</span>;
      default:
        return <span className="bg-slate-700 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-full">Custom Runner</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-gradient-to-br from-amber-500 to-red-600 rounded-xl shadow-md text-white">
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-slate-100">Proton Runner Manager</h2>
                <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-mono px-2 py-0.5 rounded-full font-semibold">
                  ProtonUp-Qt Style
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Download, update & manage GE-Proton, CachyOS, EM-Proton & DW-Proton in Steam's <code className="text-amber-300 font-mono">compatibilitytools.d</code>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Info / Tabs Toolbar */}
        <div className="px-6 py-3 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          
          {/* Main Tabs */}
          <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('releases')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                activeTab === 'releases'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Available Releases ({releases.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('installed')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                activeTab === 'installed'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FolderCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>Installed Tools ({installedRunners.length})</span>
            </button>
          </div>

          {/* Refresh Buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => { fetchReleases(providerFilter); fetchInstalled(); }}
              className="p-1.5 text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs transition flex items-center space-x-1"
              title="Refresh release lists and disk scan"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingReleases || loadingInstalled ? 'animate-spin text-amber-400' : ''}`} />
              <span className="text-xs">Refresh</span>
            </button>
          </div>
        </div>

        {/* Status notification banner */}
        {statusMessage && (
          <div className={`px-6 py-2.5 text-xs border-b flex items-center justify-between font-medium ${
            statusMessage.isError 
              ? 'bg-red-950/60 text-red-200 border-red-800/80' 
              : 'bg-cyan-950/60 text-cyan-200 border-cyan-800/80'
          }`}>
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-400" />
              <span>{statusMessage.text}</span>
            </div>
            <button 
              onClick={() => setStatusMessage(null)} 
              className="text-slate-400 hover:text-white ml-2 text-xs font-bold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          {/* RELEASES TAB */}
          {activeTab === 'releases' && (
            <div className="space-y-4">
              
              {/* Provider Filter Bar */}
              <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-slate-800/80">
                <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-slate-400" /> Filter:
                </span>
                {[
                  { id: 'all', label: 'All Providers' },
                  { id: 'ge', label: '🔥 GE-Proton' },
                  { id: 'cachyos', label: '⚡ Proton-CachyOS' },
                  { id: 'em', label: '🐺 Proton-EM' },
                  { id: 'dw', label: '🛠️ Proton-DW' },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setProviderFilter(p.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium border transition ${
                      providerFilter === p.id
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold'
                        : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300 border-slate-700/60'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Releases Grid / List */}
              {loadingReleases ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-3">
                  <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
                  <p className="text-sm font-medium text-slate-300">Fetching latest Proton runner releases from GitHub...</p>
                </div>
              ) : releases.length === 0 ? (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-8 text-center space-y-2">
                  <AlertCircle className="w-8 h-8 text-slate-500 mx-auto" />
                  <p className="text-sm font-semibold text-slate-300">No releases found for provider filter.</p>
                  <p className="text-xs text-slate-500">Try switching provider filters or checking your Internet connection.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {releases.map((rel) => {
                    const isInstalled = isRunnerInstalled(rel.tagName);
                    const isInstallingThis = installingId === rel.id;
                    const isExpanded = expandedReleaseId === rel.id;

                    return (
                      <div
                        key={rel.id}
                        className="bg-slate-950 border border-slate-800/80 hover:border-slate-700 rounded-xl p-4 transition shadow-sm space-y-3"
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                          
                          {/* Left: Tag & Provider Info */}
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                              {getProviderBadge(rel.provider)}
                              <h3 className="text-sm font-bold text-slate-100 font-mono">
                                {rel.title || rel.tagName}
                              </h3>
                              {isInstalled && (
                                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> Installed
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-slate-400 flex items-center gap-3">
                              <span>Published: {new Date(rel.publishedAt).toLocaleDateString()}</span>
                              {rel.asset && (
                                <span>Size: <strong className="text-slate-200">{formatMb(rel.asset.sizeBytes)}</strong></span>
                              )}
                              {rel.asset?.downloadCount !== undefined && (
                                <span>Downloads: {rel.asset.downloadCount.toLocaleString()}</span>
                              )}
                            </p>
                          </div>

                          {/* Right: Actions */}
                          <div className="flex items-center space-x-2 flex-shrink-0">
                            <a
                              href={rel.htmlUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition"
                              title="View full release notes on GitHub"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>

                            <button
                              onClick={() => setExpandedReleaseId(isExpanded ? null : rel.id)}
                              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition flex items-center space-x-1"
                            >
                              <span>Notes</span>
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>

                            <button
                              onClick={() => handleInstall(rel)}
                              disabled={isInstallingThis || !rel.asset}
                              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition shadow-md ${
                                isInstalled
                                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                                  : 'bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold'
                              } disabled:opacity-50`}
                            >
                              <Download className={`w-3.5 h-3.5 ${isInstallingThis ? 'animate-bounce' : ''}`} />
                              <span>
                                {isInstallingThis
                                  ? 'Installing...'
                                  : isInstalled
                                  ? 'Reinstall'
                                  : 'Install to Steam'}
                              </span>
                            </button>
                          </div>
                        </div>

                        {/* Expandable Release Notes */}
                        {isExpanded && rel.body && (
                          <div className="mt-3 p-3 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300 font-mono whitespace-pre-line max-h-48 overflow-y-auto leading-relaxed">
                            {rel.body}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* INSTALLED TAB */}
          {activeTab === 'installed' && (
            <div className="space-y-4">
              
              <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 text-xs text-slate-400 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <HardDrive className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                  <span>
                    Compatibility directory scanned: <code className="text-cyan-300 font-mono font-semibold">~/.local/share/Steam/compatibilitytools.d</code>
                  </span>
                </div>
                <span className="text-slate-300 font-bold">{installedRunners.length} tools installed</span>
              </div>

              {loadingInstalled ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-3">
                  <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
                  <p className="text-sm font-medium text-slate-300">Scanning Steam compatibility directories on disk...</p>
                </div>
              ) : installedRunners.length === 0 ? (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-8 text-center space-y-2">
                  <FolderCheck className="w-8 h-8 text-slate-500 mx-auto" />
                  <p className="text-sm font-semibold text-slate-300">No custom Proton runners detected in compatibilitytools.d.</p>
                  <p className="text-xs text-slate-500">Switch to the "Available Releases" tab above to install GE-Proton, Proton-CachyOS, or EM-Proton with 1-click.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {installedRunners.map((runner) => (
                    <div
                      key={runner.fullPath}
                      className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <Cpu className="w-4 h-4 text-cyan-400" />
                          <h3 className="text-sm font-bold text-slate-100 font-mono">
                            {runner.displayTitle || runner.folderName}
                          </h3>
                        </div>
                        <p className="text-xs text-slate-400 flex items-center gap-3">
                          <span>Folder: <code className="text-slate-300 font-mono">{runner.folderName}</code></span>
                          <span>Path: <span className="text-slate-400 font-mono truncate max-w-xs">{runner.fullPath}</span></span>
                        </p>
                      </div>

                      <div className="flex items-center space-x-3 flex-shrink-0">
                        <span className="text-xs font-semibold text-slate-400 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg">
                          ~{runner.approxSizeMb} MB
                        </span>

                        <button
                          onClick={() => handleUninstall(runner)}
                          disabled={uninstallingFolder === runner.folderName}
                          className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900/80 text-red-200 border border-red-800/80 rounded-lg text-xs font-semibold transition flex items-center space-x-1"
                          title="Delete folder from compatibilitytools.d"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          <span>{uninstallingFolder === runner.folderName ? 'Removing...' : 'Uninstall'}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer / Instructions */}
        <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <p className="text-xs text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <span>After installing a new Proton runner, restart Steam to select it in <strong>Game Properties &gt; Compatibility</strong>.</span>
          </p>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
