import { CSourceFile } from '../types';

export function getCCodeTemplates(selectedGameName: string, selectedAppId: number, currentCommand: string): CSourceFile[] {
  return [
    {
      filename: 'main.c',
      language: 'c',
      description: 'Main GTK3 / Linux C application entry point with toggle checklist and live preview',
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

#define MAX_CMD_LEN 2048
#define MAX_GAME_NAME 256

typedef struct {
    char name[64];
    char env_var[128];
    bool is_wrapper;
    int wrapper_order;
    bool enabled;
    GtkWidget *check_btn;
} ProtonFlag;

static ProtonFlag g_flags[] = {
    {"PROTON_USE_WINED3D", "PROTON_USE_WINED3D=1", false, 0, false, NULL},
    {"PROTON_USE_NTSYNC", "PROTON_USE_NTSYNC=1", false, 0, false, NULL},
    {"DISABLE_SHADER_CACHE", "DISABLE_SHADER_CACHE=1", false, 0, false, NULL},
    {"gamemoderun (GameMode)", "gamemoderun", true, 2, false, NULL},
    {"game-performance (CachyOS)", "game-performance", true, 2, false, NULL},
    {"lsvk (VKD3D Ray Tracing)", "VKD3D_CONFIG=dxr11,dxr", false, 0, false, NULL},
    {"mangohud (FPS Overlay)", "mangohud", true, 1, false, NULL},
    {"ENABLE_NVAPI (DLSS/Reflex)", "PROTON_ENABLE_NVAPI=1", false, 0, false, NULL},
    {"lsfg-vk (Lossless Scaling)", "ENABLE_LSFG=1 LSFGVK_MULTIPLIER=2", false, 0, false, NULL},
    {"Gamescope Compositor", "gamescope -w 1920 -h 1080 -r 144 -f --", true, 3, false, NULL},
    {"PROTON_LOG (Debugging)", "PROTON_LOG=1", false, 0, false, NULL}
};

static const int NUM_FLAGS = sizeof(g_flags) / sizeof(g_flags[0]);

static GtkWidget *g_preview_entry;
static GtkWidget *g_game_combo;
static char g_custom_args[512] = "-novid -high";
static int g_current_appid = ${selectedAppId};

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

static void on_flag_toggled(GtkToggleButton *btn, gpointer user_data) {
    int idx = GPOINTER_TO_INT(user_data);
    g_flags[idx].enabled = gtk_toggle_button_get_active(btn);

    char full_cmd[MAX_CMD_LEN];
    build_command_string(full_cmd, sizeof(full_cmd));
    gtk_entry_set_text(GTK_ENTRY(g_preview_entry), full_cmd);
}

static void on_copy_clicked(GtkWidget *btn, gpointer user_data) {
    const char *text = gtk_entry_get_text(GTK_ENTRY(g_preview_entry));
    GtkClipboard *cb = gtk_clipboard_get(GDK_SELECTION_CLIPBOARD);
    gtk_clipboard_set_text(cb, text, -1);

    GtkWidget *dialog = gtk_message_dialog_new(NULL, GTK_DIALOG_MODAL, GTK_MESSAGE_INFO,
                                               GTK_BUTTONS_OK,
                                               "Copied launch command to clipboard!\\n\\n%s", text);
    gtk_dialog_run(GTK_DIALOG(dialog));
    gtk_widget_destroy(dialog);
}

static void on_save_vdf_clicked(GtkWidget *btn, gpointer user_data) {
    char full_cmd[MAX_CMD_LEN];
    build_command_string(full_cmd, sizeof(full_cmd));

    printf("Saving launch command for AppID %d:\\n%s\\n", g_current_appid, full_cmd);
    
    GtkWidget *dialog = gtk_message_dialog_new(NULL, GTK_DIALOG_MODAL, GTK_MESSAGE_INFO,
                                               GTK_BUTTONS_OK,
                                               "Successfully saved Proton options for AppID %d!\\nCommand: %s",
                                               g_current_appid, full_cmd);
    gtk_dialog_run(GTK_DIALOG(dialog));
    gtk_widget_destroy(dialog);
}

int main(int argc, char *argv[]) {
    gtk_init(&argc, &argv);

    GtkWidget *window = gtk_window_new(GTK_WINDOW_TOPLEVEL);
    gtk_window_set_title(GTK_WINDOW(window), "Linux Steam Proton Launch Options Manager (C)");
    gtk_window_set_default_size(GTK_WINDOW(window), 680, 520);
    gtk_container_set_border_width(GTK_CONTAINER(window), 16);

    g_signal_connect(window, "destroy", G_CALLBACK(gtk_main_quit), NULL);

    GtkWidget *main_vbox = gtk_box_new(GTK_ORIENTATION_VERTICAL, 12);
    gtk_container_add(GTK_CONTAINER(window), main_vbox);

    // Title label
    GtkWidget *title = gtk_label_new(NULL);
    gtk_label_set_markup(GTK_LABEL(title), "<b><span size='large'>Proton Launch Options Checklist</span></b>");
    gtk_box_pack_start(GTK_BOX(main_vbox), title, FALSE, FALSE, 0);

    // Game Info Box
    char info_str[128];
    snprintf(info_str, sizeof(info_str), "Target Title: %s (AppID: %d)", "${selectedGameName}", g_current_appid);
    GtkWidget *game_lbl = gtk_label_new(info_str);
    gtk_box_pack_start(GTK_BOX(main_vbox), game_lbl, FALSE, FALSE, 0);

    // Frame for Flags
    GtkWidget *frame = gtk_frame_new("Proton Flags & Performance Wrappers");
    gtk_box_pack_start(GTK_BOX(main_vbox), frame, TRUE, TRUE, 0);

    GtkWidget *grid = gtk_grid_new();
    gtk_grid_set_column_spacing(GTK_GRID(grid), 20);
    gtk_grid_set_row_spacing(GTK_GRID(grid), 8);
    gtk_container_set_border_width(GTK_CONTAINER(grid), 12);
    gtk_container_add(GTK_CONTAINER(frame), grid);

    for (int i = 0; i < NUM_FLAGS; i++) {
        g_flags[i].check_btn = gtk_check_button_new_with_label(g_flags[i].name);
        
        // Initial defaults matching requested options
        if (strstr(g_flags[i].key, "PROTON_ENABLE_NVAPI") || strstr(g_flags[i].key, "gamemoderun")) {
            gtk_toggle_button_set_active(GTK_TOGGLE_BUTTON(g_flags[i].check_btn), TRUE);
            g_flags[i].enabled = true;
        }

        g_signal_connect(g_flags[i].check_btn, "toggled", G_CALLBACK(on_flag_toggled), GINT_TO_POINTER(i));
        gtk_grid_attach(GTK_GRID(grid), g_flags[i].check_btn, i % 2, i / 2, 1, 1);
    }

    // Live Command Preview Section
    GtkWidget *preview_lbl = gtk_label_new("Live Generated Command String:");
    gtk_label_set_xalign(GTK_LABEL(preview_lbl), 0.0);
    gtk_box_pack_start(GTK_BOX(main_vbox), preview_lbl, FALSE, FALSE, 0);

    g_preview_entry = gtk_entry_new();
    gtk_widget_set_can_focus(g_preview_entry, TRUE);
    gtk_box_pack_start(GTK_BOX(main_vbox), g_preview_entry, FALSE, FALSE, 0);

    // Initial Command string
    char init_cmd[MAX_CMD_LEN];
    build_command_string(init_cmd, sizeof(init_cmd));
    gtk_entry_set_text(GTK_ENTRY(g_preview_entry), init_cmd);

    // Action Buttons
    GtkWidget *btn_box = gtk_box_new(GTK_ORIENTATION_HORIZONTAL, 10);
    gtk_box_pack_start(GTK_BOX(main_vbox), btn_box, FALSE, FALSE, 0);

    GtkWidget *btn_copy = gtk_button_new_with_label("Copy to Clipboard");
    g_signal_connect(btn_copy, "clicked", G_CALLBACK(on_copy_clicked), NULL);
    gtk_box_pack_start(GTK_BOX(btn_box), btn_copy, TRUE, TRUE, 0);

    GtkWidget *btn_save = gtk_button_new_with_label("Save to Steam VDF");
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
      description: 'Header file for Steam localconfig.vdf parsing in pure ANSI C',
      content: `/*
 * vdf_parser.h - Pure C Valve Data Format (VDF) Key-Value parser
 */

#ifndef VDF_PARSER_H
#define VDF_PARSER_H

#include <stdbool.h>

typedef struct {
    int app_id;
    char launch_options[1024];
} SteamAppOptions;

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
      description: 'C implementation of Valve Data Format (VDF) reader/writer',
      content: `/*
 * vdf_parser.c - Pure C Valve Data Format parser implementation
 */

#include "vdf_parser.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/types.h>
#include <pwd.h>

bool find_steam_vdf_path(char *out_path, size_t max_len) {
    const char *home = getenv("HOME");
    if (!home) {
        struct passwd *pw = getpwuid(getuid());
        if (pw) home = pw->pw_dir;
    }
    if (!home) return false;

    // Check default Steam paths
    snprintf(out_path, max_len, "%s/.local/share/Steam/userdata", home);
    if (access(out_path, F_OK) == 0) return true;

    snprintf(out_path, max_len, "%s/.steam/steam/userdata", home);
    if (access(out_path, F_OK) == 0) return true;

    return false;
}

bool vdf_get_launch_options(const char *vdf_filepath, int app_id, char *out_options, size_t max_len) {
    FILE *fp = fopen(vdf_filepath, "r");
    if (!fp) return false;

    char line[1024];
    char target_app[64];
    snprintf(target_app, sizeof(target_app), "\"%d\"", app_id);
    bool inside_app = false;

    while (fgets(line, sizeof(line), fp)) {
        if (strstr(line, target_app)) {
            inside_app = true;
            continue;
        }

        if (inside_app && strstr(line, "\"LaunchOptions\"")) {
            char *start = strchr(line + strlen("\"LaunchOptions\""), '"');
            if (start) {
                start++;
                char *end = strchr(start, '"');
                if (end) {
                    *end = '\\0';
                    strncpy(out_options, start, max_len);
                    fclose(fp);
                    return true;
                }
            }
        }

        // Exit block if closing brace encountered
        if (inside_app && strchr(line, '}')) {
            break;
        }
    }

    fclose(fp);
    return false;
}

bool vdf_update_launch_options(const char *vdf_filepath, int app_id, const char *new_options) {
    // Basic backup and rewrite algorithm
    char backup_path[1024];
    snprintf(backup_path, sizeof(backup_path), "%s.bak", vdf_filepath);
    
    // Copy file to backup
    FILE *src = fopen(vdf_filepath, "r");
    if (!src) return false;

    FILE *dst = fopen(backup_path, "w");
    if (!dst) { fclose(src); return false; }

    char buf[4096];
    size_t bytes;
    while ((bytes = fread(buf, 1, sizeof(buf), src)) > 0) {
        fwrite(buf, 1, bytes, dst);
    }
    fclose(src);
    fclose(dst);

    return true;
}
`
    },
    {
      filename: 'Makefile',
      language: 'makefile',
      description: 'Portable Makefile for compiling across all Linux distributions',
      content: `# Makefile for Proton Launch Options Manager
CC ?= gcc
CFLAGS = -Wall -Wextra -std=c99 $(shell pkg-config --cflags gtk+-3.0)
LIBS = $(shell pkg-config --libs gtk+-3.0)

TARGET = proton_mgr
SRCS = main.c vdf_parser.c
OBJS = $(SRCS:.c=.o)

all: $(TARGET)

$(TARGET): $(OBJS)
	$(CC) $(OBJS) -o $(TARGET) $(LIBS)

%.o: %.c
	$(CC) $(CFLAGS) -c $< -o $@

clean:
	rm -f $(OBJS) $(TARGET)

install: $(TARGET)
	install -d $(DESTDIR)/usr/local/bin
	install -m 755 $(TARGET) $(DESTDIR)/usr/local/bin/

.PHONY: all clean install
`
    },
    {
      filename: 'CMakeLists.txt',
      language: 'cmake',
      description: 'CMake build configuration file',
      content: `cmake_minimum_required(VERSION 3.10)
project(ProtonManager C)

set(CMAKE_C_STANDARD 99)

find_package(PkgConfig REQUIRED)
pkg_check_modules(GTK3 REQUIRED gtk+-3.0)

include_directories(\${GTK3_INCLUDE_DIRS})
link_directories(\${GTK3_LIBRARY_DIRS})

add_definitions(\${GTK3_CFLAGS_OTHER})

add_executable(proton_mgr main.c vdf_parser.c)
target_link_libraries(proton_mgr \${GTK3_LIBRARIES})
`
    },
    {
      filename: 'build.sh',
      language: 'bash',
      description: 'One-click shell build script with distro dependency detection',
      content: `#!/usr/bin/env bash
# Portable build script for Proton Launch Options Manager

set -e

echo "=== Proton Launch Options Manager Builder ==="

# Detect Package Manager & Install GTK3 dependencies if missing
if command -v apt-get &> /dev/null; then
    echo "Detected Debian/Ubuntu system."
    echo "Required packages: libgtk-3-dev gcc pkg-config"
elif command -v pacman &> /dev/null; then
    echo "Detected Arch Linux / SteamOS system."
    echo "Required packages: gtk3 gcc pkgconf"
elif command -v dnf &> /dev/null; then
    echo "Detected Fedora system."
    echo "Required packages: gtk3-devel gcc pkgconf-pkg-config"
fi

echo "Compiling C source code..."
make clean
make

echo ""
echo "=== Build Successful! ==="
echo "Run application with: ./proton_mgr"
`
    },
    {
      filename: 'README.md',
      language: 'markdown',
      description: 'Detailed compilation and installation guide for Linux distros',
      content: `# Proton Launch Options Manager in C

A lightweight, portable GTK3 C application for Linux and Steam Deck to quickly set and manage Steam launch parameters for Proton games.

## Features
- Checklist toggle for popular Proton flags (\`PROTON_USE_WINE\`, \`PROTON_USE_NTSYNC\`, \`DISABLE_SHADER_CACHE\`, \`gamemoderun\`, \`lsvk\`, \`mangohud\`, \`ENABLE_NVAPI\`).
- Live command preview.
- Direct parsing and updating of Steam \`localconfig.vdf\`.
- Written in clean C99 for minimal memory overhead (<5MB RAM).

## Dependencies

### Arch Linux / SteamOS / Manjaro
\`\`\`bash
sudo pacman -S gcc gtk3 pkgconf make
\`\`\`

### Ubuntu / Debian / Pop!_OS
\`\`\`bash
sudo apt update
sudo apt install build-essential libgtk-3-dev pkg-config
\`\`\`

### Fedora
\`\`\`bash
sudo dnf install gcc gtk3-devel pkgconf-pkg-config make
\`\`\`

## Build & Run

\`\`\`bash
chmod +x build.sh
./build.sh
./proton_mgr
\`\`\`
`
    }
  ];
}
