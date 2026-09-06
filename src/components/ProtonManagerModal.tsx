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
  Layers,
  FolderArchive,
  PackageCheck,
  Loader2,
  XCircle,
  Copy,
  Check,
  Search,
  Code,
  GitBranch
} from 'lucide-react';
import { PROTON_FLAGS } from '../data/protonFlagsData';

interface ProtonManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast?: (msg: string) => void;
  initialTab?: 'releases' | 'installed' | 'flags-scan';
  onSelectFlagToSearch?: (flagKey: string) => void;
}

interface ReleaseAsset {
  name: string;
  downloadUrl: string;
  sizeBytes: number;
  downloadCount: number;
  score: number;
  archTag: string;
  isCompatible: boolean;
  isRecommended: boolean;
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
  asset: ReleaseAsset | null;
  allAssets?: ReleaseAsset[];
}

interface HostSystemInfo {
  nodeArch: string;
  sysArch: string;
  displayArch: string;
  isX64: boolean;
  isArm64: boolean;
  isRiscv64: boolean;
  isV3Capable: boolean;
  isV4Capable: boolean;
}

interface InstalledRunner {
  folderName: string;
  displayTitle: string;
  fullPath: string;
  modifiedTime: string;
  approxSizeMb?: number;
  approxSizeFormatted?: string;
  source?: string;
}

interface InstallProgress {
  relId: number | string;
  tagName: string;
  percent: number;
  stage: 'connecting' | 'downloading' | 'decompressing' | 'installing' | 'completed' | 'error';
  message: string;
  downloadedMb?: string;
  totalMb?: string;
  error?: string;
}

