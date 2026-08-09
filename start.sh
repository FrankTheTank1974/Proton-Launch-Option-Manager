#!/usr/bin/env bash
set -e

PORT="${PORT:-3000}"
APP_URL="http://localhost:${PORT}"

echo "=================================================="
echo " 🎮 Starting Proton Launch Options Manager"
echo "=================================================="

# 1. Install dependencies if missing
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

# 2. Build production assets & server
echo "🔨 Building production distribution..."
npm run build

# 3. Helper function to open default system browser
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

# 4. Start Node.js server
echo "🚀 Application running at ${APP_URL}"
npm start
