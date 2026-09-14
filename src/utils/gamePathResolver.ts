/**
 * Game Binary & Install Path Resolver
 * 
 * Provides known real executable names and directory paths for popular Steam games,
 * dynamically searches app manifests (appmanifest_<appid>.acf) and installation
 * directories on disk for exact executable paths.
 */

export interface GameExecutableInfo {
  executableName: string;
  installDirName: string;
  relativeExePath: string; // e.g. "bin/x64/Cyberpunk2077.exe"
  defaultInstallPath: string; // e.g. "$HOME/.local/share/Steam/steamapps/common/Cyberpunk 2077"
  fullExePath: string; // e.g. "$HOME/.local/share/Steam/steamapps/common/Cyberpunk 2077/bin/x64/Cyberpunk2077.exe"
  compatDataPath: string; // e.g. "$HOME/.local/share/Steam/steamapps/compatdata/1091500"
  steamInstallPath: string; // e.g. "$HOME/.local/share/Steam"
}

/**
 * Normalizes a path so that leading '~/' is transformed into '$HOME/'.
 * This prevents bash/fish/zsh from failing when paths are enclosed in quotes
 * (since shell tilde expansion does not expand '~' inside double quotes).
 */
export function normalizeShellPath(p: string): string {
  if (!p) return p;
  if (p.startsWith('~/')) {
    return '$HOME' + p.slice(1);
  }
  return p;
}

