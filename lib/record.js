#!/usr/bin/env node
// parchment-lite session recorder — token-frugal, zero dependencies.
// Lite fork of the Parchment Tasks recorder: no app, no tasks, no prompt
// library. Sessions live as JSON in ~/.parchment-lite/sessions.json and the
// hook never asks Claude to do work — it just records.
//
// Hook events handled (stdin JSON from Claude Code hooks):
//   SessionStart     → create/reactivate a session card
//   UserPromptSubmit → append a 1-line prompt note
//   Stop / SessionEnd→ mark card inactive
// CLI modes:
//   status → print one line about the current session
//   log    → print the last 10 session cards
//   patch  → merge JSON from stdin onto the active card (used by /sheath)

const fs = require('fs');
const path = require('path');
const os = require('os');

const HOME = path.join(os.homedir(), '.parchment-lite');
const DATA = path.join(HOME, 'sessions.json');

function readState() {
  try { return JSON.parse(fs.readFileSync(DATA, 'utf8')); }
  catch { return { sessions: [], meta: { created: Date.now() } }; }
}
function writeState(s) {
  fs.mkdirSync(HOME, { recursive: true });
  fs.writeFileSync(DATA, JSON.stringify(s, null, 2));
}
function clip(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n) + '…' : s; }
function firstLine(s) { return clip(String(s || '').replace(/\s+/g, ' ').trim(), 140); }
function ago(t) {
  const m = Math.round((Date.now() - t) / 60000);
  return m < 60 ? `${m}m ago` : `${Math.round(m / 60)}h ago`;
}

(async function main() {
  let raw = '';
  if (!process.stdin.isTTY) for await (const chunk of process.stdin) raw += chunk;
  const mode = process.argv[2] || '';
  const s = readState();
  s.sessions = s.sessions || [];

  if (mode === 'status') {
    const c = s.sessions.filter(x => x.active).sort((a, b) => b.updated - a.updated)[0]
      || s.sessions.sort((a, b) => b.updated - a.updated)[0];
    console.log(c ? `${c.title} · ${c.promptCount || 0} prompts · updated ${ago(c.updated)}` : 'no sessions yet');
    process.exit(0);
  }

  if (mode === 'log') {
    for (const c of s.sessions.sort((a, b) => b.updated - a.updated).slice(0, 10)) {
      console.log(`${c.active ? '●' : '○'} ${new Date(c.created).toLocaleDateString()} · ${c.title} · ${c.promptCount || 0} prompts`);
      if (c.summary) console.log(`   ${c.summary}`);
    }
    process.exit(0);
  }

  if (mode === 'patch') {
    let body;
    try { body = JSON.parse(raw || '{}'); } catch { process.exit(0); }
    let card = body.sessionId
      ? s.sessions.find(x => x.sessionId === body.sessionId)
      : s.sessions.filter(x => x.active).sort((a, b) => b.updated - a.updated)[0]
        || s.sessions.sort((a, b) => b.updated - a.updated)[0];
    if (!card) {
      card = { id: 'sess_manual_' + Date.now().toString(36), sessionId: body.sessionId || 'manual',
        created: Date.now(), promptLog: [], promptCount: 0 };
      s.sessions.push(card);
    }
    ['title', 'summary', 'body', 'cwd', 'active'].forEach(k => { if (body[k] !== undefined) card[k] = body[k]; });
    if (Array.isArray(body.tags)) card.tags = Array.from(new Set([...(card.tags || []), ...body.tags]));
    card.updated = Date.now();
    writeState(s);
    process.exit(0);
  }

  let evt;
  try { evt = JSON.parse(raw || '{}'); } catch { evt = {}; }
  const hook = evt.hook_event_name || mode || '';
  const sessionId = evt.session_id || 'unknown';
  const cwd = evt.cwd || process.cwd();
  let card = s.sessions.find(x => x.sessionId === sessionId);

  if (hook === 'SessionStart') {
    if (!card) {
      card = {
        id: 'sess_' + sessionId.slice(0, 12), sessionId,
        title: `Claude session · ${new Date().toLocaleString()}`,
        body: `cwd: ${cwd}\n`, cwd, tags: ['auto-recorded'],
        active: true, created: Date.now(), updated: Date.now(),
        promptCount: 0, promptLog: [],
      };
      s.sessions.push(card);
    } else { card.active = true; card.updated = Date.now(); }
  } else if (hook === 'UserPromptSubmit') {
    if (!card) {
      card = {
        id: 'sess_' + sessionId.slice(0, 12), sessionId,
        title: 'Claude session', body: '', cwd, tags: ['auto-recorded'],
        active: true, created: Date.now(), updated: Date.now(),
        promptCount: 0, promptLog: [],
      };
      s.sessions.push(card);
    }
    const line = firstLine(evt.prompt);
    if (line) {
      card.promptLog = card.promptLog || [];
      card.promptLog.push({ t: Date.now(), p: line });
      if (card.promptLog.length > 80) card.promptLog = card.promptLog.slice(-80);
      card.promptCount = (card.promptCount || 0) + 1;
      const tail = card.promptLog.slice(-8).map(x => `· ${x.p}`).join('\n');
      card.body = `cwd: ${cwd}\nprompts: ${card.promptCount}\n\n${tail}`;
      if (!card.title || card.title.startsWith('Claude session')) {
        card.title = clip(card.promptLog[0].p, 60) || card.title;
      }
    }
    card.updated = Date.now();
  } else if (hook === 'Stop' || hook === 'SessionEnd') {
    if (card) { card.active = false; card.updated = Date.now(); }
  }

  writeState(s);
  process.exit(0);
})().catch(() => { /* never block Claude */ process.exit(0); });
