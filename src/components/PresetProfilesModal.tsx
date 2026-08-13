import React from 'react';
import { PresetProfile } from '../types';
import { X, Sliders, Zap, Cpu, BatteryCharging, Trophy, Bug, Check } from 'lucide-react';

interface PresetProfilesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPreset: (preset: PresetProfile) => void;
}

export const PRESET_PROFILES: PresetProfile[] = [
  {
    id: 'korthos_low_latency_layer',
    title: 'Low Latency Layer (Reflex / Anti-Lag 2)',
    description: 'Enables Korthos Low Latency Layer (LOW_LATENCY_LAYER=1), Reflex interface, NVAPI support, and DXVK AMD GPU hiding.',
    targetHardware: 'Korthos low_latency_layer + AMD / Nvidia Vulkan GPUs',
    iconName: 'Zap',
    enabledFlags: {
      enable_low_latency_layer: true,
      lll_reflex: true,
      lll_dxvk_config: 'dxgi.hideAmdGpu = True',
      enable_nvapi: true,
      proton_use_ntsync: true,
      gamemoderun: true,
    },
    customEnvVars: [],
    extraArgs: '',
    wrapperOrder: ['gamemoderun'],
  },
  {
    id: 'nvidia_rtx_ultra',
    title: 'Nvidia RTX / DLSS Ultra',
    description: 'Enables NVAPI for DLSS, DLSS 3 Frame Gen, NTSync kernel synchronization, and Feral GameMode priority.',
    targetHardware: 'Nvidia RTX 20/30/40 Series + Linux Kernel 6.8+',
    iconName: 'Zap',
    enabledFlags: {
      enable_nvapi: true,
      proton_use_ntsync: true,
      gamemoderun: true,
      lsvk_vkd3d: 'dxr11,dxr',
    },
    customEnvVars: [],
    extraArgs: '',
    wrapperOrder: ['gamemoderun'],
  },
  {
    id: 'cachyos_performance',
    title: 'CachyOS Max Performance',
    description: 'Uses the native CachyOS game-performance wrapper, NTSync kernel driver, and MangoHud performance overlay.',
    targetHardware: 'CachyOS Linux / cachyos-settings',
    iconName: 'Zap',
    enabledFlags: {
      game_performance: true,
      proton_use_ntsync: true,
      mangohud: true,
    },
    customEnvVars: [],
    extraArgs: '',
    wrapperOrder: ['mangohud', 'game-performance'],
  },
  {
    id: 'amd_radv_sam',
    title: 'AMD RADV High FPS + SAM',
    description: 'Enables Smart Access Memory (ReBAR), NTSync, MangoHud overlay, and GameMode governor.',
    targetHardware: 'AMD Radeon RX 6000/7000 Series + Mesa RADV driver',
    iconName: 'Cpu',
    enabledFlags: {
      proton_use_ntsync: true,
      radv_sam: 'sam',
      gamemoderun: true,
      mangohud: true,
    },
    customEnvVars: [],
    extraArgs: '',
    wrapperOrder: ['mangohud', 'gamemoderun'],
  },
  {
    id: 'lsfg_framegen_deck',
    title: 'lsfg-vk Frame Generation (Lossless Scaling)',
    description: 'Enables PancakeTAS lsfg-vk Vulkan layer with 2x frame generation multiplier and performance mode tuning for Steam Deck & Linux.',
    targetHardware: 'Steam Deck / Any Vulkan GPU + lsfg-vk Layer',
    iconName: 'Sparkles',
    enabledFlags: {
      enable_lsfg: true,
      lsfgvk_multiplier: '2',
      lsfgvk_performance_mode: true,
      lsfgvk_flow_scale: '0.75',
      gamemoderun: true,
    },
    customEnvVars: [],
    extraArgs: '',
    wrapperOrder: ['gamemoderun'],
  },
  {
    id: 'steam_deck_battery',
    title: 'Steam Deck Battery & Performance',
    description: 'Configures Gamescope compositor with FSR upscaling and disabled shader cache to save SSD wear.',
    targetHardware: 'Steam Deck / Valve SteamOS 3.5+',
    iconName: 'BatteryCharging',
    enabledFlags: {
      disable_shader_cache: true,
      gamescope_wrapper: true,
      gamemoderun: true,
    },
    customEnvVars: [],
    extraArgs: '',
    wrapperOrder: ['gamemoderun', 'gamescope'],
  },
  {
    id: 'esports_low_latency',
    title: 'Esports Low Latency & High FPS',
    description: 'Minimal overhead with MangoHud performance stats and game engine launch args (-novid -high).',
    targetHardware: 'All High Refresh Rate Displays',
    iconName: 'Trophy',
    enabledFlags: {
      mangohud: true,
      gamemoderun: true,
      proton_use_ntsync: true,
    },
    customEnvVars: [],
    extraArgs: '-novid -high -fullscreen +fps_max 0',
    wrapperOrder: ['mangohud', 'gamemoderun'],
  },
  {
    id: 'proton_crash_debugger',
    title: 'Proton Crash & Compatibility Debugger',
    description: 'Enables verbose file logging to ~/steam-<appid>.log, disables Esync/Fsync, and uses WineD3D fallback.',
    targetHardware: 'Troubleshooting Crashing or Unlaunchable Games',
    iconName: 'Bug',
    enabledFlags: {
      proton_log: true,
      proton_use_wine: true,
      proton_no_esync: true,
      proton_no_fsync: true,
    },
    customEnvVars: [],
    extraArgs: '',
    wrapperOrder: [],
  },
];

export const PresetProfilesModal: React.FC<PresetProfilesModalProps> = ({
  isOpen,
  onClose,
  onSelectPreset,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center space-x-3">
            <div className="bg-amber-500/20 p-2 rounded-xl border border-amber-500/30">
              <Sliders className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                Performance Hardware Presets
              </h2>
              <p className="text-xs text-slate-400">
                One-click optimized flag configurations for Nvidia, AMD, Steam Deck, and debugging
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profiles List */}
        <div className="p-4 space-y-3 max-h-[65vh] overflow-y-auto">
          {PRESET_PROFILES.map((preset) => (
            <div
              key={preset.id}
              onClick={() => {
                onSelectPreset(preset);
                onClose();
              }}
              className="group bg-slate-950 border border-slate-800 hover:border-cyan-500/60 rounded-xl p-4 cursor-pointer transition shadow-md flex items-start justify-between"
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-bold text-slate-100 group-hover:text-cyan-300 transition">
                    {preset.title}
                  </h3>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-mono">
                    {preset.targetHardware}
                  </span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  {preset.description}
                </p>

                <div className="flex flex-wrap gap-1 pt-1.5 font-mono text-[10px]">
                  {Object.keys(preset.enabledFlags).map((flagKey) => (
                    <span key={flagKey} className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-1.5 py-0.2 rounded">
                      {flagKey}
                    </span>
                  ))}
                  {preset.extraArgs && (
                    <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 px-1.5 py-0.2 rounded">
                      {preset.extraArgs}
                    </span>
                  )}
                </div>
              </div>

              <button className="bg-cyan-600 group-hover:bg-cyan-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 transition flex-shrink-0 ml-3">
                <Check className="w-3.5 h-3.5" />
                <span>Apply Preset</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
