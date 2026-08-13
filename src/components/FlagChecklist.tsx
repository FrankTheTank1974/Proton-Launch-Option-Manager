import React, { useState } from 'react';
import { PROTON_FLAGS } from '../data/protonFlagsData';
import { FlagCategory, CustomEnvVar, ProtonFlag } from '../types';
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
  Bug
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
  const [newEnvKey, setNewEnvKey] = useState('');
  const [newEnvVal, setNewEnvVal] = useState('');

  const categories: Array<{ id: FlagCategory | 'all'; label: string; icon: React.ReactNode }> = [
    { id: 'all', label: 'All Flags', icon: <CheckSquare className="w-3.5 h-3.5" /> },
    { id: 'proton_runtime', label: 'Proton Runtime & Sync', icon: <Cpu className="w-3.5 h-3.5" /> },
    { id: 'graphics_dxvk', label: 'DXVK & NVAPI & Shaders', icon: <Zap className="w-3.5 h-3.5" /> },
    { id: 'low_latency', label: 'Low Latency Layer (LLL)', icon: <Flame className="w-3.5 h-3.5 text-amber-400" /> },
    { id: 'performance_wrappers', label: 'Wrappers & Overlays', icon: <Activity className="w-3.5 h-3.5" /> },
    { id: 'display_gamescope', label: 'Gamescope', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'debug_logs', label: 'Logs & Debug', icon: <Bug className="w-3.5 h-3.5" /> },
  ];

  const filteredFlags = PROTON_FLAGS.filter((flag) => {
    if (activeTab === 'all') return true;
    return flag.category === activeTab;
  });

  const handleAddEnv = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEnvKey.trim()) return;
    onAddCustomEnvVar(newEnvKey.trim(), newEnvVal.trim());
    setNewEnvKey('');
    setNewEnvVal('');
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-4">
      
      {/* Category Tabs */}
      <div className="flex flex-wrap gap-1.5 border-b border-slate-800 pb-3">
        {categories.map((cat) => (
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
          </button>
        ))}
      </div>

      {/* Flag Checklist Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredFlags.map((flag) => {
          const isChecked = enabledFlags[flag.id] === true || (typeof enabledFlags[flag.id] === 'string' && enabledFlags[flag.id] !== '');
          const currentValue = enabledFlags[flag.id];

          // Is requested primary flag
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
              className={`relative p-3.5 rounded-xl border transition flex flex-col justify-between ${
                isChecked
                  ? 'bg-slate-950/90 border-cyan-500/60 shadow-md shadow-cyan-950/20'
                  : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                {/* Top Title & Badge */}
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center space-x-2">
                    {flag.type === 'toggle' ? (
                      <input
                        type="checkbox"
                        id={`check-${flag.id}`}
                        checked={!!currentValue}
                        onChange={(e) => onToggleFlag(flag.id, e.target.checked)}
                        className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-400 bg-slate-900 border-slate-700 cursor-pointer"
                      />
                    ) : null}

                    <label
                      htmlFor={`check-${flag.id}`}
                      className="text-xs font-bold text-slate-100 cursor-pointer hover:text-cyan-300 transition flex items-center gap-1.5"
                    >
                      {flag.name}
                      {isRequestedFlag && (
                        <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.2 rounded font-mono font-medium">
                          Core Flag
                        </span>
                      )}
                    </label>
                  </div>

                  {/* Performance Impact Badge */}
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold border ${
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
                      className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none cursor-pointer"
                    >
                      {flag.options.map((opt) => (
                        <option key={opt.value} value={opt.value} className="bg-slate-900">
                          {opt.label}
                        </option>
                      ))}
                    </select>
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
