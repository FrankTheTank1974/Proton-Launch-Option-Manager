export type FlagCategory = 
  | 'proton_runtime'
  | 'proton_cachyos'
  | 'proton_ge'
  | 'proton_em'
  | 'proton_dw'
  | 'proton_rtsp'
  | 'boxtron'
  | 'luxtorpeda'
  | 'roberta'
  | 'graphics_dxvk'
  | 'lsfg_framegen'
  | 'performance_wrappers'
  | 'display_gamescope'
  | 'low_latency'
  | 'debug_logs';

export type PerformanceImpact = 'high' | 'medium' | 'low' | 'neutral' | 'debug';

export interface ProtonFlagOption {
  value: string;
  label: string;
}

export interface ProtonFlag {
  id: string;
  name: string;
  key: string; // e.g. "PROTON_USE_WINED3D", "PROTON_USE_NTSYNC", "DISABLE_SHADER_CACHE", "gamemoderun"
  type: 'toggle' | 'select' | 'text' | 'number';
  category: FlagCategory;
  defaultValue: string | boolean;
  options?: ProtonFlagOption[]; // for select types
  valuePrefix?: string;
  valueSuffix?: string;
  isWrapper?: boolean; // e.g. mangohud, gamemoderun, gamescope
  wrapperOrder?: number; // order before %command%
  description: string;
  tooltip: string;
  example: string;
  performanceImpact: PerformanceImpact;
  distroNotes?: string;
}

export interface CustomEnvVar {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export interface SteamGame {
  id: string;
  appId: number;
  name: string;
  bannerUrl: string;
  iconUrl?: string;
  protonVersion: string;
  currentLaunchOptions: string;
  lastUpdated: string;
  installDate?: number; // Unix timestamp in milliseconds
  releaseDate?: string; // Release date (e.g. YYYY-MM-DD)
  isFavorite?: boolean;
  installedPath?: string;
  developer?: string;
}

export interface PresetProfile {
  id: string;
  title: string;
  description: string;
  targetHardware: string;
  iconName: string;
  enabledFlags: Record<string, string | boolean>;
  customEnvVars: Array<{ key: string; value: string }>;
  extraArgs: string;
  wrapperOrder: string[];
}

export interface CSourceFile {
  filename: string;
  language: string;
  description: string;
  content: string;
}

export interface VdfAppConfig {
  appId: string;
  launchOptions: string;
  appName?: string;
}
