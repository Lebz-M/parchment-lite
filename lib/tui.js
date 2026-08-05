#!/usr/bin/env node
// parchment-lite TUI — interactive, clickable session browser. Zero deps.
// Arrow keys / numbers navigate · Enter opens · mouse clicks work (xterm) ·
// Esc/b back · q quits. Reads/writes ~/.parchment-lite/sessions.json.

const fs = require('fs');
const path = require('path');
const os = require('os');

const HOME = path.join(os.homedir(), '.parchment-lite');
const DATA = path.join(HOME, 'sessions.json');

// ---------- state ----------
function readState() {
  try { return JSON.parse(fs.readFileSync(DATA, 'utf8')); }
  catch { return { sessions: [], meta: {} }; }
}
function writeState(s) {
  fs.mkdirSync(HOME, { recursive: true });
  fs.writeFileSync(DATA, JSON.stringify(s, null, 2));
}

// ---------- ansi ----------
const ESC = '\x1b[';
const c = {
  reset: `${ESC}0m`, bold: `${ESC}1m`, dim: `${ESC}2m`,
  violet: `${ESC}38;5;135m`, gold: `${ESC}38;5;178m`,
  green: `${ESC}38;5;114m`, grey: `${ESC}38;5;245m`, red: `${ESC}38;5;174m`,
  invert: `${ESC}7m`,
};
const out = s => process.stdout.write(s);
const clip = (s, n) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const ago = t => { const m = Math.round((Date.now() - t) / 60000);
  if (m < 60) return `${m}m ago`; if (m < 1440) return `${Math.round(m / 60)}h ago`;
  return `${Math.round(m / 1440)}d ago`; };

// ---------- app ----------
const app = { screen: 'menu', idx: 0, sessions: [], sel: null, confirm: null, rowMap: {} };

function loadSessions() {
  app.sessions = readState().sessions.slice().sort((a, b) => (b.updated||0) - (a.updated||0));
}

const MENU = [
  { key: 'browse', icon: '📜', label: 'Sessions Library', hint: 'browse recorded sessions' },
  { key: 'active', icon: '●', label: 'Active session', hint: 'jump to the live card' },
  { key: 'sheath', icon: '🗡', label: 'How to sheath', hint: 'the closing ritual' },
  { key: 'quit', icon: '✕', label: 'Quit', hint: '' },
];

function width() { return Math.min(process.stdout.columns || 80, 96); }

function header(title) {
  const w = width();
  out(`${ESC}H${ESC}2J`); app.rowMap = {}; app.row = 1;
  line(`${c.violet}${c.bold}┌${'─'.repeat(w - 2)}┐${c.reset}`);
  line(`${c.violet}${c.bold}│${c.reset} ${c.gold}${c.bold}parchment-lite${c.reset} ${c.grey}·${c.reset} ${title}${' '.repeat(Math.max(1, w - 20 - title.length))}${c.violet}${c.bold}│${c.reset}`);
  line(`${c.violet}${c.bold}└${'─'.repeat(w - 2)}┘${c.reset}`);
}
function line(s, mapIdx) {
  if (mapIdx !== undefined) app.rowMap[app.row] = mapIdx;
  out(s + '\n'); app.row++;
}
function footer(keys) {
  out(`\n${c.grey}${keys}   (click works too)${c.reset}\n`);
}

function render() {
  if (app.screen === 'menu') {
    header('session memory for Claude Code');
    out('\n'); app.row++;
    MENU.forEach((m, i) => {
      const on = i === app.idx;
      const pre = on ? `${c.invert}${c.gold}` : '';
      line(`  ${pre} ${i + 1}. ${m.icon}  ${m.label} ${c.reset}${c.grey} ${m.hint}${c.reset}`, i);
    });
    const act = app.sessions.filter(s => s.active).length;
    out('\n'); app.row++;
    line(`  ${c.grey}${app.sessions.length} sessions on record · ${act} active${c.reset}`);
    footer('↑↓ move · Enter select · 1-4 jump · q quit');
  }

  if (app.screen === 'list') {
    header('Sessions Library');
    out('\n'); app.row++;
    if (!app.sessions.length) line(`  ${c.grey}no sessions yet — they record automatically as you work${c.reset}`);
    app.sessions.slice(0, 15).forEach((s, i) => {
      const on = i === app.idx;
      const dot = s.active ? `${c.green}●${c.reset}` : `${c.grey}○${c.reset}`;
      const pre = on ? `${c.invert}` : '';
      line(`  ${dot} ${pre} ${clip(s.title, width() - 30)} ${c.reset}${c.grey}· ${s.promptCount || 0}p · ${ago(s.updated || s.created)}${c.reset}`, i);
    });
    footer('↑↓ move · Enter open · Esc back · q quit');
  }

  if (app.screen === 'detail' && app.sel) {
    const s = app.sel;
    header(clip(s.title, width() - 22));
    out('\n'); app.row++;
    line(`  ${s.active ? c.green + '● active' : c.grey + '○ closed'}${c.reset}  ${c.grey}created ${new Date(s.created).toLocaleString()} · ${s.promptCount || 0} prompts${c.reset}`);
    if (s.cwd) line(`  ${c.grey}cwd ${s.cwd}${c.reset}`);
    if (s.summary) { out('\n'); app.row++; line(`  ${c.gold}${c.bold}summary${c.reset}  ${clip(s.summary, 400)}`); }
    if (s.body) {
      out('\n'); app.row++;
      s.body.split('\n').slice(0, 12).forEach(l => line(`  ${clip(l, width() - 4)}`));
    }
    if (app.confirm) { out('\n'); app.row++; line(`  ${c.red}${c.bold}delete this card? y / n${c.reset}`); }
    footer('t toggle active · d delete · Esc back · q quit');
  }

  if (app.screen === 'sheath') {
    header('the sheathing ritual');
    out('\n'); app.row++;
    line(`  Say ${c.gold}${c.bold}"Sheath Your Blade"${c.reset} (or ${c.gold}/sheath${c.reset}) inside a Claude session.`);
    line('');
    line(`  Your blade will write a closing summary, file the card as closed,`);
    line(`  and give you a short recap before rest. Record, recap, rest.`);
    footer('Esc back · q quit');
  }
}