// Curated database of exact real-world binary paths for popular Steam games
export const KNOWN_GAME_EXECUTABLES: Record<number, { installDir: string; exeRelPath: string; exeName: string }> = {
  // Cyberpunk 2077
  1091500: {
    installDir: 'Cyberpunk 2077',
    exeRelPath: 'bin/x64/Cyberpunk2077.exe',
    exeName: 'Cyberpunk2077.exe',
  },
  // Elden Ring
  1245620: {
    installDir: 'ELDEN RING',
    exeRelPath: 'Game/eldenring.exe',
    exeName: 'eldenring.exe',
  },
  // Baldur's Gate 3
  1086940: {
    installDir: "Baldurs Gate 3",
    exeRelPath: 'bin/bg3_dx11.exe',
    exeName: 'bg3_dx11.exe',
  },
  // Helldivers 2
  553850: {
    installDir: 'HELLDIVERS 2',
    exeRelPath: 'bin/helldivers2.exe',
    exeName: 'helldivers2.exe',
  },
  // Apex Legends
  1172470: {
    installDir: 'Apex Legends',
    exeRelPath: 'r5apex.exe',
    exeName: 'r5apex.exe',
  },
  // The Witcher 3: Wild Hunt
  292030: {
    installDir: 'The Witcher 3',
    exeRelPath: 'bin/x64/witcher3.exe',
    exeName: 'witcher3.exe',
  },
  // God of War Ragnarök
  2322010: {
    installDir: 'God of War Ragnarok',
    exeRelPath: 'GoWR.exe',
    exeName: 'GoWR.exe',
  },
  // Red Dead Redemption 2
  1174180: {
    installDir: 'Red Dead Redemption 2',
    exeRelPath: 'RDR2.exe',
    exeName: 'RDR2.exe',
  },
  // Monster Hunter: World
  582010: {
    installDir: 'Monster Hunter World',
    exeRelPath: 'MonsterHunterWorld.exe',
    exeName: 'MonsterHunterWorld.exe',
  },
  // Counter-Strike 2
  730: {
    installDir: 'Counter-Strike Global Offensive',
    exeRelPath: 'game/bin/linuxsteamrt64/cs2',
    exeName: 'cs2',
  },
  // Dota 2
  570: {
    installDir: 'dota 2 beta',
    exeRelPath: 'game/bin/linuxsteamrt64/dota2',
    exeName: 'dota2',
  },
  // Grand Theft Auto V
  271590: {
    installDir: 'Grand Theft Auto V',
    exeRelPath: 'GTA5.exe',
    exeName: 'GTA5.exe',
  },
  // Hogwarts Legacy
  990080: {
    installDir: 'Hogwarts Legacy',
    exeRelPath: 'Phoenix/Binaries/Win64/HogwartsLegacy.exe',
    exeName: 'HogwartsLegacy.exe',
  },
  // Quake Champions
  611500: {
    installDir: 'Quake Champions',
    exeRelPath: 'QuakeChampions.exe',
    exeName: 'QuakeChampions.exe',
  },
  // Fallout 4
  377160: {
    installDir: 'Fallout 4',
    exeRelPath: 'Fallout4.exe',
    exeName: 'Fallout4.exe',
  },
  // The Elder Scrolls V: Skyrim Special Edition
  489830: {
    installDir: 'Skyrim Special Edition',
    exeRelPath: 'SkyrimSE.exe',
    exeName: 'SkyrimSE.exe',
  },
  // Starfield
  1716740: {
    installDir: 'Starfield',
    exeRelPath: 'Starfield.exe',
    exeName: 'Starfield.exe',
  },
  // Cyberpunk 2077 REDmod / debug
  1091501: {
    installDir: 'Cyberpunk 2077',
    exeRelPath: 'bin/x64/Cyberpunk2077.exe',
    exeName: 'Cyberpunk2077.exe',
  },
  // Armored Core VI Fires of Rubicon
  1888160: {
    installDir: 'ARMORED CORE VI FIRES OF RUBICON',
    exeRelPath: 'Game/armoredcore6.exe',
    exeName: 'armoredcore6.exe',
  },
  // Black Myth: Wukong
  2358720: {
    installDir: 'Black Myth Wukong',
    exeRelPath: 'b1/Binaries/Win64/b1-Win64-Shipping.exe',
    exeName: 'b1-Win64-Shipping.exe',
  },
  // Palworld
  1623730: {
    installDir: 'Palworld',
    exeRelPath: 'Pal/Binaries/Win64/Palworld-Win64-Shipping.exe',
    exeName: 'Palworld-Win64-Shipping.exe',
  },
  // Deep Rock Galactic
  548430: {
    installDir: 'Deep Rock Galactic',
    exeRelPath: 'FSD/Binaries/Win64/FSD-Win64-Shipping.exe',
    exeName: 'FSD-Win64-Shipping.exe',
  },
  // Hades II
  1145350: {
    installDir: 'Hades II',
    exeRelPath: 'Ship/Hades2.exe',
    exeName: 'Hades2.exe',
  },
  // Hades
  1145360: {
    installDir: 'Hades',
    exeRelPath: 'x64/Hades.exe',
    exeName: 'Hades.exe',
  },
  // Ghost of Tsushima DIRECTOR'S CUT
  2215430: {
    installDir: 'Ghost of Tsushima DIRECTOR\'S CUT',
    exeRelPath: 'GhostOfTsushima.exe',
    exeName: 'GhostOfTsushima.exe',
  },
  // Horizon Forbidden West Complete Edition
  2420110: {
    installDir: 'Horizon Forbidden West Complete Edition',
    exeRelPath: 'HorizonForbiddenWest.exe',
    exeName: 'HorizonForbiddenWest.exe',
  },
  // Forza Horizon 5
  1551360: {
    installDir: 'ForzaHorizon5',
    exeRelPath: 'ForzaHorizon5.exe',
    exeName: 'ForzaHorizon5.exe',
  },
  // DOOM Eternal
  782330: {
    installDir: 'DOOMEternal',
    exeRelPath: 'DOOMEternalx64vk.exe',
    exeName: 'DOOMEternalx64vk.exe',
  },
  // POSTAL: Brain Damaged
  1659820: {
    installDir: 'POSTAL Brain Damaged',
    exeRelPath: 'POSTAL Brain Damaged.exe',
    exeName: 'POSTAL Brain Damaged.exe',
  },
};

/**
 * Returns exact executable path and directory name for a given Steam game.
 * Uses known game registry, scanned real disk properties, or intelligently normalized fallback.
 */
