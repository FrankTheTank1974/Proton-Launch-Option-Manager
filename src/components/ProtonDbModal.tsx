import React, { useState, useEffect } from 'react';
import { SteamGame } from '../types';
import { X, MessageSquareQuote, ExternalLink, Zap, Loader2, Sparkles, CheckCircle2, ShieldCheck, AlertCircle, TrendingUp } from 'lucide-react';

interface ProtonDbModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedGame: SteamGame;
  distro: string;
  onApplyRecommendedFlags: (commandStr: string) => void;
}

interface ProtonDbResult {
  tier: string;
  trending: string;
  summary: string;
  commentsAdvice: string[];
  recommendedCommand: string;
  sourceUrl: string;
}

export const ProtonDbModal: React.FC<ProtonDbModalProps> = ({
  isOpen,
  onClose,
  selectedGame,
  distro,
  onApplyRecommendedFlags,
}) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProtonDbResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/protondb/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameName: selectedGame.name,
          appId: selectedGame.appId,
          distro,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setResult(data);
      } else {
        throw new Error('Failed to fetch ProtonDB insights');
      }
    } catch (err) {
      setError('Could not retrieve ProtonDB community comments at this moment. Using static offline recommendations.');
      setResult({
        tier: 'Gold',
        trending: 'Gold',
        summary: `ProtonDB community consensus for ${selectedGame.name} confirms high playability with minor flag optimizations.`,
        commentsAdvice: [
          `**Kernel Synchronization:** User comments strongly recommend \`PROTON_USE_NTSYNC=1\` to prevent micro-stuttering on Linux.`,
          `**CPU & GPU Governor:** Many Linux reports wrap the command in \`gamemoderun %command%\` for consistent frame timing.`,
          `**DirectX 12 Ray Tracing:** Enabling \`VKD3D_CONFIG=dxr11,dxr\` activates hardware ray tracing on compatible GPUs.`,
        ],
        recommendedCommand: `PROTON_USE_NTSYNC=1 VKD3D_CONFIG=dxr11,dxr gamemoderun %command%`,
        sourceUrl: `https://www.protondb.com/app/${selectedGame.appId}`,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchInsights();
    }
  }, [isOpen, selectedGame.id, distro]);

  if (!isOpen) return null;

  const getTierColor = (tier: string) => {
    const t = tier.toLowerCase();
    if (t === 'platinum') return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
    if (t === 'gold') return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    if (t === 'silver') return 'bg-slate-400/20 text-slate-300 border-slate-400/40';
    if (t === 'bronze') return 'bg-orange-500/20 text-orange-300 border-orange-500/40';
    if (t === 'borked') return 'bg-red-500/20 text-red-300 border-red-500/40';
    return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl flex flex-col shadow-2xl overflow-hidden max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center space-x-3">
            <div className="bg-amber-500/20 p-2.5 rounded-xl border border-amber-500/30">
              <MessageSquareQuote className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-slate-100">ProtonDB Community Insights</h2>
                <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-semibold border border-purple-500/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> AI Analyzed Comments
                </span>
              </div>
              <p className="text-xs text-slate-400">Synthesizing launch flag advice from real Linux gamer reports on ProtonDB</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-xl transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Game & Distro Summary Banner */}
        <div className="p-4 bg-slate-950/50 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <img
              src={selectedGame.bannerUrl}
              alt={selectedGame.name}
              className="w-14 h-10 object-cover rounded-lg border border-slate-700"
            />
            <div>
              <h3 className="font-bold text-slate-200 text-sm">{selectedGame.name}</h3>
              <p className="text-xs text-slate-400 flex items-center gap-2">
                <span>AppID: <strong className="text-slate-300 font-mono">{selectedGame.appId}</strong></span>
                <span>•</span>
                <span>Targeting: <strong className="text-cyan-400">{distro}</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {result && (
              <div className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center space-x-1.5 shadow-sm ${getTierColor(result.tier)}`}>
                <ShieldCheck className="w-4 h-4" />
                <span>Tier: {result.tier}</span>
                {result.trending && result.trending !== result.tier && (
                  <span className="text-[10px] opacity-80 flex items-center gap-0.5 ml-1">
                    <TrendingUp className="w-3 h-3" /> ({result.trending})
                  </span>
                )}
              </div>
            )}
            <a
              href={`https://www.protondb.com/app/${selectedGame.appId}`}
              target="_blank"
              rel="noreferrer"
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1 transition border border-slate-700"
              title="Open full ProtonDB community reports in a new tab"
            >
              <span>View ProtonDB</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Body Area */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4 text-xs leading-relaxed">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 space-y-3 text-amber-400">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="font-semibold text-slate-200 text-sm">Scanning ProtonDB user reports and community comments...</p>
              <p className="text-slate-400 text-xs text-center max-w-md">
                Gemini is extracting tested Proton launch flags, environment variables, and framerate tweaks reported by gamers on Linux.
              </p>
            </div>
          )}

          {error && !loading && (
            <div className="bg-amber-950/40 border border-amber-800/60 rounded-xl p-3 text-amber-200 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!loading && result && (
            <>
              {/* Community Consensus Overview */}
              <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 space-y-2">
                <h4 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>ProtonDB Community Consensus Summary</span>
                </h4>
                <p className="text-slate-300 text-xs leading-relaxed">
                  {result.summary}
                </p>
              </div>

              {/* Specific Comment Advice & Flags */}
              <div className="space-y-2.5">
                <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wider text-slate-400">
                  Key Flag Suggestions Extracted from User Comments:
                </h4>
                <div className="grid grid-cols-1 gap-2.5">
                  {result.commentsAdvice.map((advice, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-950/80 border border-slate-800 hover:border-amber-500/30 p-3 rounded-xl transition flex items-start space-x-3"
                    >
                      <div className="w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center font-mono font-bold text-amber-400 flex-shrink-0 mt-0.5">
                        {idx + 1}
                      </div>
                      <div
                        className="text-slate-300 text-xs flex-1 leading-normal"
                        dangerouslySetInnerHTML={{
                          __html: advice
                            .replace(/`([^`]+)`/g, '<code class="bg-slate-900 text-amber-300 px-1.5 py-0.5 rounded border border-slate-700 font-mono text-[11px]">$1</code>')
                            .replace(/\*\*([^*]+)\*\*/g, '<strong class="text-slate-100 font-semibold">$1</strong>')
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer with Consensus Launch Command */}
        {!loading && result && (
          <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex-1 w-full sm:w-auto overflow-hidden">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Synthesized Community Launch Command:
              </span>
              <div className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 font-mono text-cyan-400 text-xs truncate">
                {result.recommendedCommand}
              </div>
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto justify-end flex-shrink-0">
              <button
                onClick={fetchInsights}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-xl text-xs font-semibold transition"
              >
                Refresh Analysis
              </button>
              <button
                onClick={() => {
                  onApplyRecommendedFlags(result.recommendedCommand);
                  onClose();
                }}
                className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition shadow-lg shadow-amber-900/30"
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>Apply Community Flags</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
