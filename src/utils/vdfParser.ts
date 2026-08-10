import { VdfAppConfig } from '../types';

export function formatProtonToolName(toolName: string): string {
  if (!toolName) return 'Proton Experimental';
  const lower = toolName.toLowerCase().trim();
  if (lower === 'proton_experimental' || lower === 'proton-experimental' || lower === 'experimental') return 'Proton Experimental';
  if (lower === 'proton_hotfix' || lower === 'proton-hotfix' || lower === 'hotfix') return 'Proton Hotfix';
  if (lower === 'proton_bleeding_edge') return 'Proton Bleeding Edge';
  if (lower.startsWith('proton_9') || lower === 'proton-9' || lower === 'proton_9_0') return 'Proton 9.0';
  if (lower.startsWith('proton_8') || lower === 'proton-8' || lower === 'proton_8_0') return 'Proton 8.0';
  if (lower.startsWith('proton_7') || lower === 'proton-7' || lower === 'proton_7_0') return 'Proton 7.0';
  if (lower.startsWith('proton_6') || lower === 'proton-6') return 'Proton 6.3-8';
  if (lower.startsWith('proton_5') || lower === 'proton-5') return 'Proton 5.13-9';
  if (lower.includes('battleye')) return 'Proton BattEye Runtime';
  if (lower.includes('easyanticheat') || lower.includes('eac')) return 'Proton EAC Runtime';
  if (toolName.startsWith('GE-Proton') || toolName.startsWith('ge-proton')) {
    return toolName;
  }
  if (toolName.startsWith('proton_')) {
    return toolName.replace('proton_', 'Proton ').replace(/_/g, ' ');
  }
  return toolName;
}

export function parseCompatToolMapping(vdfText: string): Map<string, string> {
  const map = new Map<string, string>();
  if (!vdfText) return map;

  const compatBlockMatch = vdfText.match(/"CompatToolMapping"\s*\{([\s\S]*?)\n\s*\}\s*\n/i) || vdfText.match(/"CompatToolMapping"\s*\{([\s\S]*?)\}/i);
  const textToSearch = compatBlockMatch ? compatBlockMatch[1] : vdfText;

  const entryRegex = /"(\d+)"\s*\{[^}]*?"name"\s*"([^"]+)"/gi;
  let match;
  while ((match = entryRegex.exec(textToSearch)) !== null) {
    const appId = match[1];
    const toolName = match[2];
    map.set(appId, formatProtonToolName(toolName));
  }
  return map;
}

export function isSteamRuntimeOrTool(name: string): boolean {
  if (!name) return true;
  const lower = name.toLowerCase().trim();

  if (
    lower.includes('steam linux runtime') ||
    lower.includes('linux runtime') ||
    lower.includes('steamworks common redistributables') ||
    lower.includes('steamworks') ||
    lower.includes('common redistributables') ||
    lower.includes('proton') ||
    lower.includes('battleye runtime') ||
    lower.includes('easyanticheat') ||
    lower.includes('steamvr') ||
    lower.includes('steam controller') ||
    lower.includes('steam client')
  ) {
    return true;
  }

  return false;
}

export function parseAppManifestAcf(acfText: string): { appId: string; name: string; installDate?: number } | null {
  if (!acfText) return null;
  const appIdMatch = acfText.match(/"appid"\s*"(\d+)"/i);
  const nameMatch = acfText.match(/"name"\s*"([^"]*)"/i);
  const lastUpdatedMatch = acfText.match(/"LastUpdated"\s*"(\d+)"/i) || acfText.match(/"installdate"\s*"(\d+)"/i);
  if (appIdMatch && nameMatch) {
    return {
      appId: appIdMatch[1],
      name: nameMatch[1],
      installDate: lastUpdatedMatch ? parseInt(lastUpdatedMatch[1], 10) * 1000 : undefined,
    };
  }
  return null;
}

