import React, { useState, useMemo } from 'react';
import { SteamGame } from '../types';
import { getProtonDbAdviceForGame } from '../data/protonDbKnowledge';
import { X, Sparkles, Send, Bot, Loader2, Zap, Plus, Check, Copy } from 'lucide-react';

interface GeminiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedGame: SteamGame;
  distro: string;
  currentCommandString: string;
  onApplyRecommendedFlags: (commandStr: string, mode?: 'merge' | 'replace') => void;
  onTakeOverSingleFlag?: (flag: string) => void;
  aiEnabled?: boolean;
}

export const GeminiAssistantModal: React.FC<GeminiAssistantModalProps> = ({
  isOpen,
  onClose,
  selectedGame,
  distro,
  currentCommandString,
  onApplyRecommendedFlags,
  onTakeOverSingleFlag,
  aiEnabled = true,
}) => {
  const [prompt, setPrompt] = useState(
    `How can I fix micro-stutter and boost FPS for ${selectedGame.name} on ${distro} using Proton flags?`
  );
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [suggestedCommand, setSuggestedCommand] = useState<string | null>(null);
  const [takenOverFlags, setTakenOverFlags] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);

  // Extract flag-like tokens mentioned in the AI advice
  const detectedFlags = useMemo(() => {
    if (!response) return [];
    const matches = new Set<string>();

    // 1. Match env vars: KEY=VAL (e.g., PROTON_ENABLE_NVAPI=1, VKD3D_CONFIG=dxr11, DXVK_ASYNC=1)
    const envRegex = /\b([A-Z0-9_]{3,}=(?:"[^"]*"|'[^']*'|[^\s`"'\)\],]+))/g;
    let m: RegExpExecArray | null;
    while ((m = envRegex.exec(response)) !== null) {
      const flag = m[1].replace(/[,;.\)\]]+$/, '');
      if (flag.includes('=')) matches.add(flag);
    }

    // 2. Known wrappers & runtime tools
    const wrappers = ['gamemoderun', 'mangohud', 'gamescope', 'obs-gamecapture', 'vkbasalt', 'game-performance', 'dlssnr-helper'];
    wrappers.forEach((w) => {
      if (response.includes(w)) matches.add(w);
    });

    // 3. Engine args: -novid, --skip-launcher, +fps_max
    const argsRegex = /(?:^|\s)(--?[a-zA-Z0-9_\-]+(?:\s+[a-zA-Z0-9]+)?|\+[a-zA-Z0-9_\-]+(?:\s+[0-9]+)?)/g;
    while ((m = argsRegex.exec(response)) !== null) {
      const arg = m[1].trim();
      if (arg && arg !== '-' && arg !== '--') {
        matches.add(arg);
      }
    }

    return Array.from(matches);
  }, [response]);

  if (!isOpen) return null;

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    setLoading(true);
    setResponse(null);
    setSuggestedCommand(null);
    setTakenOverFlags({});

    try {
      const res = await fetch('/api/gemini/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameName: selectedGame.name,
          distro,
          prompt,
          currentCommand: currentCommandString || selectedGame.currentLaunchOptions,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setResponse(data.advice);
        setSuggestedCommand(data.recommendedCommand || null);
      } else {
        const gameAdvice = getProtonDbAdviceForGame(selectedGame.name, selectedGame.appId, distro);
        setResponse(
          `For **${selectedGame.name}** on **${distro}**:\n\n` +
          gameAdvice.commentsAdvice.map((c, i) => `${i + 1}. ${c}`).join('\n')
        );
        setSuggestedCommand(gameAdvice.recommendedCommand);
      }
    } catch (err) {
      const gameAdvice = getProtonDbAdviceForGame(selectedGame.name, selectedGame.appId, distro);
      setResponse(
        `For **${selectedGame.name}** on **${distro}**:\n\n` +
        gameAdvice.commentsAdvice.map((c) => `• ${c}`).join('\n')
      );
      setSuggestedCommand(gameAdvice.recommendedCommand);
    } finally {
      setLoading(false);
    }
  };

  const handleTakeOverFlag = (flag: string) => {
    if (!flag || !flag.trim()) return;
    onTakeOverSingleFlag?.(flag);
    setTakenOverFlags((prev) => ({ ...prev, [flag]: true }));
  };

  const effectiveCommand = suggestedCommand || (detectedFlags.length > 0 ? `${detectedFlags.join(' ')} %command%` : '');

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl flex flex-col shadow-2xl overflow-hidden max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center space-x-3">
            <div className="bg-purple-500/20 p-2 rounded-xl border border-purple-500/30">
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Proton AI Optimization Assistant</h2>
              <p className="text-xs text-slate-400">Ask Gemini for custom Linux launch flags, stutter fixes, and FPS optimizations</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-xl transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Command Banner */}
        <div className="px-4 py-2 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2 truncate">
            <span className="text-slate-400 font-semibold">Live Active Command:</span>
            <code className="text-cyan-300 font-mono truncate">{currentCommandString || '%command%'}</code>
          </div>
        </div>

        {/* Query Input */}
        <div className="p-4 bg-slate-950/50 border-b border-slate-800">
          {!aiEnabled ? (
            <div className="bg-amber-950/30 border border-amber-800/50 text-amber-200 text-xs px-3.5 py-2.5 rounded-xl flex items-center justify-between">
              <span>🔒 AI Copilot is currently disabled by environment settings or enterprise policy.</span>
            </div>
          ) : (
            <form onSubmit={handleAsk} className="flex items-center space-x-2">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ask about Proton flags, crashing, or FPS optimizations..."
                className="flex-1 bg-slate-900 border border-slate-800 focus:border-purple-500 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none"
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>Ask AI</span>
              </button>
            </form>
          )}
        </div>

        {/* AI Output */}
        <div className="p-4 flex-1 overflow-y-auto space-y-4 font-sans text-xs leading-relaxed">
          {loading && (
            <div className="flex items-center justify-center py-8 space-x-2 text-purple-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Analyzing Linux Proton flags with Gemini...</span>
            </div>
          )}

          {response && (
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-purple-400 font-bold">
                  <Bot className="w-4 h-4" />
                  <span>Gemini Proton Recommendation:</span>
                </div>
                <button
                  onClick={() => copyToClipboard(response)}
                  className="text-[11px] text-slate-400 hover:text-purple-300 flex items-center gap-1 transition"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copied ? 'Copied' : 'Copy Text'}</span>
                </button>
              </div>

              <div className="text-slate-300 whitespace-pre-wrap leading-relaxed">{response}</div>

              {/* Individual Detected Flags Section */}
              {detectedFlags.length > 0 && (
                <div className="pt-3 border-t border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                      Detected Advice Flags (Take over individually into Live Command):
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {detectedFlags.length} flag{detectedFlags.length !== 1 ? 's' : ''} detected
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {detectedFlags.map((flag) => {
                      const isTaken = takenOverFlags[flag];
                      return (
                        <div
                          key={flag}
                          className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs"
                        >
                          <code className="text-cyan-300 font-mono">{flag}</code>
                          <button
                            type="button"
                            onClick={() => handleTakeOverFlag(flag)}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold flex items-center gap-0.5 transition ${
                              isTaken
                                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                                : 'bg-purple-900/40 hover:bg-purple-600 text-purple-200 hover:text-white border border-purple-500/40'
                            }`}
                            title="Add this flag directly to the Live Command String"
                          >
                            {isTaken ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Plus className="w-2.5 h-2.5" />}
                            <span>{isTaken ? 'Live Added!' : 'Take Over'}</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Full Command Bar */}
              {effectiveCommand && (
                <div className="pt-3 border-t border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      Complete Recommended Command:
                    </span>
                    <button
                      onClick={() => copyToClipboard(effectiveCommand)}
                      className="text-[10px] text-slate-400 hover:text-cyan-300 flex items-center gap-1 transition"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </button>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 font-mono text-cyan-400 text-xs break-all">
                    {effectiveCommand}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => {
                        onApplyRecommendedFlags(effectiveCommand, 'merge');
                        onClose();
                      }}
                      className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition shadow-lg shadow-cyan-950"
                      title="Merge AI flags into current live command string (keeps your other options)"
                    >
                      <Zap className="w-4 h-4 fill-current" />
                      <span>Merge into Live Command</span>
                    </button>
                    <button
                      onClick={() => {
                        onApplyRecommendedFlags(effectiveCommand, 'replace');
                        onClose();
                      }}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold transition"
                      title="Replace your Live Command with this AI recommendation"
                    >
                      <span>Replace Live Command</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

