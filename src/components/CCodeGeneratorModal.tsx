import React, { useState } from 'react';
import { getCCodeTemplates } from '../data/cCodeTemplates';
import { SteamGame } from '../types';
import JSZip from 'jszip';
import { downloadTarZstdProject } from '../utils/tarZstdPacker';
import { 
  X, 
  Code2, 
  Copy, 
  Check, 
  Terminal, 
  FileCode, 
  FolderArchive, 
  ShieldAlert, 
  Sparkles, 
  Search, 
  History, 
  Play, 
  Layout, 
  FileText, 
  Wrench, 
  Layers, 
  Archive, 
  ChevronDown,
  BookOpen
} from 'lucide-react';

interface CCodeGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedGame: SteamGame;
  currentCommand: string;
  games?: SteamGame[];
}

export const CCodeGeneratorModal: React.FC<CCodeGeneratorModalProps> = ({
  isOpen,
  onClose,
  selectedGame,
  currentCommand,
  games = [],
}) => {
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showFormatDropdown, setShowFormatDropdown] = useState(false);

  if (!isOpen) return null;

  const cFiles = getCCodeTemplates(selectedGame.name, selectedGame.appId, currentCommand, games);
  const currentFile = cFiles[activeFileIndex] || cFiles[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadBashScript = () => {
    const shFile = cFiles.find((f) => f.filename === 'launch_game.sh');
    const content = shFile
      ? shFile.content
      : `#!/usr/bin/env bash\n# Launch ${selectedGame.name}\nsteam "steam://rungameid/${selectedGame.appId}" &\n`;
    const safeName = selectedGame.name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
    const filename = `launch_${safeName || 'game'}_${selectedGame.appId}.sh`;

    const blob = new Blob([content], { type: 'text/x-sh;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadTarZstd = async () => {
    setDownloading(true);
    setShowFormatDropdown(false);
    try {
      // Map C files to tar entries, setting executable permission (0755) on build.sh and launch scripts
      const tarFiles = cFiles.map((file) => ({
        filename: file.filename,
        content: file.content,
        mode: file.filename.endsWith('.sh') ? 0o755 : 0o644,
      }));

      await downloadTarZstdProject(
        tarFiles,
        'proton_launch_manager_c_source.tar.zst',
        'proton_launch_manager'
      );
    } catch (err) {
      console.error('Failed to generate .tar.zst bundle:', err);
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadZip = async () => {
    setDownloading(true);
    setShowFormatDropdown(false);
    try {
      const zip = new JSZip();
      const folder = zip.folder('proton_launch_manager');

      cFiles.forEach((file) => {
        folder?.file(file.filename, file.content);
      });

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `proton_launch_manager_c_source.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to generate ZIP bundle:', err);
    } finally {
      setDownloading(false);
    }
  };

  const getFileIcon = (filename: string, isActive: boolean) => {
    const iconClass = `w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`;
    if (filename.includes('conflict')) return <ShieldAlert className={iconClass} />;
    if (filename.includes('preset')) return <Sparkles className={iconClass} />;
    if (filename.includes('scanner')) return <Search className={iconClass} />;
    if (filename.includes('backup')) return <History className={iconClass} />;
    if (filename.includes('launcher')) return <Play className={iconClass} />;
    if (filename.includes('tui') || filename.includes('cli') || filename.endsWith('.sh')) {
      return <Terminal className={iconClass} />;
    }
    if (filename === 'main.c') return <Layout className={iconClass} />;
    if (filename.endsWith('.1')) return <BookOpen className={iconClass} />;
    if (filename.endsWith('.md')) return <FileText className={iconClass} />;
    if (filename === 'Makefile' || filename.includes('CMake')) return <Wrench className={iconClass} />;
    return <FileCode className={iconClass} />;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-6xl h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center space-x-3">
            <div className="bg-cyan-500/20 p-2 rounded-xl border border-cyan-500/30">
              <Code2 className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-100">
                  Portable Linux C Source Code Generator
                </h2>
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-mono px-2 py-0.5 rounded-full font-semibold">
                  100% Offline C99 / Pure Libc + GTK3
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Includes Conflict Detector, Presets, Library Scanner, VDF Backups, ANSI TUI & Steam Launcher
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 relative">
            <button
              onClick={handleDownloadBashScript}
              className="bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition shadow-md"
              title="Download standalone Linux bash script (.sh)"
            >
              <Terminal className="w-4 h-4 text-cyan-200" />
              <span>Export Bash Script (.sh)</span>
            </button>

            {/* Primary .tar.zst Download Button + Format Toggle */}
            <div className="flex items-center rounded-xl bg-emerald-600 shadow-md">
              <button
                onClick={handleDownloadTarZstd}
                disabled={downloading}
                className="hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-l-xl text-xs font-semibold flex items-center space-x-1.5 transition disabled:opacity-50"
                title="Download full C project compressed with Zstandard (.tar.zst) - build.sh has pre-set executable (0755) permissions"
              >
                <Archive className="w-4 h-4 text-emerald-200" />
                <span>{downloading ? 'Compressing (zstd)...' : 'Download C Project (.tar.zst)'}</span>
              </button>
              
              <button
                onClick={() => setShowFormatDropdown(!showFormatDropdown)}
                className="px-2 py-1.5 text-emerald-100 hover:bg-emerald-500 border-l border-emerald-700/50 rounded-r-xl transition"
                title="Choose export format"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Format Dropdown Menu */}
            {showFormatDropdown && (
              <div className="absolute right-10 top-11 z-50 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 min-w-[220px] text-xs font-sans space-y-1">
                <button
                  onClick={handleDownloadTarZstd}
                  className="w-full flex items-center justify-between px-2.5 py-2 text-left rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 font-medium hover:bg-emerald-900/60 transition"
                >
                  <div className="flex items-center space-x-2">
                    <Archive className="w-4 h-4 text-emerald-400" />
                    <div>
                      <div className="font-semibold text-emerald-100">.tar.zst (Recommended)</div>
                      <div className="text-[10px] text-emerald-400">Zstd archive + executable build.sh (0755)</div>
                    </div>
                  </div>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono">Linux/Deck</span>
                </button>

                <button
                  onClick={handleDownloadZip}
                  className="w-full flex items-center justify-between px-2.5 py-2 text-left rounded-lg text-slate-300 hover:bg-slate-800 transition"
                >
                  <div className="flex items-center space-x-2">
                    <FolderArchive className="w-4 h-4 text-slate-400" />
                    <div>
                      <div className="font-semibold text-slate-200">.zip Archive</div>
                      <div className="text-[10px] text-slate-400">Legacy universal ZIP format</div>
                    </div>
                  </div>
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feature Badges Banner */}
        <div className="bg-slate-950/60 border-b border-slate-800/80 px-4 py-2 flex items-center gap-3 overflow-x-auto text-[11px] font-mono text-slate-300">
          <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px] flex items-center gap-1 shrink-0">
            <Layers className="w-3.5 h-3.5 text-cyan-400" /> Embedded Offline Modules:
          </span>
          <span className="bg-slate-900 border border-slate-700/60 px-2 py-0.5 rounded text-amber-300 shrink-0">
            🛡️ Conflict Detector
          </span>
          <span className="bg-slate-900 border border-slate-700/60 px-2 py-0.5 rounded text-purple-300 shrink-0">
            ✨ Built-in Presets
          </span>
          <span className="bg-slate-900 border border-slate-700/60 px-2 py-0.5 rounded text-cyan-300 shrink-0">
            🔍 Library Auto-Scanner
          </span>
          <span className="bg-slate-900 border border-slate-700/60 px-2 py-0.5 rounded text-emerald-300 shrink-0">
            📦 VDF Backups & Rollback
          </span>
          <span className="bg-slate-900 border border-slate-700/60 px-2 py-0.5 rounded text-sky-300 shrink-0">
            🖥️ ANSI Terminal TUI
          </span>
          <span className="bg-slate-900 border border-slate-700/60 px-2 py-0.5 rounded text-rose-300 shrink-0">
            🚀 Steam URI Launcher
          </span>
          <span className="bg-slate-900 border border-slate-700/60 px-2 py-0.5 rounded text-teal-300 shrink-0">
            📖 UNIX Manpage (.1)
          </span>
        </div>

        {/* Modal Body: File Tree Sidebar + Code Viewer */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
          
          {/* File Selector Sidebar */}
          <div className="w-full md:w-72 md:min-w-[280px] md:max-w-[320px] shrink-0 flex-shrink-0 bg-slate-950 border-b md:border-b-0 md:border-r border-slate-800 p-3 space-y-1.5 overflow-y-auto max-h-48 md:max-h-none z-10">
            <div className="text-[11px] font-mono font-semibold text-slate-500 uppercase tracking-wider px-2 mb-2 flex items-center justify-between">
              <span>Project Files ({cFiles.length})</span>
            </div>

            {cFiles.map((file, idx) => {
              const isActive = idx === activeFileIndex;
              return (
                <button
                  key={file.filename}
                  onClick={() => setActiveFileIndex(idx)}
                  className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-mono text-left transition shrink-0 ${
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  {getFileIcon(file.filename, isActive)}
                  <span className="truncate">{file.filename}</span>
                </button>
              );
            })}

            <div className="pt-4 border-t border-slate-800/80 mt-4 px-2 space-y-2 hidden md:block">
              <div className="text-[11px] text-slate-400 font-mono font-semibold flex items-center justify-between">
                <span>Quick Build (Linux / Deck):</span>
                <span className="text-[9px] text-emerald-400 font-mono">0755 +x pre-set</span>
              </div>
              <div className="bg-slate-900 p-2 rounded-lg text-[10px] font-mono text-slate-300 border border-slate-800 space-y-1">
                <div className="text-emerald-400 font-semibold"># 1. Extract .tar.zst archive:</div>
                <div className="select-all text-slate-300">tar --zstd -xvf *.tar.zst</div>
                <div className="text-cyan-400 font-semibold pt-1"># 2. Run builder (already +x):</div>
                <div className="select-all text-slate-300">cd proton_launch_manager && ./build.sh</div>
                <div className="text-cyan-400 font-semibold pt-1"># 3. Interactive ANSI TUI:</div>
                <div className="select-all text-slate-300">./proton_cli -i</div>
              </div>
            </div>
          </div>

          {/* Main Code View Area */}
          <div className="flex-1 min-w-0 min-h-0 flex flex-col bg-slate-900 overflow-hidden">
            
            {/* File Info Bar */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/80 border-b border-slate-800 shrink-0">
              <div className="flex items-center space-x-2 truncate min-w-0">
                <span className="font-mono text-xs font-bold text-cyan-300 shrink-0">
                  {currentFile.filename}
                </span>
                <span className="text-xs text-slate-500 shrink-0">•</span>
                <span className="text-xs text-slate-400 truncate">
                  {currentFile.description}
                </span>
              </div>

              <button
                onClick={handleCopy}
                className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1 rounded-lg text-xs font-medium transition shrink-0 ml-2"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Code'}</span>
              </button>
            </div>

            {/* Code Editor Preview */}
            <div className="flex-1 min-w-0 min-h-0 overflow-auto p-4 bg-[#0d1117] font-mono text-xs leading-relaxed text-slate-200 custom-scrollbar select-all">
              <pre className="whitespace-pre">{currentFile.content}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
