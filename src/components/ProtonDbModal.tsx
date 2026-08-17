import React, { useState, useEffect } from 'react';
import { SteamGame } from '../types';
import { getProtonDbAdviceForGame } from '../data/protonDbKnowledge';
import {
  X,
  MessageSquareQuote,
  ExternalLink,
  Zap,
  Loader2,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  TrendingUp,
  Check,
  CheckSquare,
  Square,
  Copy,
  RotateCcw,
} from 'lucide-react';

interface ProtonDbModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedGame: SteamGame;
  distro: string;
  onApplyRecommendedFlags: (commandStr: string) => void;
  aiEnabled?: boolean;
}

interface SelectableSuggestion {
  id: string;
  title: string;
  description: string;
  flag: string;
  enabled: boolean;
}

interface ProtonDbResult {
  tier: string;
  trending: string;
  summary: string;
  suggestions?: { title: string; description: string; flag: string }[];
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
  aiEnabled = true,
}) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProtonDbResult | null>(null);
  const [suggestions, setSuggestions] = useState<SelectableSuggestion[]>([]);
  const [synthesizedCommand, setSynthesizedCommand] = useState<string>('%command%');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildCommandFromSuggestions = (items: SelectableSuggestion[], fallbackCmd?: string): string => {
    const activeItems = items.filter((item) => item.enabled && item.flag && item.flag.trim());
    if (activeItems.length === 0) {
      return fallbackCmd || '%command%';
    }

    const envVars: string[] = [];
    const wrappers: string[] = [];

    activeItems.forEach((item) => {
      const tokens = item.flag.trim().split(/\s+/);
      tokens.forEach((token) => {
        if (!token || token === '%command%') return;
        if (token.includes('=')) {
          if (!envVars.includes(token)) envVars.push(token);
        } else {
          if (!wrappers.includes(token)) wrappers.push(token);
        }
      });
    });

    return [...envVars, ...wrappers, '%command%'].join(' ');
  };

  const parseCommentsAdviceToSuggestions = (commentsAdvice: string[]): SelectableSuggestion[] => {
    return commentsAdvice.map((advice, idx) => {
      const titleMatch = advice.match(/\*\*([^*]+)\*\*/);
      const title = titleMatch ? titleMatch[1].replace(/:$/, '') : `Recommendation #${idx + 1}`;
      
      const description = advice
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .trim();

      const codeMatches = Array.from(advice.matchAll(/`([^`]+)`/g)).map((m) => m[1]);
      const flag = codeMatches.filter((c) => c !== '%command%').join(' ') || '';

      return {
        id: `adv-${idx}`,
        title,
        description,
        flag,
        enabled: true,
      };
    });
  };

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
        const data: ProtonDbResult = await res.json();
        setResult(data);

        let initialSuggestions: SelectableSuggestion[] = [];
        if (data.suggestions && Array.isArray(data.suggestions) && data.suggestions.length > 0) {
          initialSuggestions = data.suggestions.map((s, idx) => ({
            id: `sug-${idx}`,
            title: s.title || `Suggestion #${idx + 1}`,
            description: s.description || s.flag || '',
            flag: s.flag || '',
            enabled: true,
          }));
        } else if (data.commentsAdvice && Array.isArray(data.commentsAdvice)) {
          initialSuggestions = parseCommentsAdviceToSuggestions(data.commentsAdvice);
        }

        setSuggestions(initialSuggestions);
        const cmd = buildCommandFromSuggestions(initialSuggestions, data.recommendedCommand);
        setSynthesizedCommand(cmd);
      } else {
        throw new Error('Failed to fetch ProtonDB insights');
      }
    } catch (err) {
      setError('Could not connect to online service. Using curated offline ProtonDB community recommendations.');
      const gameAdvice = getProtonDbAdviceForGame(selectedGame.name, selectedGame.appId, distro);
      const fallbackData: ProtonDbResult = {
        tier: gameAdvice.tier,
        trending: gameAdvice.trending,
        summary: gameAdvice.summary,
        suggestions: gameAdvice.suggestions,
        commentsAdvice: gameAdvice.commentsAdvice,
        recommendedCommand: gameAdvice.recommendedCommand,
        sourceUrl: gameAdvice.sourceUrl || `https://www.protondb.com/app/${selectedGame.appId}`,
      };

      setResult(fallbackData);
      const fallbackSuggestions: SelectableSuggestion[] = fallbackData.suggestions!.map((s, idx) => ({
        id: `fb-${idx}`,
        title: s.title,
        description: s.description,
        flag: s.flag,
        enabled: true,
      }));
      setSuggestions(fallbackSuggestions);
      setSynthesizedCommand(buildCommandFromSuggestions(fallbackSuggestions, fallbackData.recommendedCommand));
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

  const toggleSuggestion = (id: string) => {
    setSuggestions((prev) => {
      const next = prev.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item));
      setSynthesizedCommand(buildCommandFromSuggestions(next, result?.recommendedCommand));
      return next;
    });
  };

  const selectAll = () => {
    setSuggestions((prev) => {
      const next = prev.map((item) => ({ ...item, enabled: true }));
      setSynthesizedCommand(buildCommandFromSuggestions(next, result?.recommendedCommand));
      return next;
    });
  };

  const deselectAll = () => {
    setSuggestions((prev) => {
      const next = prev.map((item) => ({ ...item, enabled: false }));
      setSynthesizedCommand(buildCommandFromSuggestions(next, '%command%'));
      return next;
    });
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(synthesizedCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getTierColor = (tier: string) => {
    const t = tier.toLowerCase();
    if (t === 'platinum') return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
    if (t === 'gold') return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    if (t === 'silver') return 'bg-slate-400/20 text-slate-300 border-slate-400/40';
    if (t === 'bronze') return 'bg-orange-500/20 text-orange-300 border-orange-500/40';
    if (t === 'borked') return 'bg-red-500/20 text-red-300 border-red-500/40';
    return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
  };

  const enabledCount = suggestions.filter((s) => s.enabled).length;

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
                {aiEnabled ? (
                  <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-semibold border border-purple-500/30 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> AI Analyzed Comments
                  </span>
                ) : (
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-semibold border border-amber-500/30 flex items-center gap-1">
                    Community Consensus
                  </span>
                )}
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
                {aiEnabled
                  ? 'Gemini is extracting tested Proton launch flags, environment variables, and framerate tweaks reported by gamers on Linux.'
                  : 'Retrieving community tested Proton launch flags, environment variables, and framerate tweaks reported by gamers on Linux.'}
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

              {/* Checkmark Selection Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wider text-slate-400">
                      Select Flag Suggestions to Include:
                    </h4>
                    <span className="bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold">
                      {enabledCount} of {suggestions.length} selected
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={selectAll}
                      className="text-[11px] text-amber-400 hover:text-amber-300 bg-slate-950 hover:bg-slate-800 border border-slate-800 px-2.5 py-1 rounded-lg transition font-medium flex items-center gap-1"
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                      <span>Select All</span>
                    </button>
                    <button
                      onClick={deselectAll}
                      className="text-[11px] text-slate-400 hover:text-slate-200 bg-slate-950 hover:bg-slate-800 border border-slate-800 px-2.5 py-1 rounded-lg transition font-medium flex items-center gap-1"
                    >
                      <Square className="w-3.5 h-3.5" />
                      <span>Deselect All</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {suggestions.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => toggleSuggestion(item.id)}
                      className={`p-3 rounded-xl border transition cursor-pointer select-none flex items-start space-x-3.5 ${
                        item.enabled
                          ? 'bg-amber-950/20 border-amber-500/40 hover:border-amber-500/60 shadow-sm'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 opacity-60'
                      }`}
                    >
                      {/* Checkmark Button */}
                      <div
                        className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 mt-0.5 transition ${
                          item.enabled
                            ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-sm'
                            : 'bg-slate-900 border-slate-700 text-transparent'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <span className={`font-bold text-xs ${item.enabled ? 'text-amber-200' : 'text-slate-400'}`}>
                            {item.title}
                          </span>
                          {item.flag && (
                            <code className="bg-slate-900 text-amber-300 border border-slate-800 px-2 py-0.5 rounded font-mono text-[11px]">
                              {item.flag}
                            </code>
                          )}
                        </div>
                        <p className={`text-xs leading-normal ${item.enabled ? 'text-slate-300' : 'text-slate-500'}`}>
                          {item.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer with Synthesized Launch Command */}
        {!loading && result && (
          <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex-1 w-full sm:w-auto overflow-hidden">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">
                  Synthesized Selected Command:
                </span>
                <button
                  onClick={copyToClipboard}
                  className="text-[10px] text-slate-400 hover:text-amber-300 flex items-center gap-1 transition"
                  title="Copy command to clipboard"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
              <input
                type="text"
                value={synthesizedCommand}
                onChange={(e) => setSynthesizedCommand(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 font-mono text-cyan-400 text-xs focus:outline-none focus:border-amber-500 transition"
              />
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto justify-end flex-shrink-0 pt-2 sm:pt-0">
              <button
                onClick={fetchInsights}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
                title="Re-run ProtonDB report analysis"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
              <button
                onClick={() => {
                  onApplyRecommendedFlags(synthesizedCommand);
                  onClose();
                }}
                className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition shadow-lg shadow-amber-900/30"
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>Apply Selected ({enabledCount})</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

