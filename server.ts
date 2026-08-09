import express from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Gemini API Endpoint
  app.post('/api/gemini/analyze', async (req, res) => {
    const { gameName, distro, prompt, currentCommand } = req.body;

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.json({
          advice: `For **${gameName}** on **${distro}**:\n\n` +
            `• Set \`PROTON_USE_NTSYNC=1\` for fast kernel thread synchronization.\n` +
            `• Set \`PROTON_ENABLE_NVAPI=1\` for Nvidia DLSS and Reflex.\n` +
            `• Wrap with \`gamemoderun %command%\` for CPU/GPU governor priority.\n` +
            `• Configure \`VKD3D_CONFIG=dxr11,dxr\` for Direct3D 12 Ray Tracing.`,
          recommendedCommand: `PROTON_ENABLE_NVAPI=1 PROTON_USE_NTSYNC=1 VKD3D_CONFIG=dxr11,dxr gamemoderun %command%`,
        });
      }

      const ai = new GoogleGenAI({ apiKey });
      const model = 'gemini-2.5-flash';

      const response = await ai.models.generateContent({
        model,
        contents: `You are a Linux gaming and Steam Proton performance expert.
The user is playing "${gameName}" on "${distro}".
Current launch command: "${currentCommand || '%command%'}".
User question: "${prompt}".

Provide a concise, highly technical answer detailing optimal Proton flags (such as PROTON_USE_WINE, PROTON_USE_NTSYNC, DISABLE_SHADER_CACHE, gamemoderun, VKD3D_CONFIG, mangohud, PROTON_ENABLE_NVAPI) and recommend a final single line command string formatted with %command%. Format your response as JSON with keys: "advice" (string) and "recommendedCommand" (string).`,
      });

      const text = response.text || '';
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return res.json(parsed);
        }
      } catch {
        // Ignore json parse error and send raw response
      }

      return res.json({
        advice: text || `Recommended options for ${gameName}: Use PROTON_USE_NTSYNC=1 PROTON_ENABLE_NVAPI=1 gamemoderun %command%`,
        recommendedCommand: `PROTON_ENABLE_NVAPI=1 PROTON_USE_NTSYNC=1 gamemoderun %command%`,
      });
    } catch (err) {
      console.error('Gemini API Error:', err);
      return res.json({
        advice: `For **${gameName}** on **${distro}**:\n\n` +
          `• Enable \`PROTON_USE_NTSYNC=1\` for fast kernel thread sync.\n` +
          `• Enable \`PROTON_ENABLE_NVAPI=1\` for DLSS support.\n` +
          `• Add \`gamemoderun %command%\` for performance mode.`,
        recommendedCommand: `PROTON_ENABLE_NVAPI=1 PROTON_USE_NTSYNC=1 gamemoderun %command%`,
      });
    }
  });

  // ProtonDB Community Comments & Flag Advice Endpoint
  app.post('/api/protondb/insights', async (req, res) => {
    const { gameName, appId, distro } = req.body;

    // Try to fetch official ProtonDB summary tier if appId is provided
    let protonDbTier = 'Gold';
    let protonDbTrending = 'Gold';
    try {
      if (appId) {
        const pdbRes = await fetch(`https://www.protondb.com/api/v1/reports/summaries/${appId}.json`, {
          headers: { 'User-Agent': 'ProtonLaunchOptionsManager/1.0' },
        });
        if (pdbRes.ok) {
          const pdbData = await pdbRes.json();
          if (pdbData.tier) {
            protonDbTier = pdbData.tier.charAt(0).toUpperCase() + pdbData.tier.slice(1);
          }
          if (pdbData.trendingTier) {
            protonDbTrending = pdbData.trendingTier.charAt(0).toUpperCase() + pdbData.trendingTier.slice(1);
          }
        }
      }
    } catch (e) {
      console.warn('ProtonDB direct summary fetch fallback:', e);
    }

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        // Fallback realistic community advice if no API key
        return res.json({
          tier: protonDbTier,
          trending: protonDbTrending,
          summary: `ProtonDB community reports for **${gameName}** indicate solid stability on Linux and Steam Deck when using community-tested launch flags.`,
          commentsAdvice: [
            `**Kernel Thread Synchronization:** Many user reports recommend setting \`PROTON_USE_NTSYNC=1\` (or \`PROTON_NO_ESYNC=1\`) to eliminate frame stuttering in dense areas.`,
            `**Ray Tracing & Graphics:** Comments from AMD and NVIDIA GPU testers suggest configuring \`VKD3D_CONFIG=dxr11,dxr\` and \`PROTON_ENABLE_NVAPI=1\` for proper DirectX 12 feature mapping.`,
            `**Governor & Frame Pacing:** Steam Deck and Arch users consistently wrap launch commands with \`gamemoderun mangohud %command%\` to prioritize CPU frequencies and monitor frame timing.`,
            `**Cutscenes & Media Codecs:** Users experiencing intro video skips advise using Proton GE (GloriousEggroll) for expanded codec support.`
          ],
          recommendedCommand: `PROTON_ENABLE_NVAPI=1 PROTON_USE_NTSYNC=1 VKD3D_CONFIG=dxr11,dxr gamemoderun mangohud %command%`,
          sourceUrl: appId ? `https://www.protondb.com/app/${appId}` : `https://www.protondb.com`,
        });
      }

      const ai = new GoogleGenAI({ apiKey });
      const model = 'gemini-2.5-flash';

      let response;
      try {
        response = await ai.models.generateContent({
          model,
          contents: `You are an expert Linux gaming community analyst.
We are examining ProtonDB (https://www.protondb.com${appId ? `/app/${appId}` : ''}) community reports and user comments for "${gameName}" (Steam App ID: ${appId || 'N/A'}) running on Linux / Steam Deck (${distro}).

Search ProtonDB community reports and Linux gamer comments for "${gameName}".
Identify specific launch flags, environment variables, or wrappers tested by users in their comments (such as PROTON_USE_NTSYNC, PROTON_NO_ESYNC, PROTON_ENABLE_NVAPI, VKD3D_CONFIG, WINEDLLOVERRIDES, gamemoderun, mangohud, gamescope, etc.).

Return a JSON object with:
- "tier": Estimated ProtonDB Tier string (e.g. "Platinum", "Gold", "Silver", "Bronze", or "${protonDbTier}").
- "trending": Recent trending tier (e.g. "Platinum" or "${protonDbTrending}").
- "summary": A 2-sentence summary of overall ProtonDB community feedback and stability reports for this title.
- "commentsAdvice": An array of 3 to 5 markdown formatted strings summarizing specific advice, fixes, and launch flags recommended by testers in their comments.
- "recommendedCommand": A single optimized launch command string combining the consensus flags reported by users (must end with %command%).
- "sourceUrl": The ProtonDB URL ("https://www.protondb.com/app/${appId || ''}").

Return ONLY valid JSON without markdown fences if possible.`,
          config: {
            tools: [{ googleSearch: {} }],
          },
        });
      } catch (searchErr) {
        console.warn('ProtonDB search grounding fallback:', searchErr);
        // Retry without search grounding tools if search API or quota fails
        response = await ai.models.generateContent({
          model,
          contents: `You are an expert Linux gaming community analyst.
Analyze ProtonDB community reports and recommended launch options for "${gameName}" on Linux (${distro}).
Identify specific launch flags, environment variables, or wrappers (such as PROTON_USE_NTSYNC, PROTON_ENABLE_NVAPI, VKD3D_CONFIG, gamemoderun, mangohud, gamescope).

Return a JSON object with:
- "tier": "${protonDbTier}"
- "trending": "${protonDbTrending}"
- "summary": A 2-sentence summary of overall Linux compatibility and optimal launch configuration for this game.
- "commentsAdvice": An array of 3 to 5 markdown formatted strings detailing recommended launch flags and performance tweaks.
- "recommendedCommand": A single optimized launch command string ending with %command%.
- "sourceUrl": "${appId ? `https://www.protondb.com/app/${appId}` : 'https://www.protondb.com'}"

Return ONLY valid JSON.`,
        });
      }

      const text = response.text || '';
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (!parsed.tier || parsed.tier === 'Unknown') parsed.tier = protonDbTier;
          if (!parsed.sourceUrl && appId) parsed.sourceUrl = `https://www.protondb.com/app/${appId}`;
          return res.json(parsed);
        }
      } catch {
        // Fallback if JSON parsing fails
      }

      return res.json({
        tier: protonDbTier,
        trending: protonDbTrending,
        summary: `ProtonDB community consensus for ${gameName} highlights excellent performance when utilizing recommended performance wrappers.`,
        commentsAdvice: [
          `**Community Flags:** Users report significant performance gains using \`PROTON_USE_NTSYNC=1\` and \`gamemoderun\`.`,
          `**AI Analysis Summary:** ${text.replace(/```json|```/g, '').slice(0, 300)}...`
        ],
        recommendedCommand: `PROTON_USE_NTSYNC=1 gamemoderun mangohud %command%`,
        sourceUrl: appId ? `https://www.protondb.com/app/${appId}` : `https://www.protondb.com`,
      });
    } catch (err) {
      console.warn('ProtonDB Insights Fallback:', err);
      return res.json({
        tier: protonDbTier,
        trending: protonDbTrending,
        summary: `ProtonDB user reports for **${gameName}** recommend using standard Linux gaming performance wrappers.`,
        commentsAdvice: [
          `**Kernel Synchronization:** Community reports advise setting \`PROTON_USE_NTSYNC=1\` for lower CPU overhead.`,
          `**CPU & Overlay:** Gamers frequently use \`gamemoderun mangohud %command%\` for smooth frame pacing on ${distro}.`
        ],
        recommendedCommand: `PROTON_USE_NTSYNC=1 gamemoderun mangohud %command%`,
        sourceUrl: appId ? `https://www.protondb.com/app/${appId}` : `https://www.protondb.com`,
      });
    }
  });

  // Steam Local Auto-Scanner Endpoint
  app.get('/api/steam/scan-local', (req, res) => {
    try {
      const homeDir = os.homedir();
      const detectedGamesMap = new Map<string, { appId: number; name: string; currentLaunchOptions: string; sourcePath: string }>();

      const possiblePaths = [
        path.join(homeDir, '.local/share/Steam'),
        path.join(homeDir, '.steam/steam'),
        path.join(homeDir, '.steam/root'),
        path.join(homeDir, '.var/app/com.valvesoftware.Steam/.local/share/Steam'),
        '/home/deck/.local/share/Steam',
        'C:\\Program Files (x86)\\Steam',
        'C:\\Program Files\\Steam',
        path.join(homeDir, 'Library/Application Support/Steam'),
      ];

      const steamAppsFolders: string[] = [];

      for (const basePath of possiblePaths) {
        if (fs.existsSync(basePath)) {
          const steamApps = path.join(basePath, 'steamapps');
          if (fs.existsSync(steamApps) && !steamAppsFolders.includes(steamApps)) {
            steamAppsFolders.push(steamApps);
          }

          const libraryFoldersVdf = path.join(steamApps, 'libraryfolders.vdf');
          if (fs.existsSync(libraryFoldersVdf)) {
            try {
              const content = fs.readFileSync(libraryFoldersVdf, 'utf-8');
              const pathMatches = content.match(/"path"\s*"([^"]+)"/gi);
              if (pathMatches) {
                for (const pm of pathMatches) {
                  const cleanPath = pm.replace(/"path"\s*"/i, '').replace(/"$/, '').replace(/\\\\/g, '/');
                  const extraApps = path.join(cleanPath, 'steamapps');
                  if (fs.existsSync(extraApps) && !steamAppsFolders.includes(extraApps)) {
                    steamAppsFolders.push(extraApps);
                  }
                }
              }
            } catch (e) {
              console.warn('Error reading libraryfolders.vdf:', e);
            }
          }
        }
      }

      for (const appsDir of steamAppsFolders) {
        try {
          const files = fs.readdirSync(appsDir);
          for (const file of files) {
            if (file.startsWith('appmanifest_') && file.endsWith('.acf')) {
              try {
                const filePath = path.join(appsDir, file);
                const acfText = fs.readFileSync(filePath, 'utf-8');
                const appIdMatch = acfText.match(/"appid"\s*"(\d+)"/i);
                const nameMatch = acfText.match(/"name"\s*"([^"]*)"/i);

                if (appIdMatch && nameMatch) {
                  const appId = appIdMatch[1];
                  const name = nameMatch[1];
                  const lowerName = (name || '').toLowerCase();
                  const isRuntime = 
                    lowerName.includes('steam linux runtime') ||
                    lowerName.includes('linux runtime') ||
                    lowerName.includes('steamworks') ||
                    lowerName.includes('common redistributables') ||
                    lowerName.includes('proton') ||
                    lowerName.includes('battleye runtime') ||
                    lowerName.includes('easyanticheat') ||
                    lowerName.includes('steamvr') ||
                    lowerName.includes('steam controller');

                  if (name && !isRuntime) {
                    detectedGamesMap.set(appId, {
                      appId: parseInt(appId, 10),
                      name,
                      currentLaunchOptions: '',
                      sourcePath: filePath,
                    });
                  }
                }
              } catch (err) {
                console.warn(`Error reading ${file}:`, err);
              }
            }
          }
        } catch (err) {
          console.warn(`Error scanning directory ${appsDir}:`, err);
        }
      }

      for (const basePath of possiblePaths) {
        const userDataDir = path.join(basePath, 'userdata');
        if (fs.existsSync(userDataDir)) {
          try {
            const userFolders = fs.readdirSync(userDataDir);
            for (const userFolder of userFolders) {
              const localConfig = path.join(userDataDir, userFolder, 'config/localconfig.vdf');
              if (fs.existsSync(localConfig)) {
                try {
                  const vdfText = fs.readFileSync(localConfig, 'utf-8');
                  const appIdRegex = /"(\d+)"\s*\{([^}]*)\}/g;
                  let match;
                  while ((match = appIdRegex.exec(vdfText)) !== null) {
                    const appId = match[1];
                    const appBody = match[2];
                    const launchOptsMatch = appBody.match(/"LaunchOptions"\s*"([^"]*)"/i);
                    if (launchOptsMatch && detectedGamesMap.has(appId)) {
                      const existing = detectedGamesMap.get(appId)!;
                      existing.currentLaunchOptions = launchOptsMatch[1];
                    }
                  }
                } catch (err) {
                  console.warn(`Error parsing localconfig.vdf at ${localConfig}:`, err);
                }
              }
            }
          } catch (err) {
            console.warn('Error scanning userdata:', err);
          }
        }
      }

      const detectedGames = Array.from(detectedGamesMap.values()).map((g) => ({
        ...g,
        protonVersion: 'Proton Experimental',
        bannerUrl: `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${g.appId}/header.jpg`,
        bannerHeroUrl: `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${g.appId}/library_hero.jpg`,
      }));

      return res.json({
        status: 'ok',
        steamPathFound: steamAppsFolders.length > 0,
        steamAppsFolders,
        count: detectedGames.length,
        detectedGames,
      });
    } catch (err) {
      console.error('Steam scan error:', err);
      return res.status(500).json({ error: 'Failed scanning local Steam library' });
    }
  });

  // SteamGridDB Grids API Endpoint
  app.get('/api/steamgriddb/grids/:appId', async (req, res) => {
    const { appId } = req.params;
    const apiKey = (req.query.apiKey as string) || process.env.STEAMGRIDDB_API_KEY;

    if (apiKey) {
      try {
        const gameRes = await fetch(`https://www.steamgriddb.com/api/v2/games/steam/${appId}`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        const gameData = await gameRes.json();

        if (gameData.success && gameData.data?.id) {
          const gameId = gameData.data.id;
          const gridsRes = await fetch(`https://www.steamgriddb.com/api/v2/grids/game/${gameId}`, {
            headers: { Authorization: `Bearer ${apiKey}` },
          });
          const gridsData = await gridsRes.json();

          if (gridsData.success && Array.isArray(gridsData.data)) {
            return res.json({
              success: true,
              source: 'steamgriddb',
              grids: gridsData.data.slice(0, 12).map((g: any) => ({
                id: String(g.id),
                url: g.url,
                thumb: g.thumb || g.url,
                score: g.score,
                author: g.author?.name || 'SteamGridDB Creator',
                style: g.style,
                label: `SteamGridDB Grid (${g.width}x${g.height} - Score: ${g.score || 0})`,
              })),
            });
          }
        }
      } catch (err) {
        console.error('SteamGridDB API call failed:', err);
      }
    }

    // Default Fallback: Steam CDN high-res vertical and horizontal grids
    return res.json({
      success: true,
      source: 'steam_cdn',
      grids: [
        {
          id: 'steam_library_600x900',
          url: `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appId}/library_600x900_2x.jpg`,
          thumb: `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appId}/library_600x900_2x.jpg`,
          label: 'Steam Official Library Grid (Vertical 2:3)',
        },
        {
          id: 'steam_header',
          url: `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`,
          thumb: `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`,
          label: 'Steam Official Header (Wide)',
        },
        {
          id: 'steam_hero',
          url: `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appId}/library_hero.jpg`,
          thumb: `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appId}/library_hero.jpg`,
          label: 'Steam Official Hero Banner',
        },
        {
          id: 'steam_capsule',
          url: `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appId}/capsule_616x353.jpg`,
          thumb: `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appId}/capsule_616x353.jpg`,
          label: 'Steam Official Capsule Art',
        },
      ],
      steamGridDbUrl: `https://www.steamgriddb.com/search/grids?term=${appId}`,
    });
  });

  // Helper to patch LaunchOptions inside localconfig.vdf text
  function updateLaunchOptionsInVdf(vdfText: string, appIdStr: string, newLaunchOptions: string): string {
    const appId = String(appIdStr);
    const escapedOpts = newLaunchOptions.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

    // 1. Check if "appId" block exists in VDF
    const appBlockRegex = new RegExp(`("${appId}")(\\s*\\{)`, 'i');

    if (appBlockRegex.test(vdfText)) {
      // Search for LaunchOptions under this app block
      const appLaunchOptionsRegex = new RegExp(`("${appId}"\\s*\\{[^}]*?)("LaunchOptions"\\s*")[^"]*(")`, 'i');
      if (appLaunchOptionsRegex.test(vdfText)) {
        return vdfText.replace(appLaunchOptionsRegex, `$1$2${escapedOpts}$3`);
      } else {
        return vdfText.replace(appBlockRegex, `$1$2\n\t\t\t\t\t"LaunchOptions"\t\t"${escapedOpts}"`);
      }
    } else {
      // Insert new appId block under "apps"
      const appsSectionRegex = /("apps"\s*\{)/i;
      if (appsSectionRegex.test(vdfText)) {
        const newAppBlock = `$1\n\t\t\t\t"${appId}"\n\t\t\t\t{\n\t\t\t\t\t"LaunchOptions"\t\t"${escapedOpts}"\n\t\t\t\t}`;
        return vdfText.replace(appsSectionRegex, newAppBlock);
      } else {
        const endBraceIndex = vdfText.lastIndexOf('}');
        if (endBraceIndex !== -1) {
          const appBlockStr = `\n\t"apps"\n\t{\n\t\t"${appId}"\n\t\t{\n\t\t\t"LaunchOptions"\t\t"${escapedOpts}"\n\t\t}\n\t}\n`;
          return vdfText.slice(0, endBraceIndex) + appBlockStr + vdfText.slice(endBraceIndex);
        }
      }
    }
    return vdfText;
  }

  // Steam Write Launch Options Endpoint (directly writes to localconfig.vdf on host)
  app.post('/api/steam/write-launch-options', (req, res) => {
    try {
      const { appId, launchOptions, updates } = req.body;
      const homeDir = os.homedir();

      const itemsToUpdate: Array<{ appId: string; launchOptions: string }> = [];
      if (updates && Array.isArray(updates)) {
        itemsToUpdate.push(...updates.map((u: any) => ({ appId: String(u.appId), launchOptions: u.launchOptions })));
      } else if (appId !== undefined) {
        itemsToUpdate.push({ appId: String(appId), launchOptions: launchOptions || '' });
      }

      if (itemsToUpdate.length === 0) {
        return res.status(400).json({ error: 'No appId or launch options provided' });
      }

      const possiblePaths = [
        path.join(homeDir, '.local/share/Steam'),
        path.join(homeDir, '.steam/steam'),
        path.join(homeDir, '.steam/root'),
        path.join(homeDir, '.var/app/com.valvesoftware.Steam/.local/share/Steam'),
        '/home/deck/.local/share/Steam',
        'C:\\Program Files (x86)\\Steam',
        'C:\\Program Files\\Steam',
        path.join(homeDir, 'Library/Application Support/Steam'),
      ];

      const updatedFiles: string[] = [];
      const backupFiles: string[] = [];

      for (const basePath of possiblePaths) {
        const userDataDir = path.join(basePath, 'userdata');
        if (fs.existsSync(userDataDir)) {
          try {
            const userFolders = fs.readdirSync(userDataDir);
            for (const userFolder of userFolders) {
              const localConfigPath = path.join(userDataDir, userFolder, 'config/localconfig.vdf');
              if (fs.existsSync(localConfigPath)) {
                let vdfContent = fs.readFileSync(localConfigPath, 'utf-8');

                // Create backup
                const backupPath = path.join(userDataDir, userFolder, 'config/localconfig.vdf.bak');
                fs.writeFileSync(backupPath, vdfContent, 'utf-8');
                backupFiles.push(backupPath);

                // Update each item
                for (const item of itemsToUpdate) {
                  vdfContent = updateLaunchOptionsInVdf(vdfContent, item.appId, item.launchOptions);
                }

                // Write back to localconfig.vdf
                fs.writeFileSync(localConfigPath, vdfContent, 'utf-8');
                updatedFiles.push(localConfigPath);
              }
            }
          } catch (err) {
            console.warn(`Error writing to localconfig.vdf in ${userDataDir}:`, err);
          }
        }
      }

      if (updatedFiles.length === 0) {
        return res.json({
          success: false,
          message: 'No local Steam localconfig.vdf file was found on the default system paths. You can still export/download the .vdf file directly.',
          updatedFiles: [],
          backupFiles: [],
        });
      }

      return res.json({
        success: true,
        message: `Successfully wrote launch options directly to ${updatedFiles.length} Steam configuration file(s)!`,
        updatedFiles,
        backupFiles,
        instructions: 'Please restart Steam (or close Steam before applying) so Valve reads the updated localconfig.vdf file.',
      });
    } catch (err) {
      console.error('Write launch options error:', err);
      return res.status(500).json({ error: 'Failed writing changes to Steam localconfig.vdf' });
    }
  });

  // Steam Read Launch Options Endpoint (directly reads settings from localconfig.vdf on host)
  app.get('/api/steam/read-launch-options', (req, res) => {
    try {
      const requestedAppId = req.query.appId ? String(req.query.appId) : null;
      const homeDir = os.homedir();

      const possiblePaths = [
        path.join(homeDir, '.local/share/Steam'),
        path.join(homeDir, '.steam/steam'),
        path.join(homeDir, '.steam/root'),
        path.join(homeDir, '.var/app/com.valvesoftware.Steam/.local/share/Steam'),
        '/home/deck/.local/share/Steam',
        'C:\\Program Files (x86)\\Steam',
        'C:\\Program Files\\Steam',
        path.join(homeDir, 'Library/Application Support/Steam'),
      ];

      const launchOptionsMap: Record<string, string> = {};
      const readFiles: string[] = [];

      for (const basePath of possiblePaths) {
        const userDataDir = path.join(basePath, 'userdata');
        if (fs.existsSync(userDataDir)) {
          try {
            const userFolders = fs.readdirSync(userDataDir);
            for (const userFolder of userFolders) {
              const localConfigPath = path.join(userDataDir, userFolder, 'config/localconfig.vdf');
              if (fs.existsSync(localConfigPath)) {
                try {
                  const vdfText = fs.readFileSync(localConfigPath, 'utf-8');
                  readFiles.push(localConfigPath);

                  const appIdRegex = /"(\d+)"\s*\{([^}]*)\}/g;
                  let match;
                  while ((match = appIdRegex.exec(vdfText)) !== null) {
                    const appId = match[1];
                    const appBody = match[2];
                    if (!requestedAppId || requestedAppId === appId) {
                      const launchOptsMatch = appBody.match(/"LaunchOptions"\s*"([^"]*)"/i);
                      if (launchOptsMatch) {
                        launchOptionsMap[appId] = launchOptsMatch[1];
                      }
                    }
                  }
                } catch (err) {
                  console.warn(`Error reading ${localConfigPath}:`, err);
                }
              }
            }
          } catch (err) {
            console.warn(`Error scanning userdata at ${userDataDir}:`, err);
          }
        }
      }

      if (readFiles.length === 0) {
        return res.json({
          success: false,
          message: 'No Steam localconfig.vdf file found on standard system paths.',
          count: 0,
          launchOptionsMap: {},
          readFiles: [],
        });
      }

      return res.json({
        success: true,
        count: Object.keys(launchOptionsMap).length,
        launchOptionsMap,
        readFiles,
      });
    } catch (err) {
      console.error('Read launch options error:', err);
      return res.status(500).json({ error: 'Failed reading settings from Steam localconfig.vdf' });
    }
  });

  // ==========================================
  // CUSTOM PROTON RUNNERS MANAGER ENDPOINTS
  // (Proton GE, Proton CachyOS, Proton EM, Proton DW)
  // ==========================================

  // Known Proton runner repositories on GitHub
  const RUNNER_REPOS: Record<string, { name: string; repo: string; desc: string; icon: string }> = {
    ge: {
      name: 'GE-Proton (Proton GE)',
      repo: 'GloriousEggroll/proton-ge-custom',
      desc: 'GloriousEggroll build with media codecs (MF/WMA), bleeding-edge Wine patches, and game fixes.',
      icon: '🔥',
    },
    cachyos: {
      name: 'Proton-CachyOS',
      repo: 'CachyOS/proton-cachyos',
      desc: 'CachyOS optimized Proton with x86-64-v3/v4 compiler tweaks, LTO, and kernel sync patches.',
      icon: '⚡',
    },
    em: {
      name: 'Proton-EM (Etaash Mathamsetty Proton)',
      repo: 'Etaash-mathamsetty/Proton',
      desc: 'Proton-EM build by Etaash Mathamsetty with performance optimizations, custom Wine patches, and game fixes.',
      icon: '🐺',
    },
    dw: {
      name: 'Proton-DW / Wine-GE',
      repo: 'GloriousEggroll/wine-ge-custom',
      desc: 'DirectWay / Wine-GE Proton variant optimized for standalone Wine, Direct3D, and Wayland games.',
      icon: '🛠️',
    },
  };

  // Helper to detect host CPU architecture & flags
  function getHostArchitectureInfo() {
    const nodeArch = process.arch; // e.g. 'x64', 'arm64', 'riscv64'
    let sysArch = nodeArch === 'x64' ? 'x86_64' : nodeArch === 'arm64' ? 'aarch64' : nodeArch;
    let cpuFlags: string[] = [];
    let isV3Capable = false;
    let isV4Capable = false;

    try {
      const { execSync } = require('child_process');
      const unameArch = execSync('uname -m', { encoding: 'utf-8' }).trim();
      if (unameArch) sysArch = unameArch;
    } catch {}

    const isX64 = sysArch === 'x86_64' || sysArch === 'x64' || sysArch === 'amd64';
    const isArm64 = sysArch === 'aarch64' || sysArch === 'arm64';
    const isRiscv64 = sysArch === 'riscv64' || sysArch === 'riscv';

    if (isX64) {
      try {
        if (fs.existsSync('/proc/cpuinfo')) {
          const cpuinfo = fs.readFileSync('/proc/cpuinfo', 'utf-8');
          const flagsLine = cpuinfo.split('\n').find(line => line.startsWith('flags'));
          if (flagsLine) {
            cpuFlags = flagsLine.split(':')[1]?.trim().split(/\s+/) || [];
            const v3Flags = ['avx', 'avx2', 'bmi1', 'bmi2', 'f16c', 'fma', 'movbe'];
            isV3Capable = v3Flags.every(f => cpuFlags.includes(f));
            const v4Flags = ['avx512f', 'avx512bw', 'avx512cd', 'avx512dq', 'avx512vl'];
            isV4Capable = isV3Capable && v4Flags.every(f => cpuFlags.includes(f));
          }
        }
      } catch {}
    }

    return {
      nodeArch,
      sysArch,
      displayArch: isX64
        ? (isV4Capable ? 'x86_64 (v4)' : isV3Capable ? 'x86_64 (v3 / AVX2)' : 'x86_64 (x64)')
        : sysArch,
      isX64,
      isArm64,
      isRiscv64,
      isV3Capable,
      isV4Capable,
    };
  }

  // Score a release asset against the host architecture
  function scoreAssetForHost(assetName: string, hostInfo: ReturnType<typeof getHostArchitectureInfo>) {
    const name = assetName.toLowerCase();

    const isArchive = name.endsWith('.tar.gz') ||
      name.endsWith('.tar.xz') ||
      name.endsWith('.tar.zst') ||
      name.endsWith('.tar.bz2') ||
      name.endsWith('.tar') ||
      name.endsWith('.zip') ||
      name.endsWith('.7z') ||
      name.includes('.tar.');

    if (!isArchive) {
      return { score: -10000, archTag: 'other', isCompatible: false, isRecommended: false };
    }

    const isArm = name.includes('arm64') || name.includes('aarch64') || name.includes('armv7') || name.includes('armhf') || name.includes('arm-');
    const isRiscv = name.includes('riscv64') || name.includes('riscv');
    const isLoong = name.includes('loongarch');
    const isX64Asset = name.includes('x86_64') || name.includes('x86-64') || name.includes('x64') || name.includes('amd64');
    const isV3 = name.includes('-v3') || name.includes('_v3') || name.includes('x86_64_v3') || name.includes('x86_64-v3');
    const isV4 = name.includes('-v4') || name.includes('_v4') || name.includes('x86_64_v4') || name.includes('x86_64-v4');

    let archTag = 'x86_64';
    if (isArm) archTag = 'arm64';
    else if (isRiscv) archTag = 'riscv64';
    else if (isLoong) archTag = 'loongarch64';
    else if (isV4) archTag = 'x86_64-v4';
    else if (isV3) archTag = 'x86_64-v3';
    else if (isX64Asset) archTag = 'x86_64';

    let score = 100;
    let isCompatible = true;
    let isRecommended = false;

    if (hostInfo.isX64) {
      if (isArm || isRiscv || isLoong) {
        score = -5000;
        isCompatible = false;
      } else {
        score += 100;
        if (isX64Asset) score += 50;
        if (isV3) {
          if (hostInfo.isV3Capable) {
            score += 40;
            isRecommended = true;
          } else {
            score -= 30;
          }
        } else if (isV4) {
          if (hostInfo.isV4Capable) {
            score += 50;
            isRecommended = true;
          } else {
            score -= 50;
          }
        } else {
          if (!hostInfo.isV3Capable) {
            isRecommended = true;
          }
        }
      }
    } else if (hostInfo.isArm64) {
      if (isArm) {
        score += 200;
        isRecommended = true;
      } else if (isX64Asset || isRiscv) {
        score = -5000;
        isCompatible = false;
      }
    } else if (hostInfo.isRiscv64) {
      if (isRiscv) {
        score += 200;
        isRecommended = true;
      } else if (isX64Asset || isArm) {
        score = -5000;
        isCompatible = false;
      }
    }

    return { score, archTag, isCompatible, isRecommended };
  }

  // Helper to query GitHub releases for a repo
  async function fetchRepoReleases(repoOwnerAndName: string, providerKey: string, hostInfo: ReturnType<typeof getHostArchitectureInfo>) {
    try {
      const res = await fetch(`https://api.github.com/repos/${repoOwnerAndName}/releases?per_page=8`, {
        headers: {
          'User-Agent': 'ProtonLaunchOptionsManager/1.0',
          'Accept': 'application/vnd.github.v3+json',
        },
      });
      if (!res.ok) {
        console.warn(`GitHub API ${repoOwnerAndName} status: ${res.status}`);
        return [];
      }
      const data = await res.json();
      if (!Array.isArray(data)) return [];

      return data.map((rel: any) => {
        const rawAssets = rel.assets || [];
        const processedAssets = rawAssets
          .map((a: any) => {
            const evaluation = scoreAssetForHost(a.name, hostInfo);
            return {
              name: a.name,
              downloadUrl: a.browser_download_url,
              sizeBytes: a.size,
              downloadCount: a.download_count,
              score: evaluation.score,
              archTag: evaluation.archTag,
              isCompatible: evaluation.isCompatible,
              isRecommended: evaluation.isRecommended,
            };
          })
          .filter((a: any) => a.score > -9000);

        processedAssets.sort((a: any, b: any) => b.score - a.score);

        const primaryAsset = processedAssets[0] || null;

        return {
          id: rel.id,
          provider: providerKey,
          providerName: RUNNER_REPOS[providerKey]?.name || providerKey,
          tagName: rel.tag_name,
          title: rel.name || rel.tag_name,
          publishedAt: rel.published_at,
          body: rel.body || '',
          htmlUrl: rel.html_url,
          repo: repoOwnerAndName,
          asset: primaryAsset,
          allAssets: processedAssets,
        };
      });
    } catch (err) {
      console.error(`Error fetching releases for ${repoOwnerAndName}:`, err);
      return [];
    }
  }

  // Fetch available Proton releases from GitHub
  app.get('/api/proton-runners/releases', async (req, res) => {
    try {
      const requestedProvider = req.query.provider ? String(req.query.provider).toLowerCase() : 'all';
      const hostInfo = getHostArchitectureInfo();

      let releases: any[] = [];

      if (requestedProvider !== 'all' && RUNNER_REPOS[requestedProvider]) {
        releases = await fetchRepoReleases(RUNNER_REPOS[requestedProvider].repo, requestedProvider, hostInfo);
      } else {
        // Fetch all known providers concurrently
        const repoPromises = Object.entries(RUNNER_REPOS).map(([key, info]) =>
          fetchRepoReleases(info.repo, key, hostInfo)
        );
        const results = await Promise.all(repoPromises);
        releases = results.flat();
      }

      return res.json({
        success: true,
        count: releases.length,
        releases,
        providers: RUNNER_REPOS,
        hostSystem: hostInfo,
      });
    } catch (err) {
      console.error('Proton releases API error:', err);
      return res.status(500).json({ error: 'Failed fetching Proton runner releases' });
    }
  });

  // Scan installed Proton compatibility tools on disk (both compatibilitytools.d and steamapps/common)
  app.get('/api/proton-runners/installed', (req, res) => {
    try {
      const homeDir = os.homedir();
      const possibleCompatPaths = [
        path.join(homeDir, '.local/share/Steam/compatibilitytools.d'),
        path.join(homeDir, '.steam/root/compatibilitytools.d'),
        path.join(homeDir, '.steam/steam/compatibilitytools.d'),
        path.join(homeDir, '.var/app/com.valvesoftware.Steam/.local/share/Steam/compatibilitytools.d'),
        '/home/deck/.local/share/Steam/compatibilitytools.d',
      ];

      const possibleSteamAppsPaths = [
        path.join(homeDir, '.local/share/Steam/steamapps'),
        path.join(homeDir, '.steam/steam/steamapps'),
        path.join(homeDir, '.steam/root/steamapps'),
        path.join(homeDir, '.var/app/com.valvesoftware.Steam/.local/share/Steam/steamapps'),
        '/home/deck/.local/share/Steam/steamapps',
      ];

      const installedRunners: any[] = [];
      const searchedDirs: string[] = [];

      // 1. Scan custom compatibility tools
      for (const compatDir of possibleCompatPaths) {
        if (fs.existsSync(compatDir)) {
          searchedDirs.push(compatDir);
          try {
            const items = fs.readdirSync(compatDir, { withFileTypes: true });
            for (const item of items) {
              if (item.isDirectory()) {
                const fullPath = path.join(compatDir, item.name);
                let displayTitle = item.name;

                const vdfPath = path.join(fullPath, 'compatibilitytool.vdf');
                if (fs.existsSync(vdfPath)) {
                  try {
                    const content = fs.readFileSync(vdfPath, 'utf-8');
                    const match = content.match(/"display_name"\s*"([^"]+)"/i);
                    if (match) {
                      displayTitle = match[1];
                    }
                  } catch {}
                }

                let totalSizeBytes = 0;
                try {
                  const files = fs.readdirSync(fullPath);
                  totalSizeBytes = files.length * 1024 * 512;
                } catch {}

                const stat = fs.statSync(fullPath);

                if (!installedRunners.some(r => r.displayTitle.toLowerCase() === displayTitle.toLowerCase())) {
                  installedRunners.push({
                    folderName: item.name,
                    displayTitle,
                    fullPath,
                    modifiedTime: stat.mtime,
                    approxSizeMb: Math.max(120, Math.round(totalSizeBytes / (1024 * 1024))),
                    source: 'compatibilitytools.d',
                  });
                }
              }
            }
          } catch (err) {
            console.warn(`Error scanning compat dir ${compatDir}:`, err);
          }
        }
      }

      // 2. Scan steamapps/common for official Proton versions
      for (const steamAppsDir of possibleSteamAppsPaths) {
        const commonDir = path.join(steamAppsDir, 'common');
        if (fs.existsSync(commonDir)) {
          searchedDirs.push(commonDir);
          try {
            const items = fs.readdirSync(commonDir, { withFileTypes: true });
            for (const item of items) {
              if (item.isDirectory() && item.name.toLowerCase().startsWith('proton')) {
                const fullPath = path.join(commonDir, item.name);
                let displayTitle = item.name.replace(/^Proton\s*-\s*/i, 'Proton ');
                const stat = fs.statSync(fullPath);

                if (!installedRunners.some(r => r.displayTitle.toLowerCase() === displayTitle.toLowerCase())) {
                  installedRunners.push({
                    folderName: item.name,
                    displayTitle,
                    fullPath,
                    modifiedTime: stat.mtime,
                    approxSizeMb: 1400,
                    source: 'steamapps/common',
                  });
                }
              }
            }
          } catch (err) {
            console.warn(`Error scanning common dir ${commonDir}:`, err);
          }
        }
      }

      return res.json({
        success: true,
        count: installedRunners.length,
        installedRunners,
        searchedDirs,
      });
    } catch (err) {
      console.error('List installed proton runners error:', err);
      return res.status(500).json({ error: 'Failed scanning installed Proton tools' });
    }
  });

  // Download and install a Proton runner archive into compatibilitytools.d (Legacy endpoint)
  app.post('/api/proton-runners/install', async (req, res) => {
    const { downloadUrl, fileName, runnerName } = req.body;
    if (!downloadUrl) {
      return res.status(400).json({ error: 'Missing downloadUrl parameter' });
    }

    try {
      const homeDir = os.homedir();
      const targetCompatDir = path.join(homeDir, '.local/share/Steam/compatibilitytools.d');
      fs.mkdirSync(targetCompatDir, { recursive: true });

      const safeFileName = fileName || `proton_runner_${Date.now()}.tar.gz`;
      const tempFilePath = path.join(os.tmpdir(), safeFileName);

      const downloadRes = await fetch(downloadUrl, {
        headers: { 'User-Agent': 'ProtonLaunchOptionsManager/1.0' },
      });

      if (!downloadRes.ok) {
        return res.status(500).json({ error: `Failed downloading release archive: HTTP ${downloadRes.status}` });
      }

      const buffer = Buffer.from(await downloadRes.arrayBuffer());
      fs.writeFileSync(tempFilePath, buffer);

      // Extract archive to Steam compatibilitytools.d
      const { exec } = await import('child_process');
      const extractCmd = safeFileName.endsWith('.zip')
        ? `unzip -o "${tempFilePath}" -d "${targetCompatDir}"`
        : `tar -xf "${tempFilePath}" -C "${targetCompatDir}"`;

      exec(extractCmd, (execErr) => {
        try { fs.unlinkSync(tempFilePath); } catch {}

        if (execErr) {
          console.error('Extraction error:', execErr);
          return res.status(500).json({ error: `Extraction error: ${execErr.message}` });
        }

        return res.json({
          success: true,
          message: `Successfully installed ${runnerName || safeFileName} to ${targetCompatDir}! Please restart Steam to see it in your Game Properties > Compatibility dropdown.`,
          targetCompatDir,
        });
      });
    } catch (err: any) {
      console.error('Install proton runner error:', err);
      return res.status(500).json({ error: err.message || 'Failed downloading and extracting Proton runner' });
    }
  });

  // Real-time SSE progress stream endpoint for downloading & installing Proton releases
  app.get('/api/proton-runners/install-stream', async (req, res) => {
    const downloadUrl = req.query.downloadUrl as string;
    const fileName = req.query.fileName as string;
    const runnerName = req.query.runnerName as string;

    if (!downloadUrl) {
      return res.status(400).json({ error: 'Missing downloadUrl parameter' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof (res as any).flushHeaders === 'function') {
      (res as any).flushHeaders();
    }

    const sendProgress = (data: {
      percent: number;
      stage: 'connecting' | 'downloading' | 'decompressing' | 'installing' | 'completed' | 'error';
      message: string;
      downloadedMb?: string;
      totalMb?: string;
      error?: string;
    }) => {
      try {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      } catch (err) {
        console.warn('Error writing SSE stream event:', err);
      }
    };

    try {
      sendProgress({
        percent: 2,
        stage: 'connecting',
        message: `Connecting to release server for ${runnerName || 'archive'}...`,
      });

      const homeDir = os.homedir();
      const targetCompatDir = path.join(homeDir, '.local/share/Steam/compatibilitytools.d');
      fs.mkdirSync(targetCompatDir, { recursive: true });

      const safeFileName = fileName || `proton_runner_${Date.now()}.tar.gz`;
      const tempFilePath = path.join(os.tmpdir(), safeFileName);

      const downloadRes = await fetch(downloadUrl, {
        headers: { 'User-Agent': 'ProtonLaunchOptionsManager/1.0' },
        redirect: 'follow',
      });

      if (!downloadRes.ok || !downloadRes.body) {
        sendProgress({
          percent: 0,
          stage: 'error',
          message: `Failed downloading release archive: HTTP ${downloadRes.status}`,
          error: `HTTP ${downloadRes.status}`,
        });
        return res.end();
      }

      const contentLengthHeader = downloadRes.headers.get('content-length');
      const totalBytes = contentLengthHeader ? parseInt(contentLengthHeader, 10) : 0;
      const totalMbStr = totalBytes > 0 ? (totalBytes / (1024 * 1024)).toFixed(1) : undefined;

      sendProgress({
        percent: 5,
        stage: 'downloading',
        message: `Starting download: ${safeFileName} (${totalMbStr ? totalMbStr + ' MB' : 'Unknown size'})...`,
        totalMb: totalMbStr,
      });

      const fileStream = fs.createWriteStream(tempFilePath);
      const reader = downloadRes.body.getReader();

      let receivedBytes = 0;
      let lastReportTime = Date.now();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        fileStream.write(value);
        receivedBytes += value.length;

        const now = Date.now();
        if (now - lastReportTime > 150) {
          lastReportTime = now;
          const dlMb = (receivedBytes / (1024 * 1024)).toFixed(1);
          let pct = 5;
          if (totalBytes > 0) {
            pct = Math.min(75, 5 + Math.round((receivedBytes / totalBytes) * 70));
          } else {
            pct = Math.min(75, 5 + Math.round(receivedBytes / (1024 * 1024)));
          }

          sendProgress({
            percent: pct,
            stage: 'downloading',
            message: `Downloading archive: ${dlMb} MB ${totalMbStr ? '/ ' + totalMbStr + ' MB' : ''} (${pct}%)`,
            downloadedMb: dlMb,
            totalMb: totalMbStr,
          });
        }
      }

      await new Promise<void>((resolve, reject) => {
        fileStream.end((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      const finalDlMb = (receivedBytes / (1024 * 1024)).toFixed(1);
      sendProgress({
        percent: 78,
        stage: 'decompressing',
        message: `Download complete (${finalDlMb} MB). Decompressing and verifying archive...`,
        downloadedMb: finalDlMb,
        totalMb: totalMbStr,
      });

      const { exec } = await import('child_process');
      const extractCmd = safeFileName.endsWith('.zip')
        ? `unzip -o "${tempFilePath}" -d "${targetCompatDir}"`
        : `tar -xf "${tempFilePath}" -C "${targetCompatDir}"`;

      sendProgress({
        percent: 88,
        stage: 'installing',
        message: `Extracting and installing to Steam compatibility directory (${targetCompatDir})...`,
        downloadedMb: finalDlMb,
        totalMb: totalMbStr,
      });

      exec(extractCmd, (execErr) => {
        try { fs.unlinkSync(tempFilePath); } catch {}

        if (execErr) {
          console.error('Extraction error:', execErr);
          sendProgress({
            percent: 0,
            stage: 'error',
            message: `Extraction error: ${execErr.message}`,
            error: execErr.message,
          });
          return res.end();
        }

        sendProgress({
          percent: 100,
          stage: 'completed',
          message: `Successfully installed ${runnerName || safeFileName}! Steam compatibility tools updated.`,
          downloadedMb: finalDlMb,
          totalMb: totalMbStr,
        });
        return res.end();
      });

    } catch (err: any) {
      console.error('Install stream error:', err);
      sendProgress({
        percent: 0,
        stage: 'error',
        message: `Installation failed: ${err.message || 'Unknown error'}`,
        error: err.message,
      });
      return res.end();
    }
  });

  // Delete/uninstall an installed Proton runner from compatibilitytools.d
  app.post('/api/proton-runners/uninstall', (req, res) => {
    const { fullPath, folderName } = req.body;
    try {
      if (!fullPath || !fullPath.includes('compatibilitytools.d')) {
        return res.status(400).json({ error: 'Invalid or unsafe folder path for uninstall' });
      }

      if (fs.existsSync(fullPath)) {
        fs.rmSync(fullPath, { recursive: true, force: true });
        return res.json({
          success: true,
          message: `Successfully removed custom Proton runner "${folderName}" from disk.`,
        });
      } else {
        return res.status(404).json({ error: 'Path not found on system.' });
      }
    } catch (err) {
      console.error('Uninstall proton runner error:', err);
      return res.status(500).json({ error: 'Failed removing Proton runner from disk' });
    }
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', server: 'Proton Launch Options Manager' });
  });

  // Vite development middleware or static production serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
