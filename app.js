'use strict';
const TZ = 'Asia/Singapore';
const DAY = 86400000;
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let D = null; // decrypted data

// ---------- local state ----------
const LS = 'life:v1';
const S = Object.assign({ todosDone: {}, custom: [], focus: {}, sports: {}, ms: {}, reset: {}, saved: [], seenChanges: 0 }, JSON.parse(localStorage.getItem(LS) || '{}'));
const save = () => localStorage.setItem(LS, JSON.stringify(S));

// ---------- time helpers ----------
const sgParts = (t) => { const d = new Date(t + 8 * 3600000); return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(), wd: d.getUTCDay(), h: d.getUTCHours(), mi: d.getUTCMinutes() }; };
const dayKey = (t = Date.now()) => { const p = sgParts(t); return `${p.y}-${String(p.m + 1).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`; };
const sgMidnight = (t = Date.now()) => { const p = sgParts(t); return Date.UTC(p.y, p.m, p.d) - 8 * 3600000; };
const fmt = (t, o) => new Date(t).toLocaleString('en-GB', { timeZone: TZ, ...o });
const hm = (t) => fmt(t, { hour: '2-digit', minute: '2-digit' });
const dayName = (t) => { const diff = Math.round((sgMidnight(t) - sgMidnight()) / DAY); return diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : diff === -1 ? 'Yesterday' : fmt(t, { weekday: 'short', day: 'numeric', month: 'short' }); };
const rel = (t) => { const s = (t - Date.now()) / 1000, a = Math.abs(s); const v = a < 3600 ? Math.round(a / 60) + 'm' : a < 172800 ? Math.round(a / 3600) + 'h' : Math.round(a / 86400) + 'd'; return s >= 0 ? 'in ' + v : v + ' ago'; };
const dueBadge = (h) => { if (!h.due) return '<span class="pill">no date</span>'; const left = h.due - Date.now(); if (left < 0) return '<span class="pill bad">overdue</span>'; if (left < 2 * DAY) return `<span class="pill warn">${rel(h.due)}</span>`; if (left < 7 * DAY) return `<span class="pill acc">${rel(h.due)}</span>`; return `<span class="pill">${rel(h.due)}</span>`; };

// ---------- icons ----------
const I = {
  today: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  homework: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5V5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2.5"/><path d="M8 7h6M8 11h4"/></svg>',
  grades: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4M8 14l2 2 4-4"/></svg>',
  sports: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12"/></svg>',
  goals: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>',
  ideas: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V17h5v-1.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/></svg>',
  inbox: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M3 13l3-8h12l3 8v6H3z"/><path d="M3 13h5l1 3h6l1-3h5"/></svg>',
};
const ROUTES = [
  ['today', 'Today'], ['homework', 'Homework'], ['grades', 'Grades'], ['calendar', 'Calendar'], ['sports', 'Sports'], ['goals', 'Goals'], ['ideas', 'Ideas'], ['inbox', 'Inbox'],
];
const TAB_ROUTES = ['today', 'homework', 'grades', 'calendar', 'sports', 'goals'];

// ---------- crypto ----------
const ub64 = (s) => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function decrypt(enc, pass) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: ub64(enc.salt), iterations: 150000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ub64(enc.iv) }, key, ub64(enc.ct));
  return JSON.parse(new TextDecoder().decode(pt));
}
async function load(force) {
  const btn = $('#syncBtn'); btn.classList.add('spin');
  try {
    const r = await fetch('data.enc.json?t=' + Date.now(), { cache: 'no-store' });
    const enc = await r.json();
    const pass = localStorage.getItem('life:pass');
    D = await decrypt(enc, pass);
    localStorage.setItem('life:cache', JSON.stringify(enc));
    if (force) toast('Up to date');
  } catch (e) {
    const c = localStorage.getItem('life:cache');
    if (c && !D) { try { D = await decrypt(JSON.parse(c), localStorage.getItem('life:pass')); toast('Offline: showing last saved data'); } catch { } }
    if (!D) throw e;
  } finally { btn.classList.remove('spin'); }
  render();
}

