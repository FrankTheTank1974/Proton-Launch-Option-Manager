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
  - **GameMode:** Feral Interactive CPU governor and system performance daemon integration.
  - **Graphics & Ray Tracing:** NVIDIA DLSS, Reflex, NVAPI, VKD3D-Proton Ray Tracing, AMD FidelityFX (FSR), and Vulkan driver flags.
  - **Audio & Windowing:** PulseAudio latency tuning, Wayland/X11 overrides, DXVK async shaders, and Wine debugging controls.
- **⚡ Live Command Builder & Toolbar:** Real-time generation of your exact Steam launch command (`command %command%`) with a clean, dedicated action toolbar featuring:
  - **Copy:** One-click copy to system clipboard.
  - **Save Game:** Save current flags directly to your game profile in the manager.
  - **Read from Steam:** Fetch existing launch options directly from Steam's `localconfig.vdf` on disk.
  - **Write to Steam:** Apply updated launch options straight into Steam's configuration files with automatic `.bak` backups.
- **🔥 Proton Runner Manager (ProtonUp-Qt Style):** Discover, download, update, and manage custom Steam Proton runner builds directly inside Steam's `compatibilitytools.d` directory:
  - **GE-Proton (GloriousEggroll):** Latest releases with media codecs (MF/WMA), DXVK patches, and game fixes.
  - **Proton-CachyOS:** Compiler-optimized builds (x86-64-v3/v4) with LTO and kernel synchronization patches.
  - **Proton-EM (EchoWolf):** Low-latency and performance-tuned Proton builds.
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
git clone https://github.com/your-username/proton-launch-options-manager.git
cd proton-launch-options-manager
npm install
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

### 4. Running Locally (Development)

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

