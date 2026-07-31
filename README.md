# 🐧 Proton Launch Options Manager

A modern, full-stack Linux gaming utility built with **React**, **TypeScript**, **Tailwind CSS**, and **Express**. Designed for Linux gamers, Steam Deck users, and power users to effortlessly customize, test, and generate Steam Proton launch options without memorizing complex environment variables or command-line syntax.

---

## ✨ Features

- **🎛️ Interactive Flag Checklist:** Easily toggle popular Linux gaming performance tools and environment variables:
  - **Gamescope** (Micro-compositor resolution, upscaling, refresh rates, and FSR/NIS)
  - **MangoHud** (Performance overlay & FPS capping)
  - **GameMode** (Feral Interactive CPU/OS optimization daemon)
  - **Graphics & Ray Tracing:** NVIDIA DLSS/Reflex, VKD3D-Proton Ray Tracing, AMD FidelityFX, and Vulkan driver flags
  - **Audio & Windowing:** PulseAudio latency adjustments, Wayland/X11 overrides, and Wine debugging controls
- **⚡ Live Command Preview:** Real-time generation of your exact Steam launch command (`command %command%`) with one-click clipboard copying.
- **📁 Steam VDF Read & Write Integration:** Directly read existing launch options from Steam's `localconfig.vdf` on disk, edit options visually, and write updated settings straight back to your local Steam configuration.
- **🖥️ Portable C Source Code Generator:** Generate standalone C source code wrappers and GTK3 native utilities for customized game launchers—perfect for standalone builds, desktop shortcuts, or custom system scripts without requiring a web browser.
- **⚡ Preset Gaming Profiles:** Quickly apply pre-tuned optimization presets tailored for Steam Deck, NVIDIA RTX setups, AMD Radeon rigs, Ultra-Wide displays, and competitive low-latency gaming.
- **🤖 Gemini AI Assistant:** Integrated AI optimization assistant powered by Google Gemini. Get tailored launch option recommendations based on specific game titles and Linux hardware configurations.
- **🎮 Game Library Management:** Organize custom launch configurations per game with search, filtering, and profile saving.

---

## 🛠️ Tech Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Framer Motion
- **Backend:** Express.js (Node.js/ESM) for API routing and secure server-side AI integration
- **AI Integration:** `@google/genai` SDK
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

The **C Source Code** button in the header opens the **Portable Linux C Source Code Generator**. This feature produces complete, standalone C99 source code files (`main.c`, `vdf_parser.c`, `vdf_parser.h`, `Makefile`, `README.md`) that can be compiled natively on any Linux distribution (Arch Linux, SteamOS, Ubuntu, Fedora, Gentoo, Debian).

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
# Compile using GCC with GTK3 support:
gcc -o proton_mgr main.c vdf_parser.c $(pkg-config --cflags --libs gtk+-3.0)

# Or simply run Makefile:
make
```

---

## 💡 Steam Usage Tip

To use your generated command in Steam:
1. Open **Steam** and right-click your game in the **Library**.
2. Select **Properties...**
3. In the **General** tab, paste the copied command string into the **Launch Options** text field (e.g., `gamemoderun mangohud %command%`).

---

## 📄 License

This project is open-source and available under the MIT License.
