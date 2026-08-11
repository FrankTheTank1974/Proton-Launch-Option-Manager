#!/usr/bin/env bash
set -e

# Always ensure start.sh itself maintains executable permissions
chmod +x "$0" 2>/dev/null || chmod +x start.sh 2>/dev/null || true

PORT="${PORT:-3000}"
APP_URL="http://localhost:${PORT}"

echo "=================================================="
echo " 🎮 Starting Proton Launch Options Manager"
echo "=================================================="

REINSTALL_REQUIRED=false

# 1. Check for GitHub updates if this is a Git repository
if [ -d ".git" ] && command -v git >/dev/null 2>&1; then
  echo "🔍 Checking for updates from GitHub..."
  if git fetch origin >/dev/null 2>&1; then
    CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "main")
    LOCAL_HASH=$(git rev-parse HEAD 2>/dev/null || true)
    REMOTE_HASH=$(git rev-parse "origin/${CURRENT_BRANCH}" 2>/dev/null || true)

    if [ -n "$LOCAL_HASH" ] && [ -n "$REMOTE_HASH" ] && [ "$LOCAL_HASH" != "$REMOTE_HASH" ]; then
      echo "🔄 New update found on GitHub! Pulling latest changes..."
      HAS_CHANGES=$(git status --porcelain 2>/dev/null || true)
      if [ -n "$HAS_CHANGES" ]; then
        echo "⚠️ Local uncommitted changes detected. Stashing local changes before update..."
        git stash save "Auto-stashed before start.sh update" >/dev/null 2>&1 || true
      fi

      if git pull origin "$CURRENT_BRANCH"; then
        echo "✅ Updated to latest version from GitHub!"
        chmod +x "$0" 2>/dev/null || chmod +x start.sh 2>/dev/null || true
        git update-index --chmod=+x start.sh 2>/dev/null || true
        REINSTALL_REQUIRED=true
      else
        echo "⚠️ Git pull failed. Continuing with local version."
      fi
    else
      echo "✅ Repository is up to date."
    fi
  else
    echo "ℹ️ Unable to reach GitHub remote or fetch updates. Skipping update check."
  fi
fi

# 2. Install dependencies if missing or after update
if [ ! -d "node_modules" ] || [ "$REINSTALL_REQUIRED" = true ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

# 3. Build production assets & server
echo "🔨 Building production distribution..."
npm run build

# 4. Check for an available port starting from requested PORT or default 3000
INITIAL_PORT="${PORT:-3000}"
if command -v node >/dev/null 2>&1; then
  FREE_PORT=$(PORT="$INITIAL_PORT" node -e '
    const net = require("net");
    function checkPort(port) {
      return new Promise((resolve) => {
        const server = net.createServer();
        server.once("error", () => resolve(false));
        server.once("listening", () => {
          server.close(() => resolve(true));
        });
        server.listen(port, "0.0.0.0");
      });
    }
    (async () => {
      let p = parseInt(process.env.PORT || "3000", 10);
      while (!(await checkPort(p))) {
        p++;
      }
      console.log(p);
    })();
  ' 2>/dev/null || echo "$INITIAL_PORT")

  if [ -n "$FREE_PORT" ]; then
    PORT="$FREE_PORT"
  fi
fi

if [ "$PORT" != "$INITIAL_PORT" ]; then
  echo "⚠️ Port ${INITIAL_PORT} is already in use. Selected available port: ${PORT}"
fi

export PORT
APP_URL="http://localhost:${PORT}"

# 5. Helper function to open default system browser
open_browser() {
  # Wait for server to boot up
  sleep 1.5
  echo "🌐 Opening ${APP_URL} in default web browser..."
  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$APP_URL" >/dev/null 2>&1 || true
  elif command -v open >/dev/null 2>&1; then
    open "$APP_URL" >/dev/null 2>&1 || true
  elif command -v wslview >/dev/null 2>&1; then
    wslview "$APP_URL" >/dev/null 2>&1 || true
  elif command -v cmd.exe >/dev/null 2>&1; then
    cmd.exe /c start "$APP_URL" >/dev/null 2>&1 || true
  else
    echo "💡 Note: Open ${APP_URL} in your browser to view the app."
  fi
}

# Launch browser in background task
open_browser &

# 6. Start Node.js server
echo "🚀 Application running at ${APP_URL}"
npm start
