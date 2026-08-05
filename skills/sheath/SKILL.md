---
name: sheath
description: Close the current session with a written record — the sheathing ritual. Use when the user says "Sheath Your Blade", "/sheath", "we're done for today", or otherwise signals the session is ending and should be recorded before goodbye.
---

# sheath — close the session with a record

The wielder's phrase **"Sheath Your Blade"** means: record, recap, rest.

1. **Record.** Write a closing summary (≤3 sentences) and a 3-bullet recap of
   what happened this session, then close the card:

```bash
node ~/.parchment-lite/record.js patch <<'JSON'
{ "title": "<short session title>",
  "summary": "<≤3 sentences: what was done, what changed>",
  "body": "- <done>\n- <open thread>\n- <where things live>",
  "active": false }
JSON
```

2. **Recap to the wielder.** A short, warm goodbye: what was done, what's
   still open, where to pick up next time. No walls of text.

3. **Stop.** Do not start new work after sheathing unless asked.
