---
name: parchment-lite
description: Record and inspect Claude terminal sessions in the local parchment-lite Sessions Library (~/.parchment-lite/sessions.json). Use when the user says "/parchment-lite", "record this session", "session status", "what have we done in past sessions", or after a disconnect where this fresh instance has no memory of earlier work in the same terminal. Token-frugal — short summaries, never verbatim dumps.
---

# parchment-lite — session recorder

Sessions are auto-recorded by hooks (SessionStart / UserPromptSubmit / Stop)
calling `~/.parchment-lite/record.js` — no Claude tokens spent. This skill is
the manual interface.

## Token-frugal rules (read first)

- **Never** dump the whole conversation into a card. Summarise.
- Cap `summary` at 3 sentences, ~400 chars. Body = 3-bullet recap max.
- One `patch` call per update — do not re-render the file.

## Subcommands

### `status`
```bash
node ~/.parchment-lite/record.js status
```
Print the one-liner back to the user.

### `log`
```bash
node ~/.parchment-lite/record.js log
```
Last 10 sessions, one line each.

### `capture` (context rescue)
After a disconnect or fresh `claude` in the same terminal: review the visible
scrollback, extract first task / key decisions / files touched, then:
```bash
node ~/.parchment-lite/record.js patch <<'JSON'
{ "title": "...", "summary": "...", "body": "- ...\n- ...\n- ...", "tags": ["context-rescue"] }
JSON
```

### `summary`
Refresh the rolling `summary` field with a ≤3-sentence recap via `patch`.
