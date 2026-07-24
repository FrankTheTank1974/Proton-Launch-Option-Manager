import { PROTON_FLAGS } from '../data/protonFlagsData';
import { CustomEnvVar } from '../types';

export interface CommandState {
  enabledFlags: Record<string, string | boolean>;
  customEnvVars: CustomEnvVar[];
  extraArgs: string;
  wrapperOrder: string[]; // e.g. ['obs-gamecapture', 'mangohud', 'gamemoderun', 'gamescope']
}

export function parseCommandString(commandStr: string): CommandState {
  const enabledFlags: Record<string, string | boolean> = {};
  const customEnvVars: CustomEnvVar[] = [];
  const wrapperOrder: string[] = [];

  if (!commandStr) {
    return {
      enabledFlags: {},
      customEnvVars: [],
      extraArgs: '',
      wrapperOrder: ['obs-gamecapture', 'mangohud', 'gamemoderun', 'gamescope'],
    };
  }

  // Split around %command%
  const parts = commandStr.split('%command%');
  const beforeCmd = (parts[0] || '').trim();
  const extraArgs = (parts[1] || '').trim();

  const tokens = beforeCmd.split(/\s+/).filter(Boolean);

  tokens.forEach((token) => {
    // Check key=value
    if (token.includes('=')) {
      const [key, val] = token.split('=');
      const matchedFlag = PROTON_FLAGS.find((f) => f.key === key);
      if (matchedFlag) {
        if (matchedFlag.type === 'toggle') {
          enabledFlags[matchedFlag.id] = val === '1' || val === 'true';
        } else if (matchedFlag.type === 'select') {
          enabledFlags[matchedFlag.id] = val;
        }
      } else {
        // Custom Env Var
        customEnvVars.push({
          id: Math.random().toString(36).substring(2, 9),
          key,
          value: val || '',
          enabled: true,
        });
      }
    } else {
      // Standalone wrapper token like gamemoderun or mangohud
      const matchedWrapper = PROTON_FLAGS.find(
        (f) => f.isWrapper && (f.key === token || token.startsWith(f.key))
      );
      if (matchedWrapper) {
        enabledFlags[matchedWrapper.id] = true;
        if (!wrapperOrder.includes(matchedWrapper.key)) {
          wrapperOrder.push(matchedWrapper.key);
        }
      }
    }
  });

  return {
    enabledFlags,
    customEnvVars,
    extraArgs,
    wrapperOrder: wrapperOrder.length
      ? wrapperOrder
      : ['obs-gamecapture', 'mangohud', 'gamemoderun', 'gamescope'],
  };
}

export function generateCommandString(
  enabledFlags: Record<string, string | boolean>,
  customEnvVars: CustomEnvVar[],
  extraArgs: string,
  wrapperOrder?: string[]
): string {
  const envVars: string[] = [];
  const wrappers: string[] = [];

  // 1. Process environment variables
  PROTON_FLAGS.forEach((flag) => {
    if (flag.isWrapper) return;
    const val = enabledFlags[flag.id];
    if (val === undefined || val === false || val === '') return;

    if (flag.type === 'toggle') {
      if (val === true) {
        envVars.push(`${flag.key}=1`);
      }
    } else if (flag.type === 'select') {
      if (typeof val === 'string' && val.length > 0) {
        envVars.push(`${flag.key}=${val}`);
      }
    }
  });

  // Custom environment variables
  customEnvVars.forEach((env) => {
    if (env.enabled && env.key.trim()) {
      envVars.push(`${env.key.trim()}=${env.value.trim()}`);
    }
  });

  // 2. Process wrappers in correct order
  const activeWrappers = PROTON_FLAGS.filter(
    (f) => f.isWrapper && enabledFlags[f.id] === true
  );

  // Default wrapper precedence
  const sortedWrappers = [...activeWrappers].sort((a, b) => {
    const orderA = wrapperOrder?.indexOf(a.key) ?? a.wrapperOrder ?? 0;
    const orderB = wrapperOrder?.indexOf(b.key) ?? b.wrapperOrder ?? 0;
    return (orderA === -1 ? 99 : orderA) - (orderB === -1 ? 99 : orderB);
  });

  sortedWrappers.forEach((w) => {
    if (w.key === 'gamescope') {
      wrappers.push('gamescope -w 1920 -h 1080 -r 144 -f --');
    } else {
      wrappers.push(w.key);
    }
  });

  // 3. Assemble command string
  const envStr = envVars.join(' ');
  const wrapStr = wrappers.join(' ');
  const extraStr = extraArgs.trim();

  let result = '';
  if (envStr) result += envStr + ' ';
  if (wrapStr) result += wrapStr + ' ';
  result += '%command%';
  if (extraStr) result += ' ' + extraStr;

  return result.trim();
}