// ---------- lock ----------
async function unlock(pass) {
  const r = await fetch('data.enc.json?t=' + Date.now(), { cache: 'no-store' });
  const enc = await r.json();
  D = await decrypt(enc, pass); // throws if wrong
  localStorage.setItem('life:pass', pass);
  localStorage.setItem('life:cache', JSON.stringify(enc));
}
async function boot() {
  const m = location.hash.match(/k=([^&]+)/);
  if (m) { localStorage.setItem('life:pass', decodeURIComponent(m[1])); history.replaceState(null, '', location.pathname + '#today'); }
  if (!localStorage.getItem('life:pass')) return showLock();
  try { await load(); showShell(); }
  catch (e) { console.error(e); showLock('Could not unlock. Check the passcode.'); }
}
function showLock(err) {
  $('#shell').classList.add('hidden'); $('#lock').classList.remove('hidden'); $('#lockErr').textContent = err || '';
}
function showShell() { $('#lock').classList.add('hidden'); $('#shell').classList.remove('hidden'); }
$('#lockForm').addEventListener('submit', async (e) => {
  e.preventDefault(); $('#lockErr').textContent = 'Unlocking…';
  try { await unlock($('#pass').value.trim()); showShell(); render(); }
  catch { $('#lockErr').textContent = 'Wrong passcode.'; }
});
$('#syncBtn').addEventListener('click', () => load(true).catch(() => toast('Could not refresh')));

// ---------- nav ----------
function route() { const r = (location.hash.replace('#', '').split('&')[0]) || 'today'; return ROUTES.some(x => x[0] === r) ? r : 'today'; }
window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });
function badges() {
  if (!D) return {};
  const hw = D.homework.filter(h => h.due && h.due > Date.now() && h.due - Date.now() < 3 * DAY).length;
  const newCh = D.changes.filter(c => c.time > (S.seenChanges || 0)).length;
  return { homework: hw, inbox: D.mail?.essec?.unread || 0, today: newCh };
}
function renderNav() {
  const b = badges(), cur = route();
  const link = (r, label) => `<a href="#${r}" class="${cur === r ? 'on' : ''}">${I[r]}<span>${label}</span>${b[r] ? `<span class="dot">${b[r] > 9 ? '9+' : b[r]}</span>` : ''}</a>`;
  $('#sideNav').innerHTML = ROUTES.map(([r, l]) => link(r, l)).join('');
  $('#tabbar').innerHTML = ROUTES.filter(([r]) => TAB_ROUTES.includes(r)).map(([r, l]) => link(r, l)).join('');
}
function header(title) {
  $('#title').textContent = title;
  $('#dateLine').textContent = fmt(Date.now(), { weekday: 'long', day: 'numeric', month: 'long' });
  $('#syncText').textContent = D ? 'Updated ' + rel(D.updatedAt) : '…';
  $('#sideFoot').innerHTML = D ? `Synced from Moodle, Gmail & Calendar<br>Updated ${rel(D.updatedAt)} · refreshes hourly` : '';
}

// ---------- views ----------
const V = {};
const todoItems = () => {
  const auto = (D.todos || []).map(t => ({ ...t }));
  const custom = (S.custom || []).map(t => ({ ...t, tag: 'mine' }));
  return [...custom, ...auto];
};
const isDone = (id) => !!S.todosDone[id];
function todoRow(t) {
  const done = isDone(t.id);
  return `<div class="item ${done ? 'done' : ''}" data-todo="${esc(t.id)}"><button class="check ${done ? 'on' : ''}" data-act="todo" data-id="${esc(t.id)}" aria-label="done"></button>
    <div class="main"><div class="t">${esc(t.text)}</div><div class="m">${t.due ? dueBadge(t) + ' ' : ''}<span class="tag">${esc(t.tag || '')}</span>${t.url ? ` · <a href="${esc(t.url)}" target="_blank" rel="noopener">open ↗</a>` : ''}${t.tag === 'mine' ? ` · <a href="#" data-act="deltodo" data-id="${esc(t.id)}">delete</a>` : ''}</div></div></div>`;
}

