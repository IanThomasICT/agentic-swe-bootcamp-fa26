#!/usr/bin/env bash
# Lists free OpenRouter models the agent can use (they support tools), coding models first, newest first.
# Usage: bash scripts/list-available-models.sh [--all]
#   --all   show every free model, including ones without tool support
set -euo pipefail

SHOW_ALL=0
case "${1:-}" in
  "") ;;
  --all) SHOW_ALL=1 ;;
  -h|--help) sed -n '2,4p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
  *) echo "Unknown option: $1 (try --all)" >&2; exit 1 ;;
esac

# Bun parses the JSON (setup installs it; no jq needed).
command -v bun >/dev/null 2>&1 || export PATH="${BUN_INSTALL:-$HOME/.bun}/bin:$PATH"
command -v bun >/dev/null 2>&1 || { echo "Bun is required. Run scripts/setup.sh first." >&2; exit 1; }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
curl -fsS https://openrouter.ai/api/v1/models -o "$TMP/models.json" \
  || { echo "Couldn't reach openrouter.ai. Check your internet connection." >&2; exit 1; }
curl -fsS "https://openrouter.ai/api/v1/models?category=programming" -o "$TMP/coding.json" \
  || echo '{"data":[]}' > "$TMP/coding.json"

SHOW_ALL="$SHOW_ALL" TMP="$TMP" bun -e '
const fs = require("fs");
const read = (f) => JSON.parse(fs.readFileSync(`${process.env.TMP}/${f}`, "utf8")).data;
const showAll = process.env.SHOW_ALL === "1";
const codingIds = new Set(read("coding.json").map((m) => m.id));

const hasTools = (m) => (m.supported_parameters ?? []).includes("tools");
const isCoding = (m) =>
  codingIds.has(m.id) || /\bcod(e|er|ing)\b|agentic/i.test(`${m.id} ${m.name} ${m.description ?? ""}`);

const models = read("models.json")
  .filter((m) => m.id.endsWith(":free") && (showAll || hasTools(m)))
  .sort((a, b) => Number(isCoding(b)) - Number(isCoding(a)) || b.created - a.created);
const shown = showAll ? models : models.slice(0, 10);

const width = Math.max(5, ...shown.map((m) => m.id.length)) + 2;
const row = (cells) => "  " + cells[0].padEnd(width) + cells.slice(1).map((c, i) => c.padEnd([8, 7, 12, 0][i])).join("");
console.log(showAll ? "\nAll free OpenRouter models:\n" : "\nFree OpenRouter models with tool support (coding models first, newest first):\n");
console.log(row(["MODEL", "CODING", "TOOLS", "ADDED", "CONTEXT"]));
for (const m of shown) {
  const added = new Date(m.created * 1000).toISOString().slice(0, 10);
  console.log(row([m.id, isCoding(m) ? "yes" : "", hasTools(m) ? "yes" : "no", added, `${Math.round(m.context_length / 1000)}k`]));
}
if (!showAll && models.length > shown.length) console.log(`\n  Showing ${shown.length} of ${models.length}. Run with --all to see every free model.`);
console.log("\n  To switch, change `model` at the top of main.ts. Free models come and go; if one errors, try the next.\n");
'
