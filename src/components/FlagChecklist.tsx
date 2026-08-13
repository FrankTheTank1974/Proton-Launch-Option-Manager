import React, { useState } from 'react';
import { PROTON_FLAGS } from '../data/protonFlagsData';
import { FlagCategory, CustomEnvVar, ProtonFlag } from '../types';
import { detectFlagConflicts, FlagConflict } from '../utils/conflictDetector';
import { 
  CheckSquare, 
  Info, 
  Zap, 
  Plus, 
  Trash2, 
  SlidersHorizontal, 
  Flame, 
  Sparkles, 
  Terminal,
  Cpu,
  Layers,
  Activity,
  Bug,
  Film,
  Boxes,
  Wrench,
  ShieldCheck,
  Gamepad2,
  Monitor,
  Gamepad,
  Search,
  X,
  Filter,
  CheckCircle2,
  Video,
  AlertTriangle,
  ShieldAlert,
  AlertCircle
} from 'lucide-react';

interface FlagChecklistProps {
  enabledFlags: Record<string, string | boolean>;
  onToggleFlag: (flagId: string, value: string | boolean) => void;
  customEnvVars: CustomEnvVar[];
  onAddCustomEnvVar: (key: string, value: string) => void;
  onRemoveCustomEnvVar: (id: string) => void;
  onToggleCustomEnvVar: (id: string, enabled: boolean) => void;
  extraArgs: string;
  onChangeExtraArgs: (args: string) => void;
  distro: string;
}