// ---------- actions ----------
function openMenu(i) {
  const key = MENU[i].key;
  if (key === 'quit') return quit();
  if (key === 'sheath') { app.screen = 'sheath'; }
  if (key === 'browse') { loadSessions(); app.screen = 'list'; app.idx = 0; }
  if (key === 'active') {
    loadSessions();
    const a = app.sessions.find(s => s.active) || app.sessions[0];
    if (a) { app.sel = a; app.screen = 'detail'; }
    else { app.screen = 'list'; app.idx = 0; }
  }
  render();
}

function listMax() { return app.screen === 'menu' ? MENU.length : Math.min(app.sessions.length, 15); }

function handleKey(k) {
  if (app.confirm) {
    if (k === 'y') {
      const st = readState();
      st.sessions = (st.sessions || []).filter(x => x.id !== app.sel.id);
      writeState(st); loadSessions();
      app.confirm = null; app.screen = 'list'; app.idx = 0;
    } else app.confirm = null;
    return render();
  }
  if (k === 'q' || k === '\x03') return quit();
  if (k === '\x1b' || k === 'b') {
    if (app.screen === 'detail') app.screen = 'list';
    else app.screen = 'menu';
    app.idx = 0; return render();
  }
  if (k === '\x1b[A') { app.idx = Math.max(0, app.idx - 1); return render(); }
  if (k === '\x1b[B') { app.idx = Math.min(listMax() - 1, app.idx + 1); return render(); }
  if (/^[1-9]$/.test(k) && app.screen === 'menu') {
    const i = Number(k) - 1;
    if (i < MENU.length) { app.idx = i; return openMenu(i); }
  }
  if (k === '\r') {
    if (app.screen === 'menu') return openMenu(app.idx);
    if (app.screen === 'list' && app.sessions[app.idx]) {
      app.sel = app.sessions[app.idx]; app.screen = 'detail'; return render();
    }
  }
  if (app.screen === 'detail') {
    if (k === 't') {
      const st = readState();
      const card = (st.sessions || []).find(x => x.id === app.sel.id);
      if (card) { card.active = !card.active; card.updated = Date.now(); writeState(st); app.sel = card; }
      return render();
    }
    if (k === 'd') { app.confirm = true; return render(); }
  }
}

function handleMouse(buf) {
  // xterm normal tracking: ESC [ M b x y  (press only)
  const b = buf[3] - 32, y = buf[5] - 32;
  if ((b & 3) === 3) return; // release
  const idx = app.rowMap[y];
  if (idx === undefined) return;
  app.idx = idx;
  if (app.screen === 'menu') return openMenu(idx);
  if (app.screen === 'list' && app.sessions[idx]) {
    app.sel = app.sessions[idx]; app.screen = 'detail'; return render();
  }
  render();
}

// ---------- lifecycle ----------
function quit() {
  out(`${ESC}?1000l${ESC}?1049l${ESC}?25h`);
  process.exit(0);
}

loadSessions();
out(`${ESC}?1049h${ESC}?25l${ESC}?1000h`); // alt screen, hide cursor, mouse on
process.on('exit', () => out(`${ESC}?1000l${ESC}?1049l${ESC}?25h`));
process.stdin.setRawMode && process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.on('data', buf => {
  if (buf[0] === 0x1b && buf[1] === 0x5b && buf[2] === 0x4d) return handleMouse(buf);
  const s = buf.toString('utf8');
  if (s[0] === '\x1b') return handleKey(s); // escape sequence, keep whole
  for (const ch of s) handleKey(ch);        // split plain chars (paste/pipe safety)
});
process.stdout.on('resize', render);
render();
