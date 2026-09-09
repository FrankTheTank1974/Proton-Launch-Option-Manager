import { PROTON_FLAGS } from '../data/protonFlagsData';

export type LaunchTokenType = 
  | 'env_var'       // Environment variable (e.g. PROTON_USE_NTSYNC=1, WINEDLLOVERRIDES="dxgi=n,b")
  | 'wrapper'       // Execution wrapper (e.g. gamemoderun, mangohud, gamescope, prime-run)
  | 'command'       // %command% Steam executable target placeholder
  | 'command_flag'  // Command flags/switches (e.g. -novid, -high, --skip-launcher, -W 2560, --)
  | 'custom_arg';   // Custom parameters, values, cvars (e.g. +fps_max 0, +exec autoexec.cfg, values)

export interface ParsedLaunchToken {
  id: string;
  type: LaunchTokenType;
  raw: string;
  // Environment variable parts
  envKey?: string;
  envValue?: string;
  // Flag / switch parts
  flagPrefix?: string; // e.g. "-" or "--" or "+"
  flagBody?: string;   // e.g. "novid", "skip-launcher", "fps_max"
  // Friendly details
  categoryLabel: string;
  title: string;
  description: string;
  // Visual styling classes
  colors: {
    badgeBg: string;
    badgeBorder: string;
    badgeText: string;
    categoryTagBg: string;
    categoryTagText: string;
    termColor: string;
    accentColor: string;
  };
}

// Known common game and wrapper command flags
const KNOWN_FLAG_DESCRIPTIONS: Record<string, { title: string; description: string }> = {
  '-novid': { title: 'Skip Intro Videos', description: 'Bypasses introductory logo and cinematic videos for faster game loading' },
  '-high': { title: 'High CPU Priority', description: 'Sets game process CPU scheduling priority to High in Linux kernel scheduler' },
  '-fullscreen': { title: 'Force Fullscreen', description: 'Forces game window into exclusive or borderless fullscreen mode' },
  '-windowed': { title: 'Force Windowed', description: 'Runs the game inside a bordered desktop window' },
  '-sw': { title: 'Software / Windowed Mode', description: 'Launches windowed mode without exclusive capture' },
  '-vulkan': { title: 'Vulkan Backend', description: 'Directs the game engine to use its native Vulkan rendering path' },
  '-dx11': { title: 'DirectX 11 API', description: 'Forces the game to render using Direct3D 11 via DXVK' },
  '-dx12': { title: 'DirectX 12 API', description: 'Forces the game to render using Direct3D 12 via VKD3D-Proton' },
  '-nojoy': { title: 'Disable Joystick Polling', description: 'Disables background controller polling to prevent micro-stutter on mouse/keyboard' },
  '-console': { title: 'Developer Console', description: 'Enables in-game debugging developer console on launch' },
  '--skip-launcher': { title: 'Skip 3rd-Party Launcher', description: 'Bypasses proprietary launcher webviews (Larian, CDPR, 2K) directly to game binary' },
  '-threads': { title: 'Worker Threads', description: 'Specifies the number of worker CPU threads allocated to the game engine' },
  '-adapter': { title: 'Display Adapter Index', description: 'Selects the target GPU adapter when multi-GPU hardware is present' },
  '-autoconfig': { title: 'Auto-detect Video Settings', description: 'Resets graphical configurations to hardware defaults for current display' },
  '-W': { title: 'Gamescope Width', description: 'Sets Gamescope nested compositor render width in pixels' },
  '-H': { title: 'Gamescope Height', description: 'Sets Gamescope nested compositor render height in pixels' },
  '-r': { title: 'Gamescope Refresh Rate', description: 'Sets target refresh rate for Gamescope display canvas in Hz' },
  '-f': { title: 'Gamescope Fullscreen', description: 'Presents Gamescope nested container in fullscreen mode' },
  '-F': { title: 'Gamescope Upscaler', description: 'Sets scaling filter (fsr, nis, linear, nearest, pixel)' },
  '-b': { title: 'Gamescope Borderless', description: 'Presents Gamescope in borderless windowed mode' },
  '-S': { title: 'Gamescope Integer Scaling', description: 'Enables integer scaling for sharp pixel-art preservation' },
  '--backend': { title: 'Gamescope Backend', description: 'Display backend driver (wayland, drm, sdl)' },
  '--adaptive-sync': { title: 'Adaptive Sync / VRR', description: 'Enables variable refresh rate (G-Sync / FreeSync) in Gamescope' },
  '--expose-wayland': { title: 'Expose Wayland Protocol', description: 'Enables native Wayland protocol to the nested application' },
  '--prefer-vk-device': { title: 'Preferred Vulkan Device', description: 'Selects specific Vulkan physical device by vendor/device ID' },
  '--': { title: 'Option Separator', description: 'Signifies the end of wrapper options and begins the target game executable pipeline' },
};

