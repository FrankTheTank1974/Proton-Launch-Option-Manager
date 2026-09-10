import { CSourceFile, SteamGame } from '../types';
import { INITIAL_STEAM_GAMES } from './steamGamesData';
import { PROTON_FLAGS } from './protonFlagsData';

function isWrapperFlag(f: any): boolean {
  return f.isWrapper === true || f.id === 'gamescope_wrapper' || f.id === 'obs_gamecapture' || f.id === 'steamtinkerlaunch_wrapper';
}

function getWrapperOrder(f: any): number {
  if (f.wrapperOrder) return f.wrapperOrder;
  if (f.id === 'mangohud' || f.id === 'obs_gamecapture') return 1;
  if (f.id === 'gamemoderun' || f.id === 'game_performance') return 2;
  if (f.id === 'gamescope_wrapper') return 3;
  if (f.id === 'steamtinkerlaunch_wrapper' || f.key === 'steamtinkerlaunch') return 4;
  return 1;
}

function generateCFlagsArray(currentCommand: string = ''): string {
  const tokens = currentCommand ? currentCommand.trim().split(/\s+/) : [];

  return PROTON_FLAGS.map(f => {
    const isWrapper = isWrapperFlag(f);
    const wrapperOrder = isWrapper ? getWrapperOrder(f) : 0;

    let envVar = '';
    let isEnabled = false;

    if (isWrapper) {
      if (f.id === 'gamescope_wrapper') envVar = 'gamescope -w 1920 -h 1080 -r 144 -f --';
      else if (f.id === 'gamemoderun') envVar = 'gamemoderun';
      else if (f.id === 'mangohud') envVar = 'mangohud';
      else if (f.id === 'obs_gamecapture') envVar = 'obs-gamecapture';
      else if (f.id === 'game_performance') envVar = 'game-performance';
      else if (f.id === 'steamtinkerlaunch_wrapper' || f.key === 'steamtinkerlaunch') {
        const stlMatch = currentCommand ? currentCommand.match(/steamtinkerlaunch\s+([a-z0-9_-]+)/i) : null;
        if (stlMatch && !['%command%', 'mangohud', 'gamemoderun', 'gamescope'].includes(stlMatch[1])) {
          envVar = `steamtinkerlaunch ${stlMatch[1]}`;
        } else {
          envVar = 'steamtinkerlaunch';
        }
      }
      else envVar = f.key;

      if (tokens.length > 0) {
        if (f.id === 'gamescope_wrapper') {
          isEnabled = tokens.includes('gamescope');
        } else if (f.id === 'steamtinkerlaunch_wrapper') {
          isEnabled = tokens.includes('steamtinkerlaunch');
        } else {
          isEnabled = tokens.includes(f.key);
        }
      }
    } else if (f.type === 'toggle') {
      envVar = `${f.key}=1`;
      if (tokens.length > 0) {
        isEnabled = tokens.some(t => t === `${f.key}=1` || t.startsWith(`${f.key}=`));
      }
    } else {
      const regex = new RegExp(`(?:^|\\s)(${f.key}=(?:"[^"]*"|'[^']*'|\\S+))`);
      const match = currentCommand ? currentCommand.match(regex) : null;
      if (match) {
        envVar = match[1];
        isEnabled = true;
      } else {
        const fallback = (f.example || '').replace(' %command%', '').trim();
        envVar = fallback || `${f.key}=1`;
      }
    }

    const cleanName = f.name.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const cleanEnvVar = envVar.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return `    { "${cleanName}", "${cleanEnvVar}", ${isWrapper}, ${wrapperOrder}, ${isEnabled ? 'true' : 'false'} }`;
  }).join(',\n');
}

