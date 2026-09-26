# 🤖 AGENTS.md — AI Agent Guidance & Repository Architecture

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-cyan)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-4.21-lightgrey)](https://expressjs.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8)](https://tailwindcss.com/)
[![EU AI Act: AI-Generated](https://img.shields.io/badge/EU%20AI%20Act-AI%20Generated-1d1d1b?logoColor=white)](https://digital-strategy.ec.europa.eu/en/policies/eu-icons-labelling-ai-generated-content)

This document provides definitive architectural blueprints, operational rules, coding standards, and domain-specific knowledge for autonomous AI agents, coding assistants (Gemini, Claude, Copilot, Cursor, Roo Code, Aider, Devin), and automated contributors operating within this repository.

---

> [!NOTE]
> ### 🇪🇺 EU AI Act Transparency Notice
> <p align="left">
>   <a href="https://digital-strategy.ec.europa.eu/en/policies/eu-icons-labelling-ai-generated-content" target="_blank" rel="noopener noreferrer">
>     <img src="./public/icons/eu-ai/eu-ai-generated-black.svg" alt="EU AI Act - AI Generated Content" height="32" />
>   </a>
> </p>
>
> Text, architectural documentation, schemas, and code generation templates in this repository have been generated or refined with the assistance of Artificial Intelligence in accordance with **Article 50(4) of Regulation (EU) 2024/1689 (European Union Artificial Intelligence Act)** and the European Commission's [Code of Practice on marking and labelling AI-generated content](https://digital-strategy.ec.europa.eu/en/policies/eu-icons-labelling-ai-generated-content).

---

## 🧭 Project Mission & Problem Statement

**Proton Launch Options Manager** is a Linux gaming developer and power-user tool. It solves several core friction points in Linux gaming:
1. **Launch Command Syntax Complexity:** Steam Proton requires combining environment variables (`KEY=VALUE`), performance wrappers (`gamemoderun`, `mangohud`, `gamescope`), and client overrides before the critical `%command%` placeholder. Syntax errors frequently break game launches silently.
2. **Flag Incompatibilities & Conflicts:** Mutually exclusive flags (e.g. `PROTON_USE_WINED3D=1` vs Vulkan flags, or running both `PROTON_NO_ESYNC=1` alongside `PROTON_USE_NTSYNC=1`) cause crashes that are difficult to diagnose.
3. **Steam VDF Configuration Management:** Reading and writing `localconfig.vdf` safely across Steam Native (`~/.local/share/Steam`), Flatpak (`~/.var/app/com.valvesoftware.Steam`), and SteamOS Deck paths (`/home/deck/`) without corrupting user configs.
4. **Custom Proton Runners (ProtonUp-Qt feature parity):** Discovering, downloading, and unpacking compatibility tools (GE-Proton, Proton-CachyOS, Proton-RTSP, Luxtorpeda, Boxtron, Roberta, Proton-EM, Proton-DW) directly into Steam's `compatibilitytools.d`.
5. **Zero-Dependency C99 Standalone Generator:** Generating 100% offline, standalone C source code (`proton_cli` and GTK3/ANSI TUI utilities) for headless, air-gapped, or minimal Linux systems where running Node.js/browser is undesirable.

---

## 🏗️ Architecture & Technology Stack

```
                          ┌─────────────────────────────────────┐
                          │         React 19 SPA (Client)       │
                          │   Vite 6 + Tailwind v4 + Lucide     │
                          └──────────────────┬──────────────────┘
                                             │ HTTP / JSON API
                                             ▼
                          ┌─────────────────────────────────────┐
                          │       Express 4.21 Server (Node)    │
                          │        tsx (dev) / esbuild (prod)   │
                          └──────┬───────────┬────────────┬─────┘
                                 │           │            │
            ┌────────────────────┘           │            └───────────────────┐
            ▼                                ▼                                ▼
┌───────────────────────┐        ┌───────────────────────┐        ┌───────────────────────┐
│     Steam VDF Sync    │        │ Compatibility Tools   │        │     Gemini AI Copilot │
│ • localconfig.vdf     │        │ • GE-Proton / CachyOS │        │ • @google/genai SDK   │
│ • libraryfolders.vdf  │        │ • GitHub Releases API │        │ • Offline heuristic   │
│ • Automatic .bak files│        │ • tar.xz / tar.zst    │        │   fallback if disabled│
└───────────────────────┘        └───────────────────────┘        └───────────────────────┘
```

### 1. Frontend (`src/`)
* **Framework:** React 19 (`react`, `react-dom`) with TypeScript 5.8 in strict mode.
* **Styling:** Tailwind CSS v4 using the modern `@import "tailwindcss";` directive in `src/index.css`. No legacy `tailwind.config.js` or inline CSS.
* **Icons:** `lucide-react`.
* **Animations:** `motion` (Framer Motion).
* **State Management:** Functional React components with hooks, centralized types in `src/types.ts`.

### 2. Backend (`server.ts`)
* **Runtime:** Node.js 22+ running Express 4.21.
* **Development:** Executed via `tsx server.ts` with Vite middlewares mounted directly.
* **Production Build:** Vite builds the client into `dist/`, and `esbuild` bundles `server.ts` into a standalone CommonJS executable at `dist/server.cjs`.
* **Steam File I/O:** Directly probes and interacts with Linux file paths (`~/.local/share/Steam/userdata/*`, Flatpak sandbox paths, SteamOS Deck user directories).

### 3. AI Copilot & Offline Fallback
* **SDK:** `@google/genai` TypeScript SDK.
* **Model:** Modern Gemini API alias (`gemini-3.6-flash`).
* **Enterprise AI Control:** If `DISABLE_AI=true`, `DISABLE_AI_COPILOT=true`, or `./start.sh --disable-ai` is set, all AI endpoints return graceful offline fallbacks from `src/data/protonDbKnowledge.ts` without attempting external network calls.

---

## 📂 Repository File Map

```
.
├── AGENTS.md                  # This file (guidelines for AI agents)
├── README.md                  # User-facing comprehensive documentation
├── package.json               # Scripts, dependencies, allowScripts overrides
├── metadata.json              # Applet metadata, permissions & capabilities
├── server.ts                  # Express backend, Steam VDF parser, runner downloader, Gemini proxy
├── start.sh                   # Production launcher script with CLI flags (--disable-ai, etc.)
├── tsconfig.json              # TypeScript configuration (strict, ESNext)
├── vite.config.ts             # Vite configuration with React and Tailwind plugins
├── public/                    # Static assets (EU AI Act icons, logos, manifests)
│   └── icons/eu-ai/           # Official European Commission AI labelling SVGs & PNGs
├── src/
│   ├── App.tsx                # Main application coordinator component
│   ├── main.tsx               # Client React DOM entry point
│   ├── index.css              # Global styles with Tailwind CSS v4 import
│   ├── types.ts               # Core TypeScript interface and type definitions
│   ├── components/            # Modular React UI components
│   │   ├── FlagChecklist.tsx         # Interactive categorized Proton/Linux flags
│   │   ├── LiveCommandPreview.tsx    # Syntax-highlighted real-time command line
│   │   ├── WriteToSteamModal.tsx     # Direct Steam localconfig.vdf disk updater
│   │   ├── BackupModal.tsx           # VDF safety backup and rollback viewer
│   │   ├── ProtonManagerModal.tsx    # Runner downloader (GE-Proton, Boxtron, etc.)
│   │   ├── CCodeGeneratorModal.tsx   # Standalone C99 / GTK3 / ANSI source exporter
│   │   ├── PresetProfilesModal.tsx   # Curated performance profiles (Deck, Esports, RT)
│   │   ├── GeminiAssistantModal.tsx  # AI Copilot launch optimization dialog
│   │   ├── ProtonDbModal.tsx         # Community advice & compatibility notes
│   │   ├── ScanLocalLibraryModal.tsx # Steam library auto-detection modal
│   │   └── DirectSteamLauncherModal.tsx # steam://rungameid/<id> URI launcher
│   ├── data/                  # Static domain datasets & templates
│   │   ├── protonFlagsData.ts        # Flag specifications, categories, descriptions
│   │   ├── steamGamesData.ts         # Pre-configured popular Steam game registry
│   │   ├── protonDbKnowledge.ts      # Offline fallback curated game advice database
│   │   └── cCodeTemplates.ts         # C99 source code generation templates
│   └── utils/                 # Pure helper functions & algorithmic logic
│       ├── commandGenerator.ts       # Parses flags & builds valid Steam command strings
│       ├── conflictDetector.ts       # Flags incompatibility & mutex conflict logic
│       ├── launchSyntaxHighlighter.ts# ANSI & HTML syntax coloring for CLI options
│       ├── vdfParser.ts              # KeyValues VDF parser & serializer
│       └── screenDetector.ts         # Display resolution detection
```

---

## 🛠️ Essential Development Commands

All AI agents must use these exact commands when verifying and operating in this workspace:

| Task | Command | Description |
| :--- | :--- | :--- |
| **Development** | `npm run dev` | Runs Express server with Vite middlewares on port 3000 via `tsx server.ts` |
| **Typecheck / Lint** | `npm run lint` | Runs `tsc --noEmit` across entire codebase to check TypeScript types |
| **Production Build** | `npm run build` | Compiles client with Vite + bundles `server.ts` to `dist/server.cjs` with `esbuild` |
| **Start Production** | `npm run start` | Runs the compiled server executable `dist/server.cjs` |
| **Clean Artifacts** | `npm run clean` | Removes `dist/` and temporary build bundles |
| **Full App Launch** | `./start.sh` | Main bash launcher supporting flags: `--disable-ai`, `--offline`, `--branch` |

---

## 📐 Coding Conventions & Guardrails for AI Agents

### 1. TypeScript Strictness
* **No `any` Types:** Maintain strong typing across all files. Define interfaces in `src/types.ts` or appropriate local types.
* **Immutable State:** When updating flags or game configs, return clean copies using spread operators or pure reducer functions.
* **Typecheck Before Submitting:** Always verify with `npm run lint` or `compile_applet`.

### 2. Styling with Tailwind CSS v4
* **No Inline Styles:** Do not use `style={{ ... }}` unless calculating dynamic pixel offsets that cannot be achieved with Tailwind classes.
* **Palette & Aesthetic:** Maintain the high-contrast Linux/SteamOS dark theme (`bg-zinc-950`, `bg-zinc-900`, `border-zinc-800`, `text-zinc-100`, accents in `emerald-500`, `cyan-500`, `indigo-500`, `rose-500`).
* **Mobile & Steam Deck Responsiveness:** UI must scale comfortably to 1280x800 (Steam Deck native display) and handle touch or controller-friendly spacing.

### 3. Steam VDF Safety Guardrails (CRITICAL)
* **Always Backup Before Write:** When writing to Steam's `localconfig.vdf`, the backend **MUST** create a timestamped backup (`.bak` or `backup_<timestamp>.vdf`) before mutating the target file.
* **KeyValues Formatting:** Steam VDF is sensitive to indentation, quoted keys, and nested object structure. Never write corrupt or partial VDF blocks.
* **Steam Process Warning:** Notify the user that Steam client reloads `localconfig.vdf` on startup, so writing while Steam is actively running may be overwritten unless Steam is restarted or reloaded.

### 4. Enterprise AI Disabling (`DISABLE_AI`)
* When modifying or adding AI features, **always** check `isAiDisabled()`.
* If AI is disabled via environment variable or command-line flag:
  1. Hide or disable AI prompt buttons in the UI.
  2. Fall back to curated static consensus heuristics in `src/data/protonDbKnowledge.ts`.
  3. Never throw unhandled network errors when `GEMINI_API_KEY` is omitted.

### 5. Standalone C99 Generator Parity
* If you introduce a new flag or conflict rule in `src/data/protonFlagsData.ts` or `src/utils/conflictDetector.ts`, **ensure parity** in `src/data/cCodeTemplates.ts`.
* The C code generator must remain **100% C99-compliant** with zero external dependencies (no required `libcurl`, `ncurses`, or non-standard headers).

---

## 🎮 Proton & Linux Gaming Domain Knowledge

When formulating launch options, agents must follow strict Linux Steam launch parameter grammar:

### Command Grammar
```
[ENVIRONMENT_VARIABLES...] [CPU_WRAPPERS...] [RENDER_WRAPPERS...] [OVERLAYS...] %command% [GAME_ARGUMENTS...]
```

#### Order of Execution:
1. **Environment Variables:** `KEY=value` (e.g. `PROTON_USE_NTSYNC=1`, `DXVK_ASYNC=1`, `WINE_FULLSCREEN_INTEGER_SCALING=1`)
2. **CPU & Priority Wrappers:** `gamemoderun`, `taskset -c 0-7`, `nice -n -10`, `chrt -f 10`
3. **Compositors & Containers:** `gamescope [flags] --`
4. **Overlays & Layers:** `mangohud`, `vkBasalt`
5. **The Steam Target Placeholder:** `%command%` (mandatory; Steam substitutes the executable path here)
6. **Game Arguments:** Suffix flags passed directly to the game binary (e.g. `-novid`, `-dx11`, `-skipintro`)

### Critical Mutex & Conflict Rules
* **DirectX 12 vs DXVK:** `VKD3D_CONFIG=dxr` applies only to DX12 games. DX9/DX10/DX11 titles use DXVK and will ignore or glitch on VKD3D variables.
* **WineD3D vs Vulkan:** `PROTON_USE_WINED3D=1` routes DirectX through OpenGL, disabling Vulkan features like DXVK, VKD3D, DLSS, and Ray Tracing.
* **Sync Mechanisms:** Do not enable `PROTON_NO_ESYNC=1` / `PROTON_NO_FSYNC=1` alongside `PROTON_USE_NTSYNC=1` without explicit diagnostic intent.
* **Ray Tracing Hardware:** Never blindly append ray tracing flags (`VKD3D_CONFIG=dxr11,dxr`) unless the target title natively implements DirectX Raytracing (DXR).

---

## 📋 Common Agent Task Workflows

### Task A: Adding a New Proton Launch Flag
1. **Add Definition:** Open `src/data/protonFlagsData.ts` and add the flag under the appropriate category (`Graphics`, `Performance`, `Audio`, `Compatibility`, `Low Latency Layer`, `Lossless Scaling`, etc.).
2. **Define Conflict Logic:** If the flag conflicts with other flags, register the rule in `src/utils/conflictDetector.ts`.
3. **Update C Template:** Add the flag toggle and description into `src/data/cCodeTemplates.ts` for offline CLI/TUI generation.
4. **Verify Build:** Execute `npm run lint` followed by `npm run build`.

### Task B: Adding a New Proton Runner Support
1. **Add Runner Metadata:** Add the runner to the runner registry in `src/components/ProtonManagerModal.tsx` (name, GitHub/Codeberg repo, description, default version regex).
2. **Add Unpacker Logic:** In `server.ts`, ensure the runner's archive format (`.tar.xz`, `.tar.zst`, `.tar.gz`, or `.zip`) is supported by the backend decompression pipeline.
3. **Verify Compatibility:** Test that Steam detects the runner in `~/.local/share/Steam/compatibilitytools.d/<runner-name>/compatibilitytool.vdf`.

### Task C: Modifying Server Endpoints
1. **Add Route:** Update `server.ts` with appropriate input validation and error handling.
2. **Maintain Offline Safety:** Ensure routes interacting with external APIs handle missing network or disabled flags gracefully.
3. **Test Compilation:** Run `npm run build` to confirm `esbuild` bundles `server.ts` without CommonJS/ESM module collisions.

---

## ✅ Pre-Submission Verification Checklist for Agents

Before concluding any turn or marking a task complete, verify the following:

- [ ] **Typecheck Passes:** `npm run lint` returns `0` errors.
- [ ] **Build Succeeds:** `npm run build` completes cleanly, building both client (`dist/`) and server (`dist/server.cjs`).
- [ ] **EU AI Act Notice Intact:** The EU AI Act badge, link, and compliance notice remain present in documentation.
- [ ] **Safety Preserved:** No hardcoded secrets, no destructive VDF writes without backups, and enterprise AI switches respected.
- [ ] **No Unnecessary Dependencies:** Kept `package.json` lean and self-contained.