// Known common engine console variables (+cvars)
const KNOWN_CVAR_DESCRIPTIONS: Record<string, { title: string; description: string }> = {
  '+fps_max': { title: 'Max FPS Limiter', description: 'Locks maximum framerate in engine loop (0 = completely uncapped)' },
  '+exec': { title: 'Execute Autoexec Script', description: 'Loads and executes custom configuration file on startup' },
  '+cl_showfps': { title: 'In-Engine FPS Overlay', description: 'Displays built-in engine frame rate and frametime telemetry' },
  '+mat_queue_mode': { title: 'Material Queue Threading', description: 'Controls multi-threaded material and rendering thread queue' },
  '+r_drawviewmodel': { title: 'Weapon Viewmodel Toggle', description: 'Toggles first-person weapon model rendering for clean competitive sightlines' },
  '+rate': { title: 'Network Tick Rate Byte Limit', description: 'Configures maximum network packet bandwidth byte rate' },
  '+cl_updaterate': { title: 'Client Network Update Rate', description: 'Sets the number of packet updates per second requested from the game server' },
  '+cl_cmdrate': { title: 'Client Network Command Rate', description: 'Sets maximum number of command packets sent to server per second' },
  '--set': { title: 'Engine Configuration Setter', description: 'Sets in-game configuration values directly (e.g. Quake Champions config parameters)' },
};

// Known wrappers
const KNOWN_WRAPPERS = new Set([
  'gamemoderun',
  'mangohud',
  'gamescope',
  'vkbasalt',
  'prime-run',
  'optirun',
  'taskset',
  'nice',
  'obs-gamecapture',
  'gdb',
  'strace',
  'renderdoccmd',
  'game-performance',
  'dlssnr-helper',
]);

/**
 * Shell-aware string tokenizer that preserves quoted substrings
 */
export function tokenizeShellCommand(commandStr: string): string[] {
  if (!commandStr || !commandStr.trim()) return [];

  const tokens: string[] = [];
  let currentToken = '';
  let inDoubleQuote = false;
  let inSingleQuote = false;
  let escapeNext = false;

  for (let i = 0; i < commandStr.length; i++) {
    const char = commandStr[i];

    if (escapeNext) {
      currentToken += char;
      escapeNext = false;
      continue;
    }

    if (char === '\\') {
      currentToken += char;
      escapeNext = true;
      continue;
    }

    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      currentToken += char;
      continue;
    }

    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      currentToken += char;
      continue;
    }

    if (/\s/.test(char) && !inDoubleQuote && !inSingleQuote) {
      if (currentToken.length > 0) {
        tokens.push(currentToken);
        currentToken = '';
      }
    } else {
      currentToken += char;
    }
  }

  if (currentToken.length > 0) {
    tokens.push(currentToken);
  }

  return tokens;
}

/**
 * Parses and syntax highlights all tokens in a Steam launch options string
 */