export function getGameExecutableInfo(
  appId: number,
  gameName: string,
  installedPath?: string,
  executablePath?: string,
  installDirName?: string
): GameExecutableInfo {
  // If exact real paths were discovered from local host disk scanning:
  if (executablePath && installedPath) {
    const parts = executablePath.replace(/\\/g, '/').split('/');
    const exeName = parts[parts.length - 1] || 'game.exe';
    const cleanInstalled = normalizeShellPath(installedPath.replace(/\\/g, '/').replace(/\/$/, ''));
    const cleanExe = normalizeShellPath(executablePath.replace(/\\/g, '/'));
    let relPath = cleanExe.startsWith(cleanInstalled) 
      ? cleanExe.slice(cleanInstalled.length).replace(/^\//, '') 
      : exeName;

    return {
      executableName: exeName,
      installDirName: installDirName || cleanInstalled.split('/').pop() || gameName,
      relativeExePath: relPath,
      defaultInstallPath: cleanInstalled,
      fullExePath: cleanExe,
      compatDataPath: `$HOME/.local/share/Steam/steamapps/compatdata/${appId}`,
      steamInstallPath: '$HOME/.local/share/Steam',
    };
  }

  // Known registry lookup by AppID or Title:
  const knownEntry = KNOWN_GAME_EXECUTABLES[appId] || Object.values(KNOWN_GAME_EXECUTABLES).find(
    (e) =>
      e.installDir.toLowerCase() === gameName.trim().toLowerCase() ||
      gameName.trim().toLowerCase().includes('postal brain damaged')
  );

  if (knownEntry) {
    const installDir = installDirName || knownEntry.installDir;
    const relPath = knownEntry.exeRelPath;
    const exeName = knownEntry.exeName;
    const defaultInstall = `$HOME/.local/share/Steam/steamapps/common/${installDir}`;
    return {
      executableName: exeName,
      installDirName: installDir,
      relativeExePath: relPath,
      defaultInstallPath: defaultInstall,
      fullExePath: `${defaultInstall}/${relPath}`,
      compatDataPath: `$HOME/.local/share/Steam/steamapps/compatdata/${appId}`,
      steamInstallPath: '$HOME/.local/share/Steam',
    };
  }

  // Intelligent fallback for custom / unlisted games
  const safeName = gameName.replace(/[^a-zA-Z0-9]/g, '');
  const cleanDirName = gameName.replace(/[:\\/*?"<>|]/g, '');
  const exeName = `${safeName || 'game'}.exe`;
  const defaultInstall = `$HOME/.local/share/Steam/steamapps/common/${cleanDirName}`;

  return {
    executableName: exeName,
    installDirName: cleanDirName,
    relativeExePath: exeName,
    defaultInstallPath: defaultInstall,
    fullExePath: `${defaultInstall}/${exeName}`,
    compatDataPath: `$HOME/.local/share/Steam/steamapps/compatdata/${appId}`,
    steamInstallPath: '$HOME/.local/share/Steam',
  };
}

export interface ProtonRunnerResolution {
  runnerName: string;
  folderName: string;
  runnerBinaryPath: string;
  isCustom: boolean;
  category: 'cachyos' | 'ge' | 'valve' | 'stl' | 'tkg' | 'kron4ek' | 'custom';
}

/**
 * Resolves Proton runner binary path accurately:
 * - Official Valve Proton releases live in ~/.local/share/Steam/steamapps/common/
 * - Custom runners (CachyOS, GE-Proton, Tkg, SteamTinkerLaunch, etc.) live in
 *   ~/.local/share/Steam/compatibilitytools.d/
 * - Runner directories with hyphens (e.g. proton-cachyos-11.0-20260703-slr-x86_64_v3)
 *   are preserved; spaces in custom titles are converted to hyphens, never vice-versa.
 */
export function resolveProtonRunnerInfo(
  runnerNameInput: string,
  knownInstalledRunners?: Array<{ folderName: string; displayTitle: string; fullPath: string; source?: string }>
): ProtonRunnerResolution {
  const input = (runnerNameInput || 'Proton Experimental').trim();

  // Helper to categorize
  const getRunnerCategory = (name: string): ProtonRunnerResolution['category'] => {
    const lower = name.toLowerCase();
    if (lower.includes('cachyos')) return 'cachyos';
    if (lower.includes('ge-proton') || lower.includes('proton-ge') || lower.startsWith('ge-') || lower.startsWith('ge_')) return 'ge';
    if (lower.includes('tkg')) return 'tkg';
    if (lower.includes('kron4ek')) return 'kron4ek';
    if (lower.includes('steamtinkerlaunch') || lower.includes('stl')) return 'stl';
    if (isOfficialValveProton(lower)) return 'valve';
    return 'custom';
  };

  // Check if official Valve Proton runner in steamapps/common
  const isOfficialValveProton = (name: string): boolean => {
    const lower = name.toLowerCase();
    if (
      lower.includes('cachyos') ||
      lower.includes('ge-') ||
      lower.includes('-ge') ||
      lower.includes('ge') && (lower.includes('custom') || lower.includes('proton')) ||
      lower.includes('tkg') ||
      lower.includes('kron4ek') ||
      lower.includes('wineland') ||
      lower.includes('rtsp') ||
      lower.includes('stl') ||
      lower.includes('steamtinkerlaunch') ||
      lower.includes('slr-') ||
      lower.includes('x86_64')
    ) {
      return false;
    }
    return (
      lower.startsWith('proton experimental') ||
      lower.startsWith('proton bleeding edge') ||
      lower.startsWith('proton hotfix') ||
      lower.startsWith('proton next') ||
      /^proton\s+[0-9]/i.test(name) ||
      lower.includes('steam linux runtime')
    );
  };

  // 1. If known installed runners from host system are available, try matching first:
  if (knownInstalledRunners && knownInstalledRunners.length > 0) {
    const directMatch = knownInstalledRunners.find(
      (r) =>
        r.folderName.toLowerCase() === input.toLowerCase() ||
        r.displayTitle.toLowerCase() === input.toLowerCase() ||
        r.folderName.toLowerCase().replace(/[\s_]+/g, '-') === input.toLowerCase().replace(/[\s_]+/g, '-')
    );
    if (directMatch) {
      const isCustomTool = directMatch.source === 'compatibilitytools.d' || directMatch.fullPath.includes('compatibilitytools.d');
      const binName = directMatch.folderName.toLowerCase().includes('steamtinkerlaunch') ? 'steamtinkerlaunch' : 'proton';
      const binaryPath = directMatch.fullPath.endsWith('/proton') || directMatch.fullPath.endsWith('/steamtinkerlaunch')
        ? directMatch.fullPath
        : `${directMatch.fullPath}/${binName}`;
      return {
        runnerName: directMatch.displayTitle || directMatch.folderName,
        folderName: directMatch.folderName,
        runnerBinaryPath: normalizeShellPath(binaryPath.replace(/\/+/g, '/')),
        isCustom: isCustomTool,
        category: getRunnerCategory(directMatch.folderName),
      };
    }
  }

  const isValve = isOfficialValveProton(input);

  if (isValve) {
    // Valve runners in steamapps/common
    let folderName = input;
    if (/^proton\s*-\s*experimental/i.test(input)) folderName = 'Proton Experimental';
    else if (/^proton\s*9\.0\s*\(beta\)/i.test(input) || /^proton\s*9\.0-3/i.test(input) || /^proton\s*9\.0/i.test(input)) folderName = 'Proton 9.0 (Beta)';
    else if (/^proton\s*8\.0/i.test(input)) folderName = 'Proton 8.0';
    else if (/^proton\s*7\.0/i.test(input)) folderName = 'Proton 7.0';
    else if (/^proton\s*6\.3/i.test(input)) folderName = 'Proton 6.3';
    else if (/^proton\s*5\.13/i.test(input)) folderName = 'Proton 5.13';
    else if (/^proton\s*hotfix/i.test(input)) folderName = 'Proton Hotfix';

    return {
      runnerName: input,
      folderName,
      runnerBinaryPath: `$HOME/.local/share/Steam/steamapps/common/${folderName}/proton`,
      isCustom: false,
      category: 'valve',
    };
  }

  // Custom runner in compatibilitytools.d:
  // Maintain exact directory name (dashes, version tags)
  let folderName = input;
  if (input.toLowerCase().includes('cachyos')) {
    // E.g. "proton cachyos 11.0 20260703 slr x86_64_v3" -> "proton-cachyos-11.0-20260703-slr-x86_64_v3"
    if (input.includes(' ')) {
      folderName = input.replace(/\s+/g, '-');
    }
  } else if (input.toLowerCase().startsWith('ge-proton') || input.toLowerCase().startsWith('proton ge')) {
    folderName = input.replace(/^proton\s+ge[-\s]*/i, 'GE-Proton').replace(/\s+/g, '-');
  } else if (input.includes(' ')) {
    folderName = input.replace(/\s+/g, '-');
  }

  const binaryName = folderName.toLowerCase().includes('steamtinkerlaunch') ? 'steamtinkerlaunch' : 'proton';

  return {
    runnerName: input,
    folderName,
    runnerBinaryPath: `$HOME/.local/share/Steam/compatibilitytools.d/${folderName}/${binaryName}`,
    isCustom: true,
    category: getRunnerCategory(folderName),
  };
}

