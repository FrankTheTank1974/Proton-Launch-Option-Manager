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

export function parseAppManifestAcf(acfText: string): { appId: string; name: string; installDate?: number; installDirName?: string } | null {
  if (!acfText) return null;
  const appIdMatch = acfText.match(/"appid"\s*"(\d+)"/i);
  const nameMatch = acfText.match(/"name"\s*"([^"]*)"/i);
  const installdirMatch = acfText.match(/"installdir"\s*"([^"]*)"/i);
  const lastUpdatedMatch = acfText.match(/"LastUpdated"\s*"(\d+)"/i) || acfText.match(/"installdate"\s*"(\d+)"/i);
  if (appIdMatch && nameMatch) {
    return {
      appId: appIdMatch[1],
      name: nameMatch[1],
      installDirName: installdirMatch ? installdirMatch[1] : undefined,
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

export function findMatchingBraceIndex(text: string, openBraceIndex: number): number {
  let depth = 0;
  let inString = false;
  let escapeNext = false;

  for (let i = openBraceIndex; i < text.length; i++) {
    const char = text[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\') {
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === '{') {
        depth++;
      } else if (char === '}') {
        depth--;
        if (depth === 0) {
          return i;
        }
      }
    }
  }

  return -1;
}

export function updateVdfLaunchOptions(
  vdfText: string,
  appId: string,
  newLaunchOptions: string
): string {
  if (!vdfText) {
    return generateSampleVdf([{ appId: Number(appId), currentLaunchOptions: newLaunchOptions, name: `App ${appId}` }]);
  }

  const escapedOpts = newLaunchOptions.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const appIdQuoted = `"${appId}"`;

  // Search for the specific app ID block inside the VDF
  let searchPos = 0;
  let appFoundIndex = -1;

  while (true) {
    const idx = vdfText.indexOf(appIdQuoted, searchPos);
    if (idx === -1) break;

    // Verify this is a key token (followed by whitespace and '{')
    const afterApp = vdfText.slice(idx + appIdQuoted.length);
    const braceMatch = afterApp.match(/^\s*\{/);
    if (braceMatch) {
      appFoundIndex = idx;
      break;
    }
    searchPos = idx + appIdQuoted.length;
  }

  if (appFoundIndex !== -1) {
    // Found existing appId block! Find its open and closing brace
    const openBraceIdx = vdfText.indexOf('{', appFoundIndex);
    if (openBraceIdx !== -1) {
      const closeBraceIdx = findMatchingBraceIndex(vdfText, openBraceIdx);
      if (closeBraceIdx !== -1) {
        const appBody = vdfText.slice(openBraceIdx + 1, closeBraceIdx);
        
        // Check if LaunchOptions already exists in this app block
        const launchOptsRegex = /("LaunchOptions"\s*")[^"]*(")/i;
        if (launchOptsRegex.test(appBody)) {
          const updatedBody = appBody.replace(launchOptsRegex, `$1${escapedOpts}$2`);
          return vdfText.slice(0, openBraceIdx + 1) + updatedBody + vdfText.slice(closeBraceIdx);
        } else {
          // Insert LaunchOptions right at start of app block
          const insertContent = `\n\t\t\t\t\t"LaunchOptions"\t\t"${escapedOpts}"`;
          return vdfText.slice(0, openBraceIdx + 1) + insertContent + vdfText.slice(openBraceIdx + 1);
        }
      }
    }
  }

  // If app block doesn't exist, locate "apps" block and insert it
  const appsIdx = vdfText.search(/"apps"\s*\{/i);
  if (appsIdx !== -1) {
    const openBraceIdx = vdfText.indexOf('{', appsIdx);
    if (openBraceIdx !== -1) {
      const newAppBlock = `\n\t\t\t\t"${appId}"\n\t\t\t\t{\n\t\t\t\t\t"LaunchOptions"\t\t"${escapedOpts}"\n\t\t\t\t}`;
      return vdfText.slice(0, openBraceIdx + 1) + newAppBlock + vdfText.slice(openBraceIdx + 1);
    }
  }

  // Fallback: If no apps block exists, append before last closing brace or construct new
  const lastBraceIdx = vdfText.lastIndexOf('}');
  if (lastBraceIdx !== -1) {
    const appBlockStr = `\n\t"apps"\n\t{\n\t\t"${appId}"\n\t\t{\n\t\t\t"LaunchOptions"\t\t"${escapedOpts}"\n\t\t}\n\t}\n`;
    return vdfText.slice(0, lastBraceIdx) + appBlockStr + vdfText.slice(lastBraceIdx);
  }

  return generateSampleVdf([{ appId: Number(appId), currentLaunchOptions: newLaunchOptions, name: `App ${appId}` }]);
}

export function generateSampleVdf(games: Array<{ appId: number; currentLaunchOptions: string; name: string }>): string {
  let appBlocks = '';
  games.forEach((g) => {
    appBlocks += `\t\t"${g.appId}"\n\t\t{\n\t\t\t"name"\t\t"${g.name}"\n\t\t\t"LaunchOptions"\t\t"${g.currentLaunchOptions}"\n\t\t}\n`;
  });

  return `"UserLocalConfigStore"\n{\n\t"Software"\n\t{\n\t\t"Valve"\n\t\t{\n\t\t\t"Steam"\n\t\t\t{\n\t\t\t\t"apps"\n\t\t\t\t{\n${appBlocks}\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}\n}`;
}
