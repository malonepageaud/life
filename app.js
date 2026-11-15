'use strict';
const TZ = 'Asia/Singapore';
const DAY = 86400000;
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let D = null; // decrypted data

// ---------- local state ----------
const LS = 'life:v1';
const S = Object.assign({ todosDone: {}, custom: [], focus: {}, sports: {}, ms: {}, reset: {}, saved: [], seenChanges: 0, biz: {}, ex: {} }, JSON.parse(localStorage.getItem(LS) || '{}'));
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
  business: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/></svg>',
};
const ROUTES = [
  ['today', 'Today'], ['homework', 'Homework'], ['grades', 'Grades'], ['calendar', 'Calendar'], ['sports', 'Gym'], ['business', 'Business'], ['goals', 'Goals'], ['ideas', 'Ideas'], ['inbox', 'Inbox'],
];
const TAB_ROUTES = ['today', 'homework', 'grades', 'calendar', 'sports', 'business', 'goals'];

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
function showShell() { $('#lock').classList.add('hidden'); $('#shell').classList.remove('hidden'); $('#fab').classList.remove('hidden'); setTimeout(() => flushPending && flushPending(), 500); }
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
const isDone = (id) => !!S.todosDone[id] || !!D?.doneServer?.[id];
function todoRow(t) {
  const done = isDone(t.id);
  return `<div class="item ${done ? 'done' : ''}" data-todo="${esc(t.id)}"><button class="check ${done ? 'on' : ''}" data-act="todo" data-id="${esc(t.id)}" aria-label="done"></button>
    <div class="main"><div class="t">${esc(t.text)}</div><div class="m">${t.due ? dueBadge(t) + ' ' : ''}<span class="tag">${esc(t.tag || '')}</span>${t.url ? ` · <a href="${esc(t.url)}" target="_blank" rel="noopener">open ↗</a>` : ''}${t.tag === 'mine' ? ` · <a href="#" data-act="deltodo" data-id="${esc(t.id)}">delete</a>` : ''}</div></div></div>`;
}

