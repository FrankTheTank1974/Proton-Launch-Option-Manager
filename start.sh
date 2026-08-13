#!/usr/bin/env bash
set -e

# Always ensure start.sh itself maintains executable permissions
chmod +x "$0" 2>/dev/null || chmod +x start.sh 2>/dev/null || true

PORT="${PORT:-3000}"
APP_URL="http://localhost:${PORT}"

# Parse command line flags or environment variables for skipping GitHub update, disabling AI Copilot & branch selection
SKIP_UPDATE="${SKIP_UPDATE:-false}"
if [ "${OFFLINE:-false}" = "true" ] || [ "${NO_UPDATE:-false}" = "true" ]; then
  SKIP_UPDATE=true
fi

DISABLE_AI="${DISABLE_AI:-false}"
if [ "${DISABLE_AI_COPILOT:-false}" = "true" ] || [ "${NO_AI:-false}" = "true" ]; then
  DISABLE_AI=true
fi

TARGET_BRANCH="${GIT_BRANCH:-}"
if [ "${USE_TEST_BRANCH:-false}" = "true" ] || [ "${CHECKOUT_TEST:-false}" = "true" ] || [ "${TEST_BRANCH:-false}" = "true" ]; then
  TARGET_BRANCH="test"
fi

while [ $# -gt 0 ]; do
  case "$1" in
    --skip-update|--no-update|-s|--offline)
      SKIP_UPDATE=true
      shift
      ;;
    --disable-ai|--no-ai|--no-copilot|--disable-copilot)
      DISABLE_AI=true
      shift
      ;;
    --test|--test-branch|--use-test|--beta|--dev-branch)
      TARGET_BRANCH="test"
      shift
      ;;
    --branch)
      TARGET_BRANCH="$2"
      shift 2
      ;;
    --branch=*)
      TARGET_BRANCH="${1#*=}"
      shift
      ;;
    *)
      shift
      ;;
  esac
done

if [ "$DISABLE_AI" = "true" ]; then
  export DISABLE_AI=true
  echo "🔒 AI Copilot disabled (Enterprise / Restricted AI Mode enabled)."
fi

echo "=================================================="
echo " 🎮 Starting Proton Launch Options Manager"
echo "=================================================="

REINSTALL_REQUIRED=false

# 1. Check for GitHub updates if this is a Git repository and update is not skipped
if [ "$SKIP_UPDATE" = "true" ]; then
  echo "⏩ Skipping GitHub update check (skip update option enabled)."
elif [ -d ".git" ] && command -v git >/dev/null 2>&1; then
  echo "🔍 Checking for updates from GitHub..."
  if git fetch origin >/dev/null 2>&1; then
    CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "main")
    DESIRED_BRANCH="${TARGET_BRANCH:-$CURRENT_BRANCH}"

    if [ "$CURRENT_BRANCH" != "$DESIRED_BRANCH" ]; then
      echo "🔀 Switching branch from '${CURRENT_BRANCH}' to '${DESIRED_BRANCH}'..."
      HAS_CHANGES=$(git status --porcelain 2>/dev/null || true)
      if [ -n "$HAS_CHANGES" ]; then
        echo "⚠️ Local uncommitted changes detected. Stashing local changes before branch switch..."
        git stash save "Auto-stashed before switching to ${DESIRED_BRANCH}" >/dev/null 2>&1 || true
      fi

      if git checkout "$DESIRED_BRANCH" 2>/dev/null || git checkout -b "$DESIRED_BRANCH" "origin/$DESIRED_BRANCH" 2>/dev/null; then
        echo "✅ Switched to branch '${DESIRED_BRANCH}'."
        CURRENT_BRANCH="$DESIRED_BRANCH"
        REINSTALL_REQUIRED=true
      else
        echo "⚠️ Could not switch to branch '${DESIRED_BRANCH}'. Staying on '${CURRENT_BRANCH}'."
      fi
    fi

    LOCAL_HASH=$(git rev-parse HEAD 2>/dev/null || true)
    REMOTE_HASH=$(git rev-parse "origin/${CURRENT_BRANCH}" 2>/dev/null || true)

    if [ -n "$LOCAL_HASH" ] && [ -n "$REMOTE_HASH" ] && [ "$LOCAL_HASH" != "$REMOTE_HASH" ]; then
      echo "🔄 New update found on GitHub for branch '${CURRENT_BRANCH}'! Pulling latest changes..."
      HAS_CHANGES=$(git status --porcelain 2>/dev/null || true)
      if [ -n "$HAS_CHANGES" ]; then
        echo "⚠️ Local uncommitted changes detected. Stashing local changes before update..."
        git stash save "Auto-stashed before start.sh update" >/dev/null 2>&1 || true
      fi

      if git pull origin "$CURRENT_BRANCH"; then
        echo "✅ Updated to latest version from GitHub (${CURRENT_BRANCH})!"
        chmod +x "$0" 2>/dev/null || chmod +x start.sh 2>/dev/null || true
        git update-index --chmod=+x start.sh 2>/dev/null || true
        REINSTALL_REQUIRED=true
      else
        echo "⚠️ Git pull failed. Continuing with local version."
      fi
    else
      echo "✅ Repository branch '${CURRENT_BRANCH}' is up to date."
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