export const FlagChecklist: React.FC<FlagChecklistProps> = ({
  enabledFlags,
  onToggleFlag,
  customEnvVars,
  onAddCustomEnvVar,
  onRemoveCustomEnvVar,
  onToggleCustomEnvVar,
  extraArgs,
  onChangeExtraArgs,
  distro,
}) => {
  const [activeTab, setActiveTab] = useState<FlagCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyEnabled, setOnlyEnabled] = useState(false);
  const [newEnvKey, setNewEnvKey] = useState('');
  const [newEnvVal, setNewEnvVal] = useState('');

  // Detect active Proton flag conflicts
  const activeConflicts = detectFlagConflicts(enabledFlags, customEnvVars);

  const handleAutoResolveConflict = (conflict: FlagConflict) => {
    if (conflict.autoResolveFix) {
      if (conflict.autoResolveFix.disableFlagIds) {
        conflict.autoResolveFix.disableFlagIds.forEach((id) => {
          onToggleFlag(id, false);
        });
      }
      if (conflict.autoResolveFix.setValueMap) {
        Object.entries(conflict.autoResolveFix.setValueMap).forEach(([id, val]) => {
          onToggleFlag(id, val);
        });
      }
    }
  };

  const handleAutoResolveAllConflicts = () => {
    activeConflicts.forEach((conflict) => {
      handleAutoResolveConflict(conflict);
    });
  };

  const categories: Array<{ id: FlagCategory | 'all'; label: string; icon: React.ReactNode }> = [
    { id: 'all', label: 'All Flags', icon: <CheckSquare className="w-3.5 h-3.5" /> },
    { id: 'proton_runtime', label: 'Proton Runtime & Sync', icon: <Cpu className="w-3.5 h-3.5" /> },
    { id: 'proton_ge', label: 'GE-Proton', icon: <Boxes className="w-3.5 h-3.5 text-purple-400" /> },
    { id: 'proton_cachyos', label: 'Proton-CachyOS', icon: <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> },
    { id: 'proton_em', label: 'Proton-EM', icon: <Wrench className="w-3.5 h-3.5 text-emerald-400" /> },
    { id: 'proton_dw', label: 'Proton-DW', icon: <ShieldCheck className="w-3.5 h-3.5 text-orange-400" /> },
    { id: 'proton_rtsp', label: 'Proton-RTSP (Livestreams)', icon: <Video className="w-3.5 h-3.5 text-rose-400" /> },
    { id: 'boxtron', label: 'Boxtron (DOSBox)', icon: <Monitor className="w-3.5 h-3.5 text-yellow-400" /> },
    { id: 'luxtorpeda', label: 'Luxtorpeda (Native Engines)', icon: <Gamepad2 className="w-3.5 h-3.5 text-lime-400" /> },
    { id: 'roberta', label: 'Roberta (ScummVM)', icon: <Gamepad className="w-3.5 h-3.5 text-pink-400" /> },
    { id: 'lsfg_framegen', label: 'LSFG-VK FrameGen', icon: <Film className="w-3.5 h-3.5 text-fuchsia-400" /> },
    { id: 'graphics_dxvk', label: 'DXVK & NVAPI & Shaders', icon: <Zap className="w-3.5 h-3.5" /> },
    { id: 'low_latency', label: 'Low Latency Layer (LLL)', icon: <Flame className="w-3.5 h-3.5 text-amber-400" /> },
    { id: 'performance_wrappers', label: 'Wrappers & Overlays', icon: <Activity className="w-3.5 h-3.5" /> },
    { id: 'display_gamescope', label: 'Gamescope', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'debug_logs', label: 'Logs & Debug', icon: <Bug className="w-3.5 h-3.5" /> },
  ];

  const searchChips = [
    { label: 'NVAPI / DLSS', query: 'NVAPI' },
    { label: 'FSR', query: 'FSR' },
    { label: 'Wayland', query: 'Wayland' },
    { label: 'NTSYNC', query: 'NTSYNC' },
    { label: 'FrameGen', query: 'LSFG' },
    { label: 'Reflex / Latency', query: 'Low Latency' },
    { label: 'RTSP / VRChat', query: 'RTSP' },
    { label: 'DOSBox', query: 'DOSBox' },
    { label: 'ScummVM', query: 'ScummVM' },
    { label: 'MangoHud', query: 'MangoHud' },
    { label: 'GameMode', query: 'gamemoderun' },
  ];

  const enabledCount = PROTON_FLAGS.filter((flag) => {
    return enabledFlags[flag.id] === true || (typeof enabledFlags[flag.id] === 'string' && enabledFlags[flag.id] !== '');
  }).length;

  const filteredFlags = PROTON_FLAGS.filter((flag) => {
    if (activeTab !== 'all' && flag.category !== activeTab) {
      return false;
    }

    const isChecked = enabledFlags[flag.id] === true || (typeof enabledFlags[flag.id] === 'string' && enabledFlags[flag.id] !== '');
    if (onlyEnabled && !isChecked) {
      return false;
    }

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      const matchName = flag.name.toLowerCase().includes(q);
      const matchKey = flag.key.toLowerCase().includes(q);
      const matchDesc = flag.description.toLowerCase().includes(q);
      const matchTooltip = flag.tooltip.toLowerCase().includes(q);
      const matchExample = flag.example.toLowerCase().includes(q);
      const matchCategory = flag.category.toLowerCase().includes(q);
      return matchName || matchKey || matchDesc || matchTooltip || matchExample || matchCategory;
    }

    return true;
  });

  const getCategoryCount = (catId: FlagCategory | 'all') => {
    return PROTON_FLAGS.filter((flag) => {
      if (catId !== 'all' && flag.category !== catId) return false;
      const isChecked = enabledFlags[flag.id] === true || (typeof enabledFlags[flag.id] === 'string' && enabledFlags[flag.id] !== '');
      if (onlyEnabled && !isChecked) return false;
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        return (
          flag.name.toLowerCase().includes(q) ||
          flag.key.toLowerCase().includes(q) ||
          flag.description.toLowerCase().includes(q) ||
          flag.tooltip.toLowerCase().includes(q) ||
          flag.example.toLowerCase().includes(q) ||
          flag.category.toLowerCase().includes(q)
        );
      }
      return true;
    }).length;
  };

  const handleAddEnv = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEnvKey.trim()) return;
    onAddCustomEnvVar(newEnvKey.trim(), newEnvVal.trim());
    setNewEnvKey('');
    setNewEnvVal('');
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-4">
      
      {/* Search Bar & Active Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-950/90 p-3 rounded-xl border border-slate-800 shadow-inner">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search flags (e.g. NVAPI, FSR, Wayland, NTSYNC, LSFG, DXVK, DOSBox, ScummVM)..."
            className="w-full bg-slate-900/90 border border-slate-800 focus:border-cyan-500 text-slate-100 text-xs rounded-lg pl-9 pr-8 py-2 focus:outline-none placeholder:text-slate-500 font-medium transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1 rounded transition"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Only Enabled Button */}
        <button
          onClick={() => setOnlyEnabled(!onlyEnabled)}
          className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold shrink-0 transition ${
            onlyEnabled
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
              : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          <span>Only Active ({enabledCount})</span>
        </button>
      </div>

      {/* Quick Search Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
        <span className="text-[11px] text-slate-500 font-medium shrink-0 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-cyan-400" />
          Quick Tags:
        </span>
        {searchChips.map((chip) => {
          const isActive = searchQuery.toLowerCase() === chip.query.toLowerCase();
          return (
            <button
              key={chip.label}
              onClick={() => setSearchQuery(isActive ? '' : chip.query)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition shrink-0 border ${
                isActive
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm'
                  : 'bg-slate-950 text-slate-400 border-slate-800/80 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-1.5 border-b border-slate-800 pb-3">
        {categories.map((cat) => {
          const count = getCategoryCount(cat.id);
          return (
            <button
              key={cat.id}
              onClick={() => setActiveTab(cat.id)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                activeTab === cat.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {cat.icon}
              <span>{cat.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeTab === cat.id ? 'bg-cyan-500/30 text-cyan-200' : 'bg-slate-900 text-slate-500'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Search / Filter Status Banner */}
      {(searchQuery.trim() !== '' || onlyEnabled) && (
        <div className="flex items-center justify-between bg-cyan-950/30 border border-cyan-800/40 rounded-lg px-3 py-1.5 text-xs text-cyan-300 font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>
              Showing {filteredFlags.length} flag{filteredFlags.length === 1 ? '' : 's'}
              {searchQuery.trim() ? ` matching "${searchQuery}"` : ''}
              {onlyEnabled ? ' (active only)' : ''}
            </span>
          </div>
          <button
            onClick={() => {
              setSearchQuery('');
              setOnlyEnabled(false);
            }}
            className="text-cyan-400 hover:text-cyan-200 underline text-[11px] font-mono"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Active Conflicts Alert Banner */}
      {activeConflicts.length > 0 && (
        <div className="bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/80 border border-amber-500/60 rounded-xl p-3.5 shadow-lg space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
              <h3 className="text-xs font-bold text-amber-200">
                {activeConflicts.length} Flag Conflict{activeConflicts.length === 1 ? '' : 's'} Detected
              </h3>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-mono font-semibold">
                Incompatible Settings
              </span>
            </div>

            <button
              onClick={handleAutoResolveAllConflicts}
              className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold px-3 py-1 rounded-lg text-xs flex items-center space-x-1.5 transition shadow-sm"
              title="Automatically fix all active flag conflicts"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Auto-Fix All ({activeConflicts.length})</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
            {activeConflicts.map((conflict) => (
              <div key={conflict.id} className="bg-slate-950/80 border border-amber-500/30 rounded-lg p-2.5 flex flex-col justify-between space-y-1.5">
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                      {conflict.title}
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono uppercase font-bold ${
                      conflict.severity === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    }`}>
                      {conflict.severity}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                    {conflict.message}
                  </p>
                  <p className="text-[10px] text-amber-200/80 mt-1 italic font-mono">
                    💡 {conflict.recommendation}
                  </p>
                </div>

                {conflict.autoResolveFix && (
                  <button
                    onClick={() => handleAutoResolveConflict(conflict)}
                    className="self-end text-[10px] bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-mono font-semibold flex items-center space-x-1 transition"
                  >
                    <Wrench className="w-3 h-3" />
                    <span>Resolve Conflict</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Flag Checklist Grid or Empty State */}
      {filteredFlags.length === 0 ? (
        <div className="text-center py-12 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-3">
          <Search className="w-8 h-8 text-slate-600 mx-auto" />
          <h4 className="text-sm font-semibold text-slate-300">No flags found</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            No Proton flags match your search query "{searchQuery}". Try searching for terms like "FSR", "DLSS", "Wayland", "NTSYNC", or "FrameGen".
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setOnlyEnabled(false);
              setActiveTab('all');
            }}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3.5 py-1.5 rounded-lg font-medium transition"
          >
            Show All Flags
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredFlags.map((flag) => {
            const isChecked = enabledFlags[flag.id] === true || (typeof enabledFlags[flag.id] === 'string' && enabledFlags[flag.id] !== '');
            const currentValue = enabledFlags[flag.id];
            const flagConflicts = activeConflicts.filter((c) => c.flagIds.includes(flag.id));
            const hasConflict = flagConflicts.length > 0;

            const isRequestedFlag = [
              'proton_use_wine',
              'proton_use_ntsync',
              'disable_shader_cache',
              'gamemoderun',
              'game_performance',
              'lsvk_vkd3d',
              'mangohud',
              'enable_nvapi',
              'enable_lsfg',
              'enable_low_latency_layer',
              'lll_reflex',
              'lll_decoupled_mitigation',
              'lll_dxvk_config',
            ].includes(flag.id);

            return (
              <div
                key={flag.id}
                className={`relative p-3.5 rounded-xl border transition flex flex-col justify-between overflow-hidden ${
                  hasConflict
                    ? 'bg-amber-950/20 border-amber-500/80 shadow-md shadow-amber-950/30'
                    : isChecked
                    ? 'bg-slate-950/90 border-cyan-500/60 shadow-md shadow-cyan-950/20'
                    : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  {/* Conflict Tooltip Banner on Card */}
                  {hasConflict && (
                    <div className="mb-2 bg-amber-950/90 border border-amber-500/60 rounded-lg p-2 text-xs text-amber-200 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[11px] flex items-center gap-1 text-amber-300">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          Conflict Tooltip
                        </span>
                        {flagConflicts[0].autoResolveFix && (
                          <button
                            onClick={() => handleAutoResolveConflict(flagConflicts[0])}
                            className="text-[10px] bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-2 py-0.5 rounded transition"
                          >
                            Auto-Fix
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] leading-snug text-slate-200">
                        {flagConflicts[0].message}
                      </p>
                    </div>
                  )}

                  {/* Top Title & Badge */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      {flag.type === 'toggle' ? (
                        <input
                          type="checkbox"
                          id={`check-${flag.id}`}
                          checked={!!currentValue}
                          onChange={(e) => onToggleFlag(flag.id, e.target.checked)}
                          className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-400 bg-slate-900 border-slate-700 cursor-pointer shrink-0 mt-0.5"
                        />
                      ) : (
                        <input
                          type="checkbox"
                          id={`check-${flag.id}`}
                          checked={isChecked}
                          onChange={(e) => {
                            if (!e.target.checked) {
                              onToggleFlag(flag.id, '');
                            } else {
                              if (flag.type === 'select' && flag.options && flag.options.length > 0) {
                                const firstNonEmpty = flag.options.find(o => o.value !== '')?.value || flag.options[0].value;
                                onToggleFlag(flag.id, firstNonEmpty);
                              } else if (flag.defaultValue && typeof flag.defaultValue === 'string' && flag.defaultValue !== '') {
                                onToggleFlag(flag.id, flag.defaultValue);
                              } else {
                                const exMatch = flag.example ? flag.example.match(/=([^\s%]+)/) : null;
                                onToggleFlag(flag.id, exMatch ? exMatch[1].replace(/["']/g, '') : 'telemetry.example.com');
                              }
                            }
                          }}
                          className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-400 bg-slate-900 border-slate-700 cursor-pointer shrink-0 mt-0.5"
                        />
                      )}

                      <label
                        htmlFor={`check-${flag.id}`}
                        className="text-xs font-bold text-slate-100 cursor-pointer hover:text-cyan-300 transition leading-snug break-words"
                      >
                        {flag.name}
                        {isRequestedFlag && (
                          <span className="ml-1.5 inline-block text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.2 rounded font-mono font-medium whitespace-nowrap">
                            Core Flag
                          </span>
                        )}
                      </label>
                    </div>

                    {/* Performance Impact Badge */}
                    <span
                      className={`shrink-0 whitespace-nowrap text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold border ${
                        flag.performanceImpact === 'high'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : flag.performanceImpact === 'medium'
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                          : flag.performanceImpact === 'debug'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {flag.performanceImpact === 'high' ? '⚡ High Impact' : flag.performanceImpact === 'medium' ? '📈 Medium Impact' : flag.performanceImpact === 'debug' ? '🐞 Debug Log' : '⚙️ Utility'}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-400 mb-2 leading-relaxed">
                    {flag.description}
                  </p>

                  {/* Select Input for Select Type Flags */}
                  {flag.type === 'select' && flag.options && (
                    <div className="mt-2 mb-2">
                      <select
                        value={(currentValue as string) || ''}
                        onChange={(e) => onToggleFlag(flag.id, e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none cursor-pointer font-mono"
                      >
                        {flag.options.map((opt) => (
                          <option key={opt.value} value={opt.value} className="bg-slate-900">
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Text / Number Input for Text/Number Type Flags */}
                  {(flag.type === 'text' || flag.type === 'number') && (
                    <div className="mt-2 mb-2">
                      <input
                        type={flag.type === 'number' ? 'number' : 'text'}
                        value={(currentValue as string) || ''}
                        onChange={(e) => onToggleFlag(flag.id, e.target.value)}
                        placeholder={flag.example ? flag.example.replace(' %command%', '') : 'e.g. host1,host2'}
                        className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none placeholder:text-slate-600"
                      />
                    </div>
                  )}
                </div>

                {/* Tooltip & Distro Notes footer */}
                <div className="pt-2 border-t border-slate-800/80 mt-2 text-[11px] text-slate-500 flex items-center justify-between font-mono">
                  <span className="truncate max-w-[220px]" title={flag.example}>
                    {flag.example}
                  </span>
                  <span className="text-slate-400 flex items-center gap-1 group/info cursor-help" title={flag.tooltip}>
                    <Info className="w-3.5 h-3.5 text-slate-400" />
                    <span>Info</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Custom Environment Variables Section */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-slate-200">Custom Environment Variables</h3>
          </div>
          <span className="text-[11px] text-slate-400">Add key-value pairs (e.g. MESA_GL_THREAD=true)</span>
        </div>

        {/* Existing Custom Variables */}
        {customEnvVars.length > 0 && (
          <div className="space-y-2">
            {customEnvVars.map((env) => (
              <div key={env.id} className="flex items-center space-x-2 bg-slate-900 border border-slate-800 p-2 rounded-lg">
                <input
                  type="checkbox"
                  checked={env.enabled}
                  onChange={(e) => onToggleCustomEnvVar(env.id, e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-cyan-500 focus:ring-cyan-400 bg-slate-950 border-slate-700"
                />
                <span className="font-mono text-xs text-cyan-300 font-semibold">{env.key}</span>
                <span className="text-xs text-slate-500">=</span>
                <span className="font-mono text-xs text-slate-200 flex-1">{env.value}</span>
                <button
                  onClick={() => onRemoveCustomEnvVar(env.id)}
                  className="text-slate-500 hover:text-red-400 p-1 transition"
                  title="Remove variable"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add New Custom Variable Form */}
        <form onSubmit={handleAddEnv} className="flex items-center space-x-2 pt-1">
          <input
            type="text"
            placeholder="KEY (e.g. MESA_GL_THREAD)"
            value={newEnvKey}
            onChange={(e) => setNewEnvKey(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none"
          />
          <span className="text-slate-500 text-xs">=</span>
          <input
            type="text"
            placeholder="VALUE (e.g. true)"
            value={newEnvVal}
            onChange={(e) => setNewEnvVal(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none"
          />
          <button
            type="submit"
            className="bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </form>
      </div>

      {/* Extra Launch Arguments */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
        <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
          <Terminal className="w-3.5 h-3.5 text-amber-400" />
          <span>Extra Launch Arguments (Appended after %command%)</span>
        </label>
        <input
          type="text"
          placeholder="e.g. -novid -high -fullscreen +fps_max 0"
          value={extraArgs}
          onChange={(e) => onChangeExtraArgs(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-lg px-3 py-1.5 text-xs text-amber-200 font-mono focus:outline-none"
        />
        <p className="text-[11px] text-slate-500">
          Native engine arguments passed directly to the game binary after %command%.
        </p>
      </div>
    </div>
  );
};

