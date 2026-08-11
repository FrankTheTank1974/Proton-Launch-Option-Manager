# 🐧 Proton Launch Options Manager

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-cyan)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-4.21-lightgrey)](https://expressjs.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8)](https://tailwindcss.com/)

A modern, full-stack Linux gaming utility built with **React**, **TypeScript**, **Tailwind CSS**, and **Express**. Designed for Linux gamers, Steam Deck users, and power users to effortlessly customize, test, and generate Steam Proton launch options without memorizing complex environment variables or command-line syntax.

---

## ✨ Features

- **🎛️ Interactive Flag Checklist:** Easily toggle popular Linux gaming performance tools and environment variables:
  - **Gamescope:** Micro-compositor resolution, upscaling (FSR/NIS), refresh rate caps, and window modes.
  - **MangoHud:** Real-time FPS, CPU/GPU stats overlay, frame timing, and limiter controls.
  - **GameMode & CachyOS `game-performance`:** Feral Interactive GameMode daemon integration and native CachyOS `game-performance` wrapper script support (`cachyos-settings`).
  - **Graphics & Ray Tracing:** NVIDIA DLSS, Reflex, NVAPI, VKD3D-Proton Ray Tracing, AMD FidelityFX (FSR), and Vulkan driver flags.
  - **lsfg-vk Frame Generation:** Full support for PancakeTAS Lossless Scaling Frame Generation Vulkan layer (`ENABLE_LSFG=1`, `LSFGVK_MULTIPLIER=2/3/4`, `LSFGVK_PERFORMANCE_MODE`, `LSFGVK_FLOW_SCALE`).
  - **Audio & Windowing:** PulseAudio latency tuning, Wayland/X11 overrides, DXVK async shaders, and Wine debugging controls.
- **⚡ Live Command Builder & Toolbar:** Real-time generation of your exact Steam launch command (`command %command%`) with a clean, dedicated action toolbar featuring:
  - **Copy:** One-click copy to system clipboard.
  - **Save Game:** Save current flags directly to your game profile in the manager.
  - **Read from Steam:** Fetch existing launch options directly from Steam's `localconfig.vdf` on disk.
  - **Write to Steam:** Apply updated launch options straight into Steam's configuration files with automatic `.bak` backups.
- **🔥 Proton Runner Manager (ProtonUp-Qt Style):** Discover, download, update, and manage custom Steam Proton runner builds directly inside Steam's `compatibilitytools.d` directory:
  - **GE-Proton (GloriousEggroll):** Latest releases with media codecs (MF/WMA), DXVK patches, and game fixes.
  - **Proton-CachyOS:** Compiler-optimized builds (x86-64-v3/v4) with LTO and kernel synchronization patches.
  - **Proton-EM (Etaash Mathamsetty):** Custom Proton build with performance optimizations and Wine patches.
  - **Proton-DW (Wine-GE / DirectWay):** Standalone Wine and Direct3D optimized releases.
- **📁 Steam VDF Disk Integration:** Scans and interacts directly with local Steam installation directories (`~/.local/share/Steam`, Flatpak, Steam Deck SteamOS `/home/deck/`, Windows, macOS). Reads and writes settings without needing manual file editing.
- **🖥️ Portable C Source Code Generator:** Generate standalone C99 source code wrappers and GTK3 native utilities for customized game launchers—perfect for standalone builds, desktop shortcuts, or custom system scripts without requiring a web browser.
- **⚡ Preset Gaming Profiles:** One-click application of pre-tuned profiles:
  - *Steam Deck Optimized* (720p/800p FSR, battery efficiency)
  - *NVIDIA RTX Ray Tracing* (NVAPI, DLSS, VKD3D RT)
  - *AMD Radeon High Performance* (RADV, FSR, GameMode)
  - *Low Latency Competitive* (Reflex/MangoHud FPS caps)
  - *Ultra-Wide Display* (Gamescope aspect ratios)
- **🤖 Gemini AI Assistant:** Integrated AI optimization assistant powered by `@google/genai`. Get tailored launch option recommendations based on specific game titles and Linux hardware configurations.
- **🎮 Game Library Management:** Search, filter, edit, and organize custom launch configurations per game title.

---

## 🛠️ Tech Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Framer Motion, JSZip
- **Backend:** Express.js (Node.js/ESM) with native ESBuild compilation for standalone execution
- **AI Integration:** Google Gemini API via `@google/genai` SDK
- **Build Tooling:** Vite & ESBuild

---

## 🚀 Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18 or newer recommended)
- `npm` (or `pnpm` / `bun` / `yarn`)

### 2. Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/FrankTheTank1974/Proton-Launch-Option-Manager.git
cd Proton-Launch-Option-Manager
npm install
```

#### ⚠️ Note on `npm install` Warnings & Blocked Install Scripts

When running `npm install`, modern versions of `npm` (npm v10+) may display warnings about blocked lifecycle scripts or deprecated sub-dependencies:

```text
npm warn deprecated node-domexception@1.0.0
npm warn install-scripts 4 packages had install scripts blocked because they are not covered by allowScripts:
npm warn install-scripts   @google/genai (preinstall: echo 'preinstall: no-op')
npm warn install-scripts   esbuild (postinstall: node install.js)
npm warn install-scripts   protobufjs (postinstall: node scripts/postinstall)
```

- **`node-domexception` / `npm fund` warnings:** These are standard informational notices from transitive dependencies and can be safely ignored.
- **Blocked install scripts (`esbuild`, `@google/genai`, etc.):** NPM blocks post-install scripts by default for security. The application will function normally in most cases. If `esbuild` fails to locate its native binary during `npm run build` or `npm run dev`, simply run:
  ```bash
  npm rebuild esbuild
  # Or approve install scripts:
  npm install-scripts approve esbuild
  ```

### 3. Environment Variables

Create a `.env` file in the root directory by copying the example file:

```bash
cp .env.example .env
```

Open `.env` and configure your API key for AI features:
```env
# Required for AI Assistant optimization suggestions
GEMINI_API_KEY="your_gemini_api_key_here"

# Optional: Set the application host URL
APP_URL="http://localhost:3000"
```

#### 🔑 How to Get a Gemini API Key

You can obtain a free Gemini API key in a few quick steps:

1. Go to **[Google AI Studio](https://aistudio.google.com/app/apikey)** (`https://aistudio.google.com/app/apikey`).
2. Sign in with your Google Account.
3. Click **"Create API key"** (or **"Get API key"**).
4. Choose an existing Google Cloud project or create a new one.
5. Copy the newly generated API key and set it as `GEMINI_API_KEY` in your `.env` file.

### 4. Quick Start (One-Click Build, Run & Open Browser)

You can build, start, and automatically launch the application in your default web browser using the helper script:

```bash
./start.sh
# or using npm
npm run launch
```

#### ⏩ Skipping GitHub Updates (Offline Mode)
If you don't have an active internet connection or prefer not to pull updates from GitHub when starting:

```bash
# Pass the --skip-update (or -s / --offline) flag
./start.sh --skip-update

# Or pass it via npm run launch
npm run launch -- --skip-update

# Or set an environment variable
SKIP_UPDATE=true ./start.sh
```

#### 🔒 Disabling AI Copilot (Enterprise / Restricted AI Policy)
For usage in corporate, work, or enterprise environments where AI usage or external LLM API connections are forbidden:

```bash
# Pass the --disable-ai (or --no-ai) flag to start.sh
./start.sh --disable-ai

# Or pass it via npm run launch
npm run launch -- --disable-ai

# Or set the environment variable in your .env or shell
DISABLE_AI=true ./start.sh
```

When AI Copilot is disabled:
- The **AI Optimizer** button and assistant modal UI options are automatically hidden.
- All ProtonDB community insights fallback to native offline consensus reports without making any Gemini API requests.

This script will:
1. **Auto-check GitHub for updates:** If run inside a Git repository (and not skipped), it fetches `origin`, stashes local edits if necessary, and automatically pulls the latest changes before building.
2. Verify and install/update npm dependencies if required.
3. Build the frontend assets and Express backend bundle.
4. Automatically launch `http://localhost:3000` in your default system browser (`xdg-open`, `open`, `wslview`, or Windows default browser).
5. Start the Node.js production server.

---

### 5. Running Locally (Manual Development)

Start the full-stack development server (Express backend + Vite frontend):

```bash
npm run dev
```

The application will start on `http://localhost:3000`.

---

## 📦 Building for Production

To build the client SPA and compile the Express backend server into a standalone production bundle:

```bash
npm run build
```

To start the compiled production server:

```bash
npm start
```

---

## 🖥️ What is the "C Source Code" Button Used For?

The **C Source Code** button in the header opens the **Portable Linux C Source Code Generator**. This feature produces complete, standalone C99 source code files (`main.c`, `vdf_parser.c`, `vdf_parser.h`, `Makefile`, `README.md`) packaged into a downloadable `.zip` file that can be compiled natively on any Linux distribution (Arch Linux, SteamOS, Ubuntu, Fedora, Gentoo, Debian).

### 🎯 Primary Use Cases:

1. **Native Offline Launcher Utilities:**
   - Compiles into a lightweight, native C binary (`proton_mgr`) with zero runtime dependencies.
   - Allows users to read, update, or clear Steam launch options directly from the Linux terminal or shell scripts without running Node.js or a web browser.

2. **Standalone Game Launch Wrappers:**
   - Generates game-specific C wrapper programs that inject custom environment variables (`GAMEMODE=1`, `PROTON_ENABLE_NVAPI=1`, `DXVK_HUD=fps`) before launching game binaries.
   - Great for creating custom `.desktop` application shortcuts or non-Steam game launchers on Steam Deck Desktop Mode.

3. **GTK3 Desktop GUI & Automation:**
   - Includes optional GTK3 desktop interface code for Linux desktop integration.
   - Enables hardware power users to bundle game launch profiles into portable ZIP archives (`proton_launch_manager_c_source.zip`) for deployment across multiple Linux gaming setups.

### 🔨 How to Build the Generated C Project:

```bash
# Unzip the downloaded generator package:
unzip proton_launch_manager_c_source.zip
cd proton_c_launcher

# Compile using GCC with GTK3 support:
gcc -o proton_mgr main.c vdf_parser.c $(pkg-config --cflags --libs gtk+-3.0)

# Or simply run Makefile:
make
```

---

## 💡 Steam Usage Tip

To apply your generated command directly in Steam:
1. Click **Write to Steam** in the manager to write automatically to `localconfig.vdf`, OR:
2. Open **Steam** and right-click your game in the **Library**.
3. Select **Properties...**
4. In the **General** tab, paste the copied command string into the **Launch Options** text field (e.g., `gamemoderun mangohud %command%`).

---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](./LICENSE) file for full details.

