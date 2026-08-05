#!/usr/bin/env node
// parchment-lite sheath trigger — UserPromptSubmit hook.
// Watches for the wielder's closing phrase ("sheath your blade", or /sheath)
// and injects the sheathing ritual as context. Emits nothing otherwise.

const chunks = [];
process.stdin.on('data', c => chunks.push(c));
process.stdin.on('end', () => {
  let evt = {};
  try { evt = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch {}
  const p = String(evt.prompt || '').toLowerCase();
  if (/sheath\s+your\s+blade|^\/sheath\b/.test(p)) {
    console.log([
      '[sheath] The wielder has spoken the closing phrase. Perform the sheathing ritual now:',
      '1. Write a closing summary (≤3 sentences) and a 3-bullet body recap of this session, then patch the card and close it:',
      '   node ~/.parchment-lite/record.js patch <<JSON with {"title","summary","body","active":false}',
      '2. Reply to the wielder with a short recap — what was done, what is left open, where things live.',
      '3. Keep it brief and warm. Then stop; the session is sheathed.',
    ].join('\n'));
  }
  process.exit(0);
});
