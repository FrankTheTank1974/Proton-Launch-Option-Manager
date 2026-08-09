import { VdfAppConfig } from '../types';

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
