import { CSourceFile, SteamGame } from '../types';
import { INITIAL_STEAM_GAMES } from './steamGamesData';

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
  const initialGameArray = gamesToUse.map(g => `    { "${g.name.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}", ${g.appId} }`).join(',\n');

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

#define MAX_CMD_LEN 2048

static ProtonFlag g_flags[] = {
    {"PROTON_USE_WINED3D", "PROTON_USE_WINED3D=1", false, 0, false},
    {"PROTON_USE_NTSYNC", "PROTON_USE_NTSYNC=1", false, 0, false},
    {"DISABLE_SHADER_CACHE", "DISABLE_SHADER_CACHE=1", false, 0, false},
    {"gamemoderun (GameMode)", "gamemoderun", true, 2, false},
    {"game-performance (CachyOS)", "game-performance", true, 2, false},
    {"lsvk (VKD3D Ray Tracing)", "VKD3D_CONFIG=dxr11,dxr", false, 0, false},
    {"mangohud (FPS Overlay)", "mangohud", true, 1, false},
    {"ENABLE_NVAPI (DLSS/Reflex)", "PROTON_ENABLE_NVAPI=1", false, 0, false},
    {"lsfg-vk (Lossless Scaling)", "ENABLE_LSFG=1 LSFGVK_MULTIPLIER=2", false, 0, false},
    {"Gamescope Compositor", "gamescope -w 1920 -h 1080 -r 144 -f --", true, 3, false},
    {"PROTON_LOG (Debugging)", "PROTON_LOG=1", false, 0, false},
    {"PROTON_NO_ESYNC", "PROTON_NO_ESYNC=1", false, 0, false},
    {"PROTON_NO_FSYNC", "PROTON_NO_FSYNC=1", false, 0, false},
    {"PROTON_ENABLE_WAYLAND", "PROTON_ENABLE_WAYLAND=1", false, 0, false},
    {"cachyos_dlss_upgrade", "PROTON_ENABLE_NVNGX=1 PROTON_DLSS_UPGRADE=1", false, 0, false},
    {"cachyos_vkreflex", "DXVK_ENABLE_NVAPI=1 PROTON_ENABLE_NVAPI=1", false, 0, false}
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
    for (int order = 1; order <= 3; order++) {
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
    printf("  -p, --preset <name>     Apply built-in preset (deck, esports, rt, retro, battery)\\n");
    printf("      --list-presets      Display all available performance presets\\n");
    printf("  -l, --list-games        Auto-scan and list installed Steam games\\n");
    printf("  -g, --game <appid|name> Set target Steam game by AppID or partial name\\n");
    printf("  -c, --check-conflicts   Detect incompatible flag combinations\\n");
    printf("      --auto-fix          Automatically resolve active flag conflicts\\n");
    printf("  -w, --write-vdf         Safely write launch options to localconfig.vdf (with backup)\\n");
    printf("  -x, --launch            Launch target game via Steam URI protocol\\n");
    printf("      --backup            Create an immediate timestamped backup of localconfig.vdf\\n");
    printf("      --list-backups      List available VDF backups\\n");
    printf("      --restore <file>    Restore a specific backup or 'latest'\\n");
    printf("  -h, --help              Show this help message\\n\\n");
    printf("Examples:\\n");
    printf("  %s -i                               # Interactive TUI mode\\n", progname);
    printf("  %s -g 1091500 -p deck -w -x         # Apply Deck preset to Cyberpunk & launch\\n", progname);
    printf("  %s --list-games                     # Scan all local Steam libraries\\n", progname);
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
        {"list-games",       no_argument,       0, 'l'},
        {"game",             required_argument, 0, 'g'},
        {"check-conflicts",  no_argument,       0, 'c'},
        {"auto-fix",         no_argument,       0, 1002},
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
    bool opt_list_games = false;
    bool opt_check_conflicts = false;
    bool opt_auto_fix = false;
    bool opt_write_vdf = false;
    bool opt_launch = false;
    bool opt_backup = false;
    bool opt_list_backups = false;
    char opt_preset_name[64] = "";
    char opt_restore_target[256] = "";

    int opt;
    int opt_idx = 0;
    while ((opt = getopt_long(argc, argv, "ip:lg:cwx h", long_options, &opt_idx)) != -1) {
        switch (opt) {
            case 'i': opt_interactive = true; break;
            case 'p': strncpy(opt_preset_name, optarg, sizeof(opt_preset_name) - 1); break;
            case 1001: opt_list_presets = true; break;
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
                        strncpy(g_target_gamename, found.name, sizeof(g_target_gamename) - 1);
                        printf("🎯 Target Game matched: %s (AppID: %d)\\n", g_target_gamename, g_target_appid);
                    }
                }
                break;
            }
            case 'c': opt_check_conflicts = true; break;
            case 1002: opt_auto_fix = true; break;
            case 'w': opt_write_vdf = true; break;
            case 'x': opt_launch = true; break;
            case 1003: opt_backup = true; break;
            case 1004: opt_list_backups = true; break;
            case 1005: strncpy(opt_restore_target, optarg, sizeof(opt_restore_target) - 1); break;
            case 'h': print_usage(argv[0]); return 0;
            default: print_usage(argv[0]); return 1;
        }
    }

    // 1. Handle Preset listing
    if (opt_list_presets) {
        print_all_presets();
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
    char name[64];
    char env_var[128];
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
    char title[64];
    char message[256];
    char recommendation[256];
    ConflictSeverity severity;
    char conflicting_flags[4][64];
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
                strncpy(c->id, "wined3d_vs_vulkan", sizeof(c->id));
                strncpy(c->title, "WineD3D (OpenGL) vs Vulkan/DXVK Features", sizeof(c->title));
                strncpy(c->message, "PROTON_USE_WINED3D forces OpenGL translation, disabling DXVK, VKD3D, and NVAPI Vulkan layers.", sizeof(c->message));
                strncpy(c->recommendation, "Disable PROTON_USE_WINED3D to enable Vulkan, DXVK, and NVAPI features.", sizeof(c->recommendation));
                c->severity = SEVERITY_ERROR;
            }
        }
    }

    // Rule 2: Dual CPU Performance Wrappers (gamemoderun + game-performance)
    if (is_flag_active(flags, num_flags, "gamemoderun") && is_flag_active(flags, num_flags, "game-performance")) {
        if (count < max_conflicts) {
            FlagConflict *c = &out_conflicts[count++];
            strncpy(c->id, "dual_cpu_wrappers", sizeof(c->id));
            strncpy(c->title, "Conflicting CPU Performance Wrappers", sizeof(c->title));
            strncpy(c->message, "Both 'gamemoderun' (Feral) and 'game-performance' (CachyOS) are active simultaneously.", sizeof(c->message));
            strncpy(c->recommendation, "Use 'game-performance' on CachyOS or 'gamemoderun' on standard distros.", sizeof(c->recommendation));
            c->severity = SEVERITY_WARNING;
        }
    }

    // Rule 3: NTSYNC Kernel Sync vs Sync Disablers (NO_ESYNC / NO_FSYNC)
    if (is_flag_active(flags, num_flags, "PROTON_USE_NTSYNC") && 
        (is_flag_active(flags, num_flags, "PROTON_NO_ESYNC") || is_flag_active(flags, num_flags, "PROTON_NO_FSYNC"))) {
        if (count < max_conflicts) {
            FlagConflict *c = &out_conflicts[count++];
            strncpy(c->id, "ntsync_vs_sync_disablers", sizeof(c->id));
            strncpy(c->title, "NTSYNC Active with Synchronization Disablers", sizeof(c->title));
            strncpy(c->message, "PROTON_USE_NTSYNC activates kernel /dev/ntsync, but Esync/Fsync disablers are also checked.", sizeof(c->message));
            strncpy(c->recommendation, "Uncheck PROTON_NO_ESYNC and PROTON_NO_FSYNC for clean NTSYNC operation.", sizeof(c->recommendation));
            c->severity = SEVERITY_WARNING;
        }
    }

    // Rule 4: Gamescope vs Native Wayland Driver
    if (is_flag_active(flags, num_flags, "gamescope") && is_flag_active(flags, num_flags, "PROTON_ENABLE_WAYLAND")) {
        if (count < max_conflicts) {
            FlagConflict *c = &out_conflicts[count++];
            strncpy(c->id, "gamescope_vs_wayland", sizeof(c->id));
            strncpy(c->title, "Gamescope vs Proton Native Wayland Driver", sizeof(c->title));
            strncpy(c->message, "Gamescope creates an XWayland container, while PROTON_ENABLE_WAYLAND bypasses XWayland.", sizeof(c->message));
            strncpy(c->recommendation, "Disable PROTON_ENABLE_WAYLAND when wrapping with Gamescope.", sizeof(c->recommendation));
            c->severity = SEVERITY_WARNING;
        }
    }

    // Rule 5: Both Esync and Fsync Disabled without NTSYNC
    if (is_flag_active(flags, num_flags, "PROTON_NO_ESYNC") && 
        is_flag_active(flags, num_flags, "PROTON_NO_FSYNC") &&
        !is_flag_active(flags, num_flags, "PROTON_USE_NTSYNC")) {
        if (count < max_conflicts) {
            FlagConflict *c = &out_conflicts[count++];
            strncpy(c->id, "no_esync_no_fsync", sizeof(c->id));
            strncpy(c->title, "Both Esync and Fsync Disabled", sizeof(c->title));
            strncpy(c->message, "Disabling both Esync and Fsync forces Wine to use high-overhead server event objects.", sizeof(c->message));
            strncpy(c->recommendation, "Leave at least Esync or Fsync enabled for normal multi-threading performance.", sizeof(c->recommendation));
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
        } else if (strcmp(conflicts[i].id, "no_esync_no_fsync") == 0) {
            disable_flag_by_fragment(flags, num_flags, "PROTON_NO_ESYNC");
            disable_flag_by_fragment(flags, num_flags, "PROTON_NO_FSYNC");
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
    char name[64];
    char description[160];
    char custom_args[128];
    char active_flags[8][64];
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

#include "presets.h"
#include <stdio.h>
#include <string.h>
#include <strings.h>

static const GamePreset g_presets[] = {
    {
        "deck",
        "Steam Deck / Handheld Optimal",
        "MangoHud overlay, GameMode priority, NTSYNC kernel sync, and optimal battery balance",
        "-novid",
        {"mangohud", "gamemoderun", "PROTON_USE_NTSYNC"},
        3
    },
    {
        "esports",
        "Max Performance & High FPS",
        "GameMode CPU pinning, NTSYNC, disable shader cache disk stalls, NVAPI Reflex",
        "-high -novid +fps_max 0",
        {"gamemoderun", "PROTON_USE_NTSYNC", "ENABLE_NVAPI"},
        3
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
        "LSFG-VK Vulkan frame multiplier (2x) with MangoHud latency monitoring",
        "",
        {"lsfg-vk", "mangohud"},
        2
    },
    {
        "battery",
        "Battery Saver / Low Power",
        "Gamescope framerate cap (40 FPS / 60 Hz) and minimum background sync overhead",
        "-novid",
        {"Gamescope"},
        1
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
        strncpy(out_custom_args, target->custom_args, max_args - 1);
        out_custom_args[max_args - 1] = 0;
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

int scan_all_steam_libraries(SteamGameInfo *out_games, int max_games);
bool find_game_by_name(const char *search_query, SteamGameInfo *out_game);
bool find_game_by_appid(int app_id, SteamGameInfo *out_game);

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

static void parse_libraryfolders(const char *lib_vdf, char library_paths[16][1024], int *num_libs) {
    FILE *fp = fopen(lib_vdf, "r");
    if (!fp) return;

    char line[1024];
    while (fgets(line, sizeof(line), fp)) {
        char *p_path = strstr(line, "\\"path\\"");
        if (p_path && *num_libs < 16) {
            p_path += 6;
            char *start = strchr(p_path, 34);
            if (start) {
                start++;
                char *end = strchr(start, 34);
                if (end) {
                    *end = 0;
                    char apps_dir[1024];
                    snprintf(apps_dir, sizeof(apps_dir), "%s/steamapps", start);
                    if (access(apps_dir, F_OK) == 0) {
                        bool exists = false;
                        for (int i = 0; i < *num_libs; i++) {
                            if (strcmp(library_paths[i], apps_dir) == 0) { exists = true; break; }
                        }
                        if (!exists) {
                            strncpy(library_paths[*num_libs], apps_dir, sizeof(library_paths[0]) - 1);
                            (*num_libs)++;
                        }
                    }
                }
            }
        }
    }
    fclose(fp);
}

int scan_all_steam_libraries(SteamGameInfo *out_games, int max_games) {
    if (!out_games || max_games <= 0) return 0;

    const char *home = getenv("HOME");
    if (!home) {
        struct passwd *pw = getpwuid(getuid());
        if (pw) home = pw->pw_dir;
    }
    if (!home) return 0;

    char library_paths[16][1024];
    int num_libs = 0;

    const char *default_steamapps[] = {
        "/.local/share/Steam/steamapps",
        "/.steam/steam/steamapps",
        "/.var/app/com.valvesoftware.Steam/.steam/steam/steamapps",
        "/.var/app/com.valvesoftware.Steam/.local/share/Steam/steamapps"
    };

    for (int i = 0; i < 4; i++) {
        char path[1024];
        snprintf(path, sizeof(path), "%s%s", home, default_steamapps[i]);
        if (access(path, F_OK) == 0 && num_libs < 16) {
            strncpy(library_paths[num_libs++], path, sizeof(library_paths[0]) - 1);

            char lib_vdf[1024];
            snprintf(lib_vdf, sizeof(lib_vdf), "%s/libraryfolders.vdf", path);
            parse_libraryfolders(lib_vdf, library_paths, &num_libs);
        }
    }

    int count = 0;

    for (int lib = 0; lib < num_libs; lib++) {
        DIR *dir = opendir(library_paths[lib]);
        if (!dir) continue;

        struct dirent *entry;
        while ((entry = readdir(dir)) != NULL) {
            if (strncmp(entry->d_name, "appmanifest_", 12) == 0 && strstr(entry->d_name, ".acf")) {
                if (count >= max_games) break;

                char acf_file[2048];
                snprintf(acf_file, sizeof(acf_file), "%s/%s", library_paths[lib], entry->d_name);

                FILE *fp = fopen(acf_file, "r");
                if (!fp) continue;

                int appid = 0;
                long long last_updated = 0;
                char name[128] = "";
                char line[512];

                while (fgets(line, sizeof(line), fp)) {
                    if (strstr(line, "\\"appid\\"")) {
                        char *val = strchr(line + 7, 34);
                        if (val) appid = atoi(val + 1);
                    } else if (strstr(line, "\\"name\\"")) {
                        char *val = strchr(line + 6, 34);
                        if (val) {
                            val++;
                            char *end = strchr(val, 34);
                            if (end) *end = 0;
                            strncpy(name, val, sizeof(name) - 1);
                        }
                    } else if (strstr(line, "\\"LastUpdated\\"")) {
                        char *val = strchr(line + 13, 34);
                        if (val) last_updated = atoll(val + 1);
                    }
                }
                fclose(fp);

                if (appid > 0 && strlen(name) > 0 && !is_tool_or_runtime(name)) {
                    bool exists = false;
                    for (int i = 0; i < count; i++) {
                        if (out_games[i].app_id == appid) { exists = true; break; }
                    }
                    if (!exists) {
                        out_games[count].app_id = appid;
                        out_games[count].last_updated = last_updated;
                        strncpy(out_games[count].name, name, sizeof(out_games[count].name) - 1);
                        count++;
                    }
                }
            }
        }
        closedir(dir);
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
        if (strcasestr(games[i].name, search_query)) {
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

#include "backup.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <dirent.h>
#include <sys/stat.h>
#include <libgen.h>

bool create_vdf_backup(const char *vdf_path, char *out_backup_path, size_t max_len) {
    if (!vdf_path || access(vdf_path, F_OK) != 0) return false;

    time_t now = time(NULL);
    struct tm *t = localtime(&now);

    char backup_file[1024];
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
        strncpy(out_backup_path, backup_file, max_len - 1);
        out_backup_path[max_len - 1] = 0;
    }

    return true;
}

int list_vdf_backups(const char *vdf_path) {
    if (!vdf_path || strlen(vdf_path) == 0) return 0;

    char dir_copy[1024];
    strncpy(dir_copy, vdf_path, sizeof(dir_copy) - 1);
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

    char restore_src[1024] = "";

    if (strcmp(backup_filename_or_latest, "latest") == 0) {
        char dir_copy[1024];
        strncpy(dir_copy, vdf_path, sizeof(dir_copy) - 1);
        char *dir_path = dirname(dir_copy);

        DIR *dir = opendir(dir_path);
        if (!dir) return false;

        char latest_name[256] = "";
        struct dirent *entry;
        while ((entry = readdir(dir)) != NULL) {
            if (strstr(entry->d_name, "localconfig.vdf.bak")) {
                if (strcmp(entry->d_name, latest_name) > 0) {
                    strncpy(latest_name, entry->d_name, sizeof(latest_name) - 1);
                }
            }
        }
        closedir(dir);

        if (strlen(latest_name) == 0) return false;
        snprintf(restore_src, sizeof(restore_src), "%s/%s", dir_path, latest_name);
    } else {
        if (backup_filename_or_latest[0] == '/') {
            strncpy(restore_src, backup_filename_or_latest, sizeof(restore_src) - 1);
        } else {
            char dir_copy[1024];
            strncpy(dir_copy, vdf_path, sizeof(dir_copy) - 1);
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

#include "launcher.h"
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <sys/types.h>
#include <sys/wait.h>

bool detect_steam_client(char *out_type, size_t max_len) {
    if (system("command -v steam > /dev/null 2>&1") == 0) {
        if (out_type && max_len > 0) strncpy(out_type, "Native Steam (system PATH)", max_len - 1);
        return true;
    }
    if (system("command -v flatpak > /dev/null 2>&1 && flatpak list | grep -q com.valvesoftware.Steam") == 0) {
        if (out_type && max_len > 0) strncpy(out_type, "Flatpak Steam", max_len - 1);
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

#include "tui.h"
#include "presets.h"
#include "scanner.h"
#include "backup.h"
#include "launcher.h"
#include "vdf_parser.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <termios.h>
#include <unistd.h>

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
    for (int order = 1; order <= 3; order++) {
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
    strncpy(current_game, game_name, sizeof(current_game) - 1);

    char status_msg[128] = "Use [UP/DOWN] to navigate, [SPACE] to toggle, [P] for presets, [S] to save";

    while (1) {
        // Clear screen
        printf("\\033[H\\033[J");

        // Header
        printf("\\033[1;36m================================================================================\\033[0m\\n");
        printf("\\033[1;37m 🚀 Proton Launch Options Manager (Interactive C99 TUI)\\033[0m\\n");
        printf("\\033[1;32m Target Game:\\033[0m \\033[1m%s\\033[0m (AppID: \\033[1;33m%d\\033[0m)\\n", current_game, current_appid);
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

        // Checklist items
        for (int i = 0; i < num_flags; i++) {
            bool is_sel = (i == selected_idx);
            const char *box = flags[i].enabled ? "\\033[1;32m[X]\\033[0m" : "\\033[1;30m[ ]\\033[0m";
            if (is_sel) {
                printf("\\033[1;37;44m > %s %-32s (%s)\\033[0m\\n",
                       flags[i].enabled ? "[X]" : "[ ]", flags[i].name, flags[i].env_var);
            } else {
                printf("   %s %-32s \\033[2m%s\\033[0m\\n",
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
        printf("\\033[1;34m [SPACE]\\033[0m Toggle  \\033[1;34m[P]\\033[0m Presets  \\033[1;34m[G]\\033[0m Games  \\033[1;34m[C]\\033[0m Fix Conflicts  \\033[1;34m[S]\\033[0m Save VDF  \\033[1;34m[X]\\033[0m Launch  \\033[1;34m[Q]\\033[0m Quit\\n");
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
        } else if (c == 'j' || c == 's' && c != 'S') {
            if (selected_idx < num_flags - 1) selected_idx++;
        } else if (c == ' ') {
            flags[selected_idx].enabled = !flags[selected_idx].enabled;
            snprintf(status_msg, sizeof(status_msg), "Toggled '%s'", flags[selected_idx].name);
        } else if (c == 'c' || c == 'C') {
            if (num_conflicts > 0) {
                auto_resolve_conflicts(flags, num_flags, conflicts, num_conflicts);
                snprintf(status_msg, sizeof(status_msg), "Resolved %d flag conflicts!", num_conflicts);
            }
        } else if (c == 'p' || c == 'P') {
            // Cycle presets
            static int p_idx = 0;
            p_idx = (p_idx + 1) % get_presets_count();
            const GamePreset *p = get_preset_by_index(p_idx);
            if (p) {
                apply_preset(flags, num_flags, p->id, NULL, 0);
                snprintf(status_msg, sizeof(status_msg), "Applied preset '%s'", p->name);
            }
        } else if (c == 'g' || c == 'G') {
            // Switch game from scanner
            SteamGameInfo scanned[64];
            int count = scan_all_steam_libraries(scanned, 64);
            if (count > 0) {
                static int g_idx = 0;
                g_idx = (g_idx + 1) % count;
                current_appid = scanned[g_idx].app_id;
                strncpy(current_game, scanned[g_idx].name, sizeof(current_game) - 1);
                snprintf(status_msg, sizeof(status_msg), "Selected '%s' (AppID %d)", current_game, current_appid);
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
      filename: 'main.c',
      language: 'c',
      description: 'Main GTK3 / Linux GUI C application with presets, conflict warnings, and VDF backup support',
      content: `/*
 * Proton Launch Options Manager for Steam Library on Linux
 * Language: C99 / GTK+3
 * Portable C code to modify Steam game launch options efficiently
 */

#include <gtk/gtk.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>
#include "vdf_parser.h"
#include "conflicts.h"
#include "presets.h"
#include "scanner.h"
#include "backup.h"
#include "launcher.h"

#define MAX_CMD_LEN 2048
#define MAX_GAME_NAME 256

static ProtonFlag g_flags[] = {
    {"PROTON_USE_WINED3D", "PROTON_USE_WINED3D=1", false, 0, false},
    {"PROTON_USE_NTSYNC", "PROTON_USE_NTSYNC=1", false, 0, false},
    {"DISABLE_SHADER_CACHE", "DISABLE_SHADER_CACHE=1", false, 0, false},
    {"gamemoderun (GameMode)", "gamemoderun", true, 2, false},
    {"game-performance (CachyOS)", "game-performance", true, 2, false},
    {"lsvk (VKD3D Ray Tracing)", "VKD3D_CONFIG=dxr11,dxr", false, 0, false},
    {"mangohud (FPS Overlay)", "mangohud", true, 1, false},
    {"ENABLE_NVAPI (DLSS/Reflex)", "PROTON_ENABLE_NVAPI=1", false, 0, false},
    {"lsfg-vk (Lossless Scaling)", "ENABLE_LSFG=1 LSFGVK_MULTIPLIER=2", false, 0, false},
    {"Gamescope Compositor", "gamescope -w 1920 -h 1080 -r 144 -f --", true, 3, false},
    {"PROTON_LOG (Debugging)", "PROTON_LOG=1", false, 0, false}
};

static const int NUM_FLAGS = sizeof(g_flags) / sizeof(g_flags[0]);
static GtkWidget *g_check_btns[NUM_FLAGS];

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

static void on_game_changed(GtkComboBoxText *combo, gpointer user_data) {
    (void)user_data;
    gint idx = gtk_combo_box_get_active(GTK_COMBO_BOX(combo));
    if (idx >= 0 && idx < g_num_games) {
        g_current_appid = g_library_games[idx].app_id;
        strncpy(g_current_gamename, g_library_games[idx].name, sizeof(g_current_gamename) - 1);

        char info_str[256];
        snprintf(info_str, sizeof(info_str), "Target Game: <b>%s</b> | AppID: <b>%d</b>", g_current_gamename, g_current_appid);
        gtk_label_set_markup(GTK_LABEL(g_game_info_lbl), info_str);
    }
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
            strncpy(g_library_games[g_num_games].name, g_current_gamename, sizeof(g_library_games[g_num_games].name) - 1);
            g_library_games[g_num_games].name[sizeof(g_library_games[g_num_games].name) - 1] = 0;
            g_num_games++;
        }
    }

    GtkWidget *window = gtk_window_new(GTK_WINDOW_TOPLEVEL);
    gtk_window_set_title(GTK_WINDOW(window), "Linux Steam Proton Launch Options Manager (C)");
    gtk_window_set_default_size(GTK_WINDOW(window), 760, 620);
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
        char item_text[256];
        snprintf(item_text, sizeof(item_text), "%s (AppID: %d)", g_library_games[i].name, g_library_games[i].app_id);
        gtk_combo_box_text_append_text(GTK_COMBO_BOX_TEXT(g_game_combo), item_text);

        if (g_library_games[i].app_id == g_current_appid) {
            active_idx = i;
        }
    }

    gtk_combo_box_set_active(GTK_COMBO_BOX(g_game_combo), active_idx);
    g_signal_connect(g_game_combo, "changed", G_CALLBACK(on_game_changed), NULL);
    gtk_box_pack_start(GTK_BOX(game_box), g_game_combo, TRUE, TRUE, 0);

    // Conflict Status Banner
    g_conflict_lbl = gtk_label_new(NULL);
    update_conflict_status();
    gtk_box_pack_start(GTK_BOX(main_vbox), g_conflict_lbl, FALSE, FALSE, 0);

    // Frame for Flags
    GtkWidget *frame = gtk_frame_new("Proton Flags & Performance Wrappers");
    gtk_box_pack_start(GTK_BOX(main_vbox), frame, TRUE, TRUE, 0);

    GtkWidget *grid = gtk_grid_new();
    gtk_grid_set_column_spacing(GTK_GRID(grid), 20);
    gtk_grid_set_row_spacing(GTK_GRID(grid), 8);
    gtk_container_set_border_width(GTK_CONTAINER(grid), 12);
    gtk_container_add(GTK_CONTAINER(frame), grid);

    for (int i = 0; i < NUM_FLAGS; i++) {
        g_check_btns[i] = gtk_check_button_new_with_label(g_flags[i].name);

        if (strstr(g_flags[i].env_var, "PROTON_ENABLE_NVAPI") || strstr(g_flags[i].env_var, "gamemoderun")) {
            gtk_toggle_button_set_active(GTK_TOGGLE_BUTTON(g_check_btns[i]), TRUE);
            g_flags[i].enabled = true;
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
        "/.var/app/com.valvesoftware.Steam/.steam/steam/userdata",
        "/.var/app/com.valvesoftware.Steam/.local/share/Steam/userdata"
    };

    for (int r = 0; r < 4; r++) {
        char uroot[1024];
        snprintf(uroot, sizeof(uroot), "%s%s", home, userdata_roots[r]);
        DIR *dir = opendir(uroot);
        if (!dir) continue;

        struct dirent *entry;
        while ((entry = readdir(dir)) != NULL) {
            if (entry->d_name[0] == '.') continue;
            char vdf_candidate[1024];
            snprintf(vdf_candidate, sizeof(vdf_candidate), "%s/%s/config/localconfig.vdf", uroot, entry->d_name);
            if (access(vdf_candidate, F_OK) == 0) {
                strncpy(out_path, vdf_candidate, max_len - 1);
                out_path[max_len - 1] = 0;
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
`
    },
    {
      filename: 'Makefile',
      language: 'makefile',
      description: 'Makefile building both zero-dependency proton_cli and optional GTK3 proton_mgr',
      content: `# Makefile for Proton Launch Options Manager
CC ?= gcc
CFLAGS = -Wall -Wextra -std=c99 -O2

# Core CLI/TUI objects (zero external dependencies, pure libc)
CLI_SRCS = cli_main.c vdf_parser.c conflicts.c presets.c scanner.c backup.c launcher.c tui.c
CLI_OBJS = $(CLI_SRCS:.c=.o)
CLI_TARGET = proton_cli

# GUI objects (GTK3)
GUI_SRCS = main.c vdf_parser.c conflicts.c presets.c scanner.c backup.c launcher.c
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
	@if [ -f $(GUI_TARGET) ]; then \\
		install -m 755 $(GUI_TARGET) $(DESTDIR)/usr/local/bin/; \\
	fi

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
        )
        target_link_libraries(proton_mgr \${GTK3_LIBRARIES})
        target_compile_options(proton_mgr PRIVATE \${GTK3_CFLAGS_OTHER})
    endif()
endif()
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
echo "======================================================================"
`
    },
    {
      filename: 'README.md',
      language: 'markdown',
      description: 'Detailed compilation, CLI flag usage, and TUI reference',
      content: `# Proton Launch Options Manager in C (Pure C99 & GTK3)

A lightweight, 100% offline, zero-dependency C utility and GTK3 application for Linux and Steam Deck to inspect, optimize, and manage Steam Proton launch parameters.

## ✨ Features (100% Offline & Pure C99)

1. **Flag Conflict & Incompatibility Detector (\`conflicts.c\`):**
   * Real-time detection of incompatible settings (WineD3D vs Vulkan, duplicate CPU wrappers, sync disablers vs NTSYNC, Gamescope vs Wayland).
   * Single-command auto-resolution (\`--auto-fix\`).

2. **Game Presets & Profiles (\`presets.c\`):**
   * Built-in curated presets: Steam Deck Optimal, Esports / High FPS, Ray Tracing & DLSS, Retro Legacy, Lossless Scaling, and Battery Saver.
   * Apply with \`./proton_cli --preset <name>\`.

3. **Steam Library Auto-Discovery (\`scanner.c\`):**
   * Automatically parses \`libraryfolders.vdf\` across internal and external mount drives.
   * Scans all \`appmanifest_*.acf\` files to list installed games without manual AppID lookup.

4. **Safe VDF Backup & Rollback Manager (\`backup.c\`):**
   * Creates automatic timestamped backups before applying edits.
   * Quick restore with \`./proton_cli --restore latest\`.

5. **Zero-Dependency Terminal UI (\`tui.c\`):**
   * Full interactive TUI with ANSI colors, live command preview, and hotkeys.
   * Runs in any terminal or SSH session without needing \`ncurses\` or X11/Wayland.

6. **Direct Steam URI Launcher (\`launcher.c\`):**
   * Launches games asynchronously via \`steam://rungameid/<appid>\` supporting Native and Flatpak Steam.

## 🚀 Quick Start

\`\`\`bash
chmod +x build.sh
./build.sh

# Interactive TUI mode
./proton_cli -i

# Auto-scan installed Steam games
./proton_cli -l

# Apply Steam Deck preset to game and save
./proton_cli -g 1091500 -p deck -w -x
\`\`\`
`
    }
  ];
}