V.today = () => {
  const now = Date.now(), dk = dayKey(), end = sgMidnight() + DAY;
  const h = sgParts(now).h;
  const greet = h < 5 ? 'Up late' : h < 12 ? 'Morning' : h < 18 ? 'Afternoon' : 'Evening';
  const fd = S.focus[dk] || {};
  const focus = D.briefing.focus || [];
  const t = sportsToday(), gDone = gymDone(dk);
  const parts = focus.length + (t && !t.rest ? 1 : 0);
  const got = focus.filter((_, i) => fd[i]).length + (t && !t.rest && gDone ? 1 : 0);
  const score = parts ? Math.round(100 * got / parts) : 0;
  const sched = [];
  for (const e of D.calendar.events) if (!e.allDay && e.start < end && e.end > now - 1800000) sched.push({ t: e.start, end: e.end, text: e.title, kind: 'ev', loc: e.location });
  for (const x of D.homework) if (x.due && x.due >= now - 1800000 && x.due < end) sched.push({ t: x.due, text: 'Due: ' + x.title, kind: 'due' });
  for (const p of D.plan || []) { const [hh, mm] = (p.time || '').split(':').map(Number); if (isNaN(hh)) continue; const tt = sgMidnight() + (hh * 60 + (mm || 0)) * 60000; if (tt > now - 1800000 && !sched.some(s => Math.abs(s.t - tt) < 15 * 60000 && s.kind === 'ev')) sched.push({ t: tt, text: p.text, kind: 'plan' }); }
  sched.sort((a, b) => a.t - b.t);
  const soon = D.homework.filter(x => x.due && x.due > now && x.due - now < 7 * DAY);
  const nextExam = (D.exams || [])[0];
  const newCh = D.changes.filter(c => c.time > (S.seenChanges || 0)).slice(0, 4);
  const biz = D.business?.today || [];
  const bd = S.biz?.[dk] || {};
  return `
  <div class="card hero today-hero"><div class="row between" style="align-items:flex-start">
    <div style="flex:1;min-width:0"><div class="eyebrow">${greet}, ${esc(D.owner || 'Malone')}</div><div class="hl">${esc(D.briefing.headline)}</div></div>
    <div class="ring" style="--p:${score};--c:var(--ok)" title="Day score"><span>${score}%</span></div></div>
    <div class="small muted" style="margin-top:8px">Day score: must-dos + gym</div></div>
  <div class="chips">${(D.countdowns || []).map(c => { const d = Math.ceil((new Date(c.date).getTime() - now) / DAY); return d >= 0 ? `<span class="chip">${esc(c.label)} <b>${d === 0 ? 'today' : d + 'd'}</b></span>` : ''; }).join('')}</div>
  <div class="card"><h2>Must do <span class="pill ${got === parts && parts ? 'ok' : ''}">${focus.filter((_, i) => fd[i]).length}/${focus.length}</span></h2><div class="list">${focus.map((f, i) => `<div class="item ${fd[i] ? 'done' : ''}"><button class="check ${fd[i] ? 'on' : ''}" data-act="focus" data-i="${i}"></button><div class="main"><div class="t">${esc(f)}</div></div></div>`).join('') || '<div class="empty">Nothing set</div>'}</div></div>
  <div class="card"><h2>Today</h2><div class="tl">${sched.map(s => `<div class="item"><div class="time ${s.t <= now && (s.end || s.t + 3600000) > now ? 'now' : ''}" style="${s.kind === 'due' ? 'color:var(--warn)' : ''}">${hm(s.t)}</div><div class="main"><div class="t" style="${s.kind === 'plan' ? 'font-weight:500;color:#c9cde0' : ''}">${esc(s.text)}</div>${s.loc ? `<div class="m">${esc(s.loc)}</div>` : ''}</div></div>`).join('') || '<div class="empty">Nothing left today</div>'}</div></div>
  <div class="tiles">
    <a class="tile" href="#homework" style="--glow:#ffb547"><span class="k">${I.homework.replace('<svg', '<svg width="15"')} Due this week</span><span class="v">${soon.length}</span><span class="s">${soon[0] ? esc(soon[0].title.slice(0, 28)) : 'clear'}</span></a>
    <a class="tile" href="#homework" style="--glow:#ff5d7a"><span class="k">${I.calendar.replace('<svg', '<svg width="15"')} Next exam</span><span class="v">${nextExam ? Math.max(0, Math.ceil((nextExam.t - now) / DAY)) + 'd' : '–'}</span><span class="s">${nextExam ? esc(nextExam.course.split(' (')[0].split(':')[0]) : ''}</span></a>
    <a class="tile" href="#sports" style="--glow:#46e39b"><span class="k">${I.sports.replace('<svg', '<svg width="15"')} Gym</span><span class="v">${gDone ? '✓' : t?.rest ? 'Rest' : esc((t?.name || '').split(' ')[0])}</span><span class="s">${sportsWeek().done}/${D.sports.weeklyTarget} this week</span></a>
    <a class="tile" href="#grades" style="--glow:#8b7cff"><span class="k">${I.grades.replace('<svg', '<svg width="15"')} Average</span><span class="v">${D.grades.average != null ? D.grades.average.toFixed(2) : '–'}</span><span class="s">/20 so far</span></a>
  </div>
  ${biz.length ? `<div class="card biz"><h2>Money moves <a class="small muted" href="#business">${esc(D.business.name || 'Business')} →</a></h2><div class="list">${biz.map((b, i) => `<div class="item ${bd[i] ? 'done' : ''}"><button class="check ${bd[i] ? 'on' : ''}" data-act="biz" data-i="${i}"></button><div class="main"><div class="t">${esc(b)}</div></div></div>`).join('')}</div></div>` : ''}
  ${newCh.length ? `<div class="card feed"><h2>New <button class="btn" data-act="seen">Seen</button></h2><div class="list">${newCh.map(c => `<div class="item"><span class="k-ico" style="background:${kindColor(c.kind)}22;color:${kindColor(c.kind)}">${kindLetter(c.kind)}</span><div class="main"><div class="t">${c.url ? `<a href="${esc(c.url)}" target="_blank" rel="noopener">${esc(c.text)}</a>` : esc(c.text)}</div><div class="d">${rel(c.time)}</div></div></div>`).join('')}</div></div>` : ''}
  <div class="sec">Ideas today</div>
  <div class="ideas">${(D.ideas || []).map(ideaCard).join('')}</div>
  ${D.errors?.length ? `<div class="small dim" style="text-align:center">Sync issue: ${D.errors.map(esc).join(' · ')}</div>` : ''}`;
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
  if (D.exams?.length) html += `<div class="card"><h2>Finals & exams <span class="pill">${D.exams.length}</span></h2><div class="list">${D.exams.map(e => { const d = Math.ceil((e.t - now) / DAY); return `<div class="item"><div class="main"><div class="row between"><div class="t">${esc(e.course)}</div><span class="pill ${d <= 7 ? 'bad' : d <= 14 ? 'warn' : 'acc'}">${d <= 0 ? 'today' : d + 'd'}</span></div><div class="m">${fmt(e.t, { weekday: 'short', day: 'numeric', month: 'short' })} · ${hm(e.t)}</div>${e.detail ? `<div class="d">${esc(e.detail)}</div>` : ''}</div></div>`; }).join('')}</div></div>`;
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
  if (g.gradeMail?.length) html += `<div class="card"><h2>Grade emails</h2><div class="list">${g.gradeMail.map(m => `<div class="item"><div class="main"><a class="t" href="${esc(m.url)}" target="_blank" rel="noopener">${esc(m.subject)}</a><div class="m">${esc(m.from)} · ${m.time ? rel(m.time) : esc((m.timeText || '').toLowerCase())}</div>${m.snippet ? `<div class="d">${esc(m.snippet)}</div>` : ''}</div></div>`).join('')}</div></div>`;
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
const gymDone = (k) => !!S.sports[k] || !!D?.gymServer?.[k];
function sportsWeek(t = Date.now()) { const ws = weekStart(t); let done = 0; for (let i = 0; i < 7; i++) if (gymDone(dayKey(ws + i * DAY + 3600000))) done++; return { ws, done }; }
function streakWeeks() { let n = 0, ws = weekStart() - 7 * DAY; while (n < 52) { if (sportsWeek(ws + 3600000).done >= D.sports.weeklyTarget) { n++; ws -= 7 * DAY; } else break; } if (sportsWeek().done >= D.sports.weeklyTarget) n++; return n; }
function goalProgress(g) {
  if (g.auto === 'sportsConsistency') { let tot = 0; for (let w = 0; w < 4; w++) tot += Math.min(D.sports.weeklyTarget, sportsWeek(Date.now() - w * 7 * DAY).done); return tot / (4 * D.sports.weeklyTarget); }
  const ms = g.milestones?.length ? (Object.values(S.ms[g.id] || {}).filter(Boolean).length / g.milestones.length) : null;
  return g.progress != null ? (ms != null && g.auto !== 'gradeAverage' ? Math.max(g.progress, ms) : g.progress) : ms;
}
V.sports = () => {
  const t = sportsToday(), dk = dayKey(), done = gymDone(dk);
  const wk = sportsWeek();
  const pct = Math.min(100, Math.round(100 * wk.done / D.sports.weeklyTarget));
  const days = [...Array(7)].map((_, i) => { const d = wk.ws + i * DAY + 3600000; const p = D.sports.plan.find(x => x.day === sgParts(d).wd); return { d, k: dayKey(d), p }; });
  let month = 0; for (let i = 0; i < 30; i++) if (gymDone(dayKey(Date.now() - i * DAY))) month++;
  const ex = (S.ex ||= {})[dk] || {};
  let n = 0;
  const blocks = (t?.blocks || []).map(([g, items]) => `<div class="blk"><div class="tag" style="margin:10px 0 2px">${esc(g)}</div>${items.map(it => { const i = n++; return `<div class="item ${ex[i] ? 'done' : ''}" style="padding:7px 0"><button class="check ${ex[i] ? 'on' : ''}" data-act="ex" data-i="${i}"></button><div class="main"><div class="t" style="font-weight:550">${esc(it)}</div></div></div>`; }).join('')}</div>`).join('');
  const walkI = n++;
  const total = n - (t?.walk ? 0 : 1), checked = Object.values(ex).filter(Boolean).length;
  return `<div class="card hero"><div class="row between"><div style="flex:1;min-width:0"><div class="eyebrow">${fmt(Date.now(), { weekday: 'long' })} · ${esc(t?.tag || '')}</div><div class="hl" style="margin:4px 0 0">${t ? esc(t.name) : 'Free'}</div></div>
    <div class="ring big" style="--p:${pct};--c:var(--ok)"><span>${wk.done}/${D.sports.weeklyTarget}</span></div></div></div>
  <div class="card"><h2>Today's workout <span class="pill ${checked >= total && total ? 'ok' : ''}">${checked}/${total}</span></h2>${blocks}
    ${t?.walk ? `<div class="tag" style="margin:10px 0 2px">Cardio</div><div class="item ${ex[walkI] ? 'done' : ''}" style="padding:7px 0"><button class="check ${ex[walkI] ? 'on' : ''}" data-act="ex" data-i="${walkI}"></button><div class="main"><div class="t" style="font-weight:550">${esc(D.sports.walk || 'Incline walk 1h')}</div></div></div>` : ''}
    <div style="margin-top:12px"><button class="btn ${done ? '' : 'pri'}" data-act="sport">${done ? '✓ Session logged (tap to undo)' : t?.rest ? 'Log recovery day' : 'Finish session'}</button></div></div>
  ${foodCard()}
  <div class="card"><h2>This week</h2><div class="days">${days.map(x => `<div>${fmt(x.d, { weekday: 'narrow' })}<div class="sq ${gymDone(x.k) ? 'done' : ''} ${x.p?.rest ? 'rest' : ''} ${x.k === dk ? 'today' : ''}" data-act="sportday" data-k="${x.k}">${gymDone(x.k) ? '✓' : esc((x.p?.name || '').slice(0, 2))}</div></div>`).join('')}</div></div>
  <div class="tiles"><div class="tile" style="--glow:#46e39b"><span class="k">Streak</span><span class="v">${streakWeeks()}</span><span class="s">weeks at ${D.sports.weeklyTarget}/${D.sports.weeklyTarget}</span></div><div class="tile" style="--glow:#3fd8ff"><span class="k">Last 30 days</span><span class="v">${month}</span><span class="s">sessions</span></div></div>
  ${D.sports.tips?.length ? `<div class="card"><h2>Tips</h2><ul class="bul">${D.sports.tips.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
  <div class="card"><h2>The split</h2>${[0, 1, 2, 3, 4, 5, 6].map(d => D.sports.plan.find(p => p.day === d)).filter(Boolean).map(p => `<details class="split"><summary><span class="dname">${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][p.day]}</span> <b>${esc(p.name)}</b> <span class="dim small">${esc(p.tag || '')}</span></summary><ul class="bul">${(p.blocks || []).flatMap(([g, its]) => its.map(i => `<li><span class="dim">${esc(g)}:</span> ${esc(i)}</li>`)).join('')}${p.walk ? `<li>${esc(D.sports.walk)}</li>` : ''}</ul></details>`).join('')}</div>
  <div class="small dim" style="text-align:center">Goal: ${esc(D.sports.goal)}</div>`;
};
function foodCard() {
  const today = (D.food || []).filter(f => dayKey(new Date(f.time).getTime()) === dayKey());
  const kcal = today.reduce((s, f) => s + (+f.kcal || 0), 0), prot = today.reduce((s, f) => s + (+f.protein || 0), 0);
  return `<div class="card"><h2>Food today <span class="small muted">${kcal ? '~' + kcal + ' kcal' : ''}${prot ? ' · ~' + prot + 'g protein' : ''}</span></h2>${today.length ? `<ul class="bul">${today.map(f => `<li>${esc(f.item)}${f.kcal ? ` <span class="dim">~${f.kcal} kcal</span>` : ''}</li>`).join('')}</ul>` : '<div class="empty">Tap the mic and say what you ate</div>'}<div class="small dim" style="margin-top:6px">Rough estimates from your updates.</div></div>`;
}
V.business = () => {
  const B = D.business || {}, now = Date.now(), dk = dayKey();
  const g = D.goals.find(x => x.id === 'money'); const gp = g ? Math.round(100 * (goalProgress(g) || 0)) : 0;
  const bd = S.biz?.[dk] || {};
  const tasks = (D.todos || []).filter(t => t.tag === 'business');
  const ideas = (D.ideas || []).filter(i => i.type === 'business');
  return `<div class="card hero"><div class="row between"><div style="flex:1;min-width:0"><div class="eyebrow">${esc(B.role || '')} · ${esc(B.full || '')}</div><div class="hl" style="margin:4px 0 6px">${esc(B.name || 'Business')}</div><p class="small">${esc(B.pitch || '')}</p></div>
    <div class="ring" style="--p:${gp}"><span>${gp}%</span></div></div></div>
  ${(B.today || []).length ? `<div class="card"><h2>Today's money moves</h2><div class="list">${B.today.map((b, i) => `<div class="item ${bd[i] ? 'done' : ''}"><button class="check ${bd[i] ? 'on' : ''}" data-act="biz" data-i="${i}"></button><div class="main"><div class="t">${esc(b)}</div></div></div>`).join('')}</div></div>` : ''}
  <div class="card"><h2>Key dates</h2><div class="list">${(B.keyDates || []).map(k => { const t = new Date(k.date + 'T09:00:00+08:00').getTime(); const d = Math.ceil((t - now) / DAY); return `<div class="item"><div class="main"><div class="row between"><div class="t">${esc(k.label)}</div><span class="pill ${d <= 3 ? 'warn' : 'acc'}">${d < 0 ? 'done' : d === 0 ? 'today' : d + 'd'}</span></div><div class="m">${dayName(t)}${k.end ? ' to ' + fmt(new Date(k.end + 'T09:00:00+08:00').getTime(), { day: 'numeric', month: 'short' }) : ''}</div></div></div>`; }).join('')}</div></div>
  <div class="card"><h2>Tasks</h2><div class="list">${tasks.map(todoRow).join('') || '<div class="empty">No open tasks</div>'}</div></div>
  <div class="card"><h2>Where it stands</h2><ul class="bul">${(B.status || []).map(s => `<li>${esc(s)}</li>`).join('')}${B.note ? `<li>${esc(B.note)}</li>` : ''}</ul>${B.team ? `<div class="small dim" style="margin-top:8px">Team: ${esc(B.team)}</div>` : ''}</div>
  ${D.shopify ? `<div class="card"><h2>Fennly (Shopify) <a class="small muted" href="${esc(D.shopify.admin || '#')}" target="_blank" rel="noopener">admin ↗</a></h2><div class="row" style="gap:22px"><div><div class="tag">Orders 7d</div><div style="font-size:22px;font-weight:750">${D.shopify.orders7 ?? '–'}</div></div><div><div class="tag">Sales 7d</div><div style="font-size:22px;font-weight:750">${D.shopify.revenue7 != null ? D.shopify.revenue7 + ' ' + (D.shopify.currency || '') : '–'}</div></div><div><div class="tag">All time</div><div style="font-size:22px;font-weight:750">${D.shopify.orders ?? '–'}</div></div></div>${D.shopify.note ? `<div class="small muted" style="margin-top:8px">${esc(D.shopify.note)}</div>` : ''}</div>` : ''}
  ${ideas.length ? `<div class="sec">Ideas</div><div class="ideas">${ideas.map(ideaCard).join('')}</div>` : ''}
  ${(B.links || []).length ? `<div class="small" style="text-align:center">${B.links.map(l => `<a class="muted" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} ↗</a>`).join(' · ')}</div>` : ''}`;
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
const BOXES = [['essec', 'ESSEC'], ['epe', 'EPE'], ['personal', 'Personal'], ['fennly', 'Fennly'], ['charette', 'Other']];
V.inbox = () => {
  const box = D.mail?.[mailBox] || { items: [], unread: 0 };
  const imp = box.items.filter(m => !m.muted), rest = box.items.filter(m => m.muted);
  const act = (D.actionMail || []).filter(a => a.box === mailBox);
  return `<div class="seg" style="overflow-x:auto">${BOXES.filter(([k]) => D.mail?.[k]).map(([k, l]) => `<button class="${mailBox === k ? 'on' : ''}" data-act="box" data-v="${k}">${l}</button>`).join('')}</div>
  ${act.length ? `<div class="card"><h2>Needs action</h2><div class="list">${act.map(mailRow).join('')}</div></div>` : ''}
  <div class="card"><h2>${mailBox === 'epe' ? 'EPE inbox (Zoho)' : 'Important · last 4 days'}</h2><div class="list">${imp.map(mailRow).join('') || '<div class="empty">Nothing important</div>'}</div>
  ${rest.length ? `<details><summary>${rest.length} newsletters / noise ▾</summary><div class="list" style="margin-top:6px">${rest.map(mailRow).join('')}</div></details>` : ''}</div>`;
};
const mailRow = (m) => `<div class="item"><span class="cdot" style="background:${m.unread ? 'var(--acc2)' : 'transparent'}"></span><div class="main"><a class="t" href="${esc(m.url)}" target="_blank" rel="noopener" style="font-weight:${m.unread ? 700 : 550}">${esc(m.subject || '(no subject)')}</a><div class="m">${esc(m.from)} · ${m.time ? rel(m.time) : esc((m.timeText || '').toLowerCase())}</div>${m.snippet ? `<div class="d">${esc(m.snippet)}</div>` : ''}</div></div>`;

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
  else if (a === 'biz') { (S.biz ||= {}); (S.biz[dk] ||= {})[el.dataset.i] = !S.biz[dk][el.dataset.i]; }
  else if (a === 'ex') { (S.ex ||= {}); (S.ex[dk] ||= {})[el.dataset.i] = !S.ex[dk][el.dataset.i]; }
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

// ---------- quick update (voice / text log) ----------
const PEND = 'life:pending';
const pending = () => JSON.parse(localStorage.getItem(PEND) || '[]');
const setPending = (p) => localStorage.setItem(PEND, JSON.stringify(p));
async function encryptMsg(obj, pass) {
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 150000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(obj))));
  const b = (u) => btoa(String.fromCharCode(...u));
  return { v: 1, salt: b(salt), iv: b(iv), ct: b(ct) };
}
async function postMsg(m) {
  if (!D?.inbox?.token) throw new Error('inbox not configured');
  const body = JSON.stringify(await encryptMsg({ time: m.time, text: m.text }, localStorage.getItem('life:pass')));
  const r = await fetch(`https://api.github.com/repos/${D.inbox.owner}/${D.inbox.repo}/issues`, { method: 'POST', headers: { Authorization: 'Bearer ' + D.inbox.token, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'log ' + m.id, body }) });
  if (!r.ok) throw new Error('post ' + r.status);
}
async function flushPending() {
  const p = pending(); let changed = false;
  for (const m of p) if (m.status !== 'sent') { try { await postMsg(m); m.status = 'sent'; } catch { m.status = 'failed'; } changed = true; }
  // drop sent messages that the server log already contains
  const logged = new Set((D?.log || []).map(l => l.text));
  const keep = p.filter(m => !(m.status === 'sent' && logged.has(m.text)) && Date.now() - m.t < 3 * DAY);
  if (changed || keep.length !== p.length) setPending(keep);
  renderChat();
}
function renderChat() {
  const box = $('#chat'); if (!box || $('#sheet').classList.contains('hidden')) return;
  const items = [...(D?.log || []).map(l => ({ t: new Date(l.time).getTime(), text: l.text, applied: l.applied || [] })), ...pending().map(m => ({ t: m.t, text: m.text, status: m.status }))].sort((a, b) => a.t - b.t).slice(-40);
  box.innerHTML = items.map(x => `<div class="bubble"><div>${esc(x.text)}</div><div class="meta">${fmt(x.t, { weekday: 'short', hour: '2-digit', minute: '2-digit' })}${x.status ? ' · ' + (x.status === 'sent' ? 'sent, handled within 15 min' : x.status === 'failed' ? 'not sent yet, will retry' : 'sending…') : ''}</div>${x.applied?.length ? `<div class="applied">${x.applied.map(a => '✓ ' + esc(a)).join('<br>')}</div>` : ''}</div>`).join('') || '<div class="empty">Nothing yet. Tap the mic and talk.</div>';
  box.scrollTop = box.scrollHeight;
}
function openSheet() { $('#sheet').classList.remove('hidden'); renderChat(); flushPending(); }
function closeSheet() { stopMic(); $('#sheet').classList.add('hidden'); }
$('#fab').addEventListener('click', openSheet);
$('#sheetClose').addEventListener('click', closeSheet);
$('#sheet').addEventListener('click', (e) => { if (e.target.id === 'sheet') closeSheet(); });
$('#send').addEventListener('click', async () => {
  stopMic();
  const text = $('#msg').value.trim(); if (!text) return;
  const m = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), t: Date.now(), time: new Date().toISOString(), text, status: 'sending' };
  setPending([...pending(), m]); $('#msg').value = ''; renderChat();
  await flushPending();
  toast(pending().find(x => x.id === m.id)?.status === 'sent' ? 'Got it' : 'Saved, will send when online');
});
// speech recognition
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null, listening = false, baseText = '';
let lang = localStorage.getItem('life:lang') || 'en-US';
const setLangBtn = () => { $('#lang').textContent = lang.startsWith('fr') ? 'FR' : 'EN'; };
setLangBtn();
$('#lang').addEventListener('click', () => { lang = lang.startsWith('fr') ? 'en-US' : 'fr-FR'; localStorage.setItem('life:lang', lang); setLangBtn(); if (listening) { stopMic(); startMic(); } });
function startMic() {
  if (!SR) { $('#msg').focus(); toast('Tap the mic on your keyboard to dictate'); return; }
  rec = new SR(); rec.lang = lang; rec.continuous = true; rec.interimResults = true;
  baseText = $('#msg').value ? $('#msg').value.trim() + ' ' : '';
  rec.onresult = (e) => { let fin = '', int = ''; for (let i = 0; i < e.results.length; i++) { const r = e.results[i]; if (r.isFinal) fin += r[0].transcript; else int += r[0].transcript; } $('#msg').value = (baseText + fin + int).replace(/\s+/g, ' ').trimStart(); };
  rec.onerror = (e) => { $('#micState').textContent = e.error === 'not-allowed' ? 'Mic blocked: allow it in Settings' : ''; stopMic(); };
  rec.onend = () => { if (listening) { try { rec.start(); } catch { stopMic(); } } };
  try { rec.start(); listening = true; $('#mic').classList.add('on'); $('#micState').textContent = 'Listening… tap again to stop'; } catch { toast('Mic unavailable, use keyboard dictation'); }
}
function stopMic() { listening = false; if (rec) { try { rec.stop(); } catch { } rec = null; } $('#mic').classList.remove('on'); $('#micState').textContent = ''; }
$('#mic').addEventListener('click', () => listening ? stopMic() : startMic());

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
boot();
