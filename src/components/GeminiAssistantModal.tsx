import React, { useState } from 'react';
import { SteamGame } from '../types';
import { X, Sparkles, Send, Bot, User, Loader2, Zap } from 'lucide-react';

interface GeminiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedGame: SteamGame;
  distro: string;
  onApplyRecommendedFlags: (commandStr: string) => void;
}

export const GeminiAssistantModal: React.FC<GeminiAssistantModalProps> = ({
  isOpen,
  onClose,
  selectedGame,
  distro,
  onApplyRecommendedFlags,
}) => {
  const [prompt, setPrompt] = useState(
    `How can I fix micro-stutter and boost FPS for ${selectedGame.name} on ${distro} using Proton flags?`
  );
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [suggestedCommand, setSuggestedCommand] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    setLoading(true);
    setResponse(null);
    setSuggestedCommand(null);

    try {
      const res = await fetch('/api/gemini/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameName: selectedGame.name,
          distro,
          prompt,
          currentCommand: selectedGame.currentLaunchOptions,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setResponse(data.advice);
        setSuggestedCommand(data.recommendedCommand || null);
      } else {
        // Fallback static AI advice
        setResponse(
          `For **${selectedGame.name}** on **${distro}**:\n\n` +
          `1. **NTSync / Threading**: Set \`PROTON_USE_NTSYNC=1\` for near-native Linux kernel synchronization (requires Kernel 6.8+).\n` +
          `2. **Nvidia DLSS / Reflex**: Enable \`PROTON_ENABLE_NVAPI=1\` if using an RTX GPU.\n` +
          `3. **GPU Governor**: Use \`gamemoderun %command%\` to ensure performance mode.\n` +
          `4. **VKD3D Ray Tracing**: Enable \`VKD3D_CONFIG=dxr11,dxr\` for Direct3D 12 Ray Tracing.`
        );
        setSuggestedCommand(`PROTON_ENABLE_NVAPI=1 PROTON_USE_NTSYNC=1 VKD3D_CONFIG=dxr11,dxr gamemoderun %command%`);
      }
    } catch (err) {
      setResponse(
        `For **${selectedGame.name}** on **${distro}**:\n\n` +
        `• Set \`PROTON_USE_NTSYNC=1\` for fast thread sync.\n` +
        `• Set \`PROTON_ENABLE_NVAPI=1\` for DLSS support.\n` +
        `• Add \`gamemoderun %command%\` for CPU governor boost.`
      );
      setSuggestedCommand(`PROTON_ENABLE_NVAPI=1 PROTON_USE_NTSYNC=1 gamemoderun %command%`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center space-x-3">
            <div className="bg-purple-500/20 p-2 rounded-xl border border-purple-500/30">
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Proton AI Optimization Assistant</h2>
              <p className="text-xs text-slate-400">Ask Gemini for custom Linux launch flags and troubleshooting advice</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-xl transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Query Input */}
        <div className="p-4 bg-slate-950/50 border-b border-slate-800">
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
        </div>

        {/* AI Output */}
        <div className="p-4 flex-1 overflow-y-auto max-h-[50vh] space-y-3 font-sans text-xs leading-relaxed">
          {loading && (
            <div className="flex items-center justify-center py-8 space-x-2 text-purple-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Analyzing Linux Proton flags with Gemini...</span>
            </div>
          )}

          {response && (
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3">
              <div className="flex items-center space-x-2 text-purple-400 font-bold">
                <Bot className="w-4 h-4" />
                <span>Gemini Proton Recommendation:</span>
              </div>
              <div className="text-slate-300 whitespace-pre-wrap">{response}</div>

              {suggestedCommand && (
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span className="font-mono text-cyan-400 text-xs truncate max-w-md">
                    {suggestedCommand}
                  </span>
                  <button
                    onClick={() => {
                      onApplyRecommendedFlags(suggestedCommand);
                      onClose();
                    }}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 transition shadow-md"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Apply AI Flags</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
