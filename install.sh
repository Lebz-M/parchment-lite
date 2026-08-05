#!/usr/bin/env bash
# parchment-lite installer — session recording + sheathing ritual for Claude Code.
# Readable on purpose. What it does, in order:
#   1. Installs the recorder + sheath trigger into ~/.parchment-lite/
#   2. Installs the /parchment-lite and /sheath skills into ~/.claude/skills/
#   3. Wires SessionStart / UserPromptSubmit / Stop hooks into ~/.claude/settings.json
#      (a timestamped backup of settings.json is made first; merge is idempotent)
#   4. Appends the Scope Guard rule to ~/.claude/CLAUDE.md (skip: --no-scope-guard)
# Uninstall: remove ~/.parchment-lite, the two skill folders, the three hook
# entries, and the scope-guard block in CLAUDE.md. Nothing else is touched.
set -euo pipefail

RAW="https://raw.githubusercontent.com/Lebz-M/parchment-lite/main"
LITE="$HOME/.parchment-lite"
SKILLS="$HOME/.claude/skills"
SETTINGS="$HOME/.claude/settings.json"
CLAUDE_MD="$HOME/.claude/CLAUDE.md"
SCOPE_GUARD=1
[ "${1:-}" = "--no-scope-guard" ] && SCOPE_GUARD=0

command -v node >/dev/null 2>&1 || { echo "✗ parchment-lite needs Node.js (node not found). Install Node and re-run."; exit 1; }

echo "→ installing recorder into $LITE"
mkdir -p "$LITE" "$SKILLS/parchment-lite" "$SKILLS/sheath" "$HOME/.claude"
curl -fsSL "$RAW/lib/record.js"          -o "$LITE/record.js"
curl -fsSL "$RAW/lib/sheath-trigger.js"  -o "$LITE/sheath-trigger.js"
curl -fsSL "$RAW/lib/tui.js"             -o "$LITE/tui.js"
chmod +x "$LITE/record.js" "$LITE/sheath-trigger.js" "$LITE/tui.js"

echo "→ installing the parchment-lite command (interactive session browser)"
BIN_DIR="/usr/local/bin"
[ -w "$BIN_DIR" ] || { BIN_DIR="$HOME/.local/bin"; mkdir -p "$BIN_DIR"; }
printf '#!/usr/bin/env bash\nexec node "%s/tui.js" "$@"\n' "$LITE" > "$BIN_DIR/parchment-lite"
chmod +x "$BIN_DIR/parchment-lite"
case ":$PATH:" in
  *":$BIN_DIR:"*) echo "  installed: $BIN_DIR/parchment-lite" ;;
  *) echo "  installed: $BIN_DIR/parchment-lite  (add $BIN_DIR to your PATH)" ;;
esac

echo "→ installing skills (/parchment-lite, /sheath)"
curl -fsSL "$RAW/skills/parchment-lite/SKILL.md" -o "$SKILLS/parchment-lite/SKILL.md"
curl -fsSL "$RAW/skills/sheath/SKILL.md"         -o "$SKILLS/sheath/SKILL.md"

echo "→ wiring hooks into $SETTINGS"
if [ -f "$SETTINGS" ]; then
  cp "$SETTINGS" "$SETTINGS.bak-parchment-lite-$(date +%Y%m%d%H%M%S)"
  echo "  (backup written next to it)"
fi
node - <<'NODE'
const fs = require('fs'), os = require('os'), path = require('path');
const file = path.join(os.homedir(), '.claude', 'settings.json');
let s = {};
try { s = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}
s.hooks = s.hooks || {};
const rec = 'node $HOME/.parchment-lite/record.js';
const sheath = 'node $HOME/.parchment-lite/sheath-trigger.js';
function ensure(event, cmd) {
  s.hooks[event] = s.hooks[event] || [];
  const present = JSON.stringify(s.hooks[event]).includes(cmd.replace(/\$/g, '\\u0024')) ||
                  JSON.stringify(s.hooks[event]).includes(cmd);
  if (!present) s.hooks[event].push({ hooks: [{ type: 'command', command: cmd }] });
}
ensure('SessionStart', rec);
ensure('UserPromptSubmit', rec);
ensure('UserPromptSubmit', sheath);
ensure('Stop', rec);
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, JSON.stringify(s, null, 2));
console.log('  hooks merged (idempotent).');
NODE

if [ "$SCOPE_GUARD" = "1" ]; then
  if [ -f "$CLAUDE_MD" ] && grep -q "parchment-lite:scope-guard:start" "$CLAUDE_MD"; then
    echo "→ scope-guard rule already present in CLAUDE.md — skipping"
  else
    echo "→ appending Scope Guard rule to $CLAUDE_MD"
    { [ -f "$CLAUDE_MD" ] && [ -s "$CLAUDE_MD" ] && echo ""; curl -fsSL "$RAW/rules/scope-guard.md"; } >> "$CLAUDE_MD"
  fi
fi

echo ""
echo "✓ parchment-lite installed."
echo "  · run 'parchment-lite' for the interactive session browser (arrows/clicks)"
echo "  · sessions auto-record to ~/.parchment-lite/sessions.json"
echo "  · say \"Sheath Your Blade\" (or /sheath) to close a session with a record"
echo "  · /parchment-lite status · log · capture for manual control"
echo "  · restart your claude session for hooks to take effect"
