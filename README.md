# 🐧 Proton Launch Options Manager

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-cyan)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-4.21-lightgrey)](https://expressjs.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8)](https://tailwindcss.com/)

A modern Linux gaming utility designed for Linux gamers, Steam Deck users, and power users. Easily customize, test, and apply Steam Proton launch options and manage custom Proton runners without memorizing complex command-line syntax.

---

## ✨ Key Features

### 🎛️ Interactive Flag Builder
* **Gamescope:** Resolution scaling, FSR/NIS upscaling, refresh rate caps, and window modes.
* **MangoHud:** Real-time FPS overlay, frame timing, and limiter controls.
* **GameMode & CachyOS:** Native Feral GameMode daemon and CachyOS `game-performance` wrapper integration.
* **Graphics & Ray Tracing:** NVIDIA DLSS, Reflex, NVAPI, VKD3D-Proton Ray Tracing, AMD FSR, and Vulkan driver flags.
* **Lossless Scaling (lsfg-vk):** Full frame generation support (`ENABLE_LSFG=1`, multipliers, flow scale, performance modes).
* **Audio & Wine Tuning:** PulseAudio latency, Wayland/X11 overrides, DXVK async shaders, and Wine debug toggles.

### 📁 Direct Steam Integration
* **VDF Disk Sync:** Read from and write directly to Steam's `localconfig.vdf` on Linux (`~/.local/share/Steam`), Flatpak, or SteamOS (`/home/deck/`).
* **Automatic Backups:** Generates `.bak` safety backups before applying file modifications.

### 🔥 Proton Runner Manager (ProtonUp-Qt Style)
* Discover, download, and manage custom Proton runner releases directly in Steam's `compatibilitytools.d`:
  * **GE-Proton** (GloriousEggroll)
  * **Proton-CachyOS** (Compiler-optimized x86-64-v3/v4 builds)
  * **Proton-RTSP** (SpookySkeletons GStreamer runner for VRChat & RTSP/HLS livestreams)
  * **Luxtorpeda** (Native Linux game engine compatibility tool from Codeberg)
  * **Boxtron** (Steam compatibility tool for DOS games using DOSBox/DOSBox-Staging)
  * **Roberta** (Steam compatibility tool for adventure games using ScummVM)
  * **Proton-EM** (Etaash Mathamsetty performance builds)
  * **Proton-DW** (Wine-GE / DirectWay)

### 🖥️ Portable C Code Generator
* Generate standalone C99 source code wrappers and GTK3 desktop utilities for custom launchers—no web browser required at runtime.

### ⚡ Low Latency Layer (LLL) Integration
Full support for Korthos Software's **[Low Latency Layer](https://github.com/Korthos-Software/low_latency_layer)** (`low_latency_layer`).

<details>
<summary><b>View Low Latency Layer Options</b></summary>

* `LOW_LATENCY_LAYER=1` (Main activation flag)
* `LOW_LATENCY_LAYER_REFLEX=1` (Expose `VK_NV_low_latency2` / Nvidia Reflex extension interface)
* `LOW_LATENCY_LAYER_DECOUPLED_MITIGATION=1` (Force mitigation for decoupled simulation and render queues)
* `LOW_LATENCY_LAYER_DISABLE=1` (Explicit layer override)
* `LOW_LATENCY_LAYER_NV_GPU_REPORT_AS_NVIDIA=1` (Debug vendor spoofing)
* `DXVK_CONFIG="dxgi.hideAmdGpu = True"` (DXVK AMD GPU hiding for in-game Reflex menus)
* `ENABLE_LAYER_MESA_ANTI_LAG=1` (Mesa RADV native Anti-Lag 2)

</details>

### 🚀 Proton-CachyOS Config Options
Native support for **[Proton-CachyOS](https://github.com/CachyOS/proton-cachyos)** environment variables and runtime settings.

<details>
<summary><b>View Proton-CachyOS Config Options</b></summary>

* `PROTON_DXVK_LOWLATENCY=1` (Frame pacing & low-latency DXVK fork)
* `PROTON_FSR4_UPGRADE=1` (Auto-upgrade FSR 3.1 games to AMD FSR 4)
* `PROTON_FSR4_RDNA3_UPGRADE=1` (RDNA 3 specific FSR 4 DLL upgrade path)
* `PROTON_USE_OPTISCALER=1` (OptiScaler in-game DLSS/FSR/XeSS upscaler injection)
* `PROTON_OPTISCALER_CONFIG="..."` (Custom OptiScaler INI config parameters)
* `PROTON_DLSS_UPGRADE="310.2"` (Force DLSS DLL version overrides & NVAPI DRS)
* `PROTON_DLSS_OVERLAY=1` (On-screen DLSS HUD indicator)
* `PROTON_VKREFLEX=1` (DXVK-NVAPI Vulkan Reflex layer)
* `PROTON_DXVK_SAREK=1` (Async DXVK fallback for legacy non-Vulkan 1.3 GPUs)
* `PROTON_NVIDIA_LIBS=1` (CUDA, NVENC, NVML, PhysX, and OptiX Wine acceleration)
* `PROTON_NVIDIA_NVOPTIX=1` (OptiX ray tracing DLL)
* `WINE_FULLSCREEN_INTEGER_SCALING=1` (Sharp pixel integer scaling)
* `WINE_DISABLE_VULKAN_OPWR=1` (Wayland windowing glitch workaround)
* `PROTON_NO_WM_DECORATION=1` (Disable WM decorations)
* `PROTON_LOCAL_SHADER_CACHE=1` (Per-game local shader cache)
* `WINE_BLOCK_HOSTS="..."` (Block Wine telemetry & DRM domains)

</details>

### 📦 GE-Proton Options
Full support for **[GE-Proton (GloriousEggroll)](https://github.com/GloriousEggroll/proton-ge-custom)** environment variables and Wine-GE patches.

<details>
<summary><b>View GE-Proton Config Options</b></summary>

* `PROTON_ENABLE_NVAPI=1` (Expose NVAPI & enable Nvidia DLSS/Reflex)
* `WINE_FULLSCREEN_FSR=1` (Built-in AMD FSR 1.0 spatial upscaler)
* `WINE_FULLSCREEN_FSR_CUSTOM_MODE="1440x900"` (Custom render resolution override)
* `WINE_FULLSCREEN_FSR_STRENGTH=2` (Adjust FSR sharpening strength 0-5)
* `PROTON_FORCE_LARGE_ADDRESS_AWARE=1` (Access up to 4GB RAM for 32-bit titles)
* `PROTON_DISABLE_NVAPI=1` (Disable NVAPI to fix driver startup crashes)
* `PROTON_NO_AMD_AGS=1` (Disable AMD AGS driver extensions)
* `PROTON_SET_GAME_DRIVE=1` (Virtual drive mount point for EA/Ubisoft launchers)
* `PROTON_ENABLE_HDR=1` (Enable High Dynamic Range 10-bit surface output)

</details>

### 🛠️ Proton-EM Options
Config options for **[Proton-EM](https://github.com/Etaash-mathamsetty)** with enhanced Wayland (`winewayland.drv`) and CJK IME input support.

<details>
<summary><b>View Proton-EM Config Options</b></summary>

* `PROTON_EM_ENABLE_WAYLAND=1` (Enable native Wayland winewayland.drv display driver)
* `PROTON_WAYLAND_KWIN_REPEAT_BUG=1` (Fix KDE KWin key repeat bugs with IME active)
* `PROTON_RAW_INPUT_SENSITIVITY=1` (Fix mouse raw input camera scaling under Wayland)
* `PROTON_EM_FSR4=1` (Integrated Proton-EM FSR 4 upscaler pipeline)
* `WINE_WAYLAND_TRICKS=1` (Experimental Wayland windowing and borderless tricks)

</details>

### 🛡️ Proton-DW Options
Config options for **Proton-DW** (DeepWine) compatibility runner for online games & Asian titles.

<details>
<summary><b>View Proton-DW Config Options</b></summary>

* `PROTON_DW_DXVK=1` (Force Proton-DW updated DXVK translation layer branch)
* `PROTON_DW_EAC_WORKAROUND=1` (Easy Anti-Cheat launcher compatibility patch)
* `PROTON_DW_DIRECTWRITE_OVERRIDE=1` (Override DirectWrite font engine for CJK launcher text)
* `PROTON_DW_DISABLE_CEF_SANDBOX=1` (Disable CEF browser sandbox in HoYoverse/Nikke launchers)

</details>

### 📺 Boxtron (DOSBox) Options
Config options for **[Boxtron](https://github.com/dreamchess/boxtron)** Steam Play compatibility tool for DOS games using native DOSBox / DOSBox-Staging.

<details>
<summary><b>View Boxtron Config Options</b></summary>

* `BOXTRON_SIERRA_GAME="1"` (Select specific game index in Sierra Classics collection)
* `BOXTRON_SCREEN=2` (Direct DOSBox fullscreen output to specific monitor index)
* `BOXTRON_USE_MIDI_SEQ="128:0"` (Override preferred MIDI client/sequencer port)
* `BOXTRON_DOSBOX="dosbox-staging"` (Use custom DOSBox executable build)
* `BOXTRON_CONF="~/.config/boxtron.conf"` (Custom boxtron config file path)

</details>

### 🕹️ Luxtorpeda (Native Engine Runner) Options
Config options for **[Luxtorpeda](https://github.com/luxtorpeda-dev/luxtorpeda)** Steam Play tool to run native Linux game engines and open-source source ports.

<details>
<summary><b>View Luxtorpeda Config Options</b></summary>

* `LUX_FORCE_UPDATE=1` (Force re-download and update native game engine packages)
* `LUX_STEAM_DECK=1` (Force handheld UI and controller optimizations)
* `LUX_SHOW_CHOICE=1` (Force engine selection prompt on game boot)
* `LUX_ENGINE_CHOICE="openmw"` (Pre-select engine package ID to bypass choice dialog)
* `LUX_VERBOSE=1` (Enable verbose debug logging output)

</details>

### 🤠 Roberta (ScummVM Runner) Options
Config options for **[Roberta](https://github.com/dreamchess/roberta)** Steam Play tool for classic adventure games using native Linux ScummVM.

<details>
<summary><b>View Roberta Config Options</b></summary>

* `ROBERTA_SIERRA_GAME="1"` (Select target game index in Sierra adventure collections)
* `LUX_SCUMMVM_GAME="monkey2"` (Pass target game engine ID directly to ScummVM)
* `ROBERTA_SCREEN=2` (Direct ScummVM display to specific monitor index)
* `ROBERTA_SCUMMVM="scummvm"` (Custom path or binary name for ScummVM executable)

</details>

### 📹 Proton-RTSP (Livestreaming GStreamer Runner) Options
Config options for **[Proton-RTSP](https://github.com/SpookySkeletons/proton-rtsp)** by SpookySkeletons — a Steam Play compatibility tool specialized for RTSP, RTP, and HLS livestream video playback (AVPro Video in VRChat, ChilloutVR, etc.).

<details>
<summary><b>View Proton-RTSP Config Options</b></summary>

* `PROTON_ENABLE_RTSP=1` (Enables GStreamer RTSP transport stack for VRChat & AVPro livestreams)
* `PROTON_GST_VIDEO_ORIENTATION="180"` (Fixes upside-down or inverted stream textures in world media players)
* `PROTON_ENABLE_NVDEC=1` (Enables Nvidia GPU NVDEC video decoding acceleration inside GStreamer)
* `PROTON_ENABLE_VAAPI=1` (Enables AMD / Intel VA-API hardware video acceleration)
* `PROTON_YTDLP_LOCATION="/usr/bin/yt-dlp"` (Custom binary path for yt-dlp to resolve Twitch/YouTube/RTSP streams)
* `PROTON_MEDIA_FORCE_MF=1` (Forces Windows Media Foundation requests through Proton-RTSP GStreamer pipeline)
* `PROTON_RTSP_PORT_RANGE="8554-8560"` (Custom network port range bounds for RTSP stream sockets)
* `GST_DEBUG="rtsp*:4,rtp*:4"` (GStreamer debug log level for diagnosing stream player failures)

</details>

### 🧪 Official Valve Proton & Proton Experimental Options
Essential runtime & debugging environment variables supported natively by **Valve Proton (Proton 9.0+, Proton Experimental, and Bleeding-Edge)**.

<details>
<summary><b>View Valve Proton & Proton Experimental Flags</b></summary>

* `PROTON_ENABLE_WAYLAND=1` (Enables official Valve winewayland.drv display driver in Proton 9.0+)
* `PROTON_USE_SECCOMP=1` (Enables Linux Seccomp syscall filtering for EAC / BattlEye & anti-cheat)
* `PROTON_USE_EAC_LINUX=1` (Forces Steam Linux Easy Anti-Cheat runtime module bridge)
* `PROTON_USE_BE_LINUX=1` (Forces Steam Linux BattlEye runtime module bridge)
* `PROTON_ENABLE_AMD_AGS=1` (Enables AMD AGS library support for Radeon GPUs)
* `PROTON_DISABLE_NVNGX=1` (Disables Nvidia NGX DLSS wrapper if causing crashes)
* `PROTON_DUMP_DEBUG_COMMANDS=1` (Dumps standalone gdb / lldb debug launch scripts into `/tmp/proton_*`)
* `PROTON_DEBUG_DIR="/tmp/proton_debug"` (Custom target directory for Proton debug logs and trace dumps)
* `PROTON_CRASH_REPORT_DIR="~/proton_crashes"` (Target directory for game crash dumps and minidumps)
* `PROTON_OFFLOAD_VK_DEVICE="0"` (Offloads Vulkan device rendering on hybrid graphics laptops)
* `PROTON_NO_WRITE_WATCH=1` (Disables Wine memory write-watch mechanism for stability)
* `PROTON_DISABLE_D3D11=1` / `PROTON_DISABLE_D3D10=1` (Disables DXVK D3D11/D3D10 translation layers)
* `STEAM_COMPAT_DATA_PATH="~/.local/share/steam_prefixes/game"` (Custom Proton prefix location path)
* `PROTON_VERBOSITY=2` (Increases logging verbosity level in `steam-<appid>.log`)

</details>

### ⚡ One-Click Preset Profiles
* Instant configurations for *Low Latency Layer (Reflex / Anti-Lag 2)*, *Steam Deck*, *NVIDIA RTX Ray Tracing*, *AMD Radeon High Performance*, *Low Latency Competitive*, and *Ultra-Wide Displays*.

### 🤖 Gemini AI Assistant
* Powered by Google Gemini (`@google/genai`) to synthesize community insights and recommend tailored launch flags for specific games and hardware.

---

## 🚀 Quick Start (Recommended Installation)

The fastest and best way to install and run the application is using the automated `start.sh` script (which automatically installs dependencies, checks for updates, builds the project, and opens your browser):

```bash
# 1. Clone the repository
git clone https://github.com/FrankTheTank1974/Proton-Launch-Option-Manager.git

# 2. Enter the project directory
cd Proton-Launch-Option-Manager

# 3. Make the start script executable
chmod +x ./start.sh

# 4. Launch the application
./start.sh
```

> [!NOTE]
> `./start.sh` automatically checks for GitHub updates, verifies `npm` dependencies, compiles frontend & server bundles, and opens `http://localhost:3000` in your default browser. You can also run `npm run launch` as an alternative.

---

## ⚙️ Configuration & CLI Options

### Environment Variables (`.env`)

Copy `.env.example` to `.env` to configure your settings:

```bash
cp .env.example .env
```

| Variable | Description | Default |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | *(Optional)* Google Gemini API key for AI Optimizer recommendations | `""` |
| `DISABLE_AI` | Set to `true` to disable all AI features for offline/corporate environments | `false` |
| `APP_URL` | Application host URL | `http://localhost:3000` |

> [!TIP]
> **Getting a Gemini API Key:** You can obtain a free API key at [Google AI Studio](https://aistudio.google.com/app/apikey). Copy your key into `.env` as `GEMINI_API_KEY="your_key"`.

---

### `./start.sh` Command Flags

Customize runtime behavior using launch flags:

| Flag / Option | Description | Usage Example |
| :--- | :--- | :--- |
| `--skip-update`, `-s`, `--offline` | Skip checking GitHub for updates on startup | `./start.sh --skip-update` |
| `--disable-ai`, `--no-ai` | Disable AI Copilot & Gemini API calls (Offline/Enterprise Mode) | `./start.sh --disable-ai` |

```bash
# Example: Start in offline mode with AI disabled
./start.sh --skip-update --disable-ai

# Or pass flags through npm
npm run launch -- --skip-update --disable-ai
```

---

## 💡 How to Apply Flags in Steam

1. **Automatic Sync:** Click **Write to Steam** in the app header to save flags directly to `localconfig.vdf`.
2. **Manual Copy:**
   1. Click **Copy** in the Live Command Builder bar.
   2. Open **Steam** $\rightarrow$ Right-click your game in **Library** $\rightarrow$ Select **Properties...**
   3. In the **General** tab, paste the command into **Launch Options** (e.g. `gamemoderun mangohud %command%`).

---

## 🖥️ Portable C Code Generator

The **C Source Code** button generates a complete, portable C99 codebase (`main.c`, `vdf_parser.c`, `vdf_parser.h`, `Makefile`) packaged into a `.zip` archive.

### Use Cases
1. **Offline Terminal Launcher (`proton_mgr`):** Lightweight C binary to manage Steam launch options without a web browser.
2. **Standalone Game Wrappers:** Create custom executable wrappers that set environment variables before launching game binaries.
3. **GTK3 Desktop GUI:** Includes optional GTK3 desktop interface code for native Linux integration.

### Quick Build
```bash
unzip proton_launch_manager_c_source.zip
cd proton_c_launcher
make
```

---

## 🛠️ Development & Production

### Development Server
```bash
npm run dev
# Starts backend & Vite dev server on http://localhost:3000
```

### Production Build
```bash
npm run build   # Compiles frontend assets and Express backend bundle
npm start       # Starts standalone Node.js production server
```

---

## ❓ Troubleshooting & FAQs

<details>
<summary><b>npm install warnings / blocked scripts (esbuild)</b></summary>

Modern `npm` (v10+) may block lifecycle scripts by default:
```text
npm warn install-scripts esbuild (postinstall: node install.js)
```
If `esbuild` binary issues occur during build, run:
```bash
npm rebuild esbuild
```
</details>

<details>
<summary><b>Disabling AI Copilot for Corporate / Enterprise Environments</b></summary>

If working in an environment where AI usage or external API calls are prohibited, run `./start.sh --disable-ai` or set `DISABLE_AI=true` in `.env`.
* The **AI Optimizer** UI controls will be hidden.
* ProtonDB community advice will rely strictly on local offline consensus templates.
</details>

---

## 📄 License

This project is licensed under the [MIT License](./LICENSE).


