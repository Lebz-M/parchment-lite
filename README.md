# parchment-lite

Session memory for Claude Code, in one curl. A lite fork of the Parchment
Tasks session recorder — no app, no task board, no extras. Sessions are
auto-recorded locally and closed with a spoken ritual.

## Install

```bash
curl -sSL https://raw.githubusercontent.com/Lebz-M/parchment-lite/main/install.sh | bash
```

(Read `install.sh` first if you like — it's short and does exactly four things,
with a timestamped backup of your `settings.json` before it touches anything.)

## What you get

- **Auto-recording** — every Claude Code session becomes a card in
  `~/.parchment-lite/sessions.json` (title, prompt log, timestamps). Recorded
  by hooks, zero Claude tokens spent.
- **"Sheath Your Blade"** — say it (or `/sheath`) and your blade writes a
  closing summary, files the card, and gives you a short recap before rest.
- **`/parchment-lite`** — `status`, `log`, and `capture` (context rescue after
  a disconnect).
- **Scope Guard** — a standing rule that makes your blade warn you whenever a
  build runs ahead of the stage your product is actually at (speculative
  frameworks, schema for features that don't exist yet). It warns once,
  plainly, proposes the smallest current-stage step — then the call is yours.
  Skip it with `install.sh --no-scope-guard`.

## Uninstall

Remove `~/.parchment-lite/`, the `parchment-lite` and `sheath` folders in
`~/.claude/skills/`, the three hook entries in `~/.claude/settings.json`
(backup sits beside it), and the scope-guard block in `~/.claude/CLAUDE.md`.

---

Forged as part of the **Nimaiya** protocol — sell the forge, never the blade.
