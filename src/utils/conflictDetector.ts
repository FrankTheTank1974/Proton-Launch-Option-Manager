import { PROTON_FLAGS } from '../data/protonFlagsData';
import { CustomEnvVar } from '../types';

export interface FlagConflict {
  id: string;
  flagIds: string[];
  severity: 'warning' | 'error';
  title: string;
  message: string;
  recommendation: string;
  autoResolveFix?: {
    disableFlagIds?: string[];
    setValueMap?: Record<string, string | boolean>;
  };
}

export function detectFlagConflicts(
  enabledFlags: Record<string, string | boolean>,
  customEnvVars: CustomEnvVar[] = []
): FlagConflict[] {
  const conflicts: FlagConflict[] = [];

  const isEnabled = (flagId: string): boolean => {
    const val = enabledFlags[flagId];
    return val === true || (typeof val === 'string' && val.trim() !== '');
  };

  const hasCustomEnv = (key: string): boolean => {
    return customEnvVars.some((e) => e.enabled && e.key.trim().toUpperCase() === key.toUpperCase());
  };

  // 1. WineD3D (OpenGL) vs Vulkan / NVAPI / DXVK / VKD3D
  const vulkanFeatures = [
    'enable_nvapi',
    'dxvk_async',
    'dxvk_hud',
    'vkd3d_config',
    'lsvk_vkd3d',
    'valve_proton_enable_amd_ags',
    'cachyos_dxvk_sarek',
    'cachyos_vkreflex',
  ].filter(isEnabled);

  if (isEnabled('proton_use_wine') && vulkanFeatures.length > 0) {
    conflicts.push({
      id: 'wined3d_vs_vulkan',
      flagIds: ['proton_use_wine', ...vulkanFeatures],
      severity: 'error',
      title: 'WineD3D (OpenGL) vs Vulkan/DXVK Features',
      message: 'PROTON_USE_WINED3D forces OpenGL translation, which disables DXVK, VKD3D, and NVAPI Vulkan layers.',
      recommendation: 'Disable PROTON_USE_WINED3D to enable Vulkan, DXVK, and NVAPI features.',
      autoResolveFix: {
        disableFlagIds: ['proton_use_wine'],
      },
    });
  }

  // 2. Dual CPU Performance Wrappers (GameMode vs CachyOS game-performance)
  if (isEnabled('gamemoderun') && isEnabled('game_performance')) {
    conflicts.push({
      id: 'dual_cpu_wrappers',
      flagIds: ['gamemoderun', 'game_performance'],
      severity: 'warning',
      title: 'Conflicting CPU Performance Wrappers',
      message: "Both 'gamemoderun' (Feral GameMode) and 'game-performance' (CachyOS wrapper) are active.",
      recommendation: "Use 'game-performance' on CachyOS or 'gamemoderun' on other distros, but avoid chaining both.",
      autoResolveFix: {
        disableFlagIds: ['gamemoderun'],
      },
    });
  }

  // 3. NTSYNC Kernel Sync vs Sync Disablers (PROTON_NO_ESYNC / PROTON_NO_FSYNC)
  if (isEnabled('proton_use_ntsync') && (isEnabled('proton_no_esync') || isEnabled('proton_no_fsync'))) {
    const disablers = ['proton_no_esync', 'proton_no_fsync'].filter(isEnabled);
    conflicts.push({
      id: 'ntsync_vs_sync_disablers',
      flagIds: ['proton_use_ntsync', ...disablers],
      severity: 'warning',
      title: 'NTSYNC Active with Synchronization Disablers',
      message: 'PROTON_USE_NTSYNC activates Linux kernel /dev/ntsync handles, but Esync/Fsync disablers are checked.',
      recommendation: 'Uncheck PROTON_NO_ESYNC and PROTON_NO_FSYNC to let NTSYNC handle kernel synchronization smoothly.',
      autoResolveFix: {
        disableFlagIds: disablers,
      },
    });
  }

  // 4. Disable Shader Cache vs Shader Caching / Disk Cache Options
  if (
    isEnabled('disable_shader_cache') &&
    (isEnabled('cachyos_local_shader_cache') || hasCustomEnv('__GL_SHADER_DISK_CACHE'))
  ) {
    conflicts.push({
      id: 'disable_shader_cache_vs_opt',
      flagIds: ['disable_shader_cache', 'cachyos_local_shader_cache'],
      severity: 'warning',
      title: 'Shader Cache Disabled vs Local Caching Options',
      message: 'DISABLE_SHADER_CACHE=1 turns off Steam shader caching entirely, rendering local shader cache settings ineffective.',
      recommendation: 'Uncheck DISABLE_SHADER_CACHE=1 to allow shader compilation and local caching.',
      autoResolveFix: {
        disableFlagIds: ['disable_shader_cache'],
      },
    });
  }

  // 5. Disable NVNGX vs DLSS Upgrades / DLSS Overlay / NVAPI
  const dlssFeatures = ['cachyos_dlss_upgrade', 'cachyos_dlss_overlay'].filter(isEnabled);
  if (isEnabled('valve_proton_disable_nvngx') && (dlssFeatures.length > 0 || isEnabled('enable_nvapi'))) {
    conflicts.push({
      id: 'disable_nvngx_vs_dlss',
      flagIds: ['valve_proton_disable_nvngx', ...dlssFeatures, 'enable_nvapi'].filter(isEnabled),
      severity: 'error',
      title: 'Nvidia NGX Disabled vs DLSS / NVAPI Enhancements',
      message: 'PROTON_DISABLE_NVNGX=1 blocks Nvidia NGX DLSS wrapper injection, breaking DLSS upgrades and overlays.',
      recommendation: 'Uncheck PROTON_DISABLE_NVNGX to use DLSS enhancements.',
      autoResolveFix: {
        disableFlagIds: ['valve_proton_disable_nvngx'],
      },
    });
  }

  // 6. Dual Video Decoder Acceleration in Proton-RTSP (NVDEC vs VA-API)
  if (isEnabled('rtsp_enable_nvdec') && isEnabled('rtsp_enable_vaapi')) {
    conflicts.push({
      id: 'rtsp_nvdec_vs_vaapi',
      flagIds: ['rtsp_enable_nvdec', 'rtsp_enable_vaapi'],
      severity: 'warning',
      title: 'Dual Hardware Video Decoder Conflict (Proton-RTSP)',
      message: 'Both Nvidia NVDEC and AMD/Intel VA-API hardware decoders are toggled for GStreamer RTSP.',
      recommendation: 'Enable NVDEC for Nvidia GPUs or VA-API for AMD/Intel GPUs, but do not enable both.',
      autoResolveFix: {
        disableFlagIds: ['rtsp_enable_vaapi'],
      },
    });
  }

  // 7. Low Latency Layer (LLL) vs DXVK Native Reflex / VKReflex
  if (isEnabled('enable_low_latency_layer') && isEnabled('cachyos_vkreflex')) {
    conflicts.push({
      id: 'lll_vs_vkreflex',
      flagIds: ['enable_low_latency_layer', 'cachyos_vkreflex'],
      severity: 'warning',
      title: 'Overlapping Latency Reduction Wrappers',
      message: 'Low Latency Layer (LLL) and DXVK Native Reflex (VKReflex) both inject framerate limiter & latency hooks.',
      recommendation: 'Use either Low Latency Layer or native DXVK Reflex to avoid timing anomalies or stuttering.',
      autoResolveFix: {
        disableFlagIds: ['cachyos_vkreflex'],
      },
    });
  }

  // 8. Gamescope vs Native Wayland Driver in Proton 9.0+
  if (isEnabled('display_gamescope') && isEnabled('valve_proton_enable_wayland')) {
    conflicts.push({
      id: 'gamescope_vs_wayland_driver',
      flagIds: ['display_gamescope', 'valve_proton_enable_wayland'],
      severity: 'warning',
      title: 'Gamescope Window Manager vs Proton Native Wayland Driver',
      message: 'Gamescope creates an XWayland nested compositor container, while PROTON_ENABLE_WAYLAND bypasses XWayland.',
      recommendation: 'If using Gamescope, disable PROTON_ENABLE_WAYLAND=1, or run PROTON_ENABLE_WAYLAND directly on Wayland desktop without Gamescope.',
      autoResolveFix: {
        disableFlagIds: ['valve_proton_enable_wayland'],
      },
    });
  }

  // 9. PROTON_NO_ESYNC and PROTON_NO_FSYNC both enabled without NTSYNC
  if (isEnabled('proton_no_esync') && isEnabled('proton_no_fsync') && !isEnabled('proton_use_ntsync')) {
    conflicts.push({
      id: 'no_esync_no_fsync',
      flagIds: ['proton_no_esync', 'proton_no_fsync'],
      severity: 'warning',
      title: 'Both Esync and Fsync Disabled',
      message: 'Disabling both Esync and Fsync forces Wine to use old, high-overhead kernel event objects.',
      recommendation: 'Leave at least Esync or Fsync enabled (or use NTSYNC) for optimal thread synchronization.',
      autoResolveFix: {
        disableFlagIds: ['proton_no_esync', 'proton_no_fsync'],
      },
    });
  }

  return conflicts;
}
