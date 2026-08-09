import React, { useState } from 'react';
import { getCCodeTemplates } from '../data/cCodeTemplates';
import { SteamGame } from '../types';
import JSZip from 'jszip';
import { 
  X, 
  Code2, 
  Copy, 
  Check, 
  Download, 
  Terminal, 
  FileCode, 
  FolderArchive, 
  CheckCircle2,
  Cpu,
  Boxes
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

  if (!isOpen) return null;

  const cFiles = getCCodeTemplates(selectedGame.name, selectedGame.appId, currentCommand, games);
  const currentFile = cFiles[activeFileIndex];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadZip = async () => {
    setDownloading(true);
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

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center space-x-3">
            <div className="bg-cyan-500/20 p-2 rounded-xl border border-cyan-500/30">
              <Code2 className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>Portable Linux C Source Code Generator</span>
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono px-2 py-0.5 rounded-full font-semibold">
                  GTK3 / C99 / Portable
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Easily compile across Arch, Ubuntu, Fedora, Gentoo, and SteamOS with GTK3 or Makefile
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownloadZip}
              disabled={downloading}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition shadow-md disabled:opacity-50"
            >
              <FolderArchive className="w-4 h-4" />
              <span>{downloading ? 'Zipping...' : 'Download C Project ZIP'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: File Tree Sidebar + Code Viewer */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* File Selector Sidebar */}
          <div className="w-64 bg-slate-950 border-r border-slate-800 p-3 space-y-1.5 overflow-y-auto">
            <div className="text-[11px] font-mono font-semibold text-slate-500 uppercase tracking-wider px-2 mb-2">
              Project Structure
            </div>

            {cFiles.map((file, idx) => {
              const isActive = idx === activeFileIndex;
              return (
                <button
                  key={file.filename}
                  onClick={() => setActiveFileIndex(idx)}
                  className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-mono text-left transition ${
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  <FileCode className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                  <span className="truncate">{file.filename}</span>
                </button>
              );
            })}

            <div className="pt-4 border-t border-slate-800/80 mt-4 px-2 space-y-2">
              <div className="text-[11px] text-slate-400 font-mono font-semibold">
                Build Command (Terminal):
              </div>
              <div className="bg-slate-900 p-2 rounded-lg text-[10px] font-mono text-slate-300 border border-slate-800 break-all select-all">
                gcc -o proton_mgr main.c vdf_parser.c $(pkg-config --cflags --libs gtk+-3.0)
              </div>
            </div>
          </div>

          {/* Main Code View Area */}
          <div className="flex-1 flex flex-col bg-slate-900">
            
            {/* File Info Bar */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/80 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs font-bold text-cyan-300">
                  {currentFile.filename}
                </span>
                <span className="text-xs text-slate-500">•</span>
                <span className="text-xs text-slate-400">
                  {currentFile.description}
                </span>
              </div>

              <button
                onClick={handleCopy}
                className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1 rounded-lg text-xs font-medium transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Code'}</span>
              </button>
            </div>

            {/* Code Editor Preview */}
            <div className="flex-1 overflow-auto p-4 bg-[#0d1117] font-mono text-xs leading-relaxed text-slate-200 custom-scrollbar select-all">
              <pre className="whitespace-pre">{currentFile.content}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
