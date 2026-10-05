#!/usr/bin/env bash
# Setup for the Week 2 coding agent (Mac, Linux, Git Bash).
# Checks git and Bun (installs them if missing), saves your OpenRouter key to
# week2/coding-agent/.env, and installs the agent's packages.
# Run from anywhere: bash setup.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENT_DIR="$ROOT/week2/coding-agent"
ENV_FILE="$AGENT_DIR/.env"
OS="$(uname -s)"
NEW_TERMINAL=0

step() { printf '\n\033[1m%s\033[0m\n' "$1"; }
ok()   { printf '  \033[32mOK\033[0m %s\n' "$1"; }
fail() { printf '  \033[31mERROR\033[0m %s\n' "$1" >&2; exit 1; }

# Install a package with whichever Linux package manager is present.
linux_install() {
  if command -v apt-get >/dev/null 2>&1; then sudo apt-get update -qq && sudo apt-get install -y "$@"
  elif command -v dnf >/dev/null 2>&1; then sudo dnf install -y "$@"
  elif command -v pacman >/dev/null 2>&1; then sudo pacman -S --noconfirm "$@"
  else fail "Install $* with your package manager, then run setup again."
  fi
}

step "1. git"
if ! command -v git >/dev/null 2>&1; then
  case "$OS" in
    Darwin) xcode-select --install || true
            fail "Finish the Command Line Tools install in the window that opened, then run setup again." ;;
    Linux)  linux_install git ;;
    *)      fail "Install git from https://git-scm.com/downloads, then run setup again." ;;
  esac
fi
ok "$(git --version)"

step "2. Bun"
export BUN_INSTALL="${BUN_INSTALL:-$HOME/.bun}"
export PATH="$BUN_INSTALL/bin:$PATH"
if ! command -v bun >/dev/null 2>&1; then
  case "$OS" in
    MINGW*|MSYS*|CYGWIN*)
      powershell -NoProfile -Command "irm bun.sh/install.ps1 | iex" ;;
    *)
      command -v curl >/dev/null 2>&1 || fail "curl is required. Install it, then run setup again."
      if [ "$OS" = Linux ] && ! command -v unzip >/dev/null 2>&1; then linux_install unzip; fi
      curl -fsSL https://bun.sh/install | bash ;;
  esac
  command -v bun >/dev/null 2>&1 || fail "Bun installed, but this terminal can't find it. Open a new terminal and run setup again."
  NEW_TERMINAL=1
fi
ok "Bun $(bun --version)"

step "3. OpenRouter key"
# Ask OpenRouter whether a key works.
key_works() { curl -fsS -o /dev/null -H "Authorization: Bearer $1" https://openrouter.ai/api/v1/key 2>/dev/null; }

key=""
if [ -f "$ENV_FILE" ] && grep -q '^OPENROUTER_API_KEY=.' "$ENV_FILE"; then
  read -rp "  A key is already saved in week2/coding-agent/.env. Replace it? [y/N] " replace
  [[ "$replace" =~ ^[Yy]$ ]] || { ok "Keeping the saved key"; key="keep"; }
elif [ -n "${OPENROUTER_API_KEY:-}" ]; then
  key="$OPENROUTER_API_KEY"
  ok "Using the key from OPENROUTER_API_KEY"
fi

if [ -z "$key" ]; then
  echo "  Get a free key at https://openrouter.ai/keys (Create Key, then copy it)."
  while true; do
    read -rsp "  Paste your key (it won't show as you paste), then press Enter: " key
    echo
    key="$(printf '%s' "$key" | tr -d '[:space:]')"
    [ -n "$key" ] || continue
    if key_works "$key"; then break; fi
    echo "  OpenRouter didn't accept that key. Check it and try again."
  done
fi

if [ "$key" != "keep" ]; then
  (umask 077 && printf 'OPENROUTER_API_KEY=%s\n' "$key" > "$ENV_FILE")
  ok "Saved to week2/coding-agent/.env (git ignores this file)"
fi

step "4. Packages"
(cd "$AGENT_DIR" && bun install) || fail "bun install failed. Check your internet connection and run setup again."
ok "Installed"

step "Ready."
echo "  cd week2/coding-agent"
echo "  bun main.ts"
if [ "$NEW_TERMINAL" = 1 ]; then echo "  (Bun is new: open a new terminal first so it's on your PATH.)"; fi