V.today = () => {
  const now = Date.now(), dk = dayKey();
  const first = D.owner || 'Malone';
  const h = sgParts(now).h;
  const greet = h < 5 ? 'Late night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  const evToday = D.calendar.events.filter(e => e.start < sgMidnight() + DAY && e.end > now && !e.allDay);
  const next = evToday[0];
  const hwSoon = D.homework.filter(x => x.due && x.due > now && x.due - now < 7 * DAY);
  const openTodos = todoItems().filter(t => !isDone(t.id));
  const wk = sportsWeek();
  const sToday = sportsToday();
  const goalsAvg = (() => { const g = D.goals.map(goalProgress).filter(x => x != null); return g.length ? Math.round(100 * g.reduce((a, b) => a + b, 0) / g.length) : 0; })();
  const newCh = D.changes.filter(c => c.time > (S.seenChanges || 0));
  const fd = S.focus[dk] || {};
  const rd = S.reset[dk] || {};
  return `
  <div class="card hero">
    <div class="eyebrow">${greet}, ${esc(first)}</div>
    <div class="hl">${esc(D.briefing.headline)}</div>
    ${D.briefing.summary ? `<p>${esc(D.briefing.summary)}</p>` : ''}
  </div>
  <div class="chips">${(D.countdowns || []).map(c => { const t = new Date(c.date).getTime(); const d = Math.ceil((t - now) / DAY); return d >= 0 ? `<span class="chip">${esc(c.label)} <b>${d === 0 ? 'today' : d + 'd'}</b></span>` : ''; }).join('')}
    ${next ? `<span class="chip">Next: <b>${esc(next.title)}</b> ${next.start > now ? hm(next.start) : 'now'}</span>` : ''}</div>
  <div class="tiles">
    <a class="tile" href="#homework" style="--glow:#ffb547"><span class="k">${I.homework.replace('<svg', '<svg width="15"')} Homework</span><span class="v">${hwSoon.length}</span><span class="s">due in the next 7 days</span></a>
    <a class="tile" href="#grades" style="--glow:#8b7cff"><span class="k">${I.grades.replace('<svg', '<svg width="15"')} Average</span><span class="v">${D.grades.average != null ? D.grades.average.toFixed(2) : '–'}</span><span class="s">/20 on graded work</span></a>
    <a class="tile" href="#sports" style="--glow:#46e39b"><span class="k">${I.sports.replace('<svg', '<svg width="15"')} Sports</span><span class="v">${wk.done}/${D.sports.weeklyTarget}</span><span class="s">${sToday ? (sToday.rest ? 'Rest day' : 'Today: ' + esc(sToday.name)) : ''}</span></a>
    <a class="tile" href="#goals" style="--glow:#3fd8ff"><span class="k">${I.goals.replace('<svg', '<svg width="15"')} Goals</span><span class="v">${goalsAvg}%</span><span class="s">average progress</span></a>
  </div>
  <div class="grid2">
  <div class="card"><h2>Top 3 today</h2><div class="list">${(D.briefing.focus || []).map((f, i) => `<div class="item ${fd[i] ? 'done' : ''}"><button class="check ${fd[i] ? 'on' : ''}" data-act="focus" data-i="${i}"></button><div class="main"><div class="t">${esc(f)}</div></div></div>`).join('') || '<div class="empty">Nothing set</div>'}</div></div>
  <div class="card"><h2>Today's plan <span class="dim small">${D.briefing.date ? dayName(new Date(D.briefing.date + 'T12:00:00+08:00').getTime()) : ''}</span></h2><div class="tl">${(D.plan || []).map(p => { const [hh, mm] = (p.time || '').split(':').map(Number); const t = sgMidnight() + ((hh || 0) * 60 + (mm || 0)) * 60000; const isNow = t <= now && now < t + 3600000; return `<div class="item"><div class="time ${isNow ? 'now' : ''}">${esc(p.time || '')}</div><div class="main"><div class="t">${esc(p.text)}</div><div class="tag">${esc(p.tag || '')}</div></div></div>`; }).join('') || '<div class="empty">No plan yet</div>'}</div></div>
  </div>
  ${newCh.length || D.changes.length ? `<div class="card feed"><h2>What's new <span><button class="btn" data-act="seen">Mark seen</button></span></h2><div class="list">${D.changes.slice(0, 8).map(c => `<div class="item"><span class="k-ico" style="background:${kindColor(c.kind)}22;color:${kindColor(c.kind)}">${kindLetter(c.kind)}</span><div class="main"><div class="t">${c.time > (S.seenChanges || 0) ? '<span class="pill acc">new</span> ' : ''}${c.url ? `<a href="${esc(c.url)}" target="_blank" rel="noopener">${esc(c.text)}</a>` : esc(c.text)}</div><div class="d">${rel(c.time)}</div></div></div>`).join('')}</div></div>` : ''}
  <div class="sec">Ideas for today <a class="small muted" href="#ideas">all →</a></div>
  <div class="ideas">${(D.ideas || []).map(ideaCard).join('')}</div>
  <div class="card"><h2>To-do <a class="small muted" href="#calendar">${openTodos.length} open →</a></h2><div class="list">${openTodos.slice(0, 6).map(todoRow).join('') || '<div class="empty">All clear</div>'}</div></div>
  <div class="card"><h2>Evening reset</h2><div class="list">${(D.reset || []).map((r, i) => `<div class="item ${rd[i] ? 'done' : ''}"><button class="check ${rd[i] ? 'on' : ''}" data-act="reset" data-i="${i}"></button><div class="main"><div class="t">${esc(r)}</div></div></div>`).join('')}</div></div>
  ${D.errors?.length ? `<div class="card"><h2>Sync issues</h2><div class="small muted">${D.errors.map(esc).join('<br>')}</div></div>` : ''}`;
};
const kindColor = (k) => ({ homework: '#ffb547', grade: '#8b7cff', moodle: '#3fd8ff', mail: '#ff7aa8' }[k] || '#9aa1b5');
const kindLetter = (k) => ({ homework: 'H', grade: 'G', moodle: 'M', mail: '@' }[k] || '•');
function ideaCard(x) {
  const saved = S.saved.some(s => s.title === x.title);
  return `<div class="card idea"><div class="row between"><span class="pill ${x.type === 'business' ? 'acc' : 'ok'}">${esc(x.type || 'idea')}</span><button class="small muted" data-act="save" data-title="${esc(x.title)}">${saved ? '★ saved' : '☆ save'}</button></div><h3>${esc(x.title)}</h3><p>${esc(x.pitch)}</p>${x.firstStep ? `<div class="fs"><b>First step:</b> ${esc(x.firstStep)}</div>` : ''}</div>`;
}

V.homework = () => {
  const now = Date.now();
  const groups = [['Overdue', h => h.due && h.due < now], ['Next 48 hours', h => h.due && h.due >= now && h.due - now < 2 * DAY], ['This week', h => h.due && h.due - now >= 2 * DAY && h.due - now < 7 * DAY], ['Later', h => h.due && h.due - now >= 7 * DAY], ['No due date', h => !h.due]];
  const card = (h) => `<div class="item"><span class="cdot" style="background:${esc(h.color)}"></span><div class="main"><div class="row between"><div class="t">${esc(h.title)}</div>${dueBadge(h)}</div>
    <div class="m">${esc(h.course)} · ${esc(h.source)}${h.due ? ' · ' + dayName(h.due) + ' ' + hm(h.due) : ''}</div>
    ${h.note ? `<div class="d" style="color:#c9cde0">${esc(h.note)}</div>` : ''}
    ${h.url ? `<div style="margin-top:8px"><a class="btn" href="${esc(h.url)}" target="_blank" rel="noopener">${esc(h.action || 'Open')} ↗</a></div>` : ''}</div></div>`;
  let html = '';
  for (const [name, fn] of groups) { const xs = D.homework.filter(fn); if (xs.length) html += `<div class="card"><h2>${name} <span class="pill">${xs.length}</span></h2><div class="list">${xs.map(card).join('')}</div></div>`; }
  if (!D.homework.length) html += `<div class="card"><div class="empty">Nothing due on Moodle. Nice.</div></div>`;
  if (D.quizzesOpening?.length) html += `<div class="card"><h2>Quizzes opening</h2><div class="list">${D.quizzesOpening.map(q => `<div class="item"><div class="main"><div class="t"><a href="${esc(q.url)}" target="_blank" rel="noopener">${esc(q.subject)}</a></div><div class="d">notified ${rel(q.time)} · times in Paris time</div></div></div>`).join('')}</div></div>`;
  html += `<div class="sec">Course progress (Moodle completion)</div>`;
  html += D.courses.map(c => `<div class="card"><div class="row between"><div class="row"><span class="cdot" style="background:${esc(c.color)};margin:0"></span><b>${esc(c.name)}</b></div><span class="muted small">${c.done}/${c.tracked} done</span></div>
    <div class="bar" style="margin-top:10px"><i style="width:${c.pct || 0}%"></i></div>
    ${c.todo.length ? `<details><summary>${c.todo.length}${c.todo.length >= 25 ? '+' : ''} not completed ▾</summary><div class="list" style="margin-top:8px">${c.todo.map(t => `<div class="item"><div class="main"><a class="t" href="${esc(t.url || c.url)}" target="_blank" rel="noopener" style="font-weight:500">${esc(t.name)}</a><div class="d">${esc(t.module)}</div></div></div>`).join('')}</div></details>` : ''}
    <div style="margin-top:10px"><a class="small muted" href="${esc(c.url)}" target="_blank" rel="noopener">Open course ↗</a></div></div>`).join('');
  return html;
};

V.grades = () => {
  const g = D.grades;
  const color = (x) => x == null ? 'var(--dim)' : x >= 16 ? 'var(--ok)' : x >= 12 ? 'var(--warn)' : 'var(--bad)';
  let html = `<div class="card hero"><div class="row between"><div><div class="eyebrow">Current average</div><div class="gradebig">${g.average != null ? g.average.toFixed(2) : '–'}</div><div class="small muted" style="margin-top:6px">${esc(g.note)}</div></div></div></div>`;
  const cs = [...g.courses].sort((a, b) => (b.gradedShare - a.gradedShare));
  html += `<div class="grid2">` + cs.map(c => `<div class="card"><div class="row between"><div class="row"><span class="cdot" style="background:${esc(c.color)};margin:0"></span><b>${esc(c.name)}</b></div><b style="font-size:22px;color:${color(c.current)}">${c.current != null ? c.current.toFixed(2) : '–'}</b></div>
    <div class="row between small muted" style="margin-top:8px"><span>${c.gradedShare}% of the course graded</span>${c.moodleTotal && c.moodleTotal !== '-' ? `<span>Moodle total ${esc(c.moodleTotal)}</span>` : ''}</div>
    <div class="bar" style="margin-top:6px"><i style="width:${c.gradedShare}%"></i></div>
    ${c.components.length ? `<table class="comp">${c.components.map(x => `<tr><td>${esc(x.name)}${x.detail ? `<div class="dim small">${esc(x.detail)}</div>` : ''}</td><td class="muted">${x.weight}%</td><td><b style="color:${color(x.grade)}">${x.grade != null ? x.grade : '–'}</b></td></tr>`).join('')}</table>` : '<div class="small dim" style="margin-top:8px">Weighting not found yet.</div>'}
    ${c.items.length ? `<details><summary>${c.items.length} Moodle items ▾</summary><table class="comp">${c.items.map(i => `<tr><td>${esc(i.name)}</td><td></td><td>${esc(i.grade)}</td></tr>`).join('')}</table></details>` : ''}
  </div>`).join('') + `</div>`;
  if (g.gradeMail?.length) html += `<div class="card"><h2>Grade emails</h2><div class="list">${g.gradeMail.map(m => `<div class="item"><div class="main"><a class="t" href="${esc(m.url)}" target="_blank" rel="noopener">${esc(m.subject)}</a><div class="m">${esc(m.from)} · ${rel(m.time)}</div><div class="d">${esc(m.snippet)}</div></div></div>`).join('')}</div></div>`;
  return html;
};

let calDay = null, calSeg = 'agenda';
V.calendar = () => {
  const start = sgMidnight();
  if (calDay == null || calDay < start) calDay = start;
  const days = [...Array(7)].map((_, i) => start + i * DAY);
  const has = (d) => D.calendar.events.some(e => e.start < d + DAY && e.end > d) || D.homework.some(h => h.due && h.due >= d && h.due < d + DAY);
  const evs = D.calendar.events.filter(e => e.start < calDay + DAY && e.end > calDay);
  const dues = D.homework.filter(h => h.due && h.due >= calDay && h.due < calDay + DAY);
  const items = todoItems();
  const open = items.filter(t => !isDone(t.id)), done = items.filter(t => isDone(t.id));
  return `<div class="seg"><button class="${calSeg === 'agenda' ? 'on' : ''}" data-act="seg" data-v="agenda">Calendar</button><button class="${calSeg === 'todo' ? 'on' : ''}" data-act="seg" data-v="todo">To-do (${open.length})</button></div>
  ${calSeg === 'agenda' ? `
  <div class="week">${days.map(d => `<button class="${d === calDay ? 'on' : ''} ${has(d) ? 'has' : ''}" data-act="day" data-d="${d}">${fmt(d + 3600000, { weekday: 'short' })}<b>${fmt(d + 3600000, { day: 'numeric' })}</b></button>`).join('')}</div>
  <div class="card"><h2>${dayName(calDay + 3600000)}</h2><div class="tl">
    ${dues.map(h => `<div class="item"><div class="time" style="color:var(--warn)">${hm(h.due)}</div><div class="main"><div class="t">Due: ${esc(h.title)}</div><div class="m">${esc(h.course)}</div></div></div>`).join('')}
    ${evs.map(e => `<div class="item"><div class="time ${e.start <= Date.now() && e.end > Date.now() ? 'now' : ''}">${e.allDay ? 'all day' : hm(e.start)}</div><div class="main"><div class="t">${esc(e.title)}</div><div class="m">${e.allDay ? '' : hm(e.start) + '–' + hm(e.end)}${e.location ? ' · ' + esc(e.location) : ''} · ${e.cal === 'essec' ? 'ESSEC' : 'Personal'}</div></div></div>`).join('')}
    ${!evs.length && !dues.length ? '<div class="empty">Free day</div>' : ''}
  </div></div>
  <div class="sec">Coming up</div>
  <div class="card"><div class="list">${D.calendar.events.filter(e => e.start >= start + 7 * DAY).slice(0, 12).map(e => `<div class="item"><div class="main"><div class="t">${esc(e.title)}</div><div class="m">${dayName(e.start)} · ${e.allDay ? 'all day' : hm(e.start)}</div></div></div>`).join('') || '<div class="empty">Nothing further out yet</div>'}</div></div>
  <div class="small dim" style="text-align:center">Synced from your Google Calendars (personal + ESSEC). <a href="https://calendar.google.com/calendar/u/0/r" target="_blank" rel="noopener">Open Google Calendar ↗</a></div>` : `
  <div class="card"><form class="addrow" id="addTodo"><input id="todoText" placeholder="Add a to-do…" autocomplete="off"><button class="btn pri">Add</button></form>
  <div class="list">${open.map(todoRow).join('') || '<div class="empty">All clear</div>'}</div></div>
  ${done.length ? `<div class="card"><h2>Done</h2><div class="list">${done.map(todoRow).join('')}</div></div>` : ''}`}`;
};

function sportsToday() { const wd = sgParts(Date.now()).wd; return (D.sports.plan || []).find(p => p.day === wd); }
function weekStart(t = Date.now()) { const wd = sgParts(t).wd; return sgMidnight(t) - ((wd + 6) % 7) * DAY; }
function sportsWeek(t = Date.now()) { const ws = weekStart(t); let done = 0; for (let i = 0; i < 7; i++) if (S.sports[dayKey(ws + i * DAY + 3600000)]) done++; return { ws, done }; }
function streakWeeks() { let n = 0, ws = weekStart() - 7 * DAY; while (n < 52) { if (sportsWeek(ws + 3600000).done >= D.sports.weeklyTarget) { n++; ws -= 7 * DAY; } else break; } if (sportsWeek().done >= D.sports.weeklyTarget) n++; return n; }
function goalProgress(g) {
  if (g.auto === 'sportsConsistency') { let tot = 0; for (let w = 0; w < 4; w++) tot += Math.min(D.sports.weeklyTarget, sportsWeek(Date.now() - w * 7 * DAY).done); return tot / (4 * D.sports.weeklyTarget); }
  const ms = g.milestones?.length ? (Object.values(S.ms[g.id] || {}).filter(Boolean).length / g.milestones.length) : null;
  return g.progress != null ? (ms != null && g.auto !== 'gradeAverage' ? Math.max(g.progress, ms) : g.progress) : ms;
}
V.sports = () => {
  const t = sportsToday(), dk = dayKey(), done = !!S.sports[dk];
  const wk = sportsWeek();
  const pct = Math.min(100, Math.round(100 * wk.done / D.sports.weeklyTarget));
  const days = [...Array(7)].map((_, i) => { const d = wk.ws + i * DAY + 3600000; const p = D.sports.plan.find(x => x.day === sgParts(d).wd); return { d, k: dayKey(d), p }; });
  let month = 0; for (let i = 0; i < 30; i++) if (S.sports[dayKey(Date.now() - i * DAY)]) month++;
  return `<div class="card hero"><div class="row between"><div><div class="eyebrow">Today · ${fmt(Date.now(), { weekday: 'long' })}</div><div class="hl" style="margin:4px 0">${t ? esc(t.name) : 'Free'}</div><p>${t ? esc(t.detail) : ''}</p>${t && t.minutes ? `<div class="small muted" style="margin-top:6px">${t.minutes} min</div>` : ''}</div>
    <div class="ring big" style="--p:${pct};--c:var(--ok)"><span>${wk.done}/${D.sports.weeklyTarget}</span></div></div>
    <div style="margin-top:14px"><button class="btn ${done ? '' : 'pri'}" data-act="sport">${done ? '✓ Done today (tap to undo)' : (t && t.rest ? 'Log active recovery' : 'Mark session done')}</button></div></div>
  <div class="card"><h2>This week</h2><div class="days">${days.map(x => `<div>${fmt(x.d, { weekday: 'narrow' })}<div class="sq ${S.sports[x.k] ? 'done' : ''} ${x.p?.rest ? 'rest' : ''} ${x.k === dk ? 'today' : ''}" data-act="sportday" data-k="${x.k}">${S.sports[x.k] ? '✓' : esc((x.p?.name || '').slice(0, 2))}</div></div>`).join('')}</div></div>
  <div class="tiles"><div class="tile" style="--glow:#46e39b"><span class="k">Week streak</span><span class="v">${streakWeeks()}</span><span class="s">weeks at ${D.sports.weeklyTarget}+ sessions</span></div><div class="tile" style="--glow:#3fd8ff"><span class="k">Last 30 days</span><span class="v">${month}</span><span class="s">sessions logged</span></div></div>
  <div class="card"><h2>Long-term goal</h2><div class="t" style="font-weight:600">${esc(D.sports.goal)}</div><div class="bar" style="margin-top:10px"><i style="width:${Math.round(100 * (goalProgress({ auto: 'sportsConsistency' }) || 0))}%"></i></div><div class="small muted" style="margin-top:6px">${Math.round(100 * (goalProgress({ auto: 'sportsConsistency' }) || 0))}% consistency over the last 4 weeks</div></div>
  ${D.sports.tips?.length ? `<div class="card"><h2>Tips</h2><div class="list">${D.sports.tips.map(x => `<div class="item"><div class="main"><div class="t" style="font-weight:500">${esc(x)}</div></div></div>`).join('')}</div></div>` : ''}
  <div class="card"><h2>Weekly plan</h2><div class="list">${[1, 2, 3, 4, 5, 6, 0].map(d => D.sports.plan.find(p => p.day === d)).filter(Boolean).map(p => `<div class="item"><div class="time" style="width:44px;color:var(--mut);font-weight:650;font-size:12.5px">${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][p.day]}</div><div class="main"><div class="t">${esc(p.name)}</div><div class="m">${esc(p.detail)}</div></div></div>`).join('')}</div></div>
  <div class="small dim" style="text-align:center">Session check-ins are saved on this device.</div>`;
};

V.goals = () => D.goals.map(g => {
  const p = goalProgress(g); const pc = p == null ? 0 : Math.round(p * 100);
  const ms = S.ms[g.id] || {};
  return `<div class="card"><div class="row"><div class="ring" style="--p:${pc}"><span>${pc}%</span></div><div class="main" style="flex:1;min-width:0"><div class="tag">${esc(g.area)}</div><div style="font-weight:700;font-size:17px;letter-spacing:-.01em;line-height:1.25">${esc(g.title)}</div><div class="small muted" style="margin-top:3px">${esc(g.display)} · ${g.daysLeft >= 0 ? g.daysLeft + ' days left' : 'deadline passed'}</div></div></div>
  ${g.why ? `<div class="small muted" style="margin-top:12px">${esc(g.why)}</div>` : ''}
  ${g.note ? `<div class="small" style="margin-top:8px;color:#c9cde0">${esc(g.note)}</div>` : ''}
  ${g.nextStep ? `<div style="margin-top:10px"><span class="pill acc">next step</span> <span class="small">${esc(g.nextStep)}</span></div>` : ''}
  ${g.milestones?.length ? `<div class="list" style="margin-top:12px">${g.milestones.map((m, i) => `<div class="item ${ms[i] ? 'done' : ''}"><button class="check ${ms[i] ? 'on' : ''}" data-act="ms" data-g="${esc(g.id)}" data-i="${i}"></button><div class="main"><div class="t" style="font-weight:500">${esc(m)}</div></div></div>`).join('')}</div>` : ''}</div>`;
}).join('') + `<div class="small dim" style="text-align:center">Tell Aside to change a goal and the app updates within the hour.</div>`;

V.ideas = () => `<div class="sec">Today</div>${(D.ideas || []).map(ideaCard).join('')}
  ${D.studyTips?.length ? `<div class="card"><h2>Study tips</h2><div class="list">${D.studyTips.map(x => `<div class="item"><div class="main"><div class="t" style="font-weight:500">${esc(x)}</div></div></div>`).join('')}</div></div>` : ''}
  <div class="sec">Saved ideas</div>${S.saved.length ? S.saved.map(ideaCard).join('') : '<div class="card"><div class="empty">Tap ☆ on an idea to keep it here.</div></div>'}`;

let mailBox = 'essec';
V.inbox = () => {
  const box = D.mail?.[mailBox] || { items: [], unread: 0 };
  return `<div class="seg"><button class="${mailBox === 'essec' ? 'on' : ''}" data-act="box" data-v="essec">ESSEC (${D.mail?.essec?.unread ?? 0})</button><button class="${mailBox === 'personal' ? 'on' : ''}" data-act="box" data-v="personal">Personal (${D.mail?.personal?.unread ?? 0})</button></div>
  ${D.actionMail?.filter(a => a.box === mailBox).length ? `<div class="card"><h2>Needs action</h2><div class="list">${D.actionMail.filter(a => a.box === mailBox).map(mailRow).join('')}</div></div>` : ''}
  <div class="card"><h2>Last 4 days</h2><div class="list">${box.items.map(mailRow).join('') || '<div class="empty">Quiet inbox</div>'}</div></div>
  ${D.notifications?.length ? `<div class="card"><h2>Moodle notifications</h2><div class="list">${D.notifications.slice(0, 10).map(n => `<div class="item"><div class="main"><a class="t" href="${esc(n.url)}" target="_blank" rel="noopener" style="font-weight:${n.read ? 500 : 650}">${esc(n.subject.replace(/&amp;/g, '&'))}</a><div class="d">${rel(n.time)}</div></div></div>`).join('')}</div></div>` : ''}`;
};
const mailRow = (m) => `<div class="item"><span class="cdot" style="background:${m.unread ? 'var(--acc2)' : 'transparent'}"></span><div class="main"><a class="t" href="${esc(m.url)}" target="_blank" rel="noopener" style="font-weight:${m.unread ? 700 : 550}">${esc(m.subject || '(no subject)')}</a><div class="m">${esc(m.from)} · ${rel(m.time)}</div><div class="d">${esc(m.snippet)}</div></div></div>`;

// ---------- render + actions ----------
function render() {
  if (!D) return;
  const r = route();
  header(ROUTES.find(x => x[0] === r)[1]);
  renderNav();
  $('#view').innerHTML = V[r]();
  const f = $('#addTodo');
  if (f) f.addEventListener('submit', (e) => { e.preventDefault(); const v = $('#todoText').value.trim(); if (!v) return; S.custom.unshift({ id: 'u' + Date.now(), text: v }); save(); render(); });
}
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const a = el.dataset.act, dk = dayKey();
  if (a !== 'none') e.preventDefault();
  if (a === 'todo') { S.todosDone[el.dataset.id] = !S.todosDone[el.dataset.id]; }
  else if (a === 'deltodo') { S.custom = S.custom.filter(t => t.id !== el.dataset.id); }
  else if (a === 'focus') { (S.focus[dk] ||= {})[el.dataset.i] = !S.focus[dk]?.[el.dataset.i]; }
  else if (a === 'reset') { (S.reset[dk] ||= {})[el.dataset.i] = !S.reset[dk]?.[el.dataset.i]; }
  else if (a === 'sport') { S.sports[dk] = !S.sports[dk]; if (S.sports[dk]) toast('Session logged. Keep the streak.'); }
  else if (a === 'sportday') { const k = el.dataset.k; if (k <= dk) S.sports[k] = !S.sports[k]; }
  else if (a === 'ms') { (S.ms[el.dataset.g] ||= {})[el.dataset.i] = !S.ms[el.dataset.g]?.[el.dataset.i]; }
  else if (a === 'save') { const t = el.dataset.title; const i = S.saved.findIndex(s => s.title === t); if (i >= 0) S.saved.splice(i, 1); else { const x = (D.ideas || []).find(s => s.title === t); if (x) S.saved.unshift({ ...x, savedAt: Date.now() }); } }
  else if (a === 'seen') { S.seenChanges = Date.now(); }
  else if (a === 'seg') { calSeg = el.dataset.v; }
  else if (a === 'day') { calDay = +el.dataset.d; }
  else if (a === 'box') { mailBox = el.dataset.v; }
  save(); render();
});
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('on'), 2200); }

document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && D && Date.now() - (load._last || 0) > 5 * 60000) { load._last = Date.now(); load().catch(() => {}); } });
setInterval(() => { if (D && document.visibilityState === 'visible') load().catch(() => {}); }, 15 * 60000);
setInterval(() => { if (D) header(ROUTES.find(x => x[0] === route())[1]); }, 60000);
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
boot();