export function getCCodeTemplates(selectedGameName: string, selectedAppId: number, currentCommand: string, gamesList: SteamGame[] = []): CSourceFile[] {
  const gamesToUse = gamesList.length > 0 ? [...gamesList] : [...INITIAL_STEAM_GAMES];
  
  if (!gamesToUse.some(g => g.appId === selectedAppId)) {
    gamesToUse.unshift({
      id: `app_${selectedAppId}`,
      appId: selectedAppId,
      name: selectedGameName,
      bannerUrl: '',
      iconUrl: '',
      protonVersion: 'Proton Experimental',
      currentLaunchOptions: currentCommand,
      lastUpdated: '',
      isFavorite: false,
      developer: '',
    });
  }

  const escapedSelectedGameName = selectedGameName.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const initialGameArray = gamesToUse.map(g => `    { "${g.name.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}", ${g.appId}, 0 }`).join(',\n');
  const cFlagsArray = generateCFlagsArray(currentCommand);

  return [
    {
      filename: 'cli_main.c',
      language: 'c',
      description: 'Zero-dependency standalone C99 CLI & TUI utility with full feature set (100% offline)',
      content: `/*
 * Proton Launch Options Manager - Pure C99 CLI & TUI
 * 100% Offline, Zero-Dependency (libc only)
 * 
 * Features:
 *   1. Integrated Flag Conflict & Incompatibility Detector
 *   2. Game Preset Profiles (Deck Optimal, Esports, RT/DLSS, Retro, etc.)
 *   3. Steam Library Auto-Discovery (libraryfolders.vdf & appmanifest_*.acf)
 *   4. Safe VDF Backup & Rollback Manager
 *   5. Terminal Interactive UI (TUI with ANSI colors, no ncurses required)
 *   6. Direct Steam URI Game Launcher
 */

#ifndef _GNU_SOURCE
#define _GNU_SOURCE
#endif
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>
#include <unistd.h>
#include <getopt.h>

#include "vdf_parser.h"
#include "conflicts.h"
#include "presets.h"
#include "scanner.h"
#include "backup.h"
#include "launcher.h"
#include "tui.h"
#include "runtime_test.h"

#define MAX_CMD_LEN 2048

static ProtonFlag g_flags[] = {
${cFlagsArray}
};

static const int NUM_FLAGS = sizeof(g_flags) / sizeof(g_flags[0]);

static char g_custom_args[512] = "";
static int g_target_appid = ${selectedAppId};
static char g_target_gamename[128] = "${escapedSelectedGameName}";

void build_launch_command(char *out_buf, size_t max_len) {
    char env_vars[1024] = "";
    char wrappers[512] = "";

    // 1. Environment variables
    for (int i = 0; i < NUM_FLAGS; i++) {
        if (!g_flags[i].is_wrapper && g_flags[i].enabled) {
            if (strlen(env_vars) > 0) strcat(env_vars, " ");
            strcat(env_vars, g_flags[i].env_var);
        }
    }

    // 2. Performance & display wrappers
    for (int order = 1; order <= 4; order++) {
        for (int i = 0; i < NUM_FLAGS; i++) {
            if (g_flags[i].is_wrapper && g_flags[i].wrapper_order == order && g_flags[i].enabled) {
                if (strlen(wrappers) > 0) strcat(wrappers, " ");
                strcat(wrappers, g_flags[i].env_var);
            }
        }
    }

    // 3. Assemble command format: [ENV] [WRAPPERS] %command% [ARGS]
    snprintf(out_buf, max_len, "%s%s%s%s%%command%%%s%s",
             strlen(env_vars) > 0 ? env_vars : "",
             strlen(env_vars) > 0 ? " " : "",
             strlen(wrappers) > 0 ? wrappers : "",
             strlen(wrappers) > 0 ? " " : "",
             strlen(g_custom_args) > 0 ? " " : "",
             g_custom_args);
}

static void print_usage(const char *progname) {
    printf("Proton Launch Options Manager (Pure C99 CLI & TUI)\\n");
    printf("Usage: %s [OPTIONS]\\n\\n", progname);
    printf("Modes & Actions:\\n");
    printf("  -i, --interactive       Start Interactive ANSI Terminal UI (TUI)\\n");
    printf("  -p, --preset <name>     Apply built-in preset (deck, esports, rt, cachyos, retro, scaling, battery, stl)\\n");
    printf("      --list-presets      Display all available performance presets\\n");
    printf("      --list-flags        Display all %d available Proton flags and wrappers\\n", NUM_FLAGS);
    printf("      --enable <name>     Enable a specific flag or wrapper by key/name\\n");
    printf("      --disable <name>    Disable a specific flag or wrapper by key/name\\n");
    printf("  -l, --list-games        Auto-scan and list installed Steam games\\n");
    printf("  -g, --game <appid|name> Set target Steam game by AppID or partial name\\n");
    printf("      --list-proton       Discover and list installed Proton versions & runners\\n");
    printf("      --get-proton        Show currently configured Proton runner for target game\\n");
    printf("      --set-proton <name> Switch Proton runner for target game in Steam config.vdf\\n");
    printf("      --stl               Enable Steam Tinker Launch wrapper\\n");
    printf("      --stl-mode <mode>   Set STL launch mode (menu, game, winecfg, vortex, mo2, etc.)\\n");
    printf("      --stl-menu          Force Steam Tinker Launch GUI menu (STL_MENU=1)\\n");
    printf("      --stl-skip          Bypass Steam Tinker Launch wait dialog (STL_SKIP=1)\\n");
    printf("      --list-stl-modes    Display all 11 supported Steam Tinker Launch modes\\n");
    printf("      --stl-check         Verify if steamtinkerlaunch binary is installed\\n");
    printf("  -c, --check-conflicts   Detect incompatible flag combinations\\n");
    printf("      --auto-fix          Automatically resolve active flag conflicts\\n");
    printf("  -t, --test-runtime      Simulate and inspect resolved Steam process pipeline\\n");
    printf("      --test-exec         Perform dry-run syntax verification of evaluated command\\n");
    printf("  -w, --write-vdf         Safely write launch options to localconfig.vdf (with backup)\\n");
    printf("  -x, --launch            Launch target game via Steam URI protocol\\n");
    printf("      --backup            Create an immediate timestamped backup of localconfig.vdf\\n");
    printf("      --list-backups      List available VDF backups\\n");
    printf("      --restore <file>    Restore a specific backup or 'latest'\\n");
    printf("  -h, --help              Show this help message\\n\\n");
    printf("Examples:\\n");
    printf("  %s -i                               # Interactive TUI mode\\n", progname);
    printf("  %s --list-proton                    # View all installed Proton runners on system\\n", progname);
    printf("  %s -g 1091500 --set-proton GE-Proton9-25 # Switch Cyberpunk to GE-Proton9-25\\n", progname);
    printf("  %s -g 1091500 --stl --stl-mode mo2  # Wrap Cyberpunk with STL launching Mod Organizer 2\\n", progname);
    printf("  %s -g 1091500 -p stl -w -x          # Apply STL Modding preset & launch\\n", progname);
    printf("  %s --list-flags                     # View all runner flags and syntax\\n", progname);
}

int main(int argc, char *argv[]) {
    if (argc <= 1) {
        // Default to interactive TUI when run without arguments
        return run_interactive_tui(g_flags, NUM_FLAGS, g_target_appid, g_target_gamename);
    }

    static struct option long_options[] = {
        {"interactive",      no_argument,       0, 'i'},
        {"preset",           required_argument, 0, 'p'},
        {"list-presets",     no_argument,       0, 1001},
        {"list-flags",       no_argument,       0, 1006},
        {"enable",           required_argument, 0, 1007},
        {"disable",          required_argument, 0, 1008},
        {"list-games",       no_argument,       0, 'l'},
        {"game",             required_argument, 0, 'g'},
        {"list-proton",      no_argument,       0, 1010},
        {"get-proton",       no_argument,       0, 1011},
        {"set-proton",       required_argument, 0, 1012},
        {"stl",              no_argument,       0, 1013},
        {"stl-mode",         required_argument, 0, 1014},
        {"stl-menu",         no_argument,       0, 1015},
        {"stl-skip",         no_argument,       0, 1016},
        {"list-stl-modes",   no_argument,       0, 1017},
        {"stl-check",        no_argument,       0, 1018},
        {"check-conflicts",  no_argument,       0, 'c'},
        {"auto-fix",         no_argument,       0, 1002},
        {"test-runtime",     no_argument,       0, 't'},
        {"test-exec",        no_argument,       0, 1019},
        {"write-vdf",        no_argument,       0, 'w'},
        {"launch",           no_argument,       0, 'x'},
        {"backup",           no_argument,       0, 1003},
        {"list-backups",     no_argument,       0, 1004},
        {"restore",          required_argument, 0, 1005},
        {"help",             no_argument,       0, 'h'},
        {0, 0, 0, 0}
    };

    bool opt_interactive = false;
    bool opt_list_presets = false;
    bool opt_list_flags = false;
    bool opt_list_games = false;
    bool opt_list_proton = false;
    bool opt_get_proton = false;
    bool opt_list_stl_modes = false;
    bool opt_stl_check = false;
    bool opt_check_conflicts = false;
    bool opt_auto_fix = false;
    bool opt_test_runtime = false;
    bool opt_test_exec = false;
    bool opt_write_vdf = false;
    bool opt_launch = false;
    bool opt_backup = false;
    bool opt_list_backups = false;
    char opt_preset_name[64] = "";
    char opt_restore_target[256] = "";
    char opt_set_proton_target[128] = "";
    char opt_stl_mode_arg[64] = "";

    int opt;
    int opt_idx = 0;
    while ((opt = getopt_long(argc, argv, "ip:lg:cwtxt h", long_options, &opt_idx)) != -1) {
        switch (opt) {
            case 'i': opt_interactive = true; break;
            case 'p': snprintf(opt_preset_name, sizeof(opt_preset_name), "%s", optarg); break;
            case 1001: opt_list_presets = true; break;
            case 1006: opt_list_flags = true; break;
            case 1007: {
                int enabled_count = 0;
                for (int i = 0; i < NUM_FLAGS; i++) {
                    if (strcasestr(g_flags[i].name, optarg) || strcasestr(g_flags[i].env_var, optarg)) {
                        g_flags[i].enabled = true;
                        printf("✅ Enabled flag: %s (%s)\\n", g_flags[i].name, g_flags[i].env_var);
                        enabled_count++;
                    }
                }
                if (enabled_count == 0) {
                    fprintf(stderr, "⚠️ No flags matched query '%s'\\n", optarg);
                }
                break;
            }
            case 1008: {
                int disabled_count = 0;
                for (int i = 0; i < NUM_FLAGS; i++) {
                    if (strcasestr(g_flags[i].name, optarg) || strcasestr(g_flags[i].env_var, optarg)) {
                        g_flags[i].enabled = false;
                        printf("❌ Disabled flag: %s (%s)\\n", g_flags[i].name, g_flags[i].env_var);
                        disabled_count++;
                    }
                }
                if (disabled_count == 0) {
                    fprintf(stderr, "⚠️ No flags matched query '%s'\\n", optarg);
                }
                break;
            }
            case 'l': opt_list_games = true; break;
            case 'g': {
                int id = atoi(optarg);
                if (id > 0) {
                    g_target_appid = id;
                    snprintf(g_target_gamename, sizeof(g_target_gamename), "Steam App %d", id);
                } else {
                    SteamGameInfo found;
                    if (find_game_by_name(optarg, &found)) {
                        g_target_appid = found.app_id;
                        snprintf(g_target_gamename, sizeof(g_target_gamename), "%s", found.name);
                        printf("🎯 Target Game matched: %s (AppID: %d)\\n", g_target_gamename, g_target_appid);
                    }
                }
                break;
            }
            case 1010: opt_list_proton = true; break;
            case 1011: opt_get_proton = true; break;
            case 1012: snprintf(opt_set_proton_target, sizeof(opt_set_proton_target), "%s", optarg); break;
            case 1013: {
                for (int i = 0; i < NUM_FLAGS; i++) {
                    if (strstr(g_flags[i].env_var, "steamtinkerlaunch") || strstr(g_flags[i].name, "steamtinkerlaunch")) {
                        g_flags[i].enabled = true;
                        printf("✅ Enabled Steam Tinker Launch wrapper: %s\\n", g_flags[i].env_var);
                        break;
                    }
                }
                break;
            }
            case 1014: snprintf(opt_stl_mode_arg, sizeof(opt_stl_mode_arg), "%s", optarg); break;
            case 1015: {
                for (int i = 0; i < NUM_FLAGS; i++) {
                    if (strstr(g_flags[i].env_var, "STL_MENU") || strstr(g_flags[i].name, "Settings Menu")) {
                        g_flags[i].enabled = true;
                        printf("✅ Enabled STL_MENU=1 (forces GUI configuration menu)\\n");
                        break;
                    }
                }
                break;
            }
            case 1016: {
                for (int i = 0; i < NUM_FLAGS; i++) {
                    if (strstr(g_flags[i].env_var, "STL_SKIP") || strstr(g_flags[i].name, "Skip Wait Dialog")) {
                        g_flags[i].enabled = true;
                        printf("✅ Enabled STL_SKIP=1 (bypasses wait prompt)\\n");
                        break;
                    }
                }
                break;
            }
            case 1017: opt_list_stl_modes = true; break;
            case 1018: opt_stl_check = true; break;
            case 'c': opt_check_conflicts = true; break;
            case 1002: opt_auto_fix = true; break;
            case 't': opt_test_runtime = true; break;
            case 1019: opt_test_exec = true; break;
            case 'w': opt_write_vdf = true; break;
            case 'x': opt_launch = true; break;
            case 1003: opt_backup = true; break;
            case 1004: opt_list_backups = true; break;
            case 1005: snprintf(opt_restore_target, sizeof(opt_restore_target), "%s", optarg); break;
            case 'h': print_usage(argv[0]); return 0;
            default: print_usage(argv[0]); return 1;
        }
    }

    // Apply STL mode subcommand if specified
    if (strlen(opt_stl_mode_arg) > 0) {
        for (int i = 0; i < NUM_FLAGS; i++) {
            if (strstr(g_flags[i].env_var, "steamtinkerlaunch") || strstr(g_flags[i].name, "steamtinkerlaunch")) {
                if (strcmp(opt_stl_mode_arg, "default") == 0) {
                    snprintf(g_flags[i].env_var, sizeof(g_flags[i].env_var), "steamtinkerlaunch");
                } else {
                    snprintf(g_flags[i].env_var, sizeof(g_flags[i].env_var), "steamtinkerlaunch %s", opt_stl_mode_arg);
                }
                g_flags[i].enabled = true;
                printf("🔧 Configured Steam Tinker Launch mode: %s\\n", g_flags[i].env_var);
                break;
            }
        }
    }

    // Handle STL check
    if (opt_stl_check) {
        char stl_path[1024] = "";
        if (is_steamtinkerlaunch_installed(stl_path, sizeof(stl_path))) {
            printf("✅ Steam Tinker Launch is INSTALLED at: %s\\n", stl_path);
        } else {
            printf("⚠️ Steam Tinker Launch was NOT detected in PATH or compatibilitytools.d\\n");
            printf("💡 Download or install STL from: https://github.com/sonic2kk/steamtinkerlaunch\\n");
        }
        return 0;
    }

    // Handle STL modes listing
    if (opt_list_stl_modes) {
        printf("\\n🔧 Steam Tinker Launch (STL) Subcommands & Modes:\\n");
        printf("================================================================================\\n");
        printf("%-12s | %-62s\\n", "Mode", "Description");
        printf("--------------------------------------------------------------------------------\\n");
        printf("%-12s | %-62s\\n", "default", "Standard game launch via STL wrapper with interactive prompt");
        printf("%-12s | %-62s\\n", "menu", "Immediately open STL graphical settings and prefix editor GUI");
        printf("%-12s | %-62s\\n", "game", "Launch game directly through STL prefix environment");
        printf("%-12s | %-62s\\n", "winecfg", "Open Wine configuration GUI for the target game prefix");
        printf("%-12s | %-62s\\n", "regedit", "Open Wine Registry Editor GUI for the target prefix");
        printf("%-12s | %-62s\\n", "taskmgr", "Open Wine Task Manager GUI for process inspection");
        printf("%-12s | %-62s\\n", "cmd", "Open Wine Command Prompt inside the target prefix");
        printf("%-12s | %-62s\\n", "vortex", "Launch Vortex Mod Manager configured for this game prefix");
        printf("%-12s | %-62s\\n", "mo2", "Launch Mod Organizer 2 configured for this game prefix");
        printf("%-12s | %-62s\\n", "hmm", "Launch Hedge Mod Manager for Sonic / Hedgehog Engine games");
        printf("%-12s | %-62s\\n", "open", "Open file manager (xdg-open) at game installation directory");
        printf("%-12s | %-62s\\n", "configdir", "Open file manager at STL game configuration directory");
        printf("================================================================================\\n");
        return 0;
    }

    // Handle Installed Proton Versions listing
    if (opt_list_proton) {
        ProtonVersionInfo pversions[64];
        int pcount = scan_installed_proton_versions(pversions, 64);
        printf("\\n🍷 Discovered %d Installed Proton & Compatibility Runner%s:\\n", pcount, pcount == 1 ? "" : "s");
        printf("================================================================================\\n");
        printf("%-3s | %-24s | %-32s | %-14s\\n", "#", "Runner ID / Key", "Display Name", "Type");
        printf("--------------------------------------------------------------------------------\\n");
        for (int i = 0; i < pcount; i++) {
            const char *type_str = pversions[i].is_stl ? "STL Modder" : (pversions[i].is_custom ? "Custom (GE)" : "Official Valve");
            printf("%-3d | %-24.24s | %-32.32s | %-14s\\n", i + 1, pversions[i].id, pversions[i].display_name, type_str);
        }
        printf("================================================================================\\n");
        return 0;
    }

    // Handle Get Proton for target game
    if (opt_get_proton) {
        char config_vdf_path[1024];
        if (!find_steam_config_vdf_path(config_vdf_path, sizeof(config_vdf_path))) {
            fprintf(stderr, "⚠️ Could not locate Steam config.vdf\\n");
            return 1;
        }
        char tool_name[128] = "";
        if (vdf_get_compat_tool(config_vdf_path, g_target_appid, tool_name, sizeof(tool_name))) {
            printf("🍷 Current Proton runner for '%s' (AppID: %d): %s\\n", g_target_gamename, g_target_appid, tool_name);
        } else {
            printf("🍷 No custom runner mapped for '%s' (AppID: %d). Using Steam Global Default.\\n", g_target_gamename, g_target_appid);
        }
        return 0;
    }

    // Handle Set Proton for target game
    if (strlen(opt_set_proton_target) > 0) {
        char config_vdf_path[1024];
        if (!find_steam_config_vdf_path(config_vdf_path, sizeof(config_vdf_path))) {
            fprintf(stderr, "⚠️ Could not locate Steam config.vdf\\n");
            return 1;
        }
        if (vdf_set_compat_tool(config_vdf_path, g_target_appid, opt_set_proton_target)) {
            printf("✅ Successfully switched Proton runner for '%s' (AppID: %d) to: '%s'\\n",
                   g_target_gamename, g_target_appid, opt_set_proton_target);
            printf("📦 Automatic backup saved as %s.bak\\n", config_vdf_path);
            return 0;
        } else {
            fprintf(stderr, "❌ Failed to update Proton runner in config.vdf\\n");
            return 1;
        }
    }

    // 1. Handle Preset listing
    if (opt_list_presets) {
        print_all_presets();
        return 0;
    }

    // 1b. Handle Flags listing
    if (opt_list_flags) {
        printf("\\n📋 Available Proton Flags & Wrappers (%d Total):\\n", NUM_FLAGS);
        printf("================================================================================\\n");
        printf("%-3s | %-40s | %-32s\\n", "#", "Flag / Feature Name", "Launch Syntax");
        printf("--------------------------------------------------------------------------------\\n");
        for (int i = 0; i < NUM_FLAGS; i++) {
            printf("%-3d | %-40.40s | %-32.32s\\n", i + 1, g_flags[i].name, g_flags[i].env_var);
        }
        printf("================================================================================\\n");
        return 0;
    }

    // 2. Handle Game Auto-Discovery listing
    if (opt_list_games) {
        SteamGameInfo games[128];
        int count = scan_all_steam_libraries(games, 128);
        printf("\\n🎮 Discovered %d Installed Steam Game%s:\\n", count, count == 1 ? "" : "s");
        printf("=================================================================\\n");
        printf("%-10s | %-45s\\n", "AppID", "Game Title");
        printf("-----------------------------------------------------------------\\n");
        for (int i = 0; i < count; i++) {
            printf("%-10d | %-45s\\n", games[i].app_id, games[i].name);
        }
        printf("=================================================================\\n");
        return 0;
    }

    // 3. Handle Backups list & restore
    char vdf_path[1024];
    find_steam_vdf_path(vdf_path, sizeof(vdf_path));

    if (opt_list_backups) {
        list_vdf_backups(vdf_path);
        return 0;
    }

    if (strlen(opt_restore_target) > 0) {
        if (restore_vdf_backup(vdf_path, opt_restore_target)) {
            printf("✅ Backup restored successfully to %s\\n", vdf_path);
            return 0;
        } else {
            fprintf(stderr, "❌ Failed to restore backup '%s'\\n", opt_restore_target);
            return 1;
        }
    }

    if (opt_backup) {
        char backup_created[1024];
        if (create_vdf_backup(vdf_path, backup_created, sizeof(backup_created))) {
            printf("✅ Created timestamped backup: %s\\n", backup_created);
        } else {
            fprintf(stderr, "❌ Failed to create VDF backup.\\n");
        }
        return 0;
    }

    // 4. Apply preset if requested
    if (strlen(opt_preset_name) > 0) {
        if (apply_preset(g_flags, NUM_FLAGS, opt_preset_name, g_custom_args, sizeof(g_custom_args))) {
            printf("✨ Applied preset '%s' successfully.\\n", opt_preset_name);
        } else {
            fprintf(stderr, "⚠️ Unknown preset '%s'. Use --list-presets to view options.\\n", opt_preset_name);
        }
    }

    // 5. Check & Auto-fix Conflicts
    FlagConflict conflicts[16];
    int conflict_count = detect_conflicts(g_flags, NUM_FLAGS, conflicts, 16);

    if (opt_check_conflicts || conflict_count > 0) {
        if (conflict_count > 0) {
            print_conflicts(conflicts, conflict_count);
            if (opt_auto_fix) {
                auto_resolve_conflicts(g_flags, NUM_FLAGS, conflicts, conflict_count);
                printf("🔧 All detected conflicts automatically resolved!\\n\\n");
            }
        } else if (opt_check_conflicts) {
            printf("✅ No incompatible flag conflicts detected.\\n");
        }
    }

    // 6. Interactive TUI
    if (opt_interactive) {
        return run_interactive_tui(g_flags, NUM_FLAGS, g_target_appid, g_target_gamename);
    }

    // 7. Preview Command
    char final_cmd[MAX_CMD_LEN];
    build_launch_command(final_cmd, sizeof(final_cmd));
    printf("\\n🚀 Game: %s (AppID: %d)\\n", g_target_gamename, g_target_appid);
    printf("⚙️  Launch Options:\\n%s\\n\\n", final_cmd);

    // 7b. Test Runtime Process Pipeline Simulator
    if (opt_test_runtime || opt_test_exec) {
        RuntimeSimulationResult sim;
        run_runtime_simulation(g_target_appid, g_target_gamename, final_cmd, &sim);
        print_runtime_simulation_report(&sim);

        if (opt_test_exec) {
            printf("\\n🧪 Executing runtime dry-run test...\\n");
            int ret = execute_runtime_dry_run(&sim);
            if (ret == 0) {
                printf("✅ Dry-run validation passed cleanly!\\n");
            } else {
                printf("⚠️ Dry-run exited with code %d\\n", ret);
            }
            if (!opt_write_vdf && !opt_launch) {
                return ret;
            }
        } else if (!opt_write_vdf && !opt_launch) {
            return 0;
        }
    }

    // 8. Write to VDF
    if (opt_write_vdf) {
        if (strlen(vdf_path) > 0 && vdf_update_launch_options(vdf_path, g_target_appid, final_cmd)) {
            printf("💾 Successfully saved launch options to Steam VDF!\\n");
        } else {
            fprintf(stderr, "❌ Could not locate or update Steam userdata localconfig.vdf.\\n");
        }
    }

    // 9. Launch Game
    if (opt_launch) {
        printf("▶️ Launching %s (AppID: %d) via Steam...\\n", g_target_gamename, g_target_appid);
        launch_steam_game_uri(g_target_appid);
    }

    return 0;
}
`
    },
    {
      filename: 'conflicts.h',
      language: 'c',
      description: 'Conflict & Incompatibility detection engine header',
      content: `/*
 * conflicts.h - Flag Incompatibility & Conflict Detection Engine
 * Pure C99, 100% Offline Rule Analyzer
 */

#ifndef CONFLICTS_H
#define CONFLICTS_H

#include <stdbool.h>

typedef struct {
    char name[128];
    char env_var[256];
    bool is_wrapper;
    int wrapper_order;
    bool enabled;
} ProtonFlag;

typedef enum {
    SEVERITY_WARNING,
    SEVERITY_ERROR
} ConflictSeverity;

typedef struct {
    char id[32];
    char title[128];
    char message[256];
    char recommendation[256];
    ConflictSeverity severity;
    char conflicting_flags[4][128];
    int num_conflicting;
} FlagConflict;

int detect_conflicts(const ProtonFlag *flags, int num_flags, FlagConflict *out_conflicts, int max_conflicts);
void print_conflicts(const FlagConflict *conflicts, int count);
void auto_resolve_conflicts(ProtonFlag *flags, int num_flags, const FlagConflict *conflicts, int count);

#endif // CONFLICTS_H
`
    },
    {
      filename: 'conflicts.c',
      language: 'c',
      description: 'Conflict rules implementation (WineD3D, NTSYNC, NVNGX, Gamescope, CPU Wrappers)',
      content: `/*
 * conflicts.c - Flag Incompatibility & Conflict Detection Implementation
 */

#ifndef _GNU_SOURCE
#define _GNU_SOURCE
#endif
#include "conflicts.h"
#include <stdio.h>
#include <string.h>

static bool is_flag_active(const ProtonFlag *flags, int num_flags, const char *env_fragment) {
    for (int i = 0; i < num_flags; i++) {
        if (flags[i].enabled && (strstr(flags[i].env_var, env_fragment) || strstr(flags[i].name, env_fragment))) {
            return true;
        }
    }
    return false;
}

static void disable_flag_by_fragment(ProtonFlag *flags, int num_flags, const char *fragment) {
    for (int i = 0; i < num_flags; i++) {
        if (strstr(flags[i].env_var, fragment) || strstr(flags[i].name, fragment)) {
            flags[i].enabled = false;
        }
    }
}

int detect_conflicts(const ProtonFlag *flags, int num_flags, FlagConflict *out_conflicts, int max_conflicts) {
    int count = 0;

    // Rule 1: WineD3D (OpenGL) vs Vulkan / NVAPI / DXVK
    if (is_flag_active(flags, num_flags, "PROTON_USE_WINED3D")) {
        if (is_flag_active(flags, num_flags, "NVAPI") || 
            is_flag_active(flags, num_flags, "VKD3D") ||
            is_flag_active(flags, num_flags, "dxr")) {
            if (count < max_conflicts) {
                FlagConflict *c = &out_conflicts[count++];
                snprintf(c->id, sizeof(c->id), "wined3d_vs_vulkan");
                snprintf(c->title, sizeof(c->title), "WineD3D (OpenGL) vs Vulkan/DXVK Features");
                snprintf(c->message, sizeof(c->message), "PROTON_USE_WINED3D forces OpenGL translation, disabling DXVK, VKD3D, and NVAPI Vulkan layers.");
                snprintf(c->recommendation, sizeof(c->recommendation), "Disable PROTON_USE_WINED3D to enable Vulkan, DXVK, and NVAPI features.");
                c->severity = SEVERITY_ERROR;
            }
        }
    }

    // Rule 2: Dual CPU Performance Wrappers (gamemoderun + game-performance)
    if (is_flag_active(flags, num_flags, "gamemoderun") && is_flag_active(flags, num_flags, "game-performance")) {
        if (count < max_conflicts) {
            FlagConflict *c = &out_conflicts[count++];
            snprintf(c->id, sizeof(c->id), "dual_cpu_wrappers");
            snprintf(c->title, sizeof(c->title), "Conflicting CPU Performance Wrappers");
            snprintf(c->message, sizeof(c->message), "Both 'gamemoderun' (Feral) and 'game-performance' (CachyOS) are active simultaneously.");
            snprintf(c->recommendation, sizeof(c->recommendation), "Use 'game-performance' on CachyOS or 'gamemoderun' on standard distros.");
            c->severity = SEVERITY_WARNING;
        }
    }

    // Rule 3: NTSYNC Kernel Sync vs Sync Disablers (NO_ESYNC / NO_FSYNC)
    if (is_flag_active(flags, num_flags, "PROTON_USE_NTSYNC") && 
        (is_flag_active(flags, num_flags, "PROTON_NO_ESYNC") || is_flag_active(flags, num_flags, "PROTON_NO_FSYNC"))) {
        if (count < max_conflicts) {
            FlagConflict *c = &out_conflicts[count++];
            snprintf(c->id, sizeof(c->id), "ntsync_vs_sync_disablers");
            snprintf(c->title, sizeof(c->title), "NTSYNC Active with Synchronization Disablers");
            snprintf(c->message, sizeof(c->message), "PROTON_USE_NTSYNC activates kernel /dev/ntsync, but Esync/Fsync disablers are also checked.");
            snprintf(c->recommendation, sizeof(c->recommendation), "Uncheck PROTON_NO_ESYNC and PROTON_NO_FSYNC for clean NTSYNC operation.");
            c->severity = SEVERITY_WARNING;
        }
    }

    // Rule 4: Gamescope vs Native Wayland Driver
    if (is_flag_active(flags, num_flags, "gamescope") && 
        (is_flag_active(flags, num_flags, "PROTON_ENABLE_WAYLAND") || is_flag_active(flags, num_flags, "PROTON_USE_WAYLAND") || is_flag_active(flags, num_flags, "winewayland.drv"))) {
        if (count < max_conflicts) {
            FlagConflict *c = &out_conflicts[count++];
            snprintf(c->id, sizeof(c->id), "gamescope_vs_wayland");
            snprintf(c->title, sizeof(c->title), "Gamescope vs Proton Native Wayland Driver");
            snprintf(c->message, sizeof(c->message), "%s", "Gamescope creates an XWayland container, while PROTON_ENABLE_WAYLAND bypasses XWayland.");
            snprintf(c->recommendation, sizeof(c->recommendation), "%s", "Disable PROTON_ENABLE_WAYLAND when wrapping with Gamescope.");
            c->severity = SEVERITY_WARNING;
        }
    }

    // Rule 5: Both Esync and Fsync Disabled without NTSYNC
    if (is_flag_active(flags, num_flags, "PROTON_NO_ESYNC") && 
        is_flag_active(flags, num_flags, "PROTON_NO_FSYNC") &&
        !is_flag_active(flags, num_flags, "PROTON_USE_NTSYNC")) {
        if (count < max_conflicts) {
            FlagConflict *c = &out_conflicts[count++];
            snprintf(c->id, sizeof(c->id), "no_esync_no_fsync");
            snprintf(c->title, sizeof(c->title), "Both Esync and Fsync Disabled");
            snprintf(c->message, sizeof(c->message), "Disabling both Esync and Fsync forces Wine to use high-overhead server event objects.");
            snprintf(c->recommendation, sizeof(c->recommendation), "Leave at least Esync or Fsync enabled for normal multi-threading performance.");
            c->severity = SEVERITY_WARNING;
        }
    }

    // Rule 6: Disable Reflex vs NVAPI Reflex Layer
    if (is_flag_active(flags, num_flags, "PROTON_DISABLE_REFLEX") && is_flag_active(flags, num_flags, "DXVK_NVAPI_VKREFLEX")) {
        if (count < max_conflicts) {
            FlagConflict *c = &out_conflicts[count++];
            snprintf(c->id, sizeof(c->id), "disable_reflex_vs_vkreflex");
            snprintf(c->title, sizeof(c->title), "NVIDIA Reflex Disable vs DXVK VKReflex Layer");
            snprintf(c->message, sizeof(c->message), "PROTON_DISABLE_REFLEX actively suppresses Reflex while DXVK_NVAPI_VKREFLEX attempts to force Vulkan Reflex queues.");
            snprintf(c->recommendation, sizeof(c->recommendation), "Uncheck PROTON_DISABLE_REFLEX to enable low-latency Reflex pacing.");
            c->severity = SEVERITY_ERROR;
        }
    }

    // Rule 7: Steam Tinker Launch - Contradictory STL_MENU vs STL_SKIP
    if (is_flag_active(flags, num_flags, "STL_MENU") && is_flag_active(flags, num_flags, "STL_SKIP")) {
        if (count < max_conflicts) {
            FlagConflict *c = &out_conflicts[count++];
            snprintf(c->id, sizeof(c->id), "stl_menu_vs_skip");
            snprintf(c->title, sizeof(c->title), "Contradictory Steam Tinker Launch Flags");
            snprintf(c->message, sizeof(c->message), "Both STL_MENU=1 (forces GUI settings menu) and STL_SKIP=1 (bypasses wait prompt) are active simultaneously.");
            snprintf(c->recommendation, sizeof(c->recommendation), "Disable either STL_MENU or STL_SKIP.");
            c->severity = SEVERITY_ERROR;
        }
    }

    // Rule 8: Steam Tinker Launch - Subcommand Mode without Wrapper
    if (is_flag_active(flags, num_flags, "STL_COMMAND_MODE") && !is_flag_active(flags, num_flags, "steamtinkerlaunch")) {
        if (count < max_conflicts) {
            FlagConflict *c = &out_conflicts[count++];
            snprintf(c->id, sizeof(c->id), "stl_subcommand_without_wrapper");
            snprintf(c->title, sizeof(c->title), "STL Subcommand Active without steamtinkerlaunch Wrapper");
            snprintf(c->message, sizeof(c->message), "A Steam Tinker Launch subcommand is selected, but the steamtinkerlaunch wrapper is disabled.");
            snprintf(c->recommendation, sizeof(c->recommendation), "Enable the steamtinkerlaunch wrapper to execute this subcommand.");
            c->severity = SEVERITY_WARNING;
        }
    }

    // Rule 9: Steam Tinker Launch - Duplicate Gamescope
    if (is_flag_active(flags, num_flags, "STL_GAMESCOPE") && is_flag_active(flags, num_flags, "gamescope")) {
        if (count < max_conflicts) {
            FlagConflict *c = &out_conflicts[count++];
            snprintf(c->id, sizeof(c->id), "stl_gamescope_duplicate");
            snprintf(c->title, sizeof(c->title), "Duplicate Gamescope Micro-Compositor");
            snprintf(c->message, sizeof(c->message), "Both STL_GAMESCOPE=1 (internal STL Gamescope injection) and standalone gamescope wrapper are active.");
            snprintf(c->recommendation, sizeof(c->recommendation), "Use either STL_GAMESCOPE=1 or the standalone gamescope wrapper.");
            c->severity = SEVERITY_WARNING;
        }
    }

    return count;
}

void print_conflicts(const FlagConflict *conflicts, int count) {
    if (count <= 0) return;
    printf("\\n⚠️  %d Flag Incompatibilit%s Detected:\\n", count, count == 1 ? "y" : "ies");
    printf("=================================================================\\n");
    for (int i = 0; i < count; i++) {
        printf("[%s] %s\\n", conflicts[i].severity == SEVERITY_ERROR ? "ERROR" : "WARN ", conflicts[i].title);
        printf("  Detail: %s\\n", conflicts[i].message);
        printf("  Fix:    %s\\n", conflicts[i].recommendation);
        printf("-----------------------------------------------------------------\\n");
    }
}

void auto_resolve_conflicts(ProtonFlag *flags, int num_flags, const FlagConflict *conflicts, int count) {
    for (int i = 0; i < count; i++) {
        if (strcmp(conflicts[i].id, "wined3d_vs_vulkan") == 0) {
            disable_flag_by_fragment(flags, num_flags, "PROTON_USE_WINED3D");
        } else if (strcmp(conflicts[i].id, "dual_cpu_wrappers") == 0) {
            disable_flag_by_fragment(flags, num_flags, "gamemoderun");
        } else if (strcmp(conflicts[i].id, "ntsync_vs_sync_disablers") == 0) {
            disable_flag_by_fragment(flags, num_flags, "PROTON_NO_ESYNC");
            disable_flag_by_fragment(flags, num_flags, "PROTON_NO_FSYNC");
        } else if (strcmp(conflicts[i].id, "gamescope_vs_wayland") == 0) {
            disable_flag_by_fragment(flags, num_flags, "PROTON_ENABLE_WAYLAND");
            disable_flag_by_fragment(flags, num_flags, "PROTON_USE_WAYLAND");
        } else if (strcmp(conflicts[i].id, "no_esync_no_fsync") == 0) {
            disable_flag_by_fragment(flags, num_flags, "PROTON_NO_ESYNC");
            disable_flag_by_fragment(flags, num_flags, "PROTON_NO_FSYNC");
        } else if (strcmp(conflicts[i].id, "disable_reflex_vs_vkreflex") == 0) {
            disable_flag_by_fragment(flags, num_flags, "PROTON_DISABLE_REFLEX");
        } else if (strcmp(conflicts[i].id, "stl_menu_vs_skip") == 0) {
            disable_flag_by_fragment(flags, num_flags, "STL_SKIP");
        } else if (strcmp(conflicts[i].id, "stl_subcommand_without_wrapper") == 0) {
            for (int f = 0; f < num_flags; f++) {
                if (strstr(flags[f].env_var, "steamtinkerlaunch") || strstr(flags[f].name, "steamtinkerlaunch")) {
                    flags[f].enabled = true;
                    break;
                }
            }
        } else if (strcmp(conflicts[i].id, "stl_gamescope_duplicate") == 0) {
            disable_flag_by_fragment(flags, num_flags, "gamescope -w");
        }
    }
}
`
    },
    {
      filename: 'presets.h',
      language: 'c',
      description: 'Game Presets & Profiles engine header',
      content: `/*
 * presets.h - Game Launch Option Presets & Profiles
 * Pure C99, 100% Offline
 */

#ifndef PRESETS_H
#define PRESETS_H

#include <stdbool.h>
#include <stddef.h>
#include "conflicts.h"

typedef struct {
    char id[32];
    char name[128];
    char description[256];
    char custom_args[128];
    char active_flags[12][128];
    int num_active_flags;
} GamePreset;

int get_presets_count(void);
const GamePreset* get_preset_by_index(int idx);
void print_all_presets(void);
bool apply_preset(ProtonFlag *flags, int num_flags, const char *preset_id_or_name, char *out_custom_args, size_t max_args);

#endif // PRESETS_H
`
    },
    {
      filename: 'presets.c',
      language: 'c',
      description: 'Preset profiles database and configuration applier',
      content: `/*
 * presets.c - Preset Profiles Implementation
 */

#ifndef _GNU_SOURCE
#define _GNU_SOURCE
#endif
#include "presets.h"
#include <stdio.h>
#include <string.h>
#include <strings.h>

static const GamePreset g_presets[] = {
    {
        "deck",
        "Steam Deck / Handheld Optimal",
        "MangoHud overlay, GameMode priority, NTSYNC kernel sync, and direct DualSense/HIDRAW controller support",
        "-novid",
        {"mangohud", "gamemoderun", "PROTON_USE_NTSYNC", "PROTON_ENABLE_HIDRAW"},
        4
    },
    {
        "esports",
        "Max Performance & High FPS",
        "GameMode CPU pinning, NTSYNC kernel sync, DXVK_NVAPI_VKREFLEX Reflex layer, and CPU topology tuning",
        "-high -novid +fps_max 0",
        {"gamemoderun", "PROTON_USE_NTSYNC", "DXVK_NVAPI_VKREFLEX", "ENABLE_NVAPI"},
        4
    },
    {
        "cachyos",
        "CachyOS Kernel & Runner Max",
        "CachyOS game-performance wrapper, PROTON_ADD_CONFIG multi-config bundle, and NTSYNC kernel fast-path",
        "-novid",
        {"game-performance", "PROTON_USE_NTSYNC", "PROTON_ADD_CONFIG", "PROTON_TOPOLOGY"},
        4
    },
    {
        "rt",
        "Ray Tracing & DLSS Quality",
        "VKD3D DXR1.1 / DXR ray tracing, NVAPI DLSS hooks, NVNGX upscaler upgrade",
        "",
        {"lsvk", "ENABLE_NVAPI", "cachyos_dlss_upgrade"},
        3
    },
    {
        "retro",
        "Retro & D3D9/11 Legacy Direct3D",
        "WineD3D OpenGL fallback, Gamescope integer scaling, sync disablers for legacy engines",
        "-windowed",
        {"PROTON_USE_WINED3D", "Gamescope"},
        2
    },
    {
        "scaling",
        "Lossless Scaling & Frame Gen",
        "LSFG-VK (ENABLE_LSFG) Vulkan frame multiplier with MangoHud latency overlay",
        "",
        {"ENABLE_LSFG", "mangohud"},
        2
    },
    {
        "battery",
        "Battery Saver / Low Power",
        "Gamescope framerate cap (40 FPS / 60 Hz) and minimum background sync overhead",
        "-novid",
        {"Gamescope"},
        1
    },
    {
        "stl",
        "Steam Tinker Launch (STL) Modding",
        "GameMode, MangoHud, NTSYNC, and Steam Tinker Launch for prefix tweaking, Vortex/MO2 modding & side-loaded tools",
        "",
        {"steamtinkerlaunch", "gamemoderun", "mangohud", "PROTON_USE_NTSYNC"},
        4
    }
};

static const int NUM_PRESETS = sizeof(g_presets) / sizeof(g_presets[0]);

int get_presets_count(void) {
    return NUM_PRESETS;
}

const GamePreset* get_preset_by_index(int idx) {
    if (idx >= 0 && idx < NUM_PRESETS) return &g_presets[idx];
    return NULL;
}

void print_all_presets(void) {
    printf("\\n✨ Available Performance Presets (%d Profiles):\\n", NUM_PRESETS);
    printf("=================================================================\\n");
    printf("%-10s | %-32s | %s\\n", "Preset ID", "Name", "Description");
    printf("-----------------------------------------------------------------\\n");
    for (int i = 0; i < NUM_PRESETS; i++) {
        printf("%-10s | %-32s | %s\\n", g_presets[i].id, g_presets[i].name, g_presets[i].description);
    }
    printf("=================================================================\\n");
}

bool apply_preset(ProtonFlag *flags, int num_flags, const char *preset_id_or_name, char *out_custom_args, size_t max_args) {
    const GamePreset *target = NULL;
    for (int i = 0; i < NUM_PRESETS; i++) {
        if (strcasecmp(g_presets[i].id, preset_id_or_name) == 0 || strcasecmp(g_presets[i].name, preset_id_or_name) == 0) {
            target = &g_presets[i];
            break;
        }
    }
    if (!target) return false;

    // Reset all flags to disabled first
    for (int i = 0; i < num_flags; i++) {
        flags[i].enabled = false;
    }

    // Enable flags matching preset
    for (int f = 0; f < target->num_active_flags; f++) {
        for (int i = 0; i < num_flags; i++) {
            if (strstr(flags[i].name, target->active_flags[f]) || strstr(flags[i].env_var, target->active_flags[f])) {
                flags[i].enabled = true;
            }
        }
    }

    if (out_custom_args && max_args > 0) {
        snprintf(out_custom_args, max_args, "%s", target->custom_args);
    }

    return true;
}
`
    },
    {
      filename: 'scanner.h',
      language: 'c',
      description: 'Steam library and manifest scanner header',
      content: `/*
 * scanner.h - Steam Library Auto-Discovery & Game Finder
 * Pure C99, 100% Offline
 */

#ifndef SCANNER_H
#define SCANNER_H

#include <stdbool.h>
#include "vdf_parser.h"

typedef struct {
    char id[64];            // internal tool ID, e.g. "GE-Proton9-25", "proton_experimental", "steamtinkerlaunch"
    char display_name[128]; // human-friendly name
    char install_path[512]; // full path to tool directory
    bool is_custom;         // true if custom tool in compatibilitytools.d
    bool is_stl;            // true if Steam Tinker Launch
} ProtonVersionInfo;

int scan_all_steam_libraries(SteamGameInfo *out_games, int max_games);
int scan_steam_library_dir(const char *steamapps_dir, SteamGameInfo *out_games, int max_games);
bool find_game_by_name(const char *search_query, SteamGameInfo *out_game);
bool find_game_by_appid(int app_id, SteamGameInfo *out_game);
int scan_installed_proton_versions(ProtonVersionInfo *out_versions, int max_versions);
bool is_steamtinkerlaunch_installed(char *out_path, size_t max_len);

#endif // SCANNER_H
`
    },
    {
      filename: 'scanner.c',
      language: 'c',
      description: 'Steam library scanner implementation parsing libraryfolders.vdf & appmanifest_*.acf',
      content: `/*
 * scanner.c - Steam Library Auto-Discovery Implementation
 */

#ifndef _GNU_SOURCE
#define _GNU_SOURCE
#endif
#include "scanner.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <strings.h>
#include <dirent.h>
#include <unistd.h>
#include <pwd.h>
#include <ctype.h>
#include <sys/stat.h>

static bool case_insensitive_contains(const char *haystack, const char *needle) {
    if (!haystack || !needle) return false;
    if (*needle == 0) return true;
    size_t nlen = strlen(needle);
    size_t hlen = strlen(haystack);
    if (hlen < nlen) return false;
    for (size_t i = 0; i <= hlen - nlen; i++) {
        if (strncasecmp(&haystack[i], needle, nlen) == 0) return true;
    }
    return false;
}

static bool is_tool_or_runtime(const char *name) {
    if (!name || strlen(name) == 0) return true;
    char lower[256];
    size_t len = strlen(name);
    if (len >= sizeof(lower)) len = sizeof(lower) - 1;
    for (size_t i = 0; i < len; i++) {
        lower[i] = (char)tolower((unsigned char)name[i]);
    }
    lower[len] = 0;

    return (strstr(lower, "steam linux runtime") ||
            strstr(lower, "linux runtime") ||
            strstr(lower, "common redistributables") ||
            strstr(lower, "steamworks") ||
            strstr(lower, "proton") ||
            strstr(lower, "steamvr") ||
            strstr(lower, "steam controller") ||
            strstr(lower, "steam client") ||
            strstr(lower, "easyanticheat") ||
            strstr(lower, "battleye"));
}

static bool parse_acf_file(const char *acf_path, SteamGameInfo *out_game) {
    FILE *fp = fopen(acf_path, "r");
    if (!fp) return false;

    int appid = 0;
    long long last_updated = 0;
    char name[128] = "";
    char line[1024];

    while (fgets(line, sizeof(line), fp)) {
        char *p;
        if ((p = strcasestr(line, "\\\"appid\\\"")) != NULL) {
            char *quote1 = strchr(p + 7, '\"');
            if (quote1) {
                appid = atoi(quote1 + 1);
            }
        } else if ((p = strcasestr(line, "\\\"name\\\"")) != NULL) {
            char *quote1 = strchr(p + 6, '\"');
            if (quote1) {
                quote1++;
                char *quote2 = strchr(quote1, '\"');
                if (quote2) {
                    *quote2 = 0;
                    snprintf(name, sizeof(name), "%s", quote1);
                }
            }
        } else if ((p = strcasestr(line, "\\\"LastUpdated\\\"")) != NULL) {
            char *quote1 = strchr(p + 13, '\"');
            if (quote1) {
                last_updated = atoll(quote1 + 1);
            }
        }
    }
    fclose(fp);

    if (appid > 0 && strlen(name) > 0 && !is_tool_or_runtime(name)) {
        out_game->app_id = appid;
        out_game->last_updated = last_updated;
        snprintf(out_game->name, sizeof(out_game->name), "%s", name);
        return true;
    }
    return false;
}

static void add_library_dir(const char *dir, char library_paths[32][2048], int *num_libs) {
    if (!dir || *num_libs >= 32) return;
    if (access(dir, F_OK) != 0) return;

    char resolved[2048];
    if (realpath(dir, resolved) == NULL) {
        snprintf(resolved, sizeof(resolved), "%s", dir);
    }

    for (int i = 0; i < *num_libs; i++) {
        if (strcmp(library_paths[i], resolved) == 0) return;
    }

    snprintf(library_paths[*num_libs], sizeof(library_paths[0]), "%s", resolved);
    (*num_libs)++;
}

static void parse_libraryfolders(const char *lib_vdf, char library_paths[32][2048], int *num_libs) {
    FILE *fp = fopen(lib_vdf, "r");
    if (!fp) return;

    char line[2048];
    while (fgets(line, sizeof(line), fp)) {
        char *p_path = strcasestr(line, "\\\"path\\\"");
        if (p_path) {
            char *quote1 = strchr(p_path + 6, '\"');
            if (quote1) {
                quote1++;
                char *quote2 = strchr(quote1, '\"');
                if (quote2) {
                    *quote2 = 0;
                    char apps_dir[2048];
                    snprintf(apps_dir, sizeof(apps_dir), "%s/steamapps", quote1);
                    if (access(apps_dir, F_OK) == 0) {
                        add_library_dir(apps_dir, library_paths, num_libs);
                    } else {
                        snprintf(apps_dir, sizeof(apps_dir), "%s/SteamApps", quote1);
                        if (access(apps_dir, F_OK) == 0) {
                            add_library_dir(apps_dir, library_paths, num_libs);
                        } else {
                            add_library_dir(quote1, library_paths, num_libs);
                        }
                    }
                }
            }
        } else {
            // Check legacy format: "1" "/path/to/library"
            char *quote1 = strchr(line, '\"');
            if (quote1) {
                char *quote2 = strchr(quote1 + 1, '\"');
                if (quote2) {
                    char *quote3 = strchr(quote2 + 1, '\"');
                    if (quote3 && (quote3[1] == '/' || quote3[1] == '~')) {
                        quote3++;
                        char *quote4 = strchr(quote3, '\"');
                        if (quote4) {
                            *quote4 = 0;
                            char apps_dir[2048];
                            snprintf(apps_dir, sizeof(apps_dir), "%s/steamapps", quote3);
                            if (access(apps_dir, F_OK) == 0) {
                                add_library_dir(apps_dir, library_paths, num_libs);
                            } else {
                                snprintf(apps_dir, sizeof(apps_dir), "%s/SteamApps", quote3);
                                if (access(apps_dir, F_OK) == 0) {
                                    add_library_dir(apps_dir, library_paths, num_libs);
                                } else {
                                    add_library_dir(quote3, library_paths, num_libs);
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    fclose(fp);
}

int scan_steam_library_dir(const char *steamapps_dir, SteamGameInfo *out_games, int max_games) {
    if (!steamapps_dir || !out_games || max_games <= 0) return 0;

    char target_dir[2048];
    snprintf(target_dir, sizeof(target_dir), "%s", steamapps_dir);

    // If given a library root instead of steamapps, check for steamapps subfolder
    char sub_apps[2048];
    snprintf(sub_apps, sizeof(sub_apps), "%s/steamapps", steamapps_dir);
    if (access(sub_apps, F_OK) == 0) {
        snprintf(target_dir, sizeof(target_dir), "%s", sub_apps);
    } else {
        snprintf(sub_apps, sizeof(sub_apps), "%s/SteamApps", steamapps_dir);
        if (access(sub_apps, F_OK) == 0) {
            snprintf(target_dir, sizeof(target_dir), "%s", sub_apps);
        }
    }

    char resolved[2048];
    if (realpath(target_dir, resolved) != NULL) {
        snprintf(target_dir, sizeof(target_dir), "%s", resolved);
    }

    DIR *dir = opendir(target_dir);
    if (!dir) return 0;

    int count = 0;
    struct dirent *entry;
    while ((entry = readdir(dir)) != NULL) {
        if (strncmp(entry->d_name, "appmanifest_", 12) == 0 && strstr(entry->d_name, ".acf")) {
            if (count >= max_games) break;

            char acf_file[4096];
            snprintf(acf_file, sizeof(acf_file), "%.2000s/%.256s", target_dir, entry->d_name);

            SteamGameInfo game;
            if (parse_acf_file(acf_file, &game)) {
                bool exists = false;
                for (int i = 0; i < count; i++) {
                    if (out_games[i].app_id == game.app_id) { exists = true; break; }
                }
                if (!exists) {
                    out_games[count++] = game;
                }
            }
        }
    }
    closedir(dir);
    return count;
}

int scan_all_steam_libraries(SteamGameInfo *out_games, int max_games) {
    if (!out_games || max_games <= 0) return 0;

    const char *home = getenv("HOME");
    if (!home) {
        struct passwd *pw = getpwuid(getuid());
        if (pw) home = pw->pw_dir;
    }
    if (!home) return 0;

    char library_paths[32][2048];
    int num_libs = 0;

    const char *default_bases[] = {
        "/.local/share/Steam",
        "/.steam/steam",
        "/.steam/root",
        "/.steam/debian-installation",
        "/.var/app/com.valvesoftware.Steam/.local/share/Steam",
        "/.var/app/com.valvesoftware.Steam/.steam/steam",
        "/.var/app/com.valvesoftware.Steam/data/Steam",
        "/snap/steam/common/.local/share/Steam",
        "/snap/steam/common/.steam/steam"
    };

    for (size_t i = 0; i < sizeof(default_bases) / sizeof(default_bases[0]); i++) {
        char base[1024];
        snprintf(base, sizeof(base), "%s%s", home, default_bases[i]);

        char path[2048];
        snprintf(path, sizeof(path), "%s/steamapps", base);
        if (access(path, F_OK) == 0) {
            add_library_dir(path, library_paths, &num_libs);
        }

        snprintf(path, sizeof(path), "%s/SteamApps", base);
        if (access(path, F_OK) == 0) {
            add_library_dir(path, library_paths, &num_libs);
        }

        char lib_vdf[2048];
        snprintf(lib_vdf, sizeof(lib_vdf), "%s/config/libraryfolders.vdf", base);
        if (access(lib_vdf, F_OK) == 0) {
            parse_libraryfolders(lib_vdf, library_paths, &num_libs);
        }

        snprintf(lib_vdf, sizeof(lib_vdf), "%s/steamapps/libraryfolders.vdf", base);
        if (access(lib_vdf, F_OK) == 0) {
            parse_libraryfolders(lib_vdf, library_paths, &num_libs);
        }

        snprintf(lib_vdf, sizeof(lib_vdf), "%s/SteamApps/libraryfolders.vdf", base);
        if (access(lib_vdf, F_OK) == 0) {
            parse_libraryfolders(lib_vdf, library_paths, &num_libs);
        }
    }

    int count = 0;
    for (int lib = 0; lib < num_libs; lib++) {
        SteamGameInfo dir_games[128];
        int dir_count = scan_steam_library_dir(library_paths[lib], dir_games, 128);
        for (int i = 0; i < dir_count; i++) {
            bool exists = false;
            for (int j = 0; j < count; j++) {
                if (out_games[j].app_id == dir_games[i].app_id) {
                    exists = true;
                    break;
                }
            }
            if (!exists && count < max_games) {
                out_games[count++] = dir_games[i];
            }
        }
        if (count >= max_games) break;
    }

    // Sort games alphabetically by name
    for (int i = 0; i < count - 1; i++) {
        for (int j = i + 1; j < count; j++) {
            if (strcasecmp(out_games[i].name, out_games[j].name) > 0) {
                SteamGameInfo tmp = out_games[i];
                out_games[i] = out_games[j];
                out_games[j] = tmp;
            }
        }
    }

    return count;
}

bool find_game_by_name(const char *search_query, SteamGameInfo *out_game) {
    if (!search_query || !out_game) return false;
    SteamGameInfo games[128];
    int count = scan_all_steam_libraries(games, 128);

    for (int i = 0; i < count; i++) {
        if (case_insensitive_contains(games[i].name, search_query)) {
            *out_game = games[i];
            return true;
        }
    }
    return false;
}

bool find_game_by_appid(int app_id, SteamGameInfo *out_game) {
    if (app_id <= 0 || !out_game) return false;
    SteamGameInfo games[128];
    int count = scan_all_steam_libraries(games, 128);

    for (int i = 0; i < count; i++) {
        if (games[i].app_id == app_id) {
            *out_game = games[i];
            return true;
        }
    }
    return false;
}

bool is_steamtinkerlaunch_installed(char *out_path, size_t max_len) {
    const char *home = getenv("HOME");
    if (!home) {
        struct passwd *pw = getpwuid(getuid());
        if (pw) home = pw->pw_dir;
    }

    const char *system_paths[] = {
        "/usr/bin/steamtinkerlaunch",
        "/usr/local/bin/steamtinkerlaunch",
        "/bin/steamtinkerlaunch"
    };
    for (size_t i = 0; i < sizeof(system_paths) / sizeof(system_paths[0]); i++) {
        if (access(system_paths[i], X_OK) == 0) {
            if (out_path && max_len > 0) snprintf(out_path, max_len, "%s", system_paths[i]);
            return true;
        }
    }

    if (home) {
        char user_path[1024];
        snprintf(user_path, sizeof(user_path), "%s/.local/bin/steamtinkerlaunch", home);
        if (access(user_path, X_OK) == 0) {
            if (out_path && max_len > 0) snprintf(out_path, max_len, "%s", user_path);
            return true;
        }

        const char *compat_paths[] = {
            "/.local/share/Steam/compatibilitytools.d/steamtinkerlaunch/steamtinkerlaunch",
            "/.steam/steam/compatibilitytools.d/steamtinkerlaunch/steamtinkerlaunch",
            "/.steam/root/compatibilitytools.d/steamtinkerlaunch/steamtinkerlaunch",
            "/.var/app/com.valvesoftware.Steam/.local/share/Steam/compatibilitytools.d/steamtinkerlaunch/steamtinkerlaunch"
        };
        for (size_t i = 0; i < sizeof(compat_paths) / sizeof(compat_paths[0]); i++) {
            snprintf(user_path, sizeof(user_path), "%s%s", home, compat_paths[i]);
            if (access(user_path, X_OK) == 0) {
                if (out_path && max_len > 0) snprintf(out_path, max_len, "%s", user_path);
                return true;
            }
        }
    }

    return false;
}

static void add_proton_version(ProtonVersionInfo *out_versions, int *count, int max_versions,
                               const char *id, const char *display_name, const char *path, bool is_custom, bool is_stl) {
    if (!id || strlen(id) == 0 || *count >= max_versions) return;

    for (int i = 0; i < *count; i++) {
        if (strcmp(out_versions[i].id, id) == 0) return;
    }

    ProtonVersionInfo *pv = &out_versions[*count];
    snprintf(pv->id, sizeof(pv->id), "%s", id);
    snprintf(pv->display_name, sizeof(pv->display_name), "%s", display_name ? display_name : id);
    snprintf(pv->install_path, sizeof(pv->install_path), "%s", path ? path : "");
    pv->is_custom = is_custom;
    pv->is_stl = is_stl || (strcasestr(id, "steamtinkerlaunch") != NULL) || (display_name && strcasestr(display_name, "steamtinkerlaunch") != NULL);
    (*count)++;
}

int scan_installed_proton_versions(ProtonVersionInfo *out_versions, int max_versions) {
    if (!out_versions || max_versions <= 0) return 0;

    int count = 0;
    const char *home = getenv("HOME");
    if (!home) {
        struct passwd *pw = getpwuid(getuid());
        if (pw) home = pw->pw_dir;
    }

    // 1. Scan custom compatibility tools (compatibilitytools.d)
    const char *compat_dirs[] = {
        "/.local/share/Steam/compatibilitytools.d",
        "/.steam/steam/compatibilitytools.d",
        "/.steam/root/compatibilitytools.d",
        "/.var/app/com.valvesoftware.Steam/.local/share/Steam/compatibilitytools.d",
        "/.var/app/com.valvesoftware.Steam/.steam/steam/compatibilitytools.d",
        "/usr/share/steam/compatibilitytools.d"
    };

    for (size_t c = 0; c < sizeof(compat_dirs) / sizeof(compat_dirs[0]); c++) {
        char dir_path[1024];
        if (compat_dirs[c][0] == '/') {
            if (strncmp(compat_dirs[c], "/usr/", 5) == 0) {
                snprintf(dir_path, sizeof(dir_path), "%s", compat_dirs[c]);
            } else if (home) {
                snprintf(dir_path, sizeof(dir_path), "%s%s", home, compat_dirs[c]);
            } else {
                continue;
            }
        } else {
            continue;
        }

        DIR *dir = opendir(dir_path);
        if (!dir) continue;

        struct dirent *entry;
        while ((entry = readdir(dir)) != NULL) {
            if (entry->d_name[0] == '.') continue;

            char tool_dir[2048];
            snprintf(tool_dir, sizeof(tool_dir), "%s/%s", dir_path, entry->d_name);

            struct stat st;
            if (stat(tool_dir, &st) != 0 || !S_ISDIR(st.st_mode)) continue;

            char vdf_file[4096];
            snprintf(vdf_file, sizeof(vdf_file), "%s/compatibilitytool.vdf", tool_dir);

            char id[64] = "";
            char display[128] = "";
            bool is_stl = (strcasestr(entry->d_name, "steamtinkerlaunch") != NULL);

            FILE *fp = fopen(vdf_file, "r");
            if (fp) {
                char line[1024];
                while (fgets(line, sizeof(line), fp)) {
                    if (strcasestr(line, "display_name")) {
                        char *q1 = strchr(line + 14, '"');
                        if (q1) {
                            q1++;
                            char *q2 = strchr(q1, '"');
                            if (q2) {
                                *q2 = 0;
                                snprintf(display, sizeof(display), "%s", q1);
                            }
                        }
                    } else if (strlen(id) == 0 && strstr(line, "{\\n") == NULL) {
                        // Compatibility tool key block
                        char *q1 = strchr(line, '"');
                        if (q1) {
                            q1++;
                            char *q2 = strchr(q1, '"');
                            if (q2 && (q2 - q1 < 60)) {
                                char candidate[64];
                                size_t clen = q2 - q1;
                                strncpy(candidate, q1, clen);
                                candidate[clen] = 0;
                                if (strcasecmp(candidate, "compatibilitytools") != 0 &&
                                    strcasecmp(candidate, "compat_tools") != 0) {
                                    snprintf(id, sizeof(id), "%s", candidate);
                                }
                            }
                        }
                    }
                }
                fclose(fp);
            }

            if (strlen(id) == 0) snprintf(id, sizeof(id), "%.63s", entry->d_name);
            if (strlen(display) == 0) snprintf(display, sizeof(display), "%.127s", id);

            add_proton_version(out_versions, &count, max_versions, id, display, tool_dir, true, is_stl);
        }
        closedir(dir);
    }

    // 2. Scan official Valve Proton runners in steam library folders
    char library_paths[32][2048];
    int num_libs = 0;
    if (home) {
        char default_apps[2048];
        snprintf(default_apps, sizeof(default_apps), "%s/.local/share/Steam/steamapps", home);
        add_library_dir(default_apps, library_paths, &num_libs);
        char lib_vdf[4096];
        snprintf(lib_vdf, sizeof(lib_vdf), "%s/libraryfolders.vdf", default_apps);
        parse_libraryfolders(lib_vdf, library_paths, &num_libs);
    }

    for (int l = 0; l < num_libs; l++) {
        char common_dir[4096];
        snprintf(common_dir, sizeof(common_dir), "%.2040s/common", library_paths[l]);
        DIR *dir = opendir(common_dir);
        if (!dir) continue;

        struct dirent *entry;
        while ((entry = readdir(dir)) != NULL) {
            if (strncasecmp(entry->d_name, "Proton", 6) != 0) continue;

            char full_path[4096];
            snprintf(full_path, sizeof(full_path), "%.2048s/%.255s", common_dir, entry->d_name);

            struct stat st;
            if (stat(full_path, &st) != 0 || !S_ISDIR(st.st_mode)) continue;

            char id[64] = "";
            if (strcasestr(entry->d_name, "Experimental")) {
                snprintf(id, sizeof(id), "proton_experimental");
            } else if (strcasestr(entry->d_name, "9.0") || strcasestr(entry->d_name, "9")) {
                snprintf(id, sizeof(id), "proton_9");
            } else if (strcasestr(entry->d_name, "8.0") || strcasestr(entry->d_name, "8")) {
                snprintf(id, sizeof(id), "proton_8");
            } else if (strcasestr(entry->d_name, "7.0") || strcasestr(entry->d_name, "7")) {
                snprintf(id, sizeof(id), "proton_7");
            } else if (strcasestr(entry->d_name, "Hotfix")) {
                snprintf(id, sizeof(id), "proton_hotfix");
            } else {
                snprintf(id, sizeof(id), "%.63s", entry->d_name);
            }

            add_proton_version(out_versions, &count, max_versions, id, entry->d_name, full_path, false, false);
        }
        closedir(dir);
    }

    // 3. Detect standalone Steam Tinker Launch in PATH if not already found
    char stl_path[1024];
    if (is_steamtinkerlaunch_installed(stl_path, sizeof(stl_path))) {
        add_proton_version(out_versions, &count, max_versions,
                           "steamtinkerlaunch", "Steam Tinker Launch (STL)", stl_path, true, true);
    }

    return count;
}
`
    },
    {
      filename: 'backup.h',
      language: 'c',
      description: 'VDF Backup and Rollback engine header',
      content: `/*
 * backup.h - Steam localconfig.vdf Backup & Rollback Manager
 * Pure C99, 100% Offline
 */

#ifndef BACKUP_H
#define BACKUP_H

#include <stdbool.h>
#include <stddef.h>

typedef struct {
    char filename[128];
    char full_path[1024];
    long long timestamp;
    size_t file_size;
} BackupFileInfo;

bool create_vdf_backup(const char *vdf_path, char *out_backup_path, size_t max_len);
int list_vdf_backups(const char *vdf_path);
bool restore_vdf_backup(const char *vdf_path, const char *backup_filename_or_latest);

#endif // BACKUP_H
`
    },
    {
      filename: 'backup.c',
      language: 'c',
      description: 'VDF Backup creation, listing, and restoration implementation',
      content: `/*
 * backup.c - VDF Backup & Rollback Implementation
 */

#ifndef _GNU_SOURCE
#define _GNU_SOURCE
#endif
#include "backup.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <time.h>
#include <dirent.h>
#include <sys/stat.h>
#include <libgen.h>

bool create_vdf_backup(const char *vdf_path, char *out_backup_path, size_t max_len) {
    if (!vdf_path || access(vdf_path, F_OK) != 0) return false;

    time_t now = time(NULL);
    struct tm *t = localtime(&now);

    char backup_file[2048];
    snprintf(backup_file, sizeof(backup_file), "%s.bak.%04d%02d%02d_%02d%02d%02d",
             vdf_path,
             t->tm_year + 1900, t->tm_mon + 1, t->tm_mday,
             t->tm_hour, t->tm_min, t->tm_sec);

    FILE *src = fopen(vdf_path, "rb");
    if (!src) return false;

    FILE *dst = fopen(backup_file, "wb");
    if (!dst) { fclose(src); return false; }

    char buffer[8192];
    size_t bytes;
    while ((bytes = fread(buffer, 1, sizeof(buffer), src)) > 0) {
        fwrite(buffer, 1, bytes, dst);
    }

    fclose(src);
    fclose(dst);

    if (out_backup_path && max_len > 0) {
        snprintf(out_backup_path, max_len, "%s", backup_file);
    }

    return true;
}

int list_vdf_backups(const char *vdf_path) {
    if (!vdf_path || strlen(vdf_path) == 0) return 0;

    char dir_copy[1024];
    snprintf(dir_copy, sizeof(dir_copy), "%s", vdf_path);
    char *dir_path = dirname(dir_copy);

    DIR *dir = opendir(dir_path);
    if (!dir) return 0;

    printf("\\n📦 Available VDF Configuration Backups:\\n");
    printf("=================================================================\\n");
    printf("%-35s | %-12s\\n", "Backup File", "Size");
    printf("-----------------------------------------------------------------\\n");

    struct dirent *entry;
    int count = 0;
    while ((entry = readdir(dir)) != NULL) {
        if (strstr(entry->d_name, "localconfig.vdf.bak")) {
            char full_path[2048];
            snprintf(full_path, sizeof(full_path), "%s/%s", dir_path, entry->d_name);
            struct stat st;
            size_t sz = 0;
            if (stat(full_path, &st) == 0) sz = st.st_size;

            printf("%-35s | %zu bytes\\n", entry->d_name, sz);
            count++;
        }
    }
    closedir(dir);

    if (count == 0) {
        printf("  (No previous backups found)\\n");
    }
    printf("=================================================================\\n");
    return count;
}

bool restore_vdf_backup(const char *vdf_path, const char *backup_filename_or_latest) {
    if (!vdf_path) return false;

    char restore_src[2048] = "";

    if (strcmp(backup_filename_or_latest, "latest") == 0) {
        char dir_copy[1024];
        snprintf(dir_copy, sizeof(dir_copy), "%s", vdf_path);
        char *dir_path = dirname(dir_copy);

        DIR *dir = opendir(dir_path);
        if (!dir) return false;

        char latest_name[256] = "";
        struct dirent *entry;
        while ((entry = readdir(dir)) != NULL) {
            if (strstr(entry->d_name, "localconfig.vdf.bak")) {
                if (strcmp(entry->d_name, latest_name) > 0) {
                    snprintf(latest_name, sizeof(latest_name), "%s", entry->d_name);
                }
            }
        }
        closedir(dir);

        if (strlen(latest_name) == 0) return false;
        snprintf(restore_src, sizeof(restore_src), "%s/%s", dir_path, latest_name);
    } else {
        if (backup_filename_or_latest[0] == '/') {
            snprintf(restore_src, sizeof(restore_src), "%s", backup_filename_or_latest);
        } else {
            char dir_copy[1024];
            snprintf(dir_copy, sizeof(dir_copy), "%s", vdf_path);
            snprintf(restore_src, sizeof(restore_src), "%s/%s", dirname(dir_copy), backup_filename_or_latest);
        }
    }

    FILE *src = fopen(restore_src, "rb");
    if (!src) return false;

    FILE *dst = fopen(vdf_path, "wb");
    if (!dst) { fclose(src); return false; }

    char buffer[8192];
    size_t bytes;
    while ((bytes = fread(buffer, 1, sizeof(buffer), src)) > 0) {
        fwrite(buffer, 1, bytes, dst);
    }

    fclose(src);
    fclose(dst);

    return true;
}
`
    },
    {
      filename: 'launcher.h',
      language: 'c',
      description: 'Steam URI launcher and game process invoker header',
      content: `/*
 * launcher.h - Direct Steam URI Game Launcher & Process Invoker
 * Pure C99, 100% Offline
 */

#ifndef LAUNCHER_H
#define LAUNCHER_H

#include <stdbool.h>
#include <stddef.h>
#include <stdlib.h>

bool detect_steam_client(char *out_type, size_t max_len);
bool launch_steam_game_uri(int app_id);

#endif // LAUNCHER_H
`
    },
    {
      filename: 'launcher.c',
      language: 'c',
      description: 'Direct Steam URI game launcher implementation with client auto-detection',
      content: `/*
 * launcher.c - Direct Steam URI Game Launcher Implementation
 */

#ifndef _GNU_SOURCE
#define _GNU_SOURCE
#endif
#include "launcher.h"
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <sys/types.h>
#include <sys/wait.h>

bool detect_steam_client(char *out_type, size_t max_len) {
    if (system("command -v steam > /dev/null 2>&1") == 0) {
        if (out_type && max_len > 0) snprintf(out_type, max_len, "Native Steam (system PATH)");
        return true;
    }
    if (system("command -v flatpak > /dev/null 2>&1 && flatpak list | grep -q com.valvesoftware.Steam") == 0) {
        if (out_type && max_len > 0) snprintf(out_type, max_len, "Flatpak Steam");
        return true;
    }
    return false;
}

bool launch_steam_game_uri(int app_id) {
    if (app_id <= 0) return false;

    char uri[64];
    snprintf(uri, sizeof(uri), "steam://rungameid/%d", app_id);

    pid_t pid = fork();
    if (pid == 0) {
        // Child process
        if (system("command -v steam > /dev/null 2>&1") == 0) {
            execlp("steam", "steam", uri, (char *)NULL);
        } else if (system("command -v flatpak > /dev/null 2>&1") == 0) {
            execlp("flatpak", "flatpak", "run", "com.valvesoftware.Steam", uri, (char *)NULL);
        }
        _exit(1);
    } else if (pid > 0) {
        printf("🚀 Dispatched Steam launch command: %s (PID %d)\\n", uri, pid);
        return true;
    }

    return false;
}
`
    },
    {
      filename: 'tui.h',
      language: 'c',
      description: 'Zero-dependency ANSI Terminal UI header',
      content: `/*
 * tui.h - Interactive Terminal UI (TUI) without ncurses
 * Pure C99 with standard ANSI escape sequences
 */

#ifndef TUI_H
#define TUI_H

#include "conflicts.h"

int run_interactive_tui(ProtonFlag *flags, int num_flags, int app_id, const char *game_name);

#endif // TUI_H
`
    },
    {
      filename: 'tui.c',
      language: 'c',
      description: 'Interactive Terminal UI (TUI) implementation with live preview, preset picker, conflict alerts, and hotkeys',
      content: `/*
 * tui.c - Zero-dependency ANSI Terminal UI Implementation
 */

#ifndef _GNU_SOURCE
#define _GNU_SOURCE
#endif
#include "tui.h"
#include "presets.h"
#include "scanner.h"
#include "backup.h"
#include "launcher.h"
#include "vdf_parser.h"
#include "runtime_test.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <termios.h>
#include <unistd.h>
#include <sys/ioctl.h>

static const SteamGameInfo default_catalog_games[] = {
${initialGameArray}
};
#define NUM_DEFAULT_CATALOG ((int)(sizeof(default_catalog_games) / sizeof(default_catalog_games[0])))

static struct termios orig_termios;

static void disable_raw_mode(void) {
    tcsetattr(STDIN_FILENO, TCSAFLUSH, &orig_termios);
    printf("\\033[?25h"); // show cursor
}

static void enable_raw_mode(void) {
    tcgetattr(STDIN_FILENO, &orig_termios);
    atexit(disable_raw_mode);
    struct termios raw = orig_termios;
    raw.c_lflag &= ~(ECHO | ICANON);
    tcsetattr(STDIN_FILENO, TCSAFLUSH, &raw);
    printf("\\033[?25l"); // hide cursor
}

static void build_tui_command(const ProtonFlag *flags, int num_flags, char *out_buf, size_t max_len) {
    char env_vars[1024] = "";
    char wrappers[512] = "";

    for (int i = 0; i < num_flags; i++) {
        if (!flags[i].is_wrapper && flags[i].enabled) {
            if (strlen(env_vars) > 0) strcat(env_vars, " ");
            strcat(env_vars, flags[i].env_var);
        }
    }
    for (int order = 1; order <= 4; order++) {
        for (int i = 0; i < num_flags; i++) {
            if (flags[i].is_wrapper && flags[i].wrapper_order == order && flags[i].enabled) {
                if (strlen(wrappers) > 0) strcat(wrappers, " ");
                strcat(wrappers, flags[i].env_var);
            }
        }
    }
    snprintf(out_buf, max_len, "%s%s%s%s%%command%%",
             strlen(env_vars) > 0 ? env_vars : "",
             strlen(env_vars) > 0 ? " " : "",
             strlen(wrappers) > 0 ? wrappers : "",
             strlen(wrappers) > 0 ? " " : "");
}

int run_interactive_tui(ProtonFlag *flags, int num_flags, int app_id, const char *game_name) {
    enable_raw_mode();

    int selected_idx = 0;
    int current_appid = app_id;
    char current_game[128];
    snprintf(current_game, sizeof(current_game), "%s", game_name);

    // Discover installed Proton runners & compatibility tools
    ProtonVersionInfo proton_runners[64];
    int num_proton_runners = scan_installed_proton_versions(proton_runners, 64);
    int current_proton_idx = 0;

    char config_vdf_path[1024] = "";
    bool has_config_vdf = find_steam_config_vdf_path(config_vdf_path, sizeof(config_vdf_path));
    char current_proton_id[128] = "Steam Default";

    if (has_config_vdf) {
        char found_compat[128] = "";
        if (vdf_get_compat_tool(config_vdf_path, current_appid, found_compat, sizeof(found_compat))) {
            snprintf(current_proton_id, sizeof(current_proton_id), "%s", found_compat);
            for (int i = 0; i < num_proton_runners; i++) {
                if (strcmp(proton_runners[i].id, current_proton_id) == 0) {
                    current_proton_idx = i;
                    break;
                }
            }
        }
    }

    // Check Steam Tinker Launch presence
    char stl_path[1024] = "";
    bool stl_installed = is_steamtinkerlaunch_installed(stl_path, sizeof(stl_path));

    static const char *stl_modes[] = {
        "default", "menu", "game", "winecfg", "regedit", "taskmgr", "cmd", "vortex", "mo2", "hmm", "open", "configdir"
    };
    static const int num_stl_modes = sizeof(stl_modes) / sizeof(stl_modes[0]);
    int current_stl_mode_idx = 0;

    // Initialize unified games list (Active Game + Scanned Steam Libraries + Built-in Catalog Games)
    SteamGameInfo all_games[128];
    int total_games = 0;

    // 1. Target game as initial entry
    all_games[0].app_id = app_id;
    snprintf(all_games[0].name, sizeof(all_games[0].name), "%s", game_name);
    total_games = 1;

    // 2. Discover installed games from Steam library folders
    SteamGameInfo scanned[64];
    int scanned_count = scan_all_steam_libraries(scanned, 64);
    for (int i = 0; i < scanned_count && total_games < 128; i++) {
        bool exists = false;
        for (int j = 0; j < total_games; j++) {
            if (all_games[j].app_id == scanned[i].app_id) { exists = true; break; }
        }
        if (!exists) {
            all_games[total_games++] = scanned[i];
        }
    }

    // 3. Fallback to pre-configured catalog games to guarantee games can always be cycled
    for (int i = 0; i < NUM_DEFAULT_CATALOG && total_games < 128; i++) {
        bool exists = false;
        for (int j = 0; j < total_games; j++) {
            if (all_games[j].app_id == default_catalog_games[i].app_id) { exists = true; break; }
        }
        if (!exists) {
            all_games[total_games++] = default_catalog_games[i];
        }
    }

    int current_game_idx = 0;
    for (int i = 0; i < total_games; i++) {
        if (all_games[i].app_id == current_appid) {
            current_game_idx = i;
            break;
        }
    }

    // Active Preset tracking
    int active_preset_idx = -1; // -1 indicates custom/manual flags
    bool preset_modified = false;

    // Detect if current active flags already match any preset profile
    for (int p = 0; p < get_presets_count(); p++) {
        const GamePreset *gp = get_preset_by_index(p);
        if (gp && gp->num_active_flags > 0) {
            bool all_match = true;
            for (int a = 0; a < gp->num_active_flags; a++) {
                bool found = false;
                for (int f = 0; f < num_flags; f++) {
                    if (flags[f].enabled && (strstr(flags[f].env_var, gp->active_flags[a]) || strstr(flags[f].name, gp->active_flags[a]))) {
                        found = true;
                        break;
                    }
                }
                if (!found) { all_match = false; break; }
            }
            if (all_match) {
                active_preset_idx = p;
                break;
            }
        }
    }

    char status_msg[512] = "Use [UP/DOWN] to navigate, [SPACE] to toggle, [V] Proton version, [T] STL, [P] Presets, [S] Save";

    while (1) {
        // Clear screen
        printf("\\033[H\\033[J");

        // Header
        printf("\\033[1;36m================================================================================\\033[0m\\n");
        printf("\\033[1;37m 🚀 Proton Launch Options Manager (Interactive C99 TUI)\\033[0m\\n");
        printf(" \\033[1;32m🎮 Target Game:\\033[0m   \\033[1;37m[%d/%d] %s\\033[0m (AppID: \\033[1;33m%d\\033[0m)  \\033[2m[Press G to cycle %d games]\\033[0m\\n",
               current_game_idx + 1, total_games, current_game, current_appid, total_games);

        printf(" \\033[1;34m🍷 Proton Runner:\\033[0m \\033[1;37m%s\\033[0m %s  \\033[2m[Press V to cycle %d runners via config.vdf]\\033[0m\\n",
               current_proton_id,
               num_proton_runners > 0 ? "\\033[1;32m[Installed]\\033[0m" : "\\033[2m[Default]\\033[0m",
               num_proton_runners);

        // Find if STL wrapper flag is enabled
        int stl_flag_idx = -1;
        for (int i = 0; i < num_flags; i++) {
            if (strstr(flags[i].env_var, "steamtinkerlaunch") || strstr(flags[i].name, "steamtinkerlaunch")) {
                stl_flag_idx = i;
                break;
            }
        }
        bool stl_active = (stl_flag_idx >= 0 && flags[stl_flag_idx].enabled);
        printf(" \\033[1;33m🔧 Tinker Launch:\\033[0m %s %s  \\033[2m[Press T to toggle/mode, STL is %s]\\033[0m\\n",
               stl_active ? "\\033[1;32m[ACTIVE]\\033[0m" : "\\033[2m[OFF]\\033[0m",
               stl_active ? flags[stl_flag_idx].env_var : "",
               stl_installed ? "Installed" : "Not Found");

        if (active_preset_idx >= 0 && active_preset_idx < get_presets_count()) {
            const GamePreset *ap = get_preset_by_index(active_preset_idx);
            printf(" \\033[1;35m⚡ Active Preset:\\033[0m \\033[1;33m[%d/%d] %s\\033[0m (\\033[1;36m%s\\033[0m)%s  \\033[2m[Press P to cycle presets]\\033[0m\\n",
                   active_preset_idx + 1, get_presets_count(), ap->name, ap->id,
                   preset_modified ? " \\033[1;31m[Modified]\\033[0m" : " \\033[1;32m[Applied]\\033[0m");
            printf("    \\033[2m└─ %s\\033[0m\\n", ap->description);
        } else {
            printf(" \\033[1;35m⚡ Active Preset:\\033[0m \\033[1;37m[Custom / Manual Flags]\\033[0m  \\033[2m[Press P to cycle %d presets: deck, esports, stl...]\\033[0m\\n",
                   get_presets_count());
            printf("    \\033[2m└─ Current launch flags customized manually\\033[0m\\n");
        }

        // Preset carousel bar
        printf(" \\033[2mPresets Bar:\\033[0m ");
        for (int p = 0; p < get_presets_count(); p++) {
            const GamePreset *gp = get_preset_by_index(p);
            if (p == active_preset_idx) {
                printf("\\033[1;30;43m ▶ %s ◀ \\033[0m ", gp->id);
            } else {
                printf("\\033[2m[%s]\\033[0m ", gp->id);
            }
        }
        printf("\\n");
        printf("\\033[1;36m================================================================================\\033[0m\\n");

        // Conflict check
        FlagConflict conflicts[8];
        int num_conflicts = detect_conflicts(flags, num_flags, conflicts, 8);
        if (num_conflicts > 0) {
            printf("\\033[1;31m ⚠️  %d Conflict(s) Detected: %s (Press [C] to Auto-Fix)\\033[0m\\n",
                   num_conflicts, conflicts[0].title);
        } else {
            printf("\\033[1;32m ✅ All active flags are compatible & optimized\\033[0m\\n");
        }
        printf("--------------------------------------------------------------------------------\\n");

        // Dynamic terminal height calculation for smooth, non-overflowing scrolling
        struct winsize ws;
        int terminal_rows = 24;
        if (ioctl(STDOUT_FILENO, TIOCGWINSZ, &ws) == 0 && ws.ws_row > 18) {
            terminal_rows = ws.ws_row;
        }
        int page_size = terminal_rows - 18;
        if (page_size < 5) page_size = 5;
        if (page_size > 22) page_size = 22;

        int start_idx = selected_idx - (page_size / 2);
        if (start_idx < 0) start_idx = 0;
        if (start_idx + page_size > num_flags) start_idx = num_flags - page_size;
        if (start_idx < 0) start_idx = 0;
        int end_idx = start_idx + page_size;
        if (end_idx > num_flags) end_idx = num_flags;

        printf(" Flags %d-%d of %d (Use UP/DOWN or J/K to scroll):\\n", start_idx + 1, end_idx, num_flags);
        for (int i = start_idx; i < end_idx; i++) {
            bool is_sel = (i == selected_idx);
            const char *box = flags[i].enabled ? "\\033[1;32m[X]\\033[0m" : "\\033[1;30m[ ]\\033[0m";
            if (is_sel) {
                printf("\\033[1;37;44m > %s %-36.36s (%s)\\033[0m\\n",
                       flags[i].enabled ? "[X]" : "[ ]", flags[i].name, flags[i].env_var);
            } else {
                printf("   %s %-36.36s \\033[2m%s\\033[0m\\n",
                       box, flags[i].name, flags[i].env_var);
            }
        }

        printf("--------------------------------------------------------------------------------\\n");
        
        // Command Preview
        char cmd[1024];
        build_tui_command(flags, num_flags, cmd, sizeof(cmd));
        printf("\\033[1;33m Live Launch Command:\\033[0m\\n");
        printf(" \\033[1;37m%s\\033[0m\\n", cmd);

        printf("--------------------------------------------------------------------------------\\n");
        printf("\\033[1;34m [SPACE]\\033[0m Toggle \\033[1;34m[V]\\033[0m Proton \\033[1;34m[T]\\033[0m STL \\033[1;34m[R]\\033[0m Test Runtime \\033[1;34m[P]\\033[0m Preset \\033[1;34m[G]\\033[0m Game \\033[1;34m[C]\\033[0m Conflicts \\033[1;34m[S]\\033[0m Save \\033[1;34m[X]\\033[0m Launch \\033[1;34m[Q]\\033[0m Quit\\n");
        printf("\\033[2m %s\\033[0m\\n", status_msg);

        // Read input character
        char c;
        if (read(STDIN_FILENO, &c, 1) != 1) break;

        if (c == 'q' || c == 'Q' || c == 27) { // 27 = ESC
            if (c == 27) {
                char seq[2];
                if (read(STDIN_FILENO, &seq[0], 1) == 1 && read(STDIN_FILENO, &seq[1], 1) == 1) {
                    if (seq[0] == '[') {
                        if (seq[1] == 'A') { // Up
                            if (selected_idx > 0) selected_idx--;
                            continue;
                        } else if (seq[1] == 'B') { // Down
                            if (selected_idx < num_flags - 1) selected_idx++;
                            continue;
                        }
                    }
                }
            }
            break;
        } else if (c == 'k' || c == 'w') {
            if (selected_idx > 0) selected_idx--;
        } else if (c == 'j' || (c == 's' && c != 'S')) {
            if (selected_idx < num_flags - 1) selected_idx++;
        } else if (c == ' ') {
            flags[selected_idx].enabled = !flags[selected_idx].enabled;
            if (active_preset_idx >= 0) preset_modified = true;
            snprintf(status_msg, sizeof(status_msg), "Toggled '%s' -> %s",
                     flags[selected_idx].name, flags[selected_idx].enabled ? "ON" : "OFF");
        } else if (c == 'v' || c == 'V') {
            // Cycle installed Proton runner versions
            if (num_proton_runners > 0) {
                if (c == 'V') {
                    current_proton_idx = (current_proton_idx - 1 + num_proton_runners) % num_proton_runners;
                } else {
                    current_proton_idx = (current_proton_idx + 1) % num_proton_runners;
                }
                snprintf(current_proton_id, sizeof(current_proton_id), "%s", proton_runners[current_proton_idx].id);
                if (has_config_vdf) {
                    vdf_set_compat_tool(config_vdf_path, current_appid, current_proton_id);
                    snprintf(status_msg, sizeof(status_msg), "🍷 Switched runner to '%s' (%s) & saved to config.vdf",
                             current_proton_id, proton_runners[current_proton_idx].display_name);
                } else {
                    snprintf(status_msg, sizeof(status_msg), "🍷 Selected runner '%s' (%s)",
                             current_proton_id, proton_runners[current_proton_idx].display_name);
                }
            } else {
                snprintf(status_msg, sizeof(status_msg), "ℹ️ No extra Proton runners found; using default.");
            }
        } else if (c == 't' || c == 'T') {
            // Toggle or cycle Steam Tinker Launch mode
            if (stl_flag_idx >= 0) {
                if (!flags[stl_flag_idx].enabled) {
                    flags[stl_flag_idx].enabled = true;
                    snprintf(flags[stl_flag_idx].env_var, sizeof(flags[stl_flag_idx].env_var), "steamtinkerlaunch");
                    current_stl_mode_idx = 0;
                    snprintf(status_msg, sizeof(status_msg), "🔧 Enabled Steam Tinker Launch (default)");
                } else {
                    current_stl_mode_idx = (current_stl_mode_idx + 1) % (num_stl_modes + 1);
                    if (current_stl_mode_idx == num_stl_modes) {
                        flags[stl_flag_idx].enabled = false;
                        snprintf(status_msg, sizeof(status_msg), "🔧 Disabled Steam Tinker Launch wrapper");
                    } else {
                        const char *m = stl_modes[current_stl_mode_idx];
                        if (strcmp(m, "default") == 0) {
                            snprintf(flags[stl_flag_idx].env_var, sizeof(flags[stl_flag_idx].env_var), "steamtinkerlaunch");
                        } else {
                            snprintf(flags[stl_flag_idx].env_var, sizeof(flags[stl_flag_idx].env_var), "steamtinkerlaunch %s", m);
                        }
                        snprintf(status_msg, sizeof(status_msg), "🔧 STL Mode: '%s' -> %s", m, flags[stl_flag_idx].env_var);
                    }
                }
            }
        } else if (c == 'r' || c == 'R') {
            // Open full-screen Steam Runtime Process Pipeline Simulator
            disable_raw_mode();
            printf("\\033[2J\\033[H");
            char current_launch_opts[1024];
            build_tui_command(flags, num_flags, current_launch_opts, sizeof(current_launch_opts));

            RuntimeSimulationResult sim;
            run_runtime_simulation(current_appid, current_game, current_launch_opts, &sim);
            print_runtime_simulation_report(&sim);

            printf("\\n \\033[1;36mPress any key to return to Manager...\\033[0m");
            fflush(stdout);
            enable_raw_mode();
            char dummy;
            if (read(STDIN_FILENO, &dummy, 1) < 0) {}
            snprintf(status_msg, sizeof(status_msg), "🧪 Inspected Runtime Process Pipeline for '%s'", current_game);
        } else if (c == 'c' || c == 'C') {
            if (num_conflicts > 0) {
                auto_resolve_conflicts(flags, num_flags, conflicts, num_conflicts);
                if (active_preset_idx >= 0) preset_modified = true;
                snprintf(status_msg, sizeof(status_msg), "Resolved %d flag conflicts!", num_conflicts);
            }
        } else if (c == 'p' || c == 'P') {
            // Cycle presets forward (p) or backward (P)
            if (c == 'P') {
                active_preset_idx = (active_preset_idx - 1 + get_presets_count()) % get_presets_count();
            } else {
                active_preset_idx = (active_preset_idx + 1) % get_presets_count();
            }
            const GamePreset *p = get_preset_by_index(active_preset_idx);
            if (p) {
                apply_preset(flags, num_flags, p->id, NULL, 0);
                preset_modified = false;
                snprintf(status_msg, sizeof(status_msg), "⚡ Applied Preset [%d/%d]: '%s' (%s)",
                         active_preset_idx + 1, get_presets_count(), p->name, p->id);
            }
        } else if (c == 'g' || c == 'G') {
            // Cycle game from unified library / catalog
            if (total_games > 1) {
                if (c == 'G') {
                    current_game_idx = (current_game_idx - 1 + total_games) % total_games;
                } else {
                    current_game_idx = (current_game_idx + 1) % total_games;
                }
                current_appid = all_games[current_game_idx].app_id;
                snprintf(current_game, sizeof(current_game), "%s", all_games[current_game_idx].name);

                // Re-query compat tool mapping for newly selected game
                if (has_config_vdf) {
                    char found_compat[128] = "";
                    if (vdf_get_compat_tool(config_vdf_path, current_appid, found_compat, sizeof(found_compat))) {
                        snprintf(current_proton_id, sizeof(current_proton_id), "%s", found_compat);
                    } else {
                        snprintf(current_proton_id, sizeof(current_proton_id), "Steam Default");
                    }
                }

                snprintf(status_msg, sizeof(status_msg), "🎮 Switched Target Game [%d/%d]: '%s' (AppID %d)",
                         current_game_idx + 1, total_games, current_game, current_appid);
            } else {
                snprintf(status_msg, sizeof(status_msg), "ℹ️ Only 1 game available in library/catalog (AppID %d)", current_appid);
            }
        } else if (c == 'S') {
            char vdf_path[1024];
            find_steam_vdf_path(vdf_path, sizeof(vdf_path));
            if (strlen(vdf_path) > 0 && vdf_update_launch_options(vdf_path, current_appid, cmd)) {
                snprintf(status_msg, sizeof(status_msg), "Saved launch options to Steam VDF!");
            } else {
                snprintf(status_msg, sizeof(status_msg), "Could not write to localconfig.vdf");
            }
        } else if (c == 'x' || c == 'X') {
            launch_steam_game_uri(current_appid);
            snprintf(status_msg, sizeof(status_msg), "Launched game via Steam URI!");
        }
    }

    disable_raw_mode();
    printf("\\nExited Proton Launch Options Manager.\\n");
    return 0;
}
`
    },
    {
      filename: 'runtime_test.h',
      language: 'c',
      description: 'Steam Runtime Process Pipeline Simulator & Diagnostic Inspector header',
      content: `/*
 * runtime_test.h - Steam Runtime Process Pipeline Simulator & Diagnostic Inspector
 * Pure C99, 100% Offline
 */

#ifndef RUNTIME_TEST_H
#define RUNTIME_TEST_H

#include <stdbool.h>
#include <stddef.h>
#include "vdf_parser.h"

typedef struct {
    char install_dir[256];
    char exe_rel_path[256];
    char exe_name[128];
    char full_install_path[2048];
    char full_exe_path[2048];
    bool install_dir_exists;
    bool exe_exists;
    bool exe_executable;
    bool is_native_linux;
} GameExecutableInfo;

typedef struct {
    int app_id;
    char game_name[128];
    GameExecutableInfo exe_info;
    char proton_id[128];
    char proton_display_name[128];
    char proton_binary_path[1024];
    bool proton_exists;
    bool proton_executable;
    char env_vars[2048];
    char wrappers[1024];
    char command_flags[512];
    char evaluated_bash[8192];
    bool stl_active;
    char stl_mode[64];
    bool stl_installed;
    int check_errors;
    int check_warnings;
    char check_msgs[16][256];
    int checks_count;
} RuntimeSimulationResult;

// Resolves executable information for a given game (curated database + local library scanning)
bool resolve_game_executable(int app_id, const char *game_name, GameExecutableInfo *out_info);

// Resolves configured proton runner binary path
bool resolve_proton_binary(int app_id, const char *tool_id, char *out_path, size_t max_len, char *out_display, size_t max_disp_len);

// Runs full runtime simulation pipeline based on currently configured flags, game and proton runner
void run_runtime_simulation(int app_id, const char *game_name, const char *launch_options, RuntimeSimulationResult *res);

// Prints ANSI-formatted runtime simulation diagnostic report
void print_runtime_simulation_report(const RuntimeSimulationResult *res);

// Performs optional test execution / syntax dry-run
int execute_runtime_dry_run(const RuntimeSimulationResult *res);

#endif // RUNTIME_TEST_H
`
    },
    {
      filename: 'runtime_test.c',
      language: 'c',
      description: 'Steam Runtime Process Pipeline Simulator & Diagnostic Inspector implementation',
      content: `/*
 * runtime_test.c - Steam Runtime Process Pipeline Simulator Implementation
 * Pure C99, 100% Offline
 */

#ifndef _GNU_SOURCE
#define _GNU_SOURCE
#endif
#include "runtime_test.h"
#include "scanner.h"
#include "conflicts.h"
#include "vdf_parser.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <pwd.h>
#include <sys/stat.h>
#include <ctype.h>

typedef struct {
    int app_id;
    const char *install_dir;
    const char *exe_rel_path;
    const char *exe_name;
    bool is_native_linux;
} KnownGameEntry;

static const KnownGameEntry KNOWN_GAMES[] = {
    { 1091500, "Cyberpunk 2077", "bin/x64/Cyberpunk2077.exe", "Cyberpunk2077.exe", false },
    { 1245620, "ELDEN RING", "Game/eldenring.exe", "eldenring.exe", false },
    { 1086940, "Baldurs Gate 3", "bin/bg3_dx11.exe", "bg3_dx11.exe", false },
    { 553850,  "HELLDIVERS 2", "bin/helldivers2.exe", "helldivers2.exe", false },
    { 1172470, "Apex Legends", "r5apex.exe", "r5apex.exe", false },
    { 292030,  "The Witcher 3", "bin/x64/witcher3.exe", "witcher3.exe", false },
    { 2322010, "God of War Ragnarok", "GoWR.exe", "GoWR.exe", false },
    { 1174180, "Red Dead Redemption 2", "RDR2.exe", "RDR2.exe", false },
    { 582010,  "Monster Hunter World", "MonsterHunterWorld.exe", "MonsterHunterWorld.exe", false },
    { 730,     "Counter-Strike Global Offensive", "game/bin/linuxsteamrt64/cs2", "cs2", true },
    { 570,     "dota 2 beta", "game/bin/linuxsteamrt64/dota2", "dota2", true },
    { 271590,  "Grand Theft Auto V", "GTA5.exe", "GTA5.exe", false },
    { 990080,  "Hogwarts Legacy", "Phoenix/Binaries/Win64/HogwartsLegacy.exe", "HogwartsLegacy.exe", false },
    { 611500,  "Quake Champions", "QuakeChampions.exe", "QuakeChampions.exe", false },
    { 489830,  "Skyrim Special Edition", "SkyrimSE.exe", "SkyrimSE.exe", false },
    { 377160,  "Fallout 4", "Fallout4.exe", "Fallout4.exe", false },
    { 1716740, "Starfield", "Starfield.exe", "Starfield.exe", false },
    { 1888160, "ARMORED CORE VI FIRES OF RUBICON", "Game/armoredcore6.exe", "armoredcore6.exe", false },
    { 2358720, "Black Myth Wukong", "b1/Binaries/Win64/b1-Win64-Shipping.exe", "b1-Win64-Shipping.exe", false },
    { 1623730, "Palworld", "Pal/Binaries/Win64/Palworld-Win64-Shipping.exe", "Palworld-Win64-Shipping.exe", false },
    { 548430,  "Deep Rock Galactic", "FSD/Binaries/Win64/FSD-Win64-Shipping.exe", "FSD-Win64-Shipping.exe", false },
    { 1145350, "Hades II", "Ship/Hades2.exe", "Hades2.exe", false },
    { 1145360, "Hades", "x64/Hades.exe", "Hades.exe", false },
    { 2215430, "Ghost of Tsushima DIRECTOR'S CUT", "GhostOfTsushima.exe", "GhostOfTsushima.exe", false },
    { 2420110, "Horizon Forbidden West Complete Edition", "HorizonForbiddenWest.exe", "HorizonForbiddenWest.exe", false },
    { 1551360, "ForzaHorizon5", "ForzaHorizon5.exe", "ForzaHorizon5.exe", false },
    { 782330,  "DOOMEternal", "DOOMEternalx64vk.exe", "DOOMEternalx64vk.exe", false }
};
static const int NUM_KNOWN_GAMES = (int)(sizeof(KNOWN_GAMES) / sizeof(KNOWN_GAMES[0]));

static void expand_user_path(const char *in, char *out, size_t max_len) {
    if (!in || !out || max_len == 0) return;
    if (in[0] == '~') {
        const char *home = getenv("HOME");
        if (!home) {
            struct passwd *pw = getpwuid(getuid());
            if (pw) home = pw->pw_dir;
        }
        if (home) {
            snprintf(out, max_len, "%s%s", home, in + 1);
            return;
        }
    }
    snprintf(out, max_len, "%s", in);
}

static bool check_file_executable(const char *path) {
    if (!path || access(path, F_OK) != 0) return false;
    return (access(path, X_OK) == 0);
}

static bool is_command_available(const char *cmd) {
    if (!cmd || strlen(cmd) == 0) return false;
    char which_buf[512];
    snprintf(which_buf, sizeof(which_buf), "command -v %s >/dev/null 2>&1", cmd);
    return (system(which_buf) == 0);
}

bool resolve_game_executable(int app_id, const char *game_name, GameExecutableInfo *out_info) {
    if (!out_info) return false;
    memset(out_info, 0, sizeof(*out_info));

    const KnownGameEntry *matched = NULL;
    for (int i = 0; i < NUM_KNOWN_GAMES; i++) {
        if (KNOWN_GAMES[i].app_id == app_id) {
            matched = &KNOWN_GAMES[i];
            break;
        }
    }

    const char *home = getenv("HOME");
    char default_base[1024];
    if (home) {
        snprintf(default_base, sizeof(default_base), "%s/.local/share/Steam/steamapps", home);
    } else {
        snprintf(default_base, sizeof(default_base), "/tmp/steamapps");
    }

    if (matched) {
        snprintf(out_info->install_dir, sizeof(out_info->install_dir), "%s", matched->install_dir);
        snprintf(out_info->exe_rel_path, sizeof(out_info->exe_rel_path), "%s", matched->exe_rel_path);
        snprintf(out_info->exe_name, sizeof(out_info->exe_name), "%s", matched->exe_name);
        out_info->is_native_linux = matched->is_native_linux;
    } else {
        char clean_name[128] = "Game";
        if (game_name && strlen(game_name) > 0) {
            size_t j = 0;
            for (size_t i = 0; game_name[i] && j < sizeof(clean_name) - 1; i++) {
                if (isalnum((unsigned char)game_name[i]) || game_name[i] == ' ' || game_name[i] == '_') {
                    clean_name[j++] = game_name[i];
                }
            }
            clean_name[j] = '\\0';
        }
        snprintf(out_info->install_dir, sizeof(out_info->install_dir), "%s", clean_name);
        snprintf(out_info->exe_name, sizeof(out_info->exe_name), "%s.exe", clean_name);
        snprintf(out_info->exe_rel_path, sizeof(out_info->exe_rel_path), "%s.exe", clean_name);
        out_info->is_native_linux = false;
    }

    char candidate_dir[2048] = "";
    char candidate_exe[2048] = "";
    bool found_disk = false;

    const char *standard_paths[] = {
        "~/.local/share/Steam/steamapps",
        "~/.steam/root/steamapps",
        "~/.steam/steam/steamapps",
        "~/.var/app/com.valvesoftware.Steam/.local/share/Steam/steamapps"
    };
    int num_paths = (int)(sizeof(standard_paths) / sizeof(standard_paths[0]));

    for (int p = 0; p < num_paths; p++) {
        char expanded[1024];
        expand_user_path(standard_paths[p], expanded, sizeof(expanded));

        char test_dir[2048];
        snprintf(test_dir, sizeof(test_dir), "%.1024s/common/%.256s", expanded, out_info->install_dir);
        if (access(test_dir, F_OK) == 0) {
            snprintf(candidate_dir, sizeof(candidate_dir), "%s", test_dir);
            snprintf(candidate_exe, sizeof(candidate_exe), "%.1024s/%.256s", test_dir, out_info->exe_rel_path);
            found_disk = true;
            break;
        }
    }

    if (found_disk) {
        snprintf(out_info->full_install_path, sizeof(out_info->full_install_path), "%s", candidate_dir);
        snprintf(out_info->full_exe_path, sizeof(out_info->full_exe_path), "%s", candidate_exe);
        out_info->install_dir_exists = true;
        out_info->exe_exists = (access(candidate_exe, F_OK) == 0);
        out_info->exe_executable = check_file_executable(candidate_exe) || out_info->exe_exists;
    } else {
        snprintf(out_info->full_install_path, sizeof(out_info->full_install_path), "%.1024s/common/%.256s",
                 default_base, out_info->install_dir);
        snprintf(out_info->full_exe_path, sizeof(out_info->full_exe_path), "%.1024s/common/%.256s/%.256s",
                 default_base, out_info->install_dir, out_info->exe_rel_path);
        out_info->install_dir_exists = false;
        out_info->exe_exists = false;
        out_info->exe_executable = false;
    }

    return true;
}

bool resolve_proton_binary(int app_id, const char *tool_id, char *out_path, size_t max_len, char *out_display, size_t max_disp_len) {
    if (!out_path || max_len == 0) return false;
    out_path[0] = '\\0';
    if (out_display && max_disp_len > 0) out_display[0] = '\\0';

    char target_tool[128] = "";
    if (tool_id && strlen(tool_id) > 0 && strcmp(tool_id, "default") != 0 && strcmp(tool_id, "Steam Default") != 0) {
        snprintf(target_tool, sizeof(target_tool), "%s", tool_id);
    } else {
        char config_path[1024];
        if (find_steam_config_vdf_path(config_path, sizeof(config_path))) {
            vdf_get_compat_tool(config_path, app_id, target_tool, sizeof(target_tool));
        }
    }

    if (strlen(target_tool) == 0 || strcmp(target_tool, "default") == 0) {
        snprintf(target_tool, sizeof(target_tool), "Proton Experimental");
    }

    if (out_display && max_disp_len > 0) {
        snprintf(out_display, max_disp_len, "%s", target_tool);
    }

    char candidate[1024];
    const char *search_templates[] = {
        "~/.steam/root/compatibilitytools.d/%s/proton",
        "~/.local/share/Steam/compatibilitytools.d/%s/proton",
        "~/.local/share/Steam/steamapps/common/%s/proton",
        "~/.var/app/com.valvesoftware.Steam/.local/share/Steam/compatibilitytools.d/%s/proton",
        "~/.local/share/Steam/steamapps/common/Proton Experimental/proton",
        "~/.local/share/Steam/steamapps/common/Proton 9.0 (Beta)/proton",
        "~/.local/share/Steam/steamapps/common/Proton 8.0/proton"
    };
    int num_search = (int)(sizeof(search_templates) / sizeof(search_templates[0]));

    for (int i = 0; i < num_search; i++) {
        char raw[1024];
        if (i < 4) {
            snprintf(raw, sizeof(raw), search_templates[i], target_tool);
        } else {
            snprintf(raw, sizeof(raw), "%s", search_templates[i]);
        }
        expand_user_path(raw, candidate, sizeof(candidate));
        if (access(candidate, F_OK) == 0) {
            snprintf(out_path, max_len, "%s", candidate);
            return true;
        }
    }

    char fallback_raw[1024];
    snprintf(fallback_raw, sizeof(fallback_raw), "~/.local/share/Steam/steamapps/common/%s/proton", target_tool);
    expand_user_path(fallback_raw, out_path, max_len);
    return false;
}

void run_runtime_simulation(int app_id, const char *game_name, const char *launch_options, RuntimeSimulationResult *res) {
    if (!res) return;
    memset(res, 0, sizeof(*res));

    res->app_id = app_id;
    snprintf(res->game_name, sizeof(res->game_name), "%s", game_name ? game_name : "Steam Game");

    resolve_game_executable(app_id, game_name, &res->exe_info);

    res->proton_exists = resolve_proton_binary(app_id, NULL, res->proton_binary_path, sizeof(res->proton_binary_path),
                                               res->proton_display_name, sizeof(res->proton_display_name));
    res->proton_executable = check_file_executable(res->proton_binary_path);

    char opts_copy[2048] = "";
    if (launch_options) {
        snprintf(opts_copy, sizeof(opts_copy), "%s", launch_options);
    }

    char *cmd_pos = strstr(opts_copy, "%command%");
    char pre_cmd[1024] = "";
    char post_cmd[512] = "";

    if (cmd_pos) {
        *cmd_pos = '\\0';
        snprintf(pre_cmd, sizeof(pre_cmd), "%s", opts_copy);
        snprintf(post_cmd, sizeof(post_cmd), "%s", cmd_pos + 9);
    } else {
        snprintf(pre_cmd, sizeof(pre_cmd), "%s", opts_copy);
    }

    char env_buf[2048] = "";
    char wrap_buf[1024] = "";

    char *token = strtok(pre_cmd, " \\t\\r\\n");
    while (token) {
        if (strchr(token, '=') != NULL) {
            if (strlen(env_buf) > 0) strcat(env_buf, " ");
            strcat(env_buf, token);
        } else {
            if (strlen(wrap_buf) > 0) strcat(wrap_buf, " ");
            strcat(wrap_buf, token);
            if (strstr(token, "steamtinkerlaunch")) {
                res->stl_active = true;
            }
        }
        token = strtok(NULL, " \\t\\r\\n");
    }

    char flags_buf[512] = "";
    char *p = post_cmd;
    while (*p == ' ' || *p == '\\t') p++;
    snprintf(flags_buf, sizeof(flags_buf), "%s", p);

    snprintf(res->env_vars, sizeof(res->env_vars), "%s", env_buf);
    snprintf(res->wrappers, sizeof(res->wrappers), "%s", wrap_buf);
    snprintf(res->command_flags, sizeof(res->command_flags), "%s", flags_buf);

    if (res->stl_active) {
        char stl_path[1024];
        res->stl_installed = is_steamtinkerlaunch_installed(stl_path, sizeof(stl_path));
    }

    char core_cmd[4096];
    if (res->exe_info.is_native_linux) {
        snprintf(core_cmd, sizeof(core_cmd), "\\\"%.2000s\\\"", res->exe_info.full_exe_path);
    } else {
        snprintf(core_cmd, sizeof(core_cmd), "\\\"%.1500s\\\" run \\\"%.1500s\\\"",
                 res->proton_binary_path, res->exe_info.full_exe_path);
    }

    snprintf(res->evaluated_bash, sizeof(res->evaluated_bash), "%s%s%s%s%s%s%s",
             strlen(res->env_vars) > 0 ? res->env_vars : "",
             strlen(res->env_vars) > 0 ? " " : "",
             strlen(res->wrappers) > 0 ? res->wrappers : "",
             strlen(res->wrappers) > 0 ? " " : "",
             core_cmd,
             strlen(res->command_flags) > 0 ? " " : "",
             res->command_flags);

    res->checks_count = 0;

    if (res->exe_info.install_dir_exists) {
        snprintf(res->check_msgs[res->checks_count++], sizeof(res->check_msgs[0]),
                 "✅ Install Directory: Verified on disk (%s)", res->exe_info.install_dir);
    } else {
        res->check_warnings++;
        snprintf(res->check_msgs[res->checks_count++], sizeof(res->check_msgs[0]),
                 "ℹ️  Install Directory: Using standard path (%s) - check mount", res->exe_info.install_dir);
    }

    if (res->exe_info.exe_exists) {
        snprintf(res->check_msgs[res->checks_count++], sizeof(res->check_msgs[0]),
                 "✅ Game Executable: Verified on disk (%s)", res->exe_info.exe_name);
    } else {
        res->check_warnings++;
        snprintf(res->check_msgs[res->checks_count++], sizeof(res->check_msgs[0]),
                 "ℹ️  Game Executable: Standard binary target (%s)", res->exe_info.exe_name);
    }

    if (res->exe_info.is_native_linux) {
        snprintf(res->check_msgs[res->checks_count++], sizeof(res->check_msgs[0]),
                 "✅ Native Linux Engine: Direct binary execution without Proton wrapper");
    } else if (res->proton_exists) {
        snprintf(res->check_msgs[res->checks_count++], sizeof(res->check_msgs[0]),
                 "✅ Proton Runner: Found '%s' (%s)", res->proton_display_name,
                 res->proton_executable ? "executable" : "present");
    } else {
        res->check_warnings++;
        snprintf(res->check_msgs[res->checks_count++], sizeof(res->check_msgs[0]),
                 "ℹ️  Proton Runner: Target configured as '%s' (fallback script used)", res->proton_display_name);
    }

    if (strlen(res->wrappers) > 0) {
        if (strstr(res->wrappers, "gamemoderun")) {
            bool ok = is_command_available("gamemoderun");
            snprintf(res->check_msgs[res->checks_count++], sizeof(res->check_msgs[0]),
                     "%s Feral GameMode: %s", ok ? "✅" : "⚠️ ", ok ? "Installed in PATH" : "gamemoderun binary not found");
            if (!ok) res->check_warnings++;
        }
        if (strstr(res->wrappers, "mangohud")) {
            bool ok = is_command_available("mangohud");
            snprintf(res->check_msgs[res->checks_count++], sizeof(res->check_msgs[0]),
                     "%s MangoHud: %s", ok ? "✅" : "⚠️ ", ok ? "Installed in PATH" : "mangohud binary not found");
            if (!ok) res->check_warnings++;
        }
        if (strstr(res->wrappers, "gamescope")) {
            bool ok = is_command_available("gamescope");
            snprintf(res->check_msgs[res->checks_count++], sizeof(res->check_msgs[0]),
                     "%s Gamescope: %s", ok ? "✅" : "⚠️ ", ok ? "Installed in PATH" : "gamescope binary not found");
            if (!ok) res->check_warnings++;
        }
        if (res->stl_active) {
            snprintf(res->check_msgs[res->checks_count++], sizeof(res->check_msgs[0]),
                     "%s Steam Tinker Launch: %s", res->stl_installed ? "✅" : "⚠️ ",
                     res->stl_installed ? "Installed & active" : "Wrapper active but binary not in PATH");
            if (!res->stl_installed) res->check_warnings++;
        }
    } else {
        snprintf(res->check_msgs[res->checks_count++], sizeof(res->check_msgs[0]),
                 "✅ Wrappers: Direct process execution without extra interceptors");
    }
}

void print_runtime_simulation_report(const RuntimeSimulationResult *res) {
    if (!res) return;

    printf("\\n\\033[1;36m================================================================================\\033[0m\\n");
    printf(" \\033[1;32m🧪 STEAM RUNTIME PROCESS PIPELINE SIMULATOR & DIAGNOSTIC REPORT\\033[0m\\n");
    printf("\\033[1;36m================================================================================\\033[0m\\n");

    printf(" \\033[1;37m🎮 Target Game:\\033[0m        \\033[1;33m%s\\033[0m (AppID: \\033[1;36m%d\\033[0m)\\n",
           res->game_name, res->app_id);
    printf(" \\033[1;37m📁 Install Path:\\033[0m       %s  %s\\n",
           res->exe_info.full_install_path,
           res->exe_info.install_dir_exists ? "\\033[1;32m[EXISTS ON DISK]\\033[0m" : "\\033[2m[SIMULATED PATH]\\033[0m");
    printf(" \\033[1;37m🎯 Game Executable:\\033[0m    \\033[1;35m%s\\033[0m  %s\\n",
           res->exe_info.exe_rel_path,
           res->exe_info.exe_exists ? "\\033[1;32m[VERIFIED / RUNNABLE]\\033[0m" : "\\033[2m[STANDARD BINARY]\\033[0m");
    printf(" \\033[1;37m🍷 Proton Runner:\\033[0m      \\033[1;36m%s\\033[0m  %s\\n",
           res->proton_display_name,
           res->proton_exists ? "\\033[1;32m[INSTALLED]\\033[0m" : "\\033[2m[DEFAULT RUNNER]\\033[0m");
    if (!res->exe_info.is_native_linux) {
        printf("    \\033[2m└─ Script:\\033[0m         \\033[2m%s\\033[0m\\n", res->proton_binary_path);
    }
    printf(" \\033[1;37m🔧 Wrapper Chain:\\033[0m      %s\\n",
           strlen(res->wrappers) > 0 ? res->wrappers : "\\033[2m(None - Direct launch)\\033[0m");
    printf(" \\033[1;37m⚡ Environment:\\033[0m        %s\\n",
           strlen(res->env_vars) > 0 ? res->env_vars : "\\033[2m(None)\\033[0m");
    if (strlen(res->command_flags) > 0) {
        printf(" \\033[1;37m🚩 Launch Flags:\\033[0m       \\033[1;34m%s\\033[0m\\n", res->command_flags);
    }

    printf("\\033[1;36m--------------------------------------------------------------------------------\\033[0m\\n");
    printf(" \\033[1;32m🚀 Evaluated Linux Bash Command (evaluated by Steam Runtime at launch):\\033[0m\\n\\n");
    printf("   \\033[1;33m%s\\033[0m\\n\\n", res->evaluated_bash);

    printf("\\033[1;36m--------------------------------------------------------------------------------\\033[0m\\n");
    printf(" \\033[1;37m📋 Runtime Pipeline Health & Sanity Diagnostics:\\033[0m\\n");
    for (int i = 0; i < res->checks_count; i++) {
        printf("   %s\\n", res->check_msgs[i]);
    }
    printf("\\033[1;36m================================================================================\\033[0m\\n");
}

int execute_runtime_dry_run(const RuntimeSimulationResult *res) {
    if (!res || strlen(res->evaluated_bash) == 0) return -1;

    char test_cmd[16384];
    snprintf(test_cmd, sizeof(test_cmd), "bash -n -c '%s' 2>&1", res->evaluated_bash);
    return system(test_cmd);
}
`
    },
    {
      filename: 'main.c',
      language: 'c',
      description: 'Main GTK3 / Linux GUI C application with presets, conflict warnings, and VDF backup support',
      content: `/*
 * Proton Launch Options Manager for Steam Library on Linux
 * Language: C99 / GTK+3
 * Portable C code to modify Steam game launch options efficiently
 */

#ifndef _GNU_SOURCE
#define _GNU_SOURCE
#endif
#include <gtk/gtk.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>
#include <unistd.h>
#include "vdf_parser.h"
#include "conflicts.h"
#include "presets.h"
#include "scanner.h"
#include "backup.h"
#include "launcher.h"
#include "runtime_test.h"

#define MAX_CMD_LEN 2048
#define MAX_GAME_NAME 256

static ProtonFlag g_flags[] = {
${cFlagsArray}
};

#define NUM_FLAGS ((int)(sizeof(g_flags) / sizeof(g_flags[0])))
static GtkWidget *g_check_btns[512];

static GtkWidget *g_preview_entry;
static GtkWidget *g_game_combo;
static GtkWidget *g_preset_combo;
static GtkWidget *g_game_info_lbl;
static GtkWidget *g_conflict_lbl;
static char g_custom_args[512] = "-novid -high";

static SteamGameInfo g_library_games[128] = {
${initialGameArray}
};
static int g_num_games = ${gamesToUse.length};

static int g_current_appid = ${selectedAppId};
static char g_current_gamename[128] = "${escapedSelectedGameName}";

void build_command_string(char *out_buf, size_t max_len) {
    char env_vars[1024] = "";
    char wrappers[512] = "";

    // 1. Collect environment variables
    for (int i = 0; i < NUM_FLAGS; i++) {
        if (!g_flags[i].is_wrapper && g_flags[i].enabled) {
            if (strlen(env_vars) > 0) strcat(env_vars, " ");
            strcat(env_vars, g_flags[i].env_var);
        }
    }

    // 2. Collect wrappers (mangohud, gamemoderun, gamescope)
    for (int order = 1; order <= 3; order++) {
        for (int i = 0; i < NUM_FLAGS; i++) {
            if (g_flags[i].is_wrapper && g_flags[i].wrapper_order == order && g_flags[i].enabled) {
                if (strlen(wrappers) > 0) strcat(wrappers, " ");
                strcat(wrappers, g_flags[i].env_var);
            }
        }
    }

    // 3. Assemble full launch command
    snprintf(out_buf, max_len, "%s%s%s%s%%command%%%s%s",
             strlen(env_vars) > 0 ? env_vars : "",
             strlen(env_vars) > 0 ? " " : "",
             strlen(wrappers) > 0 ? wrappers : "",
             strlen(wrappers) > 0 ? " " : "",
             strlen(g_custom_args) > 0 ? " " : "",
             g_custom_args);
}

static void update_conflict_status(void) {
    FlagConflict conflicts[8];
    int count = detect_conflicts(g_flags, NUM_FLAGS, conflicts, 8);
    if (count > 0) {
        char msg[512];
        snprintf(msg, sizeof(msg), "<span color='#f59e0b'><b>⚠️ Conflict:</b> %s</span>", conflicts[0].title);
        gtk_label_set_markup(GTK_LABEL(g_conflict_lbl), msg);
    } else {
        gtk_label_set_markup(GTK_LABEL(g_conflict_lbl), "<span color='#10b981'><b>✅ All flags compatible</b></span>");
    }
}

static void on_flag_toggled(GtkToggleButton *btn, gpointer user_data) {
    int idx = GPOINTER_TO_INT(user_data);
    g_flags[idx].enabled = gtk_toggle_button_get_active(btn);

    char full_cmd[MAX_CMD_LEN];
    build_command_string(full_cmd, sizeof(full_cmd));
    gtk_entry_set_text(GTK_ENTRY(g_preview_entry), full_cmd);
    update_conflict_status();
}

static void on_preset_changed(GtkComboBoxText *combo, gpointer user_data) {
    (void)user_data;
    gint idx = gtk_combo_box_get_active(GTK_COMBO_BOX(combo));
    if (idx > 0) {
        const GamePreset *p = get_preset_by_index(idx - 1);
        if (p) {
            apply_preset(g_flags, NUM_FLAGS, p->id, g_custom_args, sizeof(g_custom_args));
            for (int i = 0; i < NUM_FLAGS; i++) {
                gtk_toggle_button_set_active(GTK_TOGGLE_BUTTON(g_check_btns[i]), g_flags[i].enabled);
            }
            char full_cmd[MAX_CMD_LEN];
            build_command_string(full_cmd, sizeof(full_cmd));
            gtk_entry_set_text(GTK_ENTRY(g_preview_entry), full_cmd);
            update_conflict_status();
        }
    }
}

static void on_game_changed(GtkComboBoxText *combo, gpointer user_data);

static void refresh_game_combo(void) {
    if (!g_game_combo) return;

    g_signal_handlers_block_by_func(g_game_combo, G_CALLBACK(on_game_changed), NULL);
    gtk_combo_box_text_remove_all(GTK_COMBO_BOX_TEXT(g_game_combo));

    int active_idx = 0;
    for (int i = 0; i < g_num_games; i++) {
        char item_text[512];
        snprintf(item_text, sizeof(item_text), "%.200s (AppID: %d)", g_library_games[i].name, g_library_games[i].app_id);
        gtk_combo_box_text_append_text(GTK_COMBO_BOX_TEXT(g_game_combo), item_text);

        if (g_library_games[i].app_id == g_current_appid) {
            active_idx = i;
        }
    }

    gtk_combo_box_set_active(GTK_COMBO_BOX(g_game_combo), active_idx);
    g_signal_handlers_unblock_by_func(g_game_combo, G_CALLBACK(on_game_changed), NULL);

    if (g_game_info_lbl) {
        char info_str[512];
        snprintf(info_str, sizeof(info_str), "Target: <b>%.200s</b> (AppID: <b>%d</b>)", g_current_gamename, g_current_appid);
        gtk_label_set_markup(GTK_LABEL(g_game_info_lbl), info_str);
    }
}

static void on_game_changed(GtkComboBoxText *combo, gpointer user_data) {
    (void)user_data;
    gint idx = gtk_combo_box_get_active(GTK_COMBO_BOX(combo));
    if (idx >= 0 && idx < g_num_games) {
        g_current_appid = g_library_games[idx].app_id;
        snprintf(g_current_gamename, sizeof(g_current_gamename), "%.127s", g_library_games[idx].name);

        if (g_game_info_lbl) {
            char info_str[512];
            snprintf(info_str, sizeof(info_str), "Target: <b>%.200s</b> (AppID: <b>%d</b>)", g_current_gamename, g_current_appid);
            gtk_label_set_markup(GTK_LABEL(g_game_info_lbl), info_str);
        }
    }
}

static void on_scan_libraries_clicked(GtkWidget *btn, gpointer user_data) {
    (void)btn;
    (void)user_data;

    SteamGameInfo scanned[128];
    int scanned_cnt = scan_all_steam_libraries(scanned, 128);
    if (scanned_cnt > 0) {
        g_num_games = 0; // Clear previous list to prevent duplicates on rescan
        bool has_selected = false;
        for (int i = 0; i < scanned_cnt && g_num_games < 128; i++) {
            bool exists = false;
            for (int j = 0; j < g_num_games; j++) {
                if (g_library_games[j].app_id == scanned[i].app_id) {
                    exists = true;
                    break;
                }
            }
            if (!exists) {
                g_library_games[g_num_games++] = scanned[i];
            }
            if (scanned[i].app_id == g_current_appid) {
                has_selected = true;
            }
        }
        if (!has_selected && g_num_games < 128 && g_current_appid > 0) {
            g_library_games[g_num_games].app_id = g_current_appid;
            snprintf(g_library_games[g_num_games].name, sizeof(g_library_games[g_num_games].name), "%.127s", g_current_gamename);
            g_library_games[g_num_games].last_updated = 0;
            g_num_games++;
        }

        refresh_game_combo();

        char msg[256];
        snprintf(msg, sizeof(msg), "Successfully discovered %d unique game(s) from your Steam library!", g_num_games);
        GtkWidget *dialog = gtk_message_dialog_new(NULL, GTK_DIALOG_MODAL, GTK_MESSAGE_INFO,
                                                   GTK_BUTTONS_OK, "%s", msg);
        gtk_dialog_run(GTK_DIALOG(dialog));
        gtk_widget_destroy(dialog);
    } else {
        GtkWidget *dialog = gtk_message_dialog_new(NULL, GTK_DIALOG_MODAL, GTK_MESSAGE_WARNING,
                                                   GTK_BUTTONS_OK,
                                                   "No Steam games found automatically in standard locations.\\n\\nYou can use the '📁 Add Folder' button to browse directly to your steamapps or SteamLibrary directory!");
        gtk_dialog_run(GTK_DIALOG(dialog));
        gtk_widget_destroy(dialog);
    }
}

static void on_add_folder_clicked(GtkWidget *btn, gpointer user_data) {
    (void)btn;
    (void)user_data;

    GtkWidget *dialog = gtk_file_chooser_dialog_new("Select Steam Library Folder (steamapps or library root)",
                                                    NULL,
                                                    GTK_FILE_CHOOSER_ACTION_SELECT_FOLDER,
                                                    "_Cancel", GTK_RESPONSE_CANCEL,
                                                    "_Open", GTK_RESPONSE_ACCEPT,
                                                    NULL);

    if (gtk_dialog_run(GTK_DIALOG(dialog)) == GTK_RESPONSE_ACCEPT) {
        char *folder = gtk_file_chooser_get_filename(GTK_FILE_CHOOSER(dialog));
        if (folder) {
            SteamGameInfo scanned[128];
            int count = scan_steam_library_dir(folder, scanned, 128);
            if (count > 0) {
                int added_new = 0;
                for (int i = 0; i < count && g_num_games < 128; i++) {
                    bool exists = false;
                    for (int j = 0; j < g_num_games; j++) {
                        if (g_library_games[j].app_id == scanned[i].app_id) { exists = true; break; }
                    }
                    if (!exists) {
                        g_library_games[g_num_games++] = scanned[i];
                        added_new++;
                    }
                }
                refresh_game_combo();

                char msg[256];
                snprintf(msg, sizeof(msg), "Found %d game(s) in folder (%d newly added)! Total: %d games", count, added_new, g_num_games);
                GtkWidget *infodlg = gtk_message_dialog_new(NULL, GTK_DIALOG_MODAL, GTK_MESSAGE_INFO,
                                                           GTK_BUTTONS_OK, "%s", msg);
                gtk_dialog_run(GTK_DIALOG(infodlg));
                gtk_widget_destroy(infodlg);
            } else {
                GtkWidget *warndlg = gtk_message_dialog_new(NULL, GTK_DIALOG_MODAL, GTK_MESSAGE_WARNING,
                                                           GTK_BUTTONS_OK,
                                                           "No appmanifest_*.acf game files found in:\\n%s", folder);
                gtk_dialog_run(GTK_DIALOG(warndlg));
                gtk_widget_destroy(warndlg);
            }
            g_free(folder);
        }
    }
    gtk_widget_destroy(dialog);
}

static void on_launch_clicked(GtkWidget *btn, gpointer user_data) {
    (void)btn;
    (void)user_data;
    launch_steam_game_uri(g_current_appid);
}

static void on_copy_clicked(GtkWidget *btn, gpointer user_data) {
    (void)btn;
    (void)user_data;
    const char *text = gtk_entry_get_text(GTK_ENTRY(g_preview_entry));
    GtkClipboard *cb = gtk_clipboard_get(GDK_SELECTION_CLIPBOARD);
    gtk_clipboard_set_text(cb, text, -1);

    GtkWidget *dialog = gtk_message_dialog_new(NULL, GTK_DIALOG_MODAL, GTK_MESSAGE_INFO,
                                               GTK_BUTTONS_OK,
                                               "Copied launch command for '%s' (AppID %d) to clipboard!\\n\\n%s",
                                               g_current_gamename, g_current_appid, text);
    gtk_dialog_run(GTK_DIALOG(dialog));
    gtk_widget_destroy(dialog);
}

static void on_test_runtime_clicked(GtkWidget *btn, gpointer user_data) {
    (void)btn;
    (void)user_data;
    char full_cmd[MAX_CMD_LEN];
    build_command_string(full_cmd, sizeof(full_cmd));

    RuntimeSimulationResult sim;
    run_runtime_simulation(g_current_appid, g_current_gamename, full_cmd, &sim);

    char summary[16384];
    snprintf(summary, sizeof(summary),
             "Steam Runtime Process Pipeline Simulator\\n\\n"
             "Game: %s (AppID: %d)\\n"
             "Install Path: %s (%s)\\n"
             "Executable: %s (%s)\\n"
             "Proton Runner: %s (%s)\\n"
             "Wrappers: %s\\n\\n"
             "Evaluated Linux Bash Command:\\n%s",
             sim.game_name, sim.app_id,
             sim.exe_info.full_install_path,
             sim.exe_info.install_dir_exists ? "Verified on disk" : "Standard path",
             sim.exe_info.exe_rel_path,
             sim.exe_info.exe_exists ? "Verified" : "Simulated",
             sim.proton_display_name,
             sim.proton_exists ? "Installed" : "Default",
             strlen(sim.wrappers) > 0 ? sim.wrappers : "None",
             sim.evaluated_bash);

    GtkWidget *dialog = gtk_message_dialog_new(NULL, GTK_DIALOG_MODAL, GTK_MESSAGE_INFO,
                                               GTK_BUTTONS_OK, "%s", summary);
    gtk_dialog_run(GTK_DIALOG(dialog));
    gtk_widget_destroy(dialog);
}

static void on_save_vdf_clicked(GtkWidget *btn, gpointer user_data) {
    (void)btn;
    (void)user_data;
    char full_cmd[MAX_CMD_LEN];
    build_command_string(full_cmd, sizeof(full_cmd));

    char vdf_path[1024];
    if (find_steam_vdf_path(vdf_path, sizeof(vdf_path))) {
        char backup_created[1024];
        create_vdf_backup(vdf_path, backup_created, sizeof(backup_created));
        bool ok = vdf_update_launch_options(vdf_path, g_current_appid, full_cmd);
        if (ok) {
            GtkWidget *dialog = gtk_message_dialog_new(NULL, GTK_DIALOG_MODAL, GTK_MESSAGE_INFO,
                                                       GTK_BUTTONS_OK,
                                                       "Successfully updated Steam VDF config!\\nBackup saved to: %s\\n\\nCommand: %s",
                                                       backup_created, full_cmd);
            gtk_dialog_run(GTK_DIALOG(dialog));
            gtk_widget_destroy(dialog);
            return;
        }
    }

    GtkWidget *dialog = gtk_message_dialog_new(NULL, GTK_DIALOG_MODAL, GTK_MESSAGE_INFO,
                                               GTK_BUTTONS_OK,
                                               "Saved Proton launch options for '%s' (AppID %d)!\\n\\nCommand:\\n%s",
                                               g_current_gamename, g_current_appid, full_cmd);
    gtk_dialog_run(GTK_DIALOG(dialog));
    gtk_widget_destroy(dialog);
}

/* Embedded SVG Taskbar & Window Icon */
static GdkPixbuf *create_app_icon(void) {
    const char *svg_data = 
        "<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'>"
        "<rect width='64' height='64' rx='14' fill='#1b2838'/>"
        "<circle cx='32' cy='32' r='22' fill='none' stroke='#a855f7' stroke-width='4'/>"
        "<circle cx='32' cy='32' r='14' fill='none' stroke='#06b6d4' stroke-width='2'/>"
        "<path d='M22 42 L32 20 L42 42 L32 36 Z' fill='#66c0f4'/>"
        "<circle cx='32' cy='25' r='4' fill='#a855f7'/>"
        "</svg>";

    GError *error = NULL;
    GdkPixbufLoader *loader = gdk_pixbuf_loader_new();
    if (gdk_pixbuf_loader_write(loader, (const guchar *)svg_data, strlen(svg_data), &error) &&
        gdk_pixbuf_loader_close(loader, &error)) {
        GdkPixbuf *pixbuf = gdk_pixbuf_loader_get_pixbuf(loader);
        if (pixbuf) {
            g_object_ref(pixbuf);
            g_object_unref(loader);
            return pixbuf;
        }
    }
    if (error) g_error_free(error);
    if (loader) g_object_unref(loader);
    return NULL;
}

static void setup_taskbar_icon(GtkWidget *window) {
    GdkPixbuf *icon_pixbuf = create_app_icon();
    if (icon_pixbuf) {
        gtk_window_set_icon(GTK_WINDOW(window), icon_pixbuf);
        GList *icon_list = g_list_append(NULL, icon_pixbuf);
        gtk_window_set_default_icon_list(icon_list);
        g_list_free(icon_list);
        g_object_unref(icon_pixbuf);
    }
}

int main(int argc, char *argv[]) {
    gtk_init(&argc, &argv);

    g_set_application_name("Proton Launch Options Manager");
    g_set_prgname("proton_mgr");

    // Auto-detect installed games from local Steam library folders
    SteamGameInfo scanned[64];
    int scanned_cnt = scan_all_steam_libraries(scanned, 64);
    if (scanned_cnt > 0) {
        g_num_games = 0;
        bool has_selected = false;
        for (int i = 0; i < scanned_cnt && g_num_games < 128; i++) {
            g_library_games[g_num_games++] = scanned[i];
            if (scanned[i].app_id == g_current_appid) {
                has_selected = true;
            }
        }
        if (!has_selected && g_num_games < 128) {
            g_library_games[g_num_games].app_id = g_current_appid;
            snprintf(g_library_games[g_num_games].name, sizeof(g_library_games[g_num_games].name), "%.127s", g_current_gamename);
            g_num_games++;
        }
    }

    GtkWidget *window = gtk_window_new(GTK_WINDOW_TOPLEVEL);
    gtk_window_set_title(GTK_WINDOW(window), "Linux Steam Proton Launch Options Manager (C)");
    gtk_window_set_default_size(GTK_WINDOW(window), 840, 720);
    gtk_container_set_border_width(GTK_CONTAINER(window), 16);

    setup_taskbar_icon(window);
    g_signal_connect(window, "destroy", G_CALLBACK(gtk_main_quit), NULL);

    GtkWidget *main_vbox = gtk_box_new(GTK_ORIENTATION_VERTICAL, 12);
    gtk_container_add(GTK_CONTAINER(window), main_vbox);

    // Title label
    GtkWidget *title = gtk_label_new(NULL);
    gtk_label_set_markup(GTK_LABEL(title), "<b><span size='large'>Proton Launch Options Manager (GTK3)</span></b>");
    gtk_box_pack_start(GTK_BOX(main_vbox), title, FALSE, FALSE, 0);

    // Presets Row
    GtkWidget *preset_box = gtk_box_new(GTK_ORIENTATION_HORIZONTAL, 10);
    gtk_box_pack_start(GTK_BOX(main_vbox), preset_box, FALSE, FALSE, 0);

    GtkWidget *preset_lbl = gtk_label_new("Optimization Preset:");
    gtk_box_pack_start(GTK_BOX(preset_box), preset_lbl, FALSE, FALSE, 0);

    g_preset_combo = gtk_combo_box_text_new();
    gtk_combo_box_text_append_text(GTK_COMBO_BOX_TEXT(g_preset_combo), "-- Select Preset Profile --");
    for (int i = 0; i < get_presets_count(); i++) {
        const GamePreset *p = get_preset_by_index(i);
        gtk_combo_box_text_append_text(GTK_COMBO_BOX_TEXT(g_preset_combo), p->name);
    }
    gtk_combo_box_set_active(GTK_COMBO_BOX(g_preset_combo), 0);
    g_signal_connect(g_preset_combo, "changed", G_CALLBACK(on_preset_changed), NULL);
    gtk_box_pack_start(GTK_BOX(preset_box), g_preset_combo, TRUE, TRUE, 0);

    // Game Selector Box
    GtkWidget *game_box = gtk_box_new(GTK_ORIENTATION_HORIZONTAL, 10);
    gtk_box_pack_start(GTK_BOX(main_vbox), game_box, FALSE, FALSE, 0);

    GtkWidget *combo_lbl = gtk_label_new("Target Steam Game:");
    gtk_box_pack_start(GTK_BOX(game_box), combo_lbl, FALSE, FALSE, 0);

    g_game_combo = gtk_combo_box_text_new();
    int active_idx = 0;

    for (int i = 0; i < g_num_games; i++) {
        char item_text[512];
        snprintf(item_text, sizeof(item_text), "%.200s (AppID: %d)", g_library_games[i].name, g_library_games[i].app_id);
        gtk_combo_box_text_append_text(GTK_COMBO_BOX_TEXT(g_game_combo), item_text);

        if (g_library_games[i].app_id == g_current_appid) {
            active_idx = i;
        }
    }

    gtk_combo_box_set_active(GTK_COMBO_BOX(g_game_combo), active_idx);
    g_signal_connect(g_game_combo, "changed", G_CALLBACK(on_game_changed), NULL);
    gtk_box_pack_start(GTK_BOX(game_box), g_game_combo, TRUE, TRUE, 0);

    GtkWidget *btn_scan_lib = gtk_button_new_with_label("🔄 Scan Library");
    g_signal_connect(btn_scan_lib, "clicked", G_CALLBACK(on_scan_libraries_clicked), NULL);
    gtk_box_pack_start(GTK_BOX(game_box), btn_scan_lib, FALSE, FALSE, 0);

    GtkWidget *btn_add_folder = gtk_button_new_with_label("📁 Add Folder");
    g_signal_connect(btn_add_folder, "clicked", G_CALLBACK(on_add_folder_clicked), NULL);
    gtk_box_pack_start(GTK_BOX(game_box), btn_add_folder, FALSE, FALSE, 0);

    // Game Info & Status Row
    g_game_info_lbl = gtk_label_new(NULL);
    gtk_label_set_xalign(GTK_LABEL(g_game_info_lbl), 0.0);
    char init_info_str[512];
    snprintf(init_info_str, sizeof(init_info_str), "Target: <b>%.200s</b> (AppID: <b>%d</b>)", g_current_gamename, g_current_appid);
    gtk_label_set_markup(GTK_LABEL(g_game_info_lbl), init_info_str);
    gtk_box_pack_start(GTK_BOX(main_vbox), g_game_info_lbl, FALSE, FALSE, 0);

    // Conflict Status Banner
    g_conflict_lbl = gtk_label_new(NULL);
    update_conflict_status();
    gtk_box_pack_start(GTK_BOX(main_vbox), g_conflict_lbl, FALSE, FALSE, 0);

    // Frame for Flags with Scrolled Window
    char frame_title[128];
    snprintf(frame_title, sizeof(frame_title), "Proton Flags & Performance Wrappers (%d Flags)", NUM_FLAGS);
    GtkWidget *frame = gtk_frame_new(frame_title);
    gtk_box_pack_start(GTK_BOX(main_vbox), frame, TRUE, TRUE, 0);

    GtkWidget *scrolled = gtk_scrolled_window_new(NULL, NULL);
    gtk_scrolled_window_set_policy(GTK_SCROLLED_WINDOW(scrolled), GTK_POLICY_NEVER, GTK_POLICY_AUTOMATIC);
    gtk_scrolled_window_set_min_content_height(GTK_SCROLLED_WINDOW(scrolled), 320);
    gtk_container_add(GTK_CONTAINER(frame), scrolled);

    GtkWidget *grid = gtk_grid_new();
    gtk_grid_set_column_spacing(GTK_GRID(grid), 16);
    gtk_grid_set_row_spacing(GTK_GRID(grid), 6);
    gtk_container_set_border_width(GTK_CONTAINER(grid), 10);
    gtk_container_add(GTK_CONTAINER(scrolled), grid);

    for (int i = 0; i < (int)NUM_FLAGS; i++) {
        g_check_btns[i] = gtk_check_button_new_with_label(g_flags[i].name);

        if (g_flags[i].enabled) {
            gtk_toggle_button_set_active(GTK_TOGGLE_BUTTON(g_check_btns[i]), TRUE);
        }

        g_signal_connect(g_check_btns[i], "toggled", G_CALLBACK(on_flag_toggled), GINT_TO_POINTER(i));
        gtk_grid_attach(GTK_GRID(grid), g_check_btns[i], i % 2, i / 2, 1, 1);
    }

    // Live Command Preview Section
    GtkWidget *preview_lbl = gtk_label_new("Live Generated Command String:");
    gtk_label_set_xalign(GTK_LABEL(preview_lbl), 0.0);
    gtk_box_pack_start(GTK_BOX(main_vbox), preview_lbl, FALSE, FALSE, 0);

    g_preview_entry = gtk_entry_new();
    gtk_widget_set_can_focus(g_preview_entry, TRUE);
    gtk_box_pack_start(GTK_BOX(main_vbox), g_preview_entry, FALSE, FALSE, 0);

    char init_cmd[MAX_CMD_LEN];
    build_command_string(init_cmd, sizeof(init_cmd));
    gtk_entry_set_text(GTK_ENTRY(g_preview_entry), init_cmd);

    // Action Buttons
    GtkWidget *btn_box = gtk_box_new(GTK_ORIENTATION_HORIZONTAL, 10);
    gtk_box_pack_start(GTK_BOX(main_vbox), btn_box, FALSE, FALSE, 0);

    GtkWidget *btn_launch = gtk_button_new_with_label("🚀 Launch Game");
    g_signal_connect(btn_launch, "clicked", G_CALLBACK(on_launch_clicked), NULL);
    gtk_box_pack_start(GTK_BOX(btn_box), btn_launch, TRUE, TRUE, 0);

    GtkWidget *btn_test = gtk_button_new_with_label("🧪 Test Runtime");
    g_signal_connect(btn_test, "clicked", G_CALLBACK(on_test_runtime_clicked), NULL);
    gtk_box_pack_start(GTK_BOX(btn_box), btn_test, TRUE, TRUE, 0);

    GtkWidget *btn_copy = gtk_button_new_with_label("📋 Copy Command");
    g_signal_connect(btn_copy, "clicked", G_CALLBACK(on_copy_clicked), NULL);
    gtk_box_pack_start(GTK_BOX(btn_box), btn_copy, TRUE, TRUE, 0);

    GtkWidget *btn_save = gtk_button_new_with_label("💾 Save with Backup");
    g_signal_connect(btn_save, "clicked", G_CALLBACK(on_save_vdf_clicked), NULL);
    gtk_box_pack_start(GTK_BOX(btn_box), btn_save, TRUE, TRUE, 0);

    gtk_widget_show_all(window);
    gtk_main();

    return 0;
}
`
    },
    {
      filename: 'vdf_parser.h',
      language: 'c',
      description: 'Header file for Steam localconfig.vdf parsing and local library scanning',
      content: `/*
 * vdf_parser.h - Pure C Valve Data Format (VDF) Key-Value parser
 */

#ifndef VDF_PARSER_H
#define VDF_PARSER_H

#include <stdbool.h>
#include <stddef.h>
#include <stdio.h>

typedef struct {
    char name[128];
    int app_id;
    long long last_updated;
} SteamGameInfo;

// Find and update "LaunchOptions" string for given app_id in localconfig.vdf
bool vdf_update_launch_options(const char *vdf_filepath, int app_id, const char *new_options);

// Find current launch options for given app_id
bool vdf_get_launch_options(const char *vdf_filepath, int app_id, char *out_options, size_t max_len);

// Locate standard Linux Steam localconfig.vdf path (~/.local/share/Steam/userdata/.../config/localconfig.vdf)
bool find_steam_vdf_path(char *out_path, size_t max_len);

// Locate Steam config.vdf path (~/.local/share/Steam/config/config.vdf)
bool find_steam_config_vdf_path(char *out_path, size_t max_len);

// Get assigned Proton compatibility tool for given app_id from config.vdf (or default tool if app_id is 0)
bool vdf_get_compat_tool(const char *config_vdf_path, int app_id, char *out_tool_name, size_t max_len);

// Set Proton compatibility tool for given app_id in config.vdf (with automatic .bak backup)
bool vdf_set_compat_tool(const char *config_vdf_path, int app_id, const char *tool_name);

#endif // VDF_PARSER_H
`
    },
    {
      filename: 'vdf_parser.c',
      language: 'c',
      description: 'C implementation of Valve Data Format (VDF) reader & updater',
      content: `/*
 * vdf_parser.c - Pure C Valve Data Format parser implementation
 */

#ifndef _GNU_SOURCE
#define _GNU_SOURCE
#endif
#include "vdf_parser.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <pwd.h>
#include <dirent.h>

bool find_steam_vdf_path(char *out_path, size_t max_len) {
    const char *home = getenv("HOME");
    if (!home) {
        struct passwd *pw = getpwuid(getuid());
        if (pw) home = pw->pw_dir;
    }
    if (!home) return false;

    const char *userdata_roots[] = {
        "/.local/share/Steam/userdata",
        "/.steam/steam/userdata",
        "/.steam/root/userdata",
        "/.steam/debian-installation/userdata",
        "/.var/app/com.valvesoftware.Steam/.local/share/Steam/userdata",
        "/.var/app/com.valvesoftware.Steam/.steam/steam/userdata",
        "/.var/app/com.valvesoftware.Steam/data/Steam/userdata",
        "/snap/steam/common/.local/share/Steam/userdata",
        "/snap/steam/common/.steam/steam/userdata"
    };

    for (size_t r = 0; r < sizeof(userdata_roots) / sizeof(userdata_roots[0]); r++) {
        char uroot[1024];
        snprintf(uroot, sizeof(uroot), "%s%s", home, userdata_roots[r]);
        DIR *dir = opendir(uroot);
        if (!dir) continue;

        struct dirent *entry;
        while ((entry = readdir(dir)) != NULL) {
            if (entry->d_name[0] == '.') continue;
            char vdf_candidate[2048];
            snprintf(vdf_candidate, sizeof(vdf_candidate), "%s/%s/config/localconfig.vdf", uroot, entry->d_name);
            if (access(vdf_candidate, F_OK) == 0) {
                snprintf(out_path, max_len, "%s", vdf_candidate);
                closedir(dir);
                return true;
            }
        }
        closedir(dir);
    }

    return false;
}

bool vdf_get_launch_options(const char *vdf_filepath, int app_id, char *out_options, size_t max_len) {
    FILE *fp = fopen(vdf_filepath, "r");
    if (!fp) return false;

    char line[1024];
    char target_app[64];
    char launch_key[32];
    snprintf(target_app, sizeof(target_app), "%c%d%c", 34, app_id, 34);
    snprintf(launch_key, sizeof(launch_key), "%cLaunchOptions%c", 34, 34);
    bool inside_app = false;

    while (fgets(line, sizeof(line), fp)) {
        if (strstr(line, target_app)) {
            inside_app = true;
            continue;
        }

        if (inside_app && strstr(line, launch_key)) {
            char *start = strchr(line + strlen(launch_key), 34);
            if (start) {
                start++;
                char *end = strchr(start, 34);
                if (end) {
                    *end = 0;
                    strncpy(out_options, start, max_len - 1);
                    out_options[max_len - 1] = 0;
                    fclose(fp);
                    return true;
                }
            }
        }

        if (inside_app && strchr(line, '}')) {
            break;
        }
    }

    fclose(fp);
    return false;
}

bool vdf_update_launch_options(const char *vdf_filepath, int app_id, const char *new_options) {
    FILE *src = fopen(vdf_filepath, "r");
    if (!src) return false;

    char temp_filepath[1024];
    snprintf(temp_filepath, sizeof(temp_filepath), "%s.tmp", vdf_filepath);

    FILE *dst = fopen(temp_filepath, "w");
    if (!dst) { fclose(src); return false; }

    char line[2048];
    char target_app[64];
    snprintf(target_app, sizeof(target_app), "%c%d%c", 34, app_id, 34);

    bool inside_apps = false;
    bool inside_target = false;
    bool found_and_updated = false;

    while (fgets(line, sizeof(line), src)) {
        if (strstr(line, "\\"apps\\"")) {
            inside_apps = true;
        }

        if (inside_apps && strstr(line, target_app)) {
            inside_target = true;
            fputs(line, dst);
            continue;
        }

        if (inside_target && strstr(line, "\\"LaunchOptions\\"")) {
            fprintf(dst, "\\t\\t\\t\\t\\t\\"LaunchOptions\\"\\t\\t\\"%s\\"\\n", new_options);
            found_and_updated = true;
            continue;
        }

        if (inside_target && strchr(line, '}')) {
            if (!found_and_updated) {
                fprintf(dst, "\\t\\t\\t\\t\\t\\"LaunchOptions\\"\\t\\t\\"%s\\"\\n", new_options);
                found_and_updated = true;
            }
            inside_target = false;
        }

        fputs(line, dst);
    }

    fclose(src);
    fclose(dst);

    // Atomically replace file
    rename(temp_filepath, vdf_filepath);
    return true;
}

bool find_steam_config_vdf_path(char *out_path, size_t max_len) {
    const char *home = getenv("HOME");
    if (!home) {
        struct passwd *pw = getpwuid(getuid());
        if (pw) home = pw->pw_dir;
    }
    if (!home) return false;

    const char *config_candidates[] = {
        "/.local/share/Steam/config/config.vdf",
        "/.steam/steam/config/config.vdf",
        "/.steam/root/config/config.vdf",
        "/.steam/debian-installation/config/config.vdf",
        "/.var/app/com.valvesoftware.Steam/.local/share/Steam/config/config.vdf",
        "/.var/app/com.valvesoftware.Steam/.steam/steam/config/config.vdf",
        "/.var/app/com.valvesoftware.Steam/data/Steam/config/config.vdf",
        "/snap/steam/common/.local/share/Steam/config/config.vdf"
    };

    for (size_t i = 0; i < sizeof(config_candidates) / sizeof(config_candidates[0]); i++) {
        char full_path[2048];
        snprintf(full_path, sizeof(full_path), "%s%s", home, config_candidates[i]);
        if (access(full_path, F_OK) == 0) {
            snprintf(out_path, max_len, "%s", full_path);
            return true;
        }
    }
    return false;
}

bool vdf_get_compat_tool(const char *config_vdf_path, int app_id, char *out_tool_name, size_t max_len) {
    FILE *fp = fopen(config_vdf_path, "r");
    if (!fp) return false;

    char line[1024];
    char target_app[64];
    snprintf(target_app, sizeof(target_app), "\\\"%d\\\"", app_id);

    bool inside_compat = false;
    bool inside_target = false;

    while (fgets(line, sizeof(line), fp)) {
        if (strcasestr(line, "CompatToolMapping")) {
            inside_compat = true;
            continue;
        }
        if (inside_compat) {
            if (strstr(line, target_app)) {
                inside_target = true;
                continue;
            }
            if (inside_target && strstr(line, "name")) {
                char *quote1 = strchr(line + 6, '"');
                if (quote1) {
                    quote1++;
                    char *quote2 = strchr(quote1, '"');
                    if (quote2) {
                        *quote2 = 0;
                        snprintf(out_tool_name, max_len, "%s", quote1);
                        fclose(fp);
                        return true;
                    }
                }
            }
            if (inside_target && strchr(line, '}')) {
                inside_target = false;
            }
        }
    }
    fclose(fp);
    return false;
}

bool vdf_set_compat_tool(const char *config_vdf_path, int app_id, const char *tool_name) {
    if (!config_vdf_path || !tool_name || strlen(tool_name) == 0) return false;

    char bak_path[2048];
    snprintf(bak_path, sizeof(bak_path), "%s.bak", config_vdf_path);
    FILE *src = fopen(config_vdf_path, "r");
    if (!src) return false;
    FILE *bak = fopen(bak_path, "w");
    if (bak) {
        char buf[4096];
        size_t n;
        while ((n = fread(buf, 1, sizeof(buf), src)) > 0) {
            fwrite(buf, 1, n, bak);
        }
        fclose(bak);
        rewind(src);
    }

    char tmp_path[2048];
    snprintf(tmp_path, sizeof(tmp_path), "%s.tmp", config_vdf_path);
    FILE *dst = fopen(tmp_path, "w");
    if (!dst) { fclose(src); return false; }

    char line[2048];
    char target_app[64];
    snprintf(target_app, sizeof(target_app), "\\\"%d\\\"", app_id);

    bool inside_compat = false;
    bool inside_target = false;
    bool found_and_updated = false;

    while (fgets(line, sizeof(line), src)) {
        if (strcasestr(line, "CompatToolMapping")) {
            inside_compat = true;
            fputs(line, dst);
            continue;
        }

        if (inside_compat && !found_and_updated) {
            if (strstr(line, target_app)) {
                inside_target = true;
                fputs(line, dst);
                continue;
            }

            if (inside_target && strstr(line, "name")) {
                fprintf(dst, "\\t\\t\\t\\t\\t\\t\\\"name\\\"\\t\\t\\\"%s\\\"\\n", tool_name);
                found_and_updated = true;
                continue;
            }

            if (inside_target && strchr(line, '}')) {
                if (!found_and_updated) {
                    fprintf(dst, "\\t\\t\\t\\t\\t\\t\\\"name\\\"\\t\\t\\\"%s\\\"\\n", tool_name);
                    found_and_updated = true;
                }
                inside_target = false;
                fputs(line, dst);
                continue;
            }

            // If we are at the closing brace of CompatToolMapping and target was not found, insert it
            if (strchr(line, '}') && !inside_target) {
                fprintf(dst, "\\t\\t\\t\\t\\t\\\"%d\\\"\\n", app_id);
                fprintf(dst, "\\t\\t\\t\\t\\t{\\n");
                fprintf(dst, "\\t\\t\\t\\t\\t\\t\\\"name\\\"\\t\\t\\\"%s\\\"\\n", tool_name);
                fprintf(dst, "\\t\\t\\t\\t\\t\\t\\\"config\\\"\\t\\t\\\"\\\"\\n");
                fprintf(dst, "\\t\\t\\t\\t\\t\\t\\\"priority\\\"\\t\\t\\\"250\\\"\\n");
                fprintf(dst, "\\t\\t\\t\\t\\t}\\n");
                found_and_updated = true;
                inside_compat = false;
            }
        }

        fputs(line, dst);
    }

    fclose(src);
    fclose(dst);

    rename(tmp_path, config_vdf_path);
    return true;
}
`
    },
    {
      filename: 'Makefile',
      language: 'makefile',
      description: 'Makefile building both zero-dependency proton_cli and optional GTK3 proton_mgr',
      content: `# Makefile for Proton Launch Options Manager
CC ?= gcc
CFLAGS = -Wall -Wextra -std=c99 -D_GNU_SOURCE -O2

# Core CLI/TUI objects (zero external dependencies, pure libc)
CLI_SRCS = cli_main.c vdf_parser.c conflicts.c presets.c scanner.c backup.c launcher.c tui.c runtime_test.c
CLI_OBJS = $(CLI_SRCS:.c=.o)
CLI_TARGET = proton_cli

# GUI objects (GTK3)
GUI_SRCS = main.c vdf_parser.c conflicts.c presets.c scanner.c backup.c launcher.c runtime_test.c
GUI_OBJS = $(GUI_SRCS:.c=.o)
GUI_TARGET = proton_mgr

GTK_CFLAGS = $(shell pkg-config --cflags gtk+-3.0 2>/dev/null)
GTK_LIBS = $(shell pkg-config --libs gtk+-3.0 2>/dev/null)

all: $(CLI_TARGET) gui_check

$(CLI_TARGET): $(CLI_OBJS)
	$(CC) $(CLI_OBJS) -o $(CLI_TARGET)

gui_check:
	@if pkg-config --exists gtk+-3.0; then \\
		echo "Building GTK3 GUI ($$GUI_TARGET)..."; \\
		$(MAKE) $(GUI_TARGET); \\
	else \\
		echo "GTK3 development headers not found - skipping GUI ($$GUI_TARGET). Built standalone CLI/TUI ($$CLI_TARGET)."; \\
	fi

$(GUI_TARGET): $(GUI_OBJS)
	$(CC) $(GUI_OBJS) -o $(GUI_TARGET) $(GTK_LIBS)

main.o: main.c
	$(CC) $(CFLAGS) $(GTK_CFLAGS) -c $< -o $@

%.o: %.c
	$(CC) $(CFLAGS) -c $< -o $@

clean:
	rm -f *.o $(CLI_TARGET) $(GUI_TARGET)

install: $(CLI_TARGET)
	install -d $(DESTDIR)/usr/local/bin
	install -m 755 $(CLI_TARGET) $(DESTDIR)/usr/local/bin/
	@if [ -f $(GUI_TARGET) ]; then \
		install -m 755 $(GUI_TARGET) $(DESTDIR)/usr/local/bin/; \
	fi
	install -d $(DESTDIR)/usr/local/share/man/man1
	install -m 644 proton_cli.1 $(DESTDIR)/usr/local/share/man/man1/

.PHONY: all clean install gui_check
`
    },
    {
      filename: 'CMakeLists.txt',
      language: 'cmake',
      description: 'CMake build configuration file for CLI & GUI',
      content: `cmake_minimum_required(VERSION 3.10)
project(ProtonManager C)

set(CMAKE_C_STANDARD 99)
add_definitions(-D_GNU_SOURCE)

# 1. Standalone CLI & TUI Target (Pure libc, Zero Dependencies)
add_executable(proton_cli 
    cli_main.c 
    vdf_parser.c 
    conflicts.c 
    presets.c 
    scanner.c 
    backup.c 
    launcher.c 
    tui.c
    runtime_test.c
)

# 2. Optional GTK3 GUI Target
find_package(PkgConfig QUIET)
if (PKG_CONFIG_FOUND)
    pkg_check_modules(GTK3 gtk+-3.0)
    if (GTK3_FOUND)
        include_directories(\${GTK3_INCLUDE_DIRS})
        add_executable(proton_mgr 
            main.c 
            vdf_parser.c 
            conflicts.c 
            presets.c 
            scanner.c 
            backup.c 
            launcher.c
            runtime_test.c
        )
        target_link_libraries(proton_mgr \${GTK3_LIBRARIES})
        target_compile_options(proton_mgr PRIVATE \${GTK3_CFLAGS_OTHER})
    endif()
endif()

# 3. Installation Rules
install(TARGETS proton_cli DESTINATION bin)
if (TARGET proton_mgr)
    install(TARGETS proton_mgr DESTINATION bin)
endif()
install(FILES proton_cli.1 DESTINATION share/man/man1 OPTIONAL)
`
    },
    {
      filename: 'proton_cli.1',
      language: 'groff',
      description: 'Standard UNIX section 1 manual page for proton_cli (view with: man ./proton_cli.1)',
      content: `.\\" Manual page for proton_cli
.\\" Generated for Proton Launch Options Manager
.TH PROTON_CLI 1 "August 2026" "Proton Launch Manager 1.0" "User Commands"
.SH NAME
proton_cli \\- manage, optimize, and launch Steam Proton games with custom environment variables and performance wrappers
.SH SYNOPSIS
.B proton_cli
[\\fIOPTIONS\\fR]
.br
.B proton_cli
[\\fB\\-i\\fR | \\fB\\-\\-interactive\\fR]
.br
.B proton_cli
[\\fB\\-g\\fR \\fIGAME\\fR] [\\fB\\-p\\fR \\fIPRESET\\fR] [\\fB\\-c\\fR] [\\fB\\-\\-auto-fix\\fR] [\\fB\\-w\\fR] [\\fB\\-x\\fR]
.SH DESCRIPTION
.B proton_cli
is a lightweight, 100% offline, zero-dependency C99 command-line interface and terminal user interface (TUI) for managing Linux Steam Proton launch options.
It parses and updates Steam's binary-adjacent \\fBlocalconfig.vdf\\fR configuration file, scans mounted Steam libraries for installed games, checks for conflicting or deprecated Proton environment variables, and launches games directly using the Steam URI protocol (\\fBsteam://rungameid/<appid>\\fR).

When invoked without arguments, \\fBproton_cli\\fR automatically launches into its interactive ANSI Terminal UI mode.

.SH OPTIONS
.SS "Mode & UI Options"
.TP
.BR \\-i ", " \\-\\-interactive
Start the interactive ANSI Terminal User Interface (TUI). Features live launch command previews, a scrollable flag checklist with conflict indicators, and single-key preset selectors.
.TP
.BR \\-h ", " \\-\\-help
Display a summary of command-line options and exit.

.SS "Flag Management & Querying"
.TP
.B \\-\\-list-flags
Print a complete formatted table of all available Proton environment variables, options, and performance wrappers.
.TP
.BI \\-\\-enable= FLAG
Enable a specific Proton flag or wrapper by key (e.g. \\fBPROTON_TOPOLOGY\\fR) or name fragment.
.TP
.BI \\-\\-disable= FLAG
Disable a specific Proton flag or wrapper by key or name fragment.

.SS "Game & Library Auto-Discovery"
.TP
.BR \\-l ", " \\-\\-list-games
Scan all Steam library folders (via \\fIlibraryfolders.vdf\\fR and \\fIappmanifest_*.acf\\fR) across internal and external mount drives, and display a formatted table of installed games with their respective Steam AppIDs.
.TP
.BI \\-g " GAME" ", " \\-\\-game= GAME
Select target game by its numerical Steam AppID (e.g. \\fB1091500\\fR) or by case-insensitive title search (e.g. \\fB"Cyberpunk 2077"\\fR).

.SS "Proton Version & Compatibility Tool Management"
.TP
.B \-\-list-proton
Discover and display all installed Proton runners and compatibility tools found across Steam directories, internal runtime libraries, and ~/.steam/root/compatibilitytools.d/ (e.g. Proton Experimental, GE-Proton, Proton Hotfix, Steam Tinker Launch).
.TP
.BI \-\-get-proton
Print the currently configured compatibility tool runner assigned to the target game in Steam's \fBconfig.vdf\fR.
.TP
.BI \-\-set-proton= TOOL
Assign a specific Proton version or compatibility runner (e.g. \fBGE-Proton9-25\fR, \fBsteamtinkerlaunch\fR) to the target game in \fBconfig.vdf\fR under \fBCompatToolMapping\fR.

.SS "Steam Tinker Launch (STL) Integration"
.TP
.B \-\-stl
Enable the Steam Tinker Launch wrapper (\fBsteamtinkerlaunch %command%\fR) for the launch command.
.TP
.BI \-\-stl-mode= MODE
Specify an STL mode or sub-command (e.g. \fBmenu\fR, \fBgame\fR, \fBwinecfg\fR, \fBregedit\fR, \fBtaskmgr\fR, \fBcmd\fR, \fBvortex\fR, \fBmo2\fR, \fBhmm\fR, \fBopen\fR, \fBconfigdir\fR).
.TP
.B \-\-stl-menu
Shorthand for \fB--stl --stl-mode menu\fR to always open the STL graphical configuration menu prior to launching.
.TP
.B \-\-stl-skip
Shorthand for \fB--stl --stl-mode game\fR to bypass the STL GUI countdown timer and start immediately.
.TP
.B \-\-list-stl-modes
Display a reference list of all supported Steam Tinker Launch modes and their descriptions.
.TP
.B \-\-stl-check
Check whether Steam Tinker Launch is installed on the host system (scans standard paths and PATH).

.SS "Preset & Performance Profiles"
.TP
.BI \\-p " PRESET" ", " \\-\\-preset= PRESET
Apply a preconfigured Proton optimization profile to the active launch command.
Available preset identifiers:
.RS
.IP \\(bu 2
\\fBdeck\\fR \\- Steam Deck Optimal (Gamescope micro-compositor, MangoHud overlay, FSR upscaling, Mesa Anti-Lag, DualSense HIDRAW)
.IP \\(bu 2
\\fBesports\\fR \\- Ultra-Low Latency & High FPS (NTSYNC, Reflex, GameMode, Anti-Lag, Vulkan Reflex, CPU Topology)
.IP \\(bu 2
\\fBcachyos\\fR \\- CachyOS Ultra Gaming (game-performance wrapper, PROTON_ADD_CONFIG multi-config, NTSYNC, Topology override)
.IP \\(bu 2
\\fBrt\\fR \\- Ray Tracing & DLSS / OptiScaler (VKD3D DXR11/DXR, NVAPI, DLSS upgrade, OptiScaler)
.IP \\(bu 2
\\fBretro\\fR \\- Retro & Legacy DirectX (WineD3D OpenGL, DXVK Sarek legacy GPU async, Integer Scaling)
.IP \\(bu 2
\\fBlsfg\\fR \\- Lossless Scaling Frame Generation (lsfg-vk Vulkan layer 3x frame multiplier)
.IP \\(bu 2
\\fBbattery\\fR \\- Power Saver & Framerate Cap (Gamescope 45Hz/45FPS cap, TDP reduction)
.RE
.TP
.B \\-\\-list-presets
Print all available built-in performance presets along with their descriptions and active flag sets.

.SS "Conflict Detection & Resolution"
.TP
.BR \\-c ", " \\-\\-check-conflicts
Analyze the active combination of Proton flags and wrappers for known incompatibilities (such as WineD3D vs DXVK/VKD3D, duplicate CPU schedulers, or conflicting low-latency layers).
.TP
.B \\-\\-auto-fix
Automatically resolve and disable conflicting flags using safe heuristic recommendations.

.SS "Steam Runtime Simulation & Diagnostics"
.TP
.BR \\-t ", " \\-\\-test-runtime
Simulate and inspect the resolved Steam Runtime process execution pipeline. Displays target executable verification on disk, resolved Proton runner binary, wrapper chain, evaluated Linux bash launch command, and runtime sanity checks.
.TP
.B \\-\\-test-exec
Execute a syntax validation dry-run (via bash) of the generated launch command pipeline.

.SS "VDF Management & Game Execution"
.TP
.BR \\-w ", " \\-\\-write-vdf
Safely write the generated launch options into Steam's \\fBlocalconfig.vdf\\fR for the selected game. An automatic backup is created before any file modification.
.TP
.BR \\-x ", " \\-\\-launch
Execute the target game immediately via Steam URI protocol (\\fBsteam://rungameid/<appid>\\fR). Supports both Native Steam and Flatpak installations.
.TP
.B \\-\\-backup
Create an immediate timestamped backup of the current Steam \\fBlocalconfig.vdf\\fR.
.TP
.B \\-\\-list-backups
List all existing timestamped \\fBlocalconfig.vdf.bak.*\\fR files.
.TP
.BI \\-\\-restore= FILE
Restore Steam configuration from a specific backup file path, or specify \\fBlatest\\fR to revert to the most recent automatic backup.

.SH INTERACTIVE TUI CONTROLS
When running in TUI mode (\\fB-i\\fR or no arguments), the following hotkeys are available:
.TP
.B [Up] / [Down] / [j] / [k]
Navigate through the Proton environment variable checklist.
.TP
.B [Space] / [Enter]
Toggle the selected flag on or off.
.TP
.B [P] / [p]
Cycle through built-in performance presets.
.TP
.B [C] / [c]
Run conflict analysis and auto-resolve conflicting flags.
.TP
.B [V] / [v]
Cycle installed Proton runner versions and immediately update config.vdf.
.TP
.B [T] / [t]
Toggle Steam Tinker Launch wrapper and cycle STL sub-modes (menu, game, mo2, vortex, etc.).
.TP
.B [R] / [r]
Open the full-screen Steam Runtime Process Pipeline Simulator & Diagnostic Report.
.TP
.B [G] / [g]
Cycle target games from detected Steam libraries.
.TP
.B [S]
Save current launch command to Steam \\fBlocalconfig.vdf\\fR.
.TP
.B [X] / [x]
Launch the selected game via Steam.
.TP
.B [Q] / [q]
Exit the TUI.

.SH ENVIRONMENT & FILES
.TP
.I ~/.local/share/Steam/userdata/<user_id>/config/localconfig.vdf
Primary Steam user configuration file storing game launch options.
.TP
.I ~/.steam/steam/steamapps/libraryfolders.vdf
Steam library index containing paths to all external and internal game install directories.
.TP
.I ~/.local/share/Steam/userdata/<user_id>/config/localconfig.vdf.bak.*
Timestamped backups created automatically before write operations.

.SH EXAMPLES
.TP
.B proton_cli
Start the interactive ANSI Terminal UI.
.TP
.B proton_cli \\-l
Auto-scan and list all installed games across all Steam libraries.
.TP
.B proton_cli \\-g 1091500 \\-p deck \\-w \\-x
Apply the Steam Deck Optimal preset to Cyberpunk 2077 (AppID 1091500), save to Steam VDF, and launch the game.
.TP
.B proton_cli \\-g "Elden Ring" \\-p esports \\-c \\-\\-auto-fix \\-w
Select Elden Ring by name, apply the Esports preset, resolve any flag conflicts, and save to Steam configuration.
.TP
.B proton_cli \\-\\-restore latest
Restore the most recent automatic VDF backup if a configuration issue occurs.

.SH SEE ALSO
.BR steam (6),
.BR gamescope (1),
.BR gamemoderun (1),
.BR mangohud (1)

.SH AUTHORS
Written for the Proton Launch Options Manager project.
`
    },
    {
      filename: 'launch_game.sh',
      language: 'bash',
      description: `Executable Bash script (.sh) to launch ${selectedGameName} directly from terminal`,
      content: `#!/usr/bin/env bash
# ==============================================================================
# Linux Direct Terminal Launcher Script
# Game: ${selectedGameName}
# Steam AppID: ${selectedAppId}
# Generated by Proton Launch Options Manager
# ==============================================================================

set -euo pipefail

GAME_NAME="${escapedSelectedGameName}"
APP_ID="${selectedAppId}"
LAUNCH_OPTIONS="${currentCommand.replace(/"/g, '\\"')}"

echo "======================================================================"
echo "🚀 Launching Game: \${GAME_NAME} (AppID: \${APP_ID})"
echo "⚙️  Launch Parameters: \${LAUNCH_OPTIONS}"
echo "======================================================================"

# Direct Steam URI Protocol launcher
if command -v steam &> /dev/null; then
    echo "▶️ Executing Steam URI launcher..."
    steam "steam://rungameid/\${APP_ID}" &
    echo "✅ Successfully initiated launch sequence for \${GAME_NAME}!"
    exit 0
elif command -v flatpak &> /dev/null && flatpak list 2>/dev/null | grep -q "com.valvesoftware.Steam"; then
    echo "▶️ Executing Flatpak Steam URI launcher..."
    flatpak run com.valvesoftware.Steam "steam://rungameid/\${APP_ID}" &
    echo "✅ Successfully initiated launch sequence via Flatpak Steam!"
    exit 0
else
    echo "❌ Error: Steam installation could not be detected in system PATH or Flatpak."
    echo "Please verify Steam is installed and running."
    exit 1
fi
`
    },
    {
      filename: 'build.sh',
      language: 'bash',
      description: 'One-click shell build script with automatic compiler detection and zero-dependency compilation',
      content: `#!/usr/bin/env bash
# Portable build script for Proton Launch Options Manager
set -e

echo "======================================================================"
echo "🔧 Proton Launch Options Manager - C99 Builder"
echo "======================================================================"

# Check for compiler
if ! command -v gcc &> /dev/null && ! command -v clang &> /dev/null; then
    echo "❌ Error: Neither gcc nor clang was found in system PATH."
    if command -v pacman &> /dev/null; then
        echo "Install with: sudo pacman -S gcc make"
    elif command -v apt-get &> /dev/null; then
        echo "Install with: sudo apt install build-essential"
    elif command -v dnf &> /dev/null; then
        echo "Install with: sudo dnf install gcc make"
    fi
    exit 1
fi

echo "Compiling C source code..."
make clean
make

echo ""
echo "======================================================================"
echo "✅ Build Complete!"
echo "======================================================================"
echo "Run interactive terminal TUI:  ./proton_cli -i"
echo "List installed Steam games:    ./proton_cli -l"
echo "Apply preset and launch:       ./proton_cli -p deck -g ${selectedAppId} -w -x"
if [ -f "./proton_mgr" ]; then
    echo "Run GTK3 Desktop GUI:         ./proton_mgr"
fi
echo "View manpage:                 man ./proton_cli.1"
echo "Install system-wide:          sudo make install"
echo "======================================================================"
`
    },
    {
      filename: 'README.md',
      language: 'markdown',
      description: 'Detailed compilation, CLI flag usage, TUI reference, and manpage instructions',
      content: `# Proton Launch Options Manager in C (Pure C99 & GTK3)

A lightweight, 100% offline, zero-dependency C utility and GTK3 application for Linux and Steam Deck to inspect, optimize, and manage Steam Proton launch parameters.

## ✨ Features (100% Offline & Pure C99)

1. **Proton Version & Compatibility Tool Switcher (\`vdf_parser.c\` & \`scanner.c\`):**
   * Discovers all installed Proton versions: Proton Experimental, GE-Proton, Proton Hotfix, and custom runners in \`~/.steam/root/compatibilitytools.d/\`.
   * Directly queries and switches per-game compatibility tools in Steam's \`config.vdf\` under \`CompatToolMapping\`.
   * CLI: \`./proton_cli --list-proton\`, \`./proton_cli -g <appid> --get-proton\`, \`./proton_cli -g <appid> --set-proton <tool>\`.
   * TUI: Press \`[V]\` to cycle runners on the fly.

2. **Steam Tinker Launch (STL) Integration (\`cli_main.c\`, \`presets.c\` & \`tui.c\`):**
   * Full wrapper support for [Steam Tinker Launch](https://github.com/sonic2kk/steamtinkerlaunch).
   * Supports STL modes: \`menu\`, \`game\`, \`winecfg\`, \`regedit\`, \`taskmgr\`, \`cmd\`, \`vortex\`, \`mo2\`, \`hmm\`, \`open\`, \`configdir\`.
   * Built-in \`stl\` preset (\`./proton_cli -p stl\`) and dedicated flags (\`--stl\`, \`--stl-mode\`, \`--stl-menu\`, \`--stl-skip\`).
   * TUI: Press \`[T]\` to toggle STL and cycle sub-modes.

3. **Flag Conflict & Incompatibility Detector (\`conflicts.c\`):**
   * Real-time detection of incompatible settings (WineD3D vs Vulkan, duplicate CPU wrappers, sync disablers vs NTSYNC, Gamescope vs Wayland).
   * Single-command auto-resolution (\`--auto-fix\`).

4. **Game Presets & Profiles (\`presets.c\`):**
   * Built-in curated presets: Steam Deck Optimal, Esports / High FPS, CachyOS Max, Ray Tracing & DLSS, Retro Legacy, Lossless Scaling, Steam Tinker Launch, and Battery Saver.
   * Apply with \`./proton_cli --preset <name>\` (e.g. \`cachyos\`, \`deck\`, \`esports\`, \`stl\`).
   * Query all available flags & wrappers: \`./proton_cli --list-flags\`.
   * Enable/disable flags directly: \`./proton_cli --enable PROTON_TOPOLOGY --enable PROTON_ENABLE_HIDRAW\`.

5. **Steam Library Auto-Discovery (\`scanner.c\`):**
   * Automatically parses \`libraryfolders.vdf\` across internal and external mount drives.
   * Scans all \`appmanifest_*.acf\` files to list installed games without manual AppID lookup.

6. **Safe VDF Backup & Rollback Manager (\`backup.c\`):**
   * Creates automatic timestamped backups before applying edits.
   * Quick restore with \`./proton_cli --restore latest\`.

7. **Zero-Dependency Terminal UI (\`tui.c\`):**
   * Full interactive TUI with ANSI colors, live command preview, and hotkeys.
   * Direct hotkeys: \`[V]\` Proton Runner, \`[T]\` Steam Tinker Launch, \`[R]\` Test Runtime Simulator, \`[P]\` Presets, \`[G]\` Games, \`[C]\` Conflicts.
   * Runs in any terminal or SSH session without needing \`ncurses\` or X11/Wayland.

8. **Steam Runtime Process Pipeline Simulator (\`runtime_test.c\` & \`runtime_test.h\`):**
   * Simulates and inspects how the Steam client, Proton runner, and environment wrappers execute the game on Linux.
   * Discovers and verifies target game executable path, directory existence, and file permissions on disk.
   * Resolves configured Proton runner (\`Proton Experimental\`, \`GE-Proton\`, etc.) script and verifies binary presence.
   * Evaluates the full command string executed by bash at launch time.
   * CLI: \`./proton_cli -t\` (interactive report), \`./proton_cli --test-exec\` (dry-run syntax validation).
   * TUI: Press \`[R]\` to open the full-screen interactive diagnostic report.

9. **Direct Steam URI Launcher (\`launcher.c\`):**
   * Launches games asynchronously via \`steam://rungameid/<appid>\` supporting Native and Flatpak Steam.

10. **UNIX Manual Page (\`proton_cli.1\`):**
   * Complete standard manpage documentation.
   * View locally with \`man ./proton_cli.1\` or install to \`/usr/local/share/man/man1/\`.

## 🚀 Quick Start

\`\`\`bash
# 1. Extract the .tar.zst archive
tar --zstd -xvf proton_launch_manager_c_source.tar.zst
cd proton_launch_manager

# 2. build.sh is pre-configured with executable permissions (0755)
./build.sh

# 3. Interactive Terminal TUI Mode
./proton_cli -i

# 4. Auto-scan installed Steam games
./proton_cli -l

# 5. List and switch installed Proton versions
./proton_cli --list-proton
./proton_cli -g 1091500 --set-proton GE-Proton9-25

# 6. Simulate & Inspect Runtime Process Pipeline (Test Runtime)
./proton_cli -g 1091500 -p deck -t
./proton_cli -g 1091500 -p deck --test-exec

# 7. Use Steam Tinker Launch with MO2 or in Game mode
./proton_cli -g 1091500 --stl --stl-mode mo2 -w
./proton_cli -g 1091500 --stl-menu -w

# 8. Apply Steam Deck preset to game and save
./proton_cli -g 1091500 -p deck -w -x

# 9. Read the complete manual page
man ./proton_cli.1

# 10. Optional: Install system-wide (binary + manpage)
sudo make install
\`\`\`
`
    }
  ];
}