export const ProtonManagerModal: React.FC<ProtonManagerModalProps> = ({
  isOpen,
  onClose,
  showToast,
  initialTab = 'releases',
  onSelectFlagToSearch,
}) => {
  const [activeTab, setActiveTab] = useState<'releases' | 'installed' | 'flags-scan'>('releases');
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [releases, setReleases] = useState<ProtonRelease[]>([]);
  const [hostSystem, setHostSystem] = useState<HostSystemInfo | null>(null);
  const [selectedAssetOverrides, setSelectedAssetOverrides] = useState<Record<string | number, ReleaseAsset>>({});
  const [installedRunners, setInstalledRunners] = useState<InstalledRunner[]>([]);
  const [searchedDirs, setSearchedDirs] = useState<string[]>([]);
  
  const [loadingReleases, setLoadingReleases] = useState<boolean>(false);
  const [loadingInstalled, setLoadingInstalled] = useState<boolean>(false);
  const [installingId, setInstallingId] = useState<string | number | null>(null);
  const [activeProgress, setActiveProgress] = useState<InstallProgress | null>(null);
  const [uninstallingFolder, setUninstallingFolder] = useState<string | null>(null);
  const [expandedReleaseId, setExpandedReleaseId] = useState<string | number | null>(null);
  
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  // Flag Scan State
  const [flagScanResults, setFlagScanResults] = useState<{
    success: boolean;
    totalUniqueFlags: number;
    sourcesScanned: Array<{
      id: string;
      name: string;
      url: string;
      branch: string;
      status: number;
      flagsFound: number;
    }>;
    discoveredFlags: Array<{
      key: string;
      sources: string[];
      count: number;
    }>;
    scannedAt: string;
  } | null>(null);
  const [loadingFlagScan, setLoadingFlagScan] = useState<boolean>(false);
  const [flagFilterText, setFlagFilterText] = useState<string>('');
  const [flagPrefixFilter, setFlagPrefixFilter] = useState<string>('all');
  const [copiedFlag, setCopiedFlag] = useState<string | null>(null);

  const handleCopyFlag = (key: string) => {
    navigator.clipboard.writeText(`${key}=1`);
    setCopiedFlag(key);
    showToast?.(`Copied ${key}=1 to clipboard`);
    setTimeout(() => setCopiedFlag(null), 2000);
  };

  // Trigger live scan of runner GitHub repos
  const handleTriggerFlagScan = async () => {
    setLoadingFlagScan(true);
    try {
      const res = await fetch('/api/proton-runners/scan-flags');
      const data = await res.json();
      if (data.success) {
        setFlagScanResults(data);
        showToast?.(`Found ${data.totalUniqueFlags} flags across ${data.sourcesScanned.length} runner repositories!`);
      } else {
        setStatusMessage({ text: 'Error scanning runner flags from GitHub.', isError: true });
      }
    } catch (err) {
      console.error('Failed scanning runner flags:', err);
      setStatusMessage({ text: 'Failed connecting to runner flag scan endpoint.', isError: true });
    } finally {
      setLoadingFlagScan(false);
    }
  };

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
        const downloadable = (data.releases || []).filter(
          (rel: ProtonRelease) => rel.asset && rel.asset.downloadUrl && rel.allAssets && rel.allAssets.length > 0
        );
        setReleases(downloadable);
        if (data.hostSystem) {
          setHostSystem(data.hostSystem);
        }
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
      if (initialTab) {
        setActiveTab(initialTab);
      }
      fetchInstalled();
      fetchReleases(providerFilter);
      if (initialTab === 'flags-scan' || !flagScanResults) {
        handleTriggerFlagScan();
      }
    }
  }, [isOpen, initialTab, providerFilter]);

  if (!isOpen) return null;

  // Real-time stream install of a runner with progress bar and stage updates
  const handleInstall = (rel: ProtonRelease) => {
    const targetAsset = selectedAssetOverrides[rel.id] || rel.asset;

    if (!targetAsset?.downloadUrl) {
      setStatusMessage({ text: 'No downloadable archive found for this release.', isError: true });
      return;
    }

    if (!targetAsset.isCompatible) {
      const confirmMsg = `Warning: "${targetAsset.name}" appears to be built for a different architecture (${targetAsset.archTag}) than your host system (${hostSystem?.displayArch || 'x86_64'}). It may fail to run games.\n\nDo you want to proceed anyway?`;
      if (!window.confirm(confirmMsg)) {
        return;
      }
    }

    setInstallingId(rel.id);
    setActiveProgress({
      relId: rel.id,
      tagName: rel.tagName,
      percent: 2,
      stage: 'connecting',
      message: `Connecting to download server for ${rel.tagName} (${targetAsset.archTag})...`,
    });

    const streamUrl = `/api/proton-runners/install-stream?downloadUrl=${encodeURIComponent(targetAsset.downloadUrl)}&fileName=${encodeURIComponent(targetAsset.name)}&runnerName=${encodeURIComponent(rel.tagName)}`;

    const eventSource = new EventSource(streamUrl);

    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        setActiveProgress({
          relId: rel.id,
          tagName: rel.tagName,
          percent: data.percent,
          stage: data.stage,
          message: data.message,
          downloadedMb: data.downloadedMb,
          totalMb: data.totalMb,
          error: data.error,
        });

        if (data.stage === 'completed') {
          eventSource.close();
          setInstallingId(null);
          showToast?.(`Installed ${rel.tagName} to Steam compatibilitytools.d!`);
          fetchInstalled();
        } else if (data.stage === 'error') {
          eventSource.close();
          setInstallingId(null);
          setStatusMessage({ text: data.message || 'Error installing Proton runner', isError: true });
        }
      } catch (err) {
        console.warn('Error parsing SSE event:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE Stream Connection Error:', err);
      eventSource.close();
      setInstallingId(null);
      setActiveProgress((prev) => prev ? {
        ...prev,
        stage: 'error',
        message: 'Download connection interrupted. Please try again.',
        percent: 0,
      } : null);
    };
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
    if (bytes === undefined || bytes === null || bytes <= 0) return 'Unknown size';
    if (bytes < 1024 * 1024) {
      const kb = (bytes / 1024).toFixed(1);
      return `${kb} KB`;
    }
    const mb = bytes / (1024 * 1024);
    if (mb >= 1000) {
      return `${(mb / 1024).toFixed(2)} GB`;
    }
    return `${mb.toFixed(1)} MB`;
  };

  const getProviderBadge = (providerKey: string) => {
    switch (providerKey) {
      case 'ge':
        return <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">🔥 GE-Proton</span>;
      case 'cachyos':
        return <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">⚡ Proton-CachyOS</span>;
      case 'rtsp':
        return <span className="bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">📹 Proton-RTSP</span>;
      case 'luxtorpeda':
        return <span className="bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">🚀 Luxtorpeda</span>;
      case 'boxtron':
        return <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">📦 Boxtron</span>;
      case 'roberta':
        return <span className="bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">📜 Roberta</span>;
      case 'em':
        return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">🐺 Proton-EM</span>;
      case 'dw':
        return <span className="bg-purple-500/10 text-purple-400 border border-purple-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">🛠️ Proton-DW</span>;
      default:
        return <span className="bg-slate-700 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-full">Custom Runner</span>;
    }
  };

  const renderProgressCard = (prog: InstallProgress, isMini: boolean = false) => {
    const getStageBadge = () => {
      switch (prog.stage) {
        case 'connecting':
          return <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" /> Connecting...</span>;
        case 'downloading':
          return <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5"><Download className="w-3 h-3 animate-bounce" /> Downloading</span>;
        case 'decompressing':
          return <span className="bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5"><FolderArchive className="w-3 h-3 animate-pulse" /> Decompressing</span>;
        case 'installing':
          return <span className="bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5"><PackageCheck className="w-3 h-3 animate-spin" /> Installing to Steam</span>;
        case 'completed':
          return <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Complete</span>;
        case 'error':
          return <span className="bg-red-500/20 text-red-300 border border-red-500/40 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5 text-red-400" /> Error</span>;
      }
    };

    return (
      <div className={`bg-slate-950 border ${prog.stage === 'error' ? 'border-red-800/80 bg-red-950/20' : prog.stage === 'completed' ? 'border-emerald-800/80 bg-emerald-950/20' : 'border-cyan-500/50 bg-slate-950/90'} rounded-xl p-3.5 shadow-lg space-y-2.5 transition-all`}>
        {/* Top Header */}
        <div className="flex items-center justify-between text-xs font-semibold">
          <div className="flex items-center space-x-2">
            <span className="text-slate-100 font-mono font-bold text-xs">{prog.tagName}</span>
            {getStageBadge()}
          </div>
          <div className="text-cyan-400 font-mono font-bold text-xs">
            {prog.percent}%
          </div>
        </div>

        {/* Animated Progress Bar Track */}
        <div className="relative w-full h-3 bg-slate-900 border border-slate-800 rounded-full overflow-hidden shadow-inner">
          <div
            className={`h-full transition-all duration-300 ease-out ${
              prog.stage === 'error'
                ? 'bg-red-500'
                : prog.stage === 'completed'
                ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.6)]'
                : 'bg-gradient-to-r from-cyan-500 via-amber-400 to-emerald-400 shadow-[0_0_12px_rgba(6,182,212,0.6)]'
            }`}
            style={{ width: `${Math.max(3, Math.min(100, prog.percent))}%` }}
          />
        </div>

        {/* Description & Metrics */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-slate-300 font-mono">
          <span className="flex items-center gap-1.5 truncate text-slate-200 font-medium">
            {prog.stage !== 'completed' && prog.stage !== 'error' && (
              <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-ping flex-shrink-0" />
            )}
            {prog.message}
          </span>
          {prog.downloadedMb && (
            <span className="text-slate-400 font-semibold text-right flex-shrink-0">
              {prog.downloadedMb} MB {prog.totalMb ? `/ ${prog.totalMb} MB` : ''}
            </span>
          )}
        </div>

        {/* 4-Step Pipeline Indicator */}
        {!isMini && (
          <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-slate-800/80 text-[10px] text-center font-medium">
            <div className={`p-1 rounded transition ${prog.percent >= 2 ? 'bg-cyan-950/80 text-cyan-300 font-bold border border-cyan-800/60 shadow-sm' : 'bg-slate-900/50 text-slate-500'}`}>
              1. Connect
            </div>
            <div className={`p-1 rounded transition ${prog.percent >= 5 ? 'bg-cyan-950/80 text-cyan-300 font-bold border border-cyan-800/60 shadow-sm' : 'bg-slate-900/50 text-slate-500'}`}>
              2. Download
            </div>
            <div className={`p-1 rounded transition ${prog.percent >= 78 ? 'bg-cyan-950/80 text-cyan-300 font-bold border border-cyan-800/60 shadow-sm' : 'bg-slate-900/50 text-slate-500'}`}>
              3. Decompress
            </div>
            <div className={`p-1 rounded transition ${prog.percent >= 88 ? 'bg-cyan-950/80 text-cyan-300 font-bold border border-cyan-800/60 shadow-sm' : 'bg-slate-900/50 text-slate-500'}`}>
              4. Install
            </div>
          </div>
        )}
      </div>
    );
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
                Download, update & manage GE-Proton, CachyOS, Proton-RTSP, EM-Proton & DW-Proton in Steam's <code className="text-amber-300 font-mono">compatibilitytools.d</code>
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

            <button
              onClick={() => {
                setActiveTab('flags-scan');
                if (!flagScanResults) {
                  handleTriggerFlagScan();
                }
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                activeTab === 'flags-scan'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Runner Flag Scanner</span>
              {flagScanResults && (
                <span className="bg-purple-950 text-purple-300 text-[10px] px-1.5 py-0.2 rounded-full border border-purple-800 font-mono">
                  {flagScanResults.totalUniqueFlags}
                </span>
              )}
            </button>
          </div>

          {/* Refresh Buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                if (activeTab === 'flags-scan') {
                  handleTriggerFlagScan();
                } else {
                  fetchReleases(providerFilter);
                  fetchInstalled();
                }
              }}
              className="p-1.5 text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs transition flex items-center space-x-1"
              title={activeTab === 'flags-scan' ? 'Rescan runner repositories on GitHub' : 'Refresh release lists and disk scan'}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingReleases || loadingInstalled || loadingFlagScan ? 'animate-spin text-amber-400' : ''}`} />
              <span className="text-xs">{activeTab === 'flags-scan' ? 'Rescan GitHub' : 'Refresh'}</span>
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

          {/* ACTIVE INSTALLATION PROGRESS CARD AT TOP */}
          {activeProgress && renderProgressCard(activeProgress, false)}

          {/* RELEASES TAB */}
          {activeTab === 'releases' && (
            <div className="space-y-4">
              
              {/* Host Hardware Architecture Banner */}
              {hostSystem && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-300 flex items-center justify-between gap-2 shadow-inner">
                  <div className="flex items-center space-x-2.5">
                    <Cpu className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    <div>
                      <span className="text-slate-400">Detected System Architecture: </span>
                      <strong className="text-cyan-300 font-mono font-bold">{hostSystem.displayArch}</strong>
                      {hostSystem.isV3Capable && (
                        <span className="ml-2 text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">
                          AVX2 / x86-64-v3 Supported
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium hidden sm:block">
                    🛡️ Auto-selecting <span className="text-slate-200 font-bold">{hostSystem.isX64 ? 'x86_64' : hostSystem.sysArch}</span> packages
                  </div>
                </div>
              )}

              {/* Provider Filter Bar */}
              <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-slate-800/80">
                <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-slate-400" /> Filter:
                </span>
                {[
                  { id: 'all', label: 'All Providers' },
                  { id: 'ge', label: '🔥 GE-Proton' },
                  { id: 'cachyos', label: '⚡ Proton-CachyOS' },
                  { id: 'rtsp', label: '📹 Proton-RTSP' },
                  { id: 'luxtorpeda', label: '🚀 Luxtorpeda' },
                  { id: 'boxtron', label: '📦 Boxtron' },
                  { id: 'roberta', label: '📜 Roberta' },
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
                    const activeAsset = selectedAssetOverrides[rel.id] || rel.asset;

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
                              {activeAsset && (
                                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-semibold ${
                                  activeAsset.isCompatible
                                    ? 'bg-cyan-950/80 text-cyan-300 border-cyan-800'
                                    : 'bg-red-950/80 text-red-300 border-red-800'
                                }`}>
                                  {activeAsset.archTag}
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-slate-400 flex items-center gap-3">
                              <span>Published: {new Date(rel.publishedAt).toLocaleDateString()}</span>
                              {activeAsset && (
                                <span>Size: <strong className="text-slate-200">{formatMb(activeAsset.sizeBytes)}</strong></span>
                              )}
                              {activeAsset?.downloadCount !== undefined && (
                                <span>Downloads: {activeAsset.downloadCount.toLocaleString()}</span>
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
                              disabled={isInstallingThis || !activeAsset}
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

                        {/* Multiple Build Variants Selector */}
                        {rel.allAssets && rel.allAssets.length > 1 && (() => {
                          const hasDuplicateTags = new Set(rel.allAssets.map((a: any) => a.archTag)).size < rel.allAssets.length;
                          return (
                            <div className="pt-2 border-t border-slate-900/80 flex items-center gap-2 flex-wrap text-xs">
                              <span className="text-slate-400 text-[11px] font-semibold flex items-center gap-1">
                                <Cpu className="w-3.5 h-3.5 text-cyan-400" /> Build Variants:
                              </span>
                              {rel.allAssets.map((a) => {
                                const isSelected = activeAsset?.downloadUrl === a.downloadUrl;
                                return (
                                  <button
                                    key={a.downloadUrl}
                                    onClick={() => setSelectedAssetOverrides(prev => ({ ...prev, [rel.id]: a }))}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition flex items-center gap-1 border ${
                                      isSelected
                                        ? 'bg-cyan-950 text-cyan-300 border-cyan-500 font-bold shadow-sm'
                                        : a.isCompatible
                                        ? 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                                        : 'bg-red-950/40 hover:bg-red-900/40 text-red-300 border-red-800/60'
                                    }`}
                                    title={a.name}
                                  >
                                    <span>{hasDuplicateTags ? a.name : a.archTag}</span>
                                    {a.isRecommended && (
                                      <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1 py-0.2 rounded font-sans font-bold">
                                        Best
                                      </span>
                                    )}
                                    {!a.isCompatible && (
                                      <span className="text-[9px] bg-red-500/20 text-red-300 px-1 py-0.2 rounded font-sans">
                                        Mismatched Arch
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          );
                        })()}

                        {/* Inline progress display for this specific release */}
                        {isInstallingThis && activeProgress && activeProgress.relId === rel.id && (
                          <div className="mt-2">
                            {renderProgressCard(activeProgress, true)}
                          </div>
                        )}

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
                  <p className="text-xs text-slate-500">Switch to the "Available Releases" tab above to install GE-Proton, Proton-CachyOS, Luxtorpeda, Boxtron, Roberta, or Proton-EM with 1-click.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {installedRunners.map((runner) => (
                    <div
                      key={runner.fullPath}
                      className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 min-w-0"
                    >
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex items-center space-x-2 min-w-0">
                          <Cpu className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                          <h3 className="text-sm font-bold text-slate-100 font-mono truncate" title={runner.displayTitle || runner.folderName}>
                            {runner.displayTitle || runner.folderName}
                          </h3>
                        </div>
                        <div className="text-xs text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0">
                          <span className="flex-shrink-0">Folder: <code className="text-slate-300 font-mono">{runner.folderName}</code></span>
                          <span className="flex items-center gap-1 min-w-0 max-w-full">
                            <span className="text-slate-500 flex-shrink-0">Path:</span>
                            <span className="text-slate-400 font-mono truncate" title={runner.fullPath}>
                              {runner.fullPath}
                            </span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 flex-shrink-0 self-end sm:self-center">
                        <span className="text-xs font-semibold text-slate-400 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg flex-shrink-0">
                          ~{runner.approxSizeFormatted || (runner.approxSizeMb ? `${runner.approxSizeMb} MB` : 'Unknown size')}
                        </span>

                        <button
                          onClick={() => handleUninstall(runner)}
                          disabled={uninstallingFolder === runner.folderName}
                          className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900/80 text-red-200 border border-red-800/80 rounded-lg text-xs font-semibold transition flex items-center space-x-1 flex-shrink-0"
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

          {/* TAB 3: RUNNER FLAGS LIVE GITHUB SCANNER */}
          {activeTab === 'flags-scan' && (
            <div className="p-6 space-y-6">
              
              {/* Header Hero Banner */}
              <div className="bg-gradient-to-r from-purple-950/40 via-slate-950 to-slate-900 border border-purple-800/40 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start space-x-3.5">
                  <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl text-purple-400 shrink-0">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-base font-bold text-slate-100">Runner Repositories GitHub Live Flag Scanner</h3>
                      <span className="bg-purple-500/10 text-purple-300 border border-purple-500/30 text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold">
                        Automated Upstream Sync
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                      Scans remote launcher scripts, environment variable tables, and documentation across Valve Proton, GE-Proton, Proton-CachyOS, Proton-EM, Proton-RTSP, UMU, VKD3D-Proton, and DXVK.
                    </p>
                    {flagScanResults?.scannedAt && (
                      <p className="text-[11px] text-slate-500 font-mono">
                        Last scanned: {new Date(flagScanResults.scannedAt).toLocaleTimeString()} ({new Date(flagScanResults.scannedAt).toLocaleDateString()})
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleTriggerFlagScan}
                  disabled={loadingFlagScan}
                  className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800/50 text-white text-xs font-bold rounded-xl transition shadow-md flex items-center space-x-2 shrink-0 self-end md:self-center"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingFlagScan ? 'animate-spin' : ''}`} />
                  <span>{loadingFlagScan ? 'Scanning GitHub Repos...' : 'Rescan GitHub Pages'}</span>
                </button>
              </div>

              {/* Summary Stats Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex items-center space-x-3">
                  <div className="p-2 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-cyan-400">
                    <Code className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-lg font-bold font-mono text-cyan-300">
                      {flagScanResults?.totalUniqueFlags || 0}
                    </div>
                    <div className="text-xs text-slate-400 font-medium">Discovered Runner Flags</div>
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex items-center space-x-3">
                  <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-lg text-purple-400">
                    <GitBranch className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-lg font-bold font-mono text-purple-300">
                      {flagScanResults?.sourcesScanned?.length || 0} Repositories
                    </div>
                    <div className="text-xs text-slate-400 font-medium">Upstream Sources Scanned</div>
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex items-center space-x-3">
                  <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-lg font-bold font-mono text-emerald-300">
                      {PROTON_FLAGS.length} Flags
                    </div>
                    <div className="text-xs text-slate-400 font-medium">Synced in App Database</div>
                  </div>
                </div>
              </div>

              {/* Scanned Upstream Sources Strip / Grid */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <GitBranch className="w-3.5 h-3.5 text-purple-400" />
                    Upstream Runner Sources ({flagScanResults?.sourcesScanned?.length || 0})
                  </h4>
                  <span className="text-[11px] text-slate-500">Live HTTP Fetch with Auto-Regex Extraction</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {flagScanResults?.sourcesScanned?.map((src) => (
                    <div
                      key={src.id}
                      className="bg-slate-950/80 border border-slate-800 hover:border-slate-700 rounded-xl p-3 flex flex-col justify-between space-y-2 transition"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-200 truncate" title={src.name}>
                            {src.name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                            <span className="text-slate-500">branch:</span>
                            <span className="text-amber-400/90">{src.branch}</span>
                          </div>
                        </div>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border shrink-0 ${
                          src.status === 200 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                            : 'bg-red-500/10 text-red-400 border-red-500/30'
                        }`}>
                          {src.status === 200 ? '200 OK' : `HTTP ${src.status}`}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-900">
                        <span className="text-purple-300 font-semibold font-mono">
                          {src.flagsFound} flags detected
                        </span>
                        <a
                          href={src.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-slate-400 hover:text-cyan-400 flex items-center space-x-1 transition"
                          title="View source file on GitHub"
                        >
                          <span>Source</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Discovered Flags Section */}
              <div className="space-y-3.5 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Code className="w-3.5 h-3.5 text-cyan-400" />
                    Discovered Runner Flags ({flagScanResults?.discoveredFlags?.length || 0})
                  </h4>

                  {/* Prefix Filters */}
                  <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1">
                    {[
                      { id: 'all', label: 'All' },
                      { id: 'PROTON', label: 'PROTON_*' },
                      { id: 'WINE', label: 'WINE_*' },
                      { id: 'DXVK', label: 'DXVK_*' },
                      { id: 'VKD3D', label: 'VKD3D_*' },
                      { id: 'RADV', label: 'RADV_*' },
                      { id: 'OTHER', label: 'Wrappers / Others' },
                    ].map((btn) => (
                      <button
                        key={btn.id}
                        onClick={() => setFlagPrefixFilter(btn.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition shrink-0 border ${
                          flagPrefixFilter === btn.id
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-sm'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                        }`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Filter Search Input */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={flagFilterText}
                    onChange={(e) => setFlagFilterText(e.target.value)}
                    placeholder="Search discovered flags (e.g. ADD_CONFIG, TOPOLOGY, WAYLAND, MHWILDS, REFLEX, PYROVEIL)..."
                    className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 text-slate-100 text-xs rounded-xl pl-9 pr-8 py-2.5 focus:outline-none placeholder:text-slate-500 font-medium transition shadow-inner"
                  />
                  {flagFilterText && (
                    <button
                      onClick={() => setFlagFilterText('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1 rounded"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Flags Cards Grid */}
                {loadingFlagScan ? (
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-12 text-center space-y-3">
                    <RefreshCw className="w-8 h-8 text-purple-400 animate-spin mx-auto" />
                    <p className="text-sm font-semibold text-slate-200">Scanning GitHub runner repositories in real-time...</p>
                    <p className="text-xs text-slate-500">Querying Valve, GE-Proton, Proton-CachyOS, Proton-EM, Proton-RTSP, UMU, VKD3D-Proton, and DXVK</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(flagScanResults?.discoveredFlags || [])
                      .filter((f) => {
                        if (flagPrefixFilter === 'PROTON' && !f.key.startsWith('PROTON_')) return false;
                        if (flagPrefixFilter === 'WINE' && !f.key.startsWith('WINE_')) return false;
                        if (flagPrefixFilter === 'DXVK' && !f.key.startsWith('DXVK_')) return false;
                        if (flagPrefixFilter === 'VKD3D' && !f.key.startsWith('VKD3D_')) return false;
                        if (flagPrefixFilter === 'RADV' && !f.key.startsWith('RADV_')) return false;
                        if (flagPrefixFilter === 'OTHER') {
                          if (f.key.startsWith('PROTON_') || f.key.startsWith('WINE_') || f.key.startsWith('DXVK_') || f.key.startsWith('VKD3D_') || f.key.startsWith('RADV_')) {
                            return false;
                          }
                        }
                        if (flagFilterText.trim() !== '') {
                          const q = flagFilterText.toLowerCase().trim();
                          const inKey = f.key.toLowerCase().includes(q);
                          const matchedProto = PROTON_FLAGS.find((pf) => pf.key === f.key || pf.id === f.key.toLowerCase());
                          const inDesc = matchedProto ? (matchedProto.description.toLowerCase().includes(q) || matchedProto.name.toLowerCase().includes(q)) : false;
                          return inKey || inDesc;
                        }
                        return true;
                      })
                      .map((flag) => {
                        const matchedProto = PROTON_FLAGS.find((pf) => pf.key === flag.key || pf.id === flag.key.toLowerCase());
                        const isCopied = copiedFlag === flag.key;

                        return (
                          <div
                            key={flag.key}
                            className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl p-3.5 space-y-2.5 transition shadow-sm flex flex-col justify-between"
                          >
                            <div className="space-y-1.5">
                              {/* Top Bar: Key & Badges */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="space-y-0.5">
                                  <div className="flex items-center space-x-2">
                                    <code className="text-xs font-mono font-bold text-cyan-300 select-all">
                                      {flag.key}
                                    </code>
                                    {matchedProto ? (
                                      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[9px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                                        <CheckCircle2 className="w-2.5 h-2.5" />
                                        In Checklist
                                      </span>
                                    ) : (
                                      <span className="bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[9px] font-semibold px-2 py-0.5 rounded-full">
                                        Discovered Upstream
                                      </span>
                                    )}
                                  </div>
                                  {matchedProto && (
                                    <p className="text-xs font-semibold text-slate-200">
                                      {matchedProto.name}
                                    </p>
                                  )}
                                </div>

                                <button
                                  onClick={() => handleCopyFlag(flag.key)}
                                  className={`p-1.5 rounded-lg border text-xs transition shrink-0 ${
                                    isCopied
                                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border-slate-800 hover:border-slate-700'
                                  }`}
                                  title="Copy flag syntax"
                                >
                                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              </div>

                              {/* Description / Tooltip */}
                              <p className="text-[11px] text-slate-400 leading-relaxed">
                                {matchedProto ? matchedProto.description : `Discovered across ${flag.sources.join(', ')} runner codebase.`}
                              </p>
                            </div>

                            {/* Bottom row: Sources badges & Action */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-900 text-[10px]">
                              <div className="flex flex-wrap items-center gap-1">
                                <span className="text-slate-500 font-mono text-[9px]">Sources:</span>
                                {flag.sources.map((s) => (
                                  <span
                                    key={s}
                                    className="bg-slate-900 text-slate-300 border border-slate-800 px-1.5 py-0.5 rounded text-[9px] font-mono"
                                  >
                                    {s}
                                  </span>
                                ))}
                              </div>

                              {onSelectFlagToSearch && (
                                <button
                                  onClick={() => {
                                    onSelectFlagToSearch(flag.key);
                                    onClose();
                                  }}
                                  className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center space-x-1"
                                >
                                  <span>Configure in Checklist</span>
                                  <ChevronDown className="w-3 h-3 -rotate-90" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

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
