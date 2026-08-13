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
  * **Luxtorpeda** (Native Linux game engine compatibility tool from Codeberg)
  * **Boxtron** (Steam compatibility tool for DOS games using DOSBox/DOSBox-Staging)
  * **Roberta** (Steam compatibility tool for adventure games using ScummVM)
  * **Proton-EM** (Etaash Mathamsetty performance builds)
  * **Proton-DW** (Wine-GE / DirectWay)

### 🖥️ Portable C Code Generator
* Generate standalone C99 source code wrappers and GTK3 desktop utilities for custom launchers—no web browser required at runtime.

### ⚡ One-Click Preset Profiles
* Instant configurations for *Steam Deck*, *NVIDIA RTX Ray Tracing*, *AMD Radeon High Performance*, *Low Latency Competitive*, and *Ultra-Wide Displays*.

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