export function parseLaunchCommandTokens(commandStr: string): ParsedLaunchToken[] {
  const rawTokens = tokenizeShellCommand(commandStr);
  if (rawTokens.length === 0) return [];

  const result: ParsedLaunchToken[] = [];
  let encounteredCommand = false;
  let previousToken: ParsedLaunchToken | null = null;

  rawTokens.forEach((token, index) => {
    const id = `token_${index}_${token.slice(0, 8)}`;

    // 1. Steam Target Placeholder %command%
    if (token === '%command%') {
      encounteredCommand = true;
      const parsed: ParsedLaunchToken = {
        id,
        type: 'command',
        raw: token,
        categoryLabel: 'Steam Target',
        title: '%command%',
        description: 'Steam special placeholder. Steam automatically replaces this with the Proton runner and game binary executable.',
        colors: {
          badgeBg: 'bg-emerald-950/80 hover:bg-emerald-900/90',
          badgeBorder: 'border-emerald-500/60 shadow-sm shadow-emerald-950/50',
          badgeText: 'text-emerald-300',
          categoryTagBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          categoryTagText: 'text-emerald-400',
          termColor: 'text-emerald-400 font-bold',
          accentColor: '#10b981',
        },
      };
      result.push(parsed);
      previousToken = parsed;
      return;
    }

    // 2. Environment Variables: contains '=' and starts with letter/underscore (e.g. PROTON_USE_NTSYNC=1)
    if (!token.startsWith('-') && !token.startsWith('+') && token.includes('=')) {
      const eqIdx = token.indexOf('=');
      const key = token.slice(0, eqIdx);
      const val = token.slice(eqIdx + 1);

      // Look up known Proton flag metadata
      const knownFlag = PROTON_FLAGS.find((f) => f.key === key);
      const title = knownFlag ? knownFlag.name : key;
      const description = knownFlag 
        ? (knownFlag.tooltip || knownFlag.description) 
        : `Custom environment variable passed to Proton wine prefix runtime (Value: ${val})`;

      const parsed: ParsedLaunchToken = {
        id,
        type: 'env_var',
        raw: token,
        envKey: key,
        envValue: val,
        categoryLabel: 'Environment Variable',
        title,
        description,
        colors: {
          badgeBg: 'bg-sky-950/80 hover:bg-sky-900/90',
          badgeBorder: 'border-sky-700/60 shadow-sm shadow-sky-950/50',
          badgeText: 'text-sky-200',
          categoryTagBg: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
          categoryTagText: 'text-sky-400',
          termColor: 'text-sky-300',
          accentColor: '#38bdf8',
        },
      };
      result.push(parsed);
      previousToken = parsed;
      return;
    }

    // 3. Execution Wrappers (gamemoderun, mangohud, gamescope, etc.) before %command%
    const lowerToken = token.toLowerCase();
    if (!encounteredCommand && KNOWN_WRAPPERS.has(lowerToken)) {
      const knownFlag = PROTON_FLAGS.find((f) => f.key.toLowerCase() === lowerToken);
      const title = knownFlag ? knownFlag.name : token;
      const description = knownFlag 
        ? (knownFlag.tooltip || knownFlag.description)
        : `Linux process execution wrapper injected prior to game launch (${token})`;

      const parsed: ParsedLaunchToken = {
        id,
        type: 'wrapper',
        raw: token,
        categoryLabel: 'Command Wrapper',
        title,
        description,
        colors: {
          badgeBg: 'bg-orange-950/80 hover:bg-orange-900/90',
          badgeBorder: 'border-orange-700/60 shadow-sm shadow-orange-950/50',
          badgeText: 'text-orange-200',
          categoryTagBg: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
          categoryTagText: 'text-orange-400',
          termColor: 'text-orange-300 font-semibold',
          accentColor: '#fb923c',
        },
      };
      result.push(parsed);
      previousToken = parsed;
      return;
    }

    // 4. Command Flags & Switches: starts with '-' or '--' (e.g. -novid, -high, --skip-launcher, -W)
    if (token.startsWith('-')) {
      const isDoubleDash = token.startsWith('--');
      const prefix = isDoubleDash ? '--' : '-';
      const flagBody = token.slice(prefix.length);

      const known = KNOWN_FLAG_DESCRIPTIONS[token] || KNOWN_FLAG_DESCRIPTIONS[`-${flagBody}`];
      const title = known ? known.title : `Switch: ${token}`;
      const description = known 
        ? known.description 
        : `Command line switch / parameter passed to process (${token})`;

      const parsed: ParsedLaunchToken = {
        id,
        type: 'command_flag',
        raw: token,
        flagPrefix: prefix,
        flagBody,
        categoryLabel: 'Command Flag',
        title,
        description,
        colors: {
          badgeBg: 'bg-purple-950/80 hover:bg-purple-900/90',
          badgeBorder: 'border-purple-700/60 shadow-sm shadow-purple-950/50',
          badgeText: 'text-purple-200',
          categoryTagBg: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
          categoryTagText: 'text-purple-400',
          termColor: 'text-purple-300 font-medium',
          accentColor: '#c084fc',
        },
      };
      result.push(parsed);
      previousToken = parsed;
      return;
    }

    // 5. Custom Arguments: starts with '+' (e.g. +fps_max, +exec) OR values following flags/after %command%
    if (token.startsWith('+')) {
      const known = KNOWN_CVAR_DESCRIPTIONS[token];
      const title = known ? known.title : `Engine Console Var: ${token}`;
      const description = known 
        ? known.description 
        : `In-game engine console variable (+cvar) evaluated on startup (${token})`;

      const parsed: ParsedLaunchToken = {
        id,
        type: 'custom_arg',
        raw: token,
        flagPrefix: '+',
        flagBody: token.slice(1),
        categoryLabel: 'Custom Argument',
        title,
        description,
        colors: {
          badgeBg: 'bg-amber-950/80 hover:bg-amber-900/90',
          badgeBorder: 'border-amber-700/60 shadow-sm shadow-amber-950/50',
          badgeText: 'text-amber-200',
          categoryTagBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          categoryTagText: 'text-amber-400',
          termColor: 'text-amber-300 font-mono',
          accentColor: '#fcd34d',
        },
      };
      result.push(parsed);
      previousToken = parsed;
      return;
    }

    // 6. Generic Parameter / Argument / Sub-value (e.g. "2560" after "-W", "0" after "+fps_max", file paths)
    let title = `Argument: ${token}`;
    let description = `Value or parameter passed to the preceding command flag (${token})`;

    if (previousToken && previousToken.type === 'command_flag') {
      title = `${previousToken.raw} Argument`;
      description = `Parameter value "${token}" supplied to flag ${previousToken.raw}`;
    } else if (previousToken && previousToken.type === 'custom_arg') {
      title = `${previousToken.raw} Setting`;
      description = `Setting value "${token}" for ${previousToken.raw}`;
    } else if (encounteredCommand) {
      title = `Game Process Argument`;
      description = `Direct command line argument passed to the game executable (${token})`;
    }

    const parsed: ParsedLaunchToken = {
      id,
      type: 'custom_arg',
      raw: token,
      categoryLabel: 'Custom Argument',
      title,
      description,
      colors: {
        badgeBg: 'bg-amber-950/80 hover:bg-amber-900/90',
        badgeBorder: 'border-amber-700/60 shadow-sm shadow-amber-950/50',
        badgeText: 'text-amber-200',
        categoryTagBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        categoryTagText: 'text-amber-400',
        termColor: 'text-amber-300 font-mono',
        accentColor: '#fcd34d',
      },
    };
    result.push(parsed);
    previousToken = parsed;
  });

  return result;
}

/**
 * Returns statistics count of each token category for legend and summary badges
 */
export function getLaunchCommandStats(tokens: ParsedLaunchToken[]) {
  const stats = {
    envVars: 0,
    wrappers: 0,
    commandFlags: 0,
    customArgs: 0,
    hasCommand: false,
    total: tokens.length,
  };

  tokens.forEach((t) => {
    if (t.type === 'env_var') stats.envVars++;
    else if (t.type === 'wrapper') stats.wrappers++;
    else if (t.type === 'command_flag') stats.commandFlags++;
    else if (t.type === 'custom_arg') stats.customArgs++;
    else if (t.type === 'command') stats.hasCommand = true;
  });

  return stats;
}