export function parseLibraryFoldersVdf(vdfText: string): string[] {
  const paths: string[] = [];
  if (!vdfText) return paths;

  // Match "path" "..." inside libraryfolders.vdf
  const pathRegex = /"path"\s*"([^"]+)"/gi;
  let match;
  while ((match = pathRegex.exec(vdfText)) !== null) {
    paths.push(match[1]);
  }
  return paths;
}

export function parseLocalConfigVdf(vdfText: string): VdfAppConfig[] {
  const results: VdfAppConfig[] = [];
  
  if (!vdfText) return results;

  // Search for "apps" block
  const appsSectionMatch = vdfText.match(/"apps"\s*\{([\s\S]*?)\n\t\t\}/i) || vdfText.match(/"apps"\s*\{([\s\S]*?)\}/i);
  const contentToSearch = appsSectionMatch ? appsSectionMatch[1] : vdfText;

  // Regex to match app id blocks like:
  // "1091500" { "LaunchOptions" "PROTON_ENABLE_NVAPI=1 %command%" }
  const appIdRegex = /"(\d+)"\s*\{([^}]*)\}/g;
  let match;

  while ((match = appIdRegex.exec(contentToSearch)) !== null) {
    const appId = match[1];
    const appBody = match[2];

    const launchOptsMatch = appBody.match(/"LaunchOptions"\s*"([^"]*)"/i);
    const nameMatch = appBody.match(/"name"\s*"([^"]*)"/i);

    if (launchOptsMatch) {
      results.push({
        appId,
        launchOptions: launchOptsMatch[1],
        appName: nameMatch ? nameMatch[1] : `App ${appId}`,
      });
    }
  }

  return results;
}

export function updateVdfLaunchOptions(
  vdfText: string,
  appId: string,
  newLaunchOptions: string
): string {
  const appIdStr = `"${appId}"`;
  const appPos = vdfText.indexOf(appIdStr);

  if (appPos === -1) {
    // If AppID block doesn't exist, append inside "apps" section
    const appsIdx = vdfText.indexOf('"apps"');
    if (appsIdx !== -1) {
      const openBraceIdx = vdfText.indexOf('{', appsIdx);
      if (openBraceIdx !== -1) {
        const newBlock = `\n\t\t"${appId}"\n\t\t{\n\t\t\t"LaunchOptions"\t\t"${newLaunchOptions}"\n\t\t}`;
        return vdfText.slice(0, openBraceIdx + 1) + newBlock + vdfText.slice(openBraceIdx + 1);
      }
    }
    return vdfText;
  }

  // Find LaunchOptions inside this app block
  const blockEnd = vdfText.indexOf('}', appPos);
  const appSub = vdfText.slice(appPos, blockEnd + 1);

  if (appSub.includes('"LaunchOptions"')) {
    const updatedSub = appSub.replace(
      /"LaunchOptions"\s*"[^"]*"/i,
      `"LaunchOptions"\t\t"${newLaunchOptions}"`
    );
    return vdfText.slice(0, appPos) + updatedSub + vdfText.slice(blockEnd + 1);
  } else {
    // Insert LaunchOptions before closing brace
    const insertPos = blockEnd;
    const newEntry = `\t\t\t"LaunchOptions"\t\t"${newLaunchOptions}"\n\t\t`;
    return vdfText.slice(0, insertPos) + newEntry + vdfText.slice(insertPos);
  }
}

export function generateSampleVdf(games: Array<{ appId: number; currentLaunchOptions: string; name: string }>): string {
  let appBlocks = '';
  games.forEach((g) => {
    appBlocks += `\t\t"${g.appId}"\n\t\t{\n\t\t\t"name"\t\t"${g.name}"\n\t\t\t"LaunchOptions"\t\t"${g.currentLaunchOptions}"\n\t\t}\n`;
  });

  return `"UserLocalConfigStore"\n{\n\t"Software"\n\t{\n\t\t"Valve"\n\t\t{\n\t\t\t"Steam"\n\t\t\t{\n\t\t\t\t"apps"\n\t\t\t\t{\n${appBlocks}\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n}`;
}
