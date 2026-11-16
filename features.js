'use strict';
// Life OS / J.A.R.V.I.S. feature pack (50 features). Loaded after app.js; uses its globals.
window.ACT = window.ACT || {};
const HIDE = { food: true, money: true }; // Malone 16 Nov: not on the front end (data and code kept)
const F = {};
const idb = (() => { let dbp; const open = () => dbp || (dbp = new Promise((res, rej) => { const r = indexedDB.open('life', 1); r.onupgradeneeded = () => r.result.createObjectStore('photos', { keyPath: 'id' }); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); })); return { async all() { const db = await open(); return new Promise(res => { const out = []; const c = db.transaction('photos').objectStore('photos').openCursor(); c.onsuccess = () => { const cur = c.result; if (cur) { out.push(cur.value); cur.continue(); } else res(out); }; }); }, async put(v) { const db = await open(); return new Promise(res => { const tx = db.transaction('photos', 'readwrite'); tx.objectStore('photos').put(v); tx.oncomplete = res; }); }, async del(id) { const db = await open(); return new Promise(res => { const tx = db.transaction('photos', 'readwrite'); tx.objectStore('photos').delete(id); tx.oncomplete = res; }); } }; })();
const L = (k, d) => (S[k] ??= d);
const today = () => dayKey();
const n = (x, d = 0) => (x == null || isNaN(x) ? '–' : Number(x).toFixed(d));
const sum = (a, f) => a.reduce((s, x) => s + (+f(x) || 0), 0);
const icon = (p) => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
I.money = icon('<path d="M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>');
I.body = icon('<circle cx="12" cy="5" r="2.5"/><path d="M5 9h14M12 9v13M8 22l4-7 4 7"/>');
I.people = icon('<circle cx="9" cy="8" r="3.5"/><path d="M2 21c0-3.9 3.1-7 7-7s7 3.1 7 7"/><path d="M16 4a3.5 3.5 0 0 1 0 7M22 21c0-3-1.8-5.6-4.5-6.6"/>');
I.system = icon('<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>');

// ---------- nav: new sections ----------
GROUPS.school.segs = [['homework', 'Homework'], ['planner', 'Planner'], ['study', 'Study'], ['grades', 'Grades'], ...GROUPS.school.segs.filter(s => !['homework', 'study', 'grades', 'planner'].includes(s[0]))];
GROUPS.life.segs = [['sports', 'Gym'], ['body', 'Body'], ['habits', 'Habits'], ['calendar', 'Calendar'], ['journal', 'Journal'], ['travel', 'Travel'], ['lists', 'Lists'], ['out', 'Going out'], ['goals', 'Goals']];
GROUPS.home.segs = [['home', 'Today'], ['todo', 'To-do']];
GROUPS.work.segs = [['business', 'Business'], ...(HIDE.money ? [] : [['money', 'Money']]), ['people', 'People'], ['inbox', 'Inbox'], ['ideas', 'Ideas'], ['system', 'System']];
for (const [g, v] of Object.entries(GROUPS)) for (const [s] of v.segs) SEG2GROUP[s] = g;

// ---------- settings: theme / sounds ----------
const setting = (k, d) => (S.set ||= {})[k] ?? d;
function applyTheme() { const m = setting('theme', 'auto'); const h = sgParts(Date.now()).h; document.body.classList.toggle('light', m === 'light' || (m === 'auto' && h >= 7 && h < 18 && false)); }
let actx = null;
function beep(f = 880, d = 0.06, v = 0.04) { if (!setting('sounds', true)) return; try { actx ||= new (window.AudioContext || window.webkitAudioContext)(); const o = actx.createOscillator(), g = actx.createGain(); o.type = 'sine'; o.frequency.value = f; g.gain.value = v; o.connect(g); g.connect(actx.destination); o.start(); g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + d); o.stop(actx.currentTime + d + 0.02); } catch { } }
function buzz(ms = 12) { try { navigator.vibrate && navigator.vibrate(ms); } catch { } }
document.addEventListener('click', (e) => { const a = e.target.closest('[data-act]')?.dataset.act; if (!a) return; if (/todo|focus|biz|ex|ms|habit|pack|shop/.test(a)) { beep(1046, 0.05); buzz(); } else if (/send|orb/.test(a)) beep(660, 0.08); }, true);

// ---------- 5. proactive alerts (+ app badge) ----------
function alerts() {
  const now = Date.now(), out = [], h = sgParts(now).h, dk = today();
  for (const x of D.homework) if (x.due && x.due > now && x.due - now < 24 * 3600000) out.push({ lvl: 'bad', text: `${x.title} due ${rel(x.due)}`, href: '#school/homework' });
  for (const e of D.calendar.events) if (!e.allDay && e.start > now && e.start - now < 20 * 60000) out.push({ lvl: 'warn', text: `${e.title} in ${Math.round((e.start - now) / 60000)} min${e.location ? ' · ' + e.location : ''}`, href: '#life/calendar' });
  for (const ev of D.goingOut || []) { const c = ev.best?.salesEnd; if (c && c > now && c - now < 2 * 3600000 && !(S.booked || {})[ev.id]) out.push({ lvl: 'warn', text: `Aentry sign-up closes ${rel(c)}: ${cleanTitle(ev.title)}`, href: '#life/out' }); }
  for (const ex of (D.exams || []).filter(x => x.t - now < 7 * DAY && x.t > now)) { const st = (D.study || []).find(s => ex.course.toLowerCase().includes(s.name.toLowerCase().split(' ')[0])); const m = st ? mastery(st.key, st.count || 30) : null; if (m != null && m < 50) out.push({ lvl: 'warn', text: `${ex.course.split(' (')[0]} exam in ${Math.ceil((ex.t - now) / DAY)}d, mastery ${m}%`, href: '#school/study' }); }
  if (h >= 20) { const f = D.briefing.focus || [], fd = S.focus[dk] || {}; const left = f.filter((_, i) => !fd[i]).length; if (left) out.push({ lvl: 'warn', text: `${left} must-do${left > 1 ? 's' : ''} left today`, href: '#home' }); const t = sportsToday(); if (t && !t.rest && !gymDone(dk)) out.push({ lvl: 'warn', text: `Gym not logged yet (${t.name})`, href: '#life/sports' }); const nu = nutriToday(); if (!HIDE.food && nu.p < (D.targets?.protein || 150) * 0.7) out.push({ lvl: 'warn', text: `Protein ${nu.p}g / ${D.targets?.protein || 150}g`, href: '#life/body' }); }
  for (const p of peopleAll()) { if (p.next && p.next <= dk) out.push({ lvl: 'warn', text: `Follow up: ${p.name}`, href: '#work/people' }); const b = bdayIn(p.birthday); if (b != null && b <= 3) out.push({ lvl: 'ok', text: `${p.name}'s birthday ${b === 0 ? 'today' : 'in ' + b + 'd'}`, href: '#work/people' }); }
  const asks = (D.log || []).filter(l => l.ask && !l.ask.status && !(S.asked || {})[l.ask.id]); if (asks.length) out.push({ lvl: 'warn', text: `Jarvis is waiting for your answer (${asks.length})`, act: 'orb' });
  try { navigator.setAppBadge && (out.length ? navigator.setAppBadge(out.length) : navigator.clearAppBadge()); } catch { }
  return out;
}
F.alerts = () => { const a = alerts(); return a.length ? `<div class="card alerts"><h2>Alerts <span class="pill bad">${a.length}</span></h2>${a.slice(0, 3).map(x => `<a class="alert ${x.lvl}" ${x.act ? `data-act="${x.act}"` : `href="${x.href}"`}><i></i>${esc(x.text)}</a>`).join('')}</div>` : ''; };

// ---------- 24. revision planner ----------
function plan14() {
  const days = [], subs = (D.study || []).filter(s => s.exam), now = Date.now();
  let prev = [];
  for (let i = 0; i < 21; i++) {
    const d0 = sgMidnight() + i * DAY, key = dayKey(d0 + 3600000);
    const examToday = (D.exams || []).filter(e => e.t >= d0 && e.t < d0 + DAY);
    const cands = subs.filter(s => new Date(s.exam).getTime() > d0 + DAY).map(s => { const dte = (new Date(s.exam).getTime() - d0) / DAY; return { s, score: (s.need || 5) * (1 + 12 / (dte + 1)) - (prev.includes(s.key) ? 6 : 0) }; }).sort((a, b) => b.score - a.score);
    const pick = cands.slice(0, examToday.length ? 1 : 2).map(c => c.s);
    prev = pick.map(p => p.key);
    days.push({ d0, key, exams: examToday, subjects: pick, mins: examToday.length ? 45 : 90 });
    if (!cands.length && !examToday.length && d0 > now + 7 * DAY) break;
  }
  return days;
}
V.planner = () => { const p = plan14(); const done = L('revDone', {}); return `<div class="card hero"><div class="eyebrow">Revision planner</div><div class="hl">Worked back from your finals</div><p class="small">Two focused blocks a day, weakest subjects and closest exams first. Tick a block when done.</p></div>
  ${p.map((d, i) => `<div class="card ${i === 0 ? 'today-plan' : ''}"><div class="row between"><div><div class="tag">${dayName(d.d0 + 3600000)}</div>${d.exams.map(e => `<div class="pill bad" style="margin-top:4px">EXAM ${esc(e.course.split(' (')[0])} ${hm(e.t)}</div>`).join(' ')}</div><span class="small dim">${d.mins} min</span></div>
  <div class="list" style="margin-top:6px">${d.subjects.map(s => { const k = d.key + s.key; return `<div class="item ${done[k] ? 'done' : ''}"><button class="check ${done[k] ? 'on' : ''}" data-act="rev" data-k="${k}"></button><div class="main"><div class="t">${esc(s.name)}</div><div class="m">${s.days != null ? 'exam in ' + Math.max(0, Math.ceil((new Date(s.exam).getTime() - d.d0) / DAY)) + 'd' : ''} · ${s.grade != null ? s.grade.toFixed(1) + '/20' : 'no grade yet'}</div></div><a class="btn" href="#study&s=${s.key}">Quiz</a></div>`; }).join('') || '<div class="empty">Rest / exam day</div>'}</div></div>`).join('')}`; };
ACT.rev = (el) => { const d = L('revDone', {}); d[el.dataset.k] = !d[el.dataset.k]; };
F.revision = () => { const d = plan14()[0]; if (!d || !d.subjects.length) return ''; const done = L('revDone', {}); return `<div class="card"><h2>Revision today <a class="small muted" href="#school/planner">Plan →</a></h2><div class="list">${d.subjects.map(s => { const k = d.key + s.key; return `<div class="item ${done[k] ? 'done' : ''}"><button class="check ${done[k] ? 'on' : ''}" data-act="rev" data-k="${k}"></button><div class="main"><div class="t">${esc(s.name)} · 45 min</div></div><a class="btn" href="#study&s=${s.key}">Quiz</a></div>`; }).join('')}</div></div>`; };

// ---------- 25/26/27/39. study extras: flashcards, exam mode, summaries, music ----------
const decks = {}; async function loadDeck(k) { if (decks[k]) return decks[k]; try { decks[k] = await (await fetch(`study/cards/${k}.json?v=${D.updatedAt}`)).json(); } catch { decks[k] = []; } return decks[k]; }
const sums = {}; async function loadSum(k) { if (sums[k]) return sums[k]; try { sums[k] = await (await fetch(`study/summaries/${k}.json?v=${D.updatedAt}`)).json(); } catch { sums[k] = []; } return sums[k]; }
let flash = null, sumView = null;
const origStudy = V.study;
V.study = () => {
  if (flash) return flashView();
  if (sumView) return summaryView();
  if (quiz) return origStudy();
  const cards = (D.studyAssets?.cards || []).map(f => f.replace('.json', '')), sm = (D.studyAssets?.summaries || []).map(f => f.replace('.json', ''));
  const dueCount = (k) => { const st = L('cards', {}); const d = decks[k]; if (!d) return ''; return d.filter(c => !st[c.id] || st[c.id].due <= Date.now()).length; };
  return origStudy() + `<div class="sec">Exam mode</div><div class="card"><p class="small muted" style="margin:0 0 10px">20 questions, 30 minutes, no hints until the end. Like the real thing.</p><div class="row" style="flex-wrap:wrap;gap:6px">${(D.study || []).map(s => `<button class="btn" data-act="exam" data-k="${s.key}">${esc(s.name.split(' ')[0])}</button>`).join('')}</div></div>
  <div class="sec">Flashcards</div><div class="card"><div class="row" style="flex-wrap:wrap;gap:6px">${cards.map(k => `<button class="btn" data-act="flash" data-k="${k}">${esc(k)} ${dueCount(k) !== '' ? `<span class="pill acc">${dueCount(k)}</span>` : ''}</button>`).join('') || '<span class="small dim">Decks coming soon</span>'}</div></div>
  <div class="sec">1-page summaries</div><div class="card"><div class="row" style="flex-wrap:wrap;gap:6px">${sm.map(k => `<button class="btn" data-act="sum" data-k="${k}">${esc(k)}</button>`).join('') || '<span class="small dim">Summaries coming soon</span>'}</div></div>
  <a class="card row" href="https://open.spotify.com/playlist/37i9dQZF1DWZeKCadgRdKQ" target="_blank" rel="noopener"><span class="k-ico" style="background:rgba(61,255,176,.12);color:var(--ok)">♪</span><div style="flex:1"><div style="font-weight:700">Focus music</div><div class="small muted">Spotify Deep Focus</div></div><span class="muted">↗</span></a>`;
};
ACT.flash = (el) => { loadDeck(el.dataset.k).then(d => { const st = L('cards', {}); const due = d.filter(c => !st[c.id] || st[c.id].due <= Date.now()); flash = { k: el.dataset.k, q: (due.length ? due : d).slice(0, 20), i: 0, flip: false }; render(); }); return false; };
function flashView() {
  const c = flash.q[flash.i];
  if (!c) return `<div class="card hero" style="text-align:center"><div class="eyebrow">${esc(flash.k)}</div><div class="hl">Deck done</div><p>Cards you found hard come back sooner.</p></div><button class="btn pri" data-act="flashexit">Back</button>`;
  return `<div class="row between" style="margin-bottom:10px"><button class="btn" data-act="flashexit">✕</button><span class="small muted">${esc(flash.k)} · ${flash.i + 1}/${flash.q.length} · ${esc(c.tag || '')}</span><span></span></div>
  <div class="card flashcard ${flash.flip ? 'flip' : ''}" data-act="flip"><div class="fc-front">${esc(c.front)}</div>${flash.flip ? `<div class="fc-back">${esc(c.back)}</div>` : '<div class="small dim" style="margin-top:14px">Tap to flip</div>'}</div>
  ${flash.flip ? `<div class="row" style="gap:8px"><button class="btn" style="flex:1;justify-content:center" data-act="rate" data-r="0">Again</button><button class="btn" style="flex:1;justify-content:center" data-act="rate" data-r="1">Good</button><button class="btn pri" style="flex:1;justify-content:center" data-act="rate" data-r="2">Easy</button></div>` : ''}`;
}
ACT.flip = () => { flash.flip = !flash.flip; };
ACT.rate = (el) => { const c = flash.q[flash.i], st = L('cards', {}), r = +el.dataset.r; const x = st[c.id] || { ivl: 0, ease: 2.5 }; if (r === 0) { x.ivl = 0; x.ease = Math.max(1.3, x.ease - 0.2); x.due = Date.now() + 10 * 60000; flash.q.push(c); } else { x.ivl = x.ivl ? Math.round(x.ivl * (r === 2 ? x.ease + 0.3 : x.ease)) : (r === 2 ? 4 : 1); x.due = Date.now() + x.ivl * DAY; } st[c.id] = x; flash.i++; flash.flip = false; };
ACT.flashexit = () => { flash = null; };
ACT.sum = (el) => { loadSum(el.dataset.k).then(d => { sumView = { k: el.dataset.k, d }; render(); }); return false; };
ACT.sumexit = () => { sumView = null; };
function summaryView() { return `<div class="row between" style="margin-bottom:10px"><button class="btn" data-act="sumexit">✕</button><span class="small muted">${esc(sumView.k)} · ${sumView.d.length} sessions</span><span></span></div>${sumView.d.map(s => `<div class="card"><h2>${esc(s.session)}</h2><ul class="bul">${(s.bullets || []).map(b => `<li>${esc(b)}</li>`).join('')}</ul>${s.keyTerms?.length ? `<div class="row" style="flex-wrap:wrap;gap:5px;margin-top:8px">${s.keyTerms.map(t => `<span class="pill acc">${esc(t)}</span>`).join('')}</div>` : ''}${s.examTip ? `<div class="explain ok" style="margin-top:10px"><b>Exam tip.</b> ${esc(s.examTip)}</div>` : ''}</div>`).join('')}`; }
// exam mode on top of the quiz engine
ACT.exam = (el) => { const k = el.dataset.k; loadBank(k).then(b => { if (!b.length) return toast('No questions yet'); const qs = [...b].sort(() => Math.random() - 0.5).slice(0, 20).map(q => shuffleChoices({ ...q, key: k })); quiz = { title: 'Exam · ' + ((D.study || []).find(s => s.key === k)?.name || k), qs, i: 0, picked: null, score: 0, wrong: [], exam: true, ends: Date.now() + 30 * 60000 }; render(); }); return false; };
const origQuizView = quizView;
quizView = function () {
  if (!quiz?.exam) return origQuizView();
  const left = quiz.ends - Date.now(); if (left <= 0 && quiz.i < quiz.qs.length) { quiz.i = quiz.qs.length; quizFinish(); }
  const q = quiz.qs[quiz.i];
  if (!q) return origQuizView();
  const mm = Math.max(0, Math.floor(left / 60000)), ss = Math.max(0, Math.floor(left / 1000) % 60);
  return `<div class="row between" style="margin-bottom:10px"><button class="btn" data-act="quizexit">✕</button><span class="small muted">${esc(quiz.title)} · ${quiz.i + 1}/${quiz.qs.length}</span><span class="pill ${left < 5 * 60000 ? 'bad' : 'acc'}" id="examClock">${mm}:${String(ss).padStart(2, '0')}</span></div><div class="bar" style="margin-bottom:14px"><i style="width:${100 * quiz.i / quiz.qs.length}%"></i></div><div class="card"><div class="qtext">${esc(q.q)}</div><div class="choices">${q.choices.map((c, i) => `<button class="choice" data-act="exampick" data-i="${i}">${esc(c)}</button>`).join('')}</div></div>`;
};
ACT.exampick = (el) => { const q = quiz.qs[quiz.i]; const i = +el.dataset.i; quiz.picked = null; const ok = i === q.answer; if (ok) quiz.score++; else quiz.wrong.push(q); const st = (SST()[q.key] ||= { q: {}, sessions: [] }); const x = ((st.q ||= {})[q.id] ||= { c: 0, w: 0 }); ok ? x.c++ : x.w++; x.last = ok ? 1 : 0; x.t = Date.now(); quiz.i++; if (quiz.i >= quiz.qs.length) quizFinish(); };
setInterval(() => { const c = document.getElementById('examClock'); if (c && quiz?.exam) { const left = quiz.ends - Date.now(); if (left <= 0) render(); else c.textContent = Math.floor(left / 60000) + ':' + String(Math.floor(left / 1000) % 60).padStart(2, '0'); } }, 1000);

// ---------- 23 + 29 + 46. grade simulator, attendance, chart ----------
const origGrades = V.grades;
V.grades = () => {
  const cs = (D.grades.courses || []).filter(c => c.components?.length);
  const tgt = setting('target', 14);
  const need = (c, T) => { const share = c.gradedShare || 0; if (share >= 100) return null; const pts = c.components.filter(x => x.grade != null).reduce((s, x) => s + x.weight * x.grade, 0); return (T * 100 - pts) / (100 - share); };
  const chart = `<div class="card"><h2>Grades chart</h2>${cs.filter(c => c.current != null).sort((a, b) => b.current - a.current).map(c => `<div class="chartrow"><span>${esc(c.short)}</span><div class="bar"><i class="grow" style="width:${c.current * 5}%;background:${c.current >= 16 ? 'var(--ok)' : c.current >= 12 ? 'var(--warn)' : 'var(--bad)'}"></i></div><b>${c.current.toFixed(1)}</b></div>`).join('')}</div>`;
  const sim = `<div class="card"><h2>Grade simulator</h2><div class="row" style="gap:6px;margin-bottom:10px">${[10, 12, 14, 16, 18].map(t => `<button class="btn ${t === tgt ? 'pri' : ''}" data-act="tgt" data-t="${t}">${t}</button>`).join('')}</div><div class="small muted" style="margin-bottom:6px">Average you need on everything not graded yet to finish at ${tgt}/20:</div>${cs.map(c => { const r = need(c, tgt); return `<div class="chartrow"><span>${esc(c.short)}</span><span class="small dim">${100 - (c.gradedShare || 0)}% left</span><b style="color:${r == null ? 'var(--dim)' : r > 20 ? 'var(--bad)' : r > 16 ? 'var(--warn)' : 'var(--ok)'}">${r == null ? 'done' : r > 20 ? 'not reachable' : r < 0 ? 'secured' : r.toFixed(1)}</b></div>`; }).join('')}</div>`;
  const abs = (D.absences || []);
  const att = `<div class="card"><h2>Attendance</h2>${abs.length ? `<ul class="bul">${abs.slice(-10).map(a => `<li>${esc(a.course)} · ${esc(a.date || '')}${a.note ? ' · ' + esc(a.note) : ''}</li>`).join('')}</ul>` : '<div class="small muted">No absences logged. Tell Jarvis "I missed Marketing today" to track it.</div>'}${Object.entries(D.attendanceRules || {}).map(([k, v]) => `<div class="small dim" style="margin-top:6px"><b>${esc(k)}:</b> ${esc(v)}</div>`).join('')}</div>`;
  return sim + chart + origGrades() + (abs.length ? att : '');
};
ACT.tgt = (el) => { (S.set ||= {}).target = +el.dataset.t; };

// ---------- 15/18. weights log + rest timer in the gym view ----------
const liftsAll = () => [...(D.lifts || []), ...L('lifts', [])].map(x => ({ ...x, t: x.t || new Date(x.time).getTime() })).sort((a, b) => a.t - b.t);
const exName = (s) => s.replace(/\s+\d+x.*$/i, '').replace(/\s*\(.*\)\s*$/, '').trim();
function liftInfo(ex) { const all = liftsAll().filter(x => exName(x.ex || '').toLowerCase() === ex.toLowerCase()); if (!all.length) return null; const last = all.at(-1); const pr = all.reduce((m, x) => (+x.kg > +m.kg ? x : m), all[0]); return { last, pr }; }
const origSports = V.sports;
V.sports = () => {
  let html = origSports();
  const t = sportsToday();
  if (t?.blocks) for (const [, items] of t.blocks) for (const it of items) {
    const ex = exName(it); const info = liftInfo(ex); const top = +(it.match(/x\s*\d+\s*-\s*(\d+)/i)?.[1] || it.match(/x\s*(\d+)/i)?.[1] || 10);
    const sug = info ? (+info.last.reps >= top ? `try ${(+info.last.kg + 2.5)} kg` : `stay ${info.last.kg} kg, aim ${top} reps`) : '';
    const tag = `<div class="liftline">${info ? `last ${info.last.kg}kg × ${info.last.reps} · PR ${info.pr.kg}kg · <b>${sug}</b>` : '<span class="dim">no log yet</span>'} <button class="mini" data-act="liftform" data-ex="${esc(ex)}">log</button></div>${S._liftform === ex ? `<div class="liftform"><input id="lkg" inputmode="decimal" placeholder="kg"><input id="lreps" inputmode="numeric" placeholder="reps"><input id="lsets" inputmode="numeric" placeholder="sets"><button class="btn pri" data-act="liftsave" data-ex="${esc(ex)}">Save</button></div>` : ''}`;
    html = html.replace(`${esc(it)}</div></div></div>`, `${esc(it)}</div>${tag}</div></div>`);
  }
  const timer = `<div class="card"><h2>Rest timer</h2><div class="row" style="gap:8px">${[60, 90, 120, 180].map(s => `<button class="btn" data-act="rest" data-s="${s}">${s}s</button>`).join('')}</div></div>`;
  const weeks = [...Array(6)].map((_, i) => { const w = sportsWeek(Date.now() - (5 - i) * 7 * DAY); return w.done; });
  const chart = `<div class="card"><h2>Sessions per week</h2><div class="vbars">${weeks.map((v, i) => `<div><i class="grow" style="height:${Math.min(100, v / (D.sports.weeklyTarget || 6) * 100)}%"></i><span>${v}</span></div>`).join('')}</div></div>`;
  const prs = Object.values(liftsAll().reduce((m, x) => { const k = exName(x.ex || ''); if (!m[k] || +x.kg > +m[k].kg) m[k] = { ...x, ex: k }; return m; }, {})).slice(0, 12);
  const prCard = prs.length ? `<div class="card"><h2>Personal records</h2>${prs.map(p => `<div class="chartrow"><span>${esc(p.ex)}</span><span class="small dim">${new Date(p.t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span><b>${p.kg} kg × ${p.reps}</b></div>`).join('')}</div>` : '';
  return html + timer + chart + prCard;
};
ACT.liftform = (el) => { S._liftform = S._liftform === el.dataset.ex ? null : el.dataset.ex; };
ACT.liftsave = (el) => { const kg = parseFloat($('#lkg').value), reps = parseInt($('#lreps').value), sets = parseInt($('#lsets').value) || 1; if (!kg || !reps) { toast('Enter kg and reps'); return false; } L('lifts', []).push({ ex: el.dataset.ex, kg, reps, sets, t: Date.now() }); S._liftform = null; toast('Logged'); };
let restEnd = 0;
ACT.rest = (el) => { restEnd = Date.now() + (+el.dataset.s) * 1000; let pill = $('#restpill'); if (!pill) { pill = document.createElement('div'); pill.id = 'restpill'; pill.className = 'restpill'; document.body.appendChild(pill); pill.onclick = () => { restEnd = 0; pill.remove(); }; } return false; };
setInterval(() => { const p = $('#restpill'); if (!p || !restEnd) return; const l = Math.ceil((restEnd - Date.now()) / 1000); if (l <= 0) { p.textContent = 'GO'; beep(988, 0.25, 0.08); buzz(300); restEnd = 0; setTimeout(() => p.remove(), 2500); } else p.textContent = `REST ${Math.floor(l / 60)}:${String(l % 60).padStart(2, '0')}`; }, 250);

// ---------- 16/17/19/20/21/22. body ----------
function nutriToday() { const items = [...(D.food || []), ...L('food', [])].filter(f => dayKey(new Date(f.time).getTime()) === today()); return { items, k: Math.round(sum(items, f => f.kcal)), p: Math.round(sum(items, f => f.protein)) }; }
const seriesOf = (srv, loc, f) => [...(srv || []), ...L(loc, [])].map(x => ({ t: x.t || new Date(x.time).getTime(), v: +f(x) })).filter(x => !isNaN(x.v)).sort((a, b) => a.t - b.t);
function spark(pts, w = 300, h = 60) { if (pts.length < 2) return '<div class="small dim">Need 2+ entries for a trend</div>'; const vs = pts.map(p => p.v), mn = Math.min(...vs), mx = Math.max(...vs), r = mx - mn || 1; const xy = pts.map((p, i) => `${(i / (pts.length - 1)) * w},${h - ((p.v - mn) / r) * (h - 8) - 4}`).join(' '); return `<svg viewBox="0 0 ${w} ${h}" class="spark"><polyline points="${xy}" fill="none" stroke="var(--acc)" stroke-width="2"/></svg>`; }
function ringMini(p, label, val, c = 'var(--ok)') { return `<div class="ringbox"><div class="ring" style="--p:${Math.min(100, p)};--c:${c}"><span>${val}</span></div><div class="tag">${label}</div></div>`; }
F.nutrition = () => { const nu = nutriToday(), T = D.targets || {}; return `<div class="card"><h2>Fuel <a class="small muted" href="#life/body">Body →</a></h2><div class="row" style="justify-content:space-around">${ringMini(100 * nu.k / (T.kcal || 2600), 'kcal', nu.k)}${ringMini(100 * nu.p / (T.protein || 150), 'protein g', nu.p, 'var(--acc)')}${(() => { const s = seriesOf(D.sleep, 'sleep', x => x.h).at(-1); return ringMini(s ? 100 * s.v / (T.sleepH || 8) : 0, 'sleep h', s ? s.v : '–', 'var(--acc2)'); })()}</div></div>`; };
V.body = () => {
  const nu = nutriToday(), T = D.targets || {};
  const w = seriesOf(D.weights, 'weights', x => x.kg), sl = seriesOf(D.sleep, 'sleep', x => x.h), st = seriesOf(D.steps, 'steps', x => x.n);
  const stToday = st.filter(x => dayKey(x.t) === today()).at(-1);
  return (HIDE.food ? '' : F.nutrition()) + (HIDE.food ? '' : `<div class="card"><h2>Food today</h2>${nu.items.length ? `<ul class="bul">${nu.items.map(f => `<li>${esc(f.item)} <span class="dim">${f.kcal ? '~' + f.kcal + ' kcal' : ''}${f.protein ? ' · ' + f.protein + 'g P' : ''}</span></li>`).join('')}</ul>` : '<div class="small muted">Tell Jarvis what you ate, or add it here.</div>'}
    <div class="addrow" style="margin-top:10px"><input id="fname" placeholder="Food"><input id="fk" inputmode="numeric" placeholder="kcal" style="max-width:70px"><input id="fp" inputmode="numeric" placeholder="P g" style="max-width:62px"><button class="btn pri" data-act="foodadd">+</button></div></div>`) + `
  ${!HIDE.food && (D.mealIdeas || []).length ? `<div class="card"><h2>Meal ideas near you</h2><ul class="bul">${D.mealIdeas.map(m => `<li>${esc(typeof m === 'string' ? m : m.text || m.name)}</li>`).join('')}</ul></div>` : ''}
  <div class="card"><h2>Weight <span class="small muted">${w.length ? w.at(-1).v + ' kg' : ''}</span></h2>${spark(w)}<div class="addrow" style="margin-top:8px"><input id="wkg" inputmode="decimal" placeholder="Today's weight (kg)"><button class="btn pri" data-act="wadd">Log</button></div></div>
  <div class="card"><h2>Sleep <span class="small muted">${sl.length ? 'avg ' + n(sum(sl.slice(-7), x => x.v) / Math.min(7, sl.length), 1) + 'h (7d)' : ''}</span></h2>${spark(sl)}<div class="addrow" style="margin-top:8px"><input id="slh" inputmode="decimal" placeholder="Hours slept last night"><button class="btn pri" data-act="sladd">Log</button></div></div>
  <div class="card"><h2>Steps <span class="small muted">${stToday ? stToday.v.toLocaleString() + ' today' : ''}</span></h2>${spark(st)}<div class="addrow" style="margin-top:8px"><input id="stn" inputmode="numeric" placeholder="Steps today"><button class="btn pri" data-act="stadd">Log</button></div><details><summary>Sync from Apple Health automatically ▾</summary><ol class="bul small"><li>Shortcuts app > Automation > New > Time of Day 22:00, Run Immediately.</li><li>Add "Find Health Samples": Steps, today, sum.</li><li>Add "Open URLs": https://malonepageaud.github.io/life/#steps= then the Health result.</li></ol></details></div>
  <div class="card"><h2>Progress photos <span class="small muted">private, stays on this phone</span></h2><div id="photos" class="photos"><div class="small dim">Loading…</div></div><label class="btn pri" style="margin-top:10px">Add photo<input type="file" accept="image/*" capture="environment" id="photoIn" hidden></label></div>`;
};
ACT.foodadd = () => { const item = $('#fname').value.trim(); if (!item) return false; L('food', []).push({ item, kcal: +$('#fk').value || 0, protein: +$('#fp').value || 0, time: new Date().toISOString() }); };
ACT.wadd = () => { const v = parseFloat($('#wkg').value); if (!v) return false; L('weights', []).push({ kg: v, t: Date.now() }); };
ACT.sladd = () => { const v = parseFloat($('#slh').value); if (!v) return false; L('sleep', []).push({ h: v, t: Date.now() }); };
ACT.stadd = () => { const v = parseInt($('#stn').value); if (!v) return false; L('steps', []).push({ n: v, t: Date.now() }); };
async function paintPhotos() { const box = $('#photos'); if (!box) return; const ps = (await idb.all()).sort((a, b) => a.t - b.t); if (!ps.length) { box.innerHTML = '<div class="small dim">No photos yet. Same pose, same light, once a week.</div>'; return; } const first = ps[0], last = ps.at(-1); const url = (p) => URL.createObjectURL(p.blob); box.innerHTML = `${ps.length > 1 ? `<div class="compare"><figure><img src="${url(first)}"><figcaption>${new Date(first.t).toLocaleDateString('en-GB')}</figcaption></figure><figure><img src="${url(last)}"><figcaption>${new Date(last.t).toLocaleDateString('en-GB')}</figcaption></figure></div>` : ''}<div class="thumbs">${ps.slice(-9).reverse().map(p => `<img src="${url(p)}" data-act="photodel" data-id="${p.id}" title="Tap to delete">`).join('')}</div>`; }
document.addEventListener('change', async (e) => { if (e.target.id === 'photoIn' && e.target.files[0]) { await idb.put({ id: 'p' + Date.now(), t: Date.now(), blob: e.target.files[0] }); toast('Saved on this phone only'); paintPhotos(); } });
ACT.photodel = (el) => { if (confirm('Delete this photo?')) idb.del(el.dataset.id).then(paintPhotos); return false; };

// ---------- 10/11/12/9. money ----------
const moneyAll = () => [...(D.money || []), ...L('money', [])].map(m => ({ ...m, t: m.t || new Date(m.time).getTime() })).sort((a, b) => b.t - a.t);
function monthStats() { const now = new Date(Date.now() + 8 * 3600000); const m0 = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) - 8 * 3600000; const ms = moneyAll().filter(m => m.t >= m0); const inc = sum(ms.filter(m => m.amount > 0), m => m.amount), out = -sum(ms.filter(m => m.amount < 0), m => m.amount); const cats = {}; for (const m of ms.filter(m => m.amount < 0)) cats[m.cat || 'other'] = (cats[m.cat || 'other'] || 0) - m.amount; return { ms, inc, out, net: inc - out, cats }; }
F.income = () => { const g = D.moneyGoal; if (!g) return ''; const s = monthStats(); return `<a class="card row" href="#work/money">${ringMini(100 * s.inc / (g.monthly || 1000), 'income', Math.round(s.inc), 'var(--gold)')}<div style="flex:1"><div class="tag">This month</div><div style="font-family:var(--hud);font-size:22px;font-weight:700">${Math.round(s.inc)} / ${g.monthly} ${esc(g.currency || '')}</div><div class="small muted">spent ${Math.round(s.out)} · net ${Math.round(s.net)}</div></div></a>`; };
V.money = () => {
  const s = monthStats(), g = D.moneyGoal || { monthly: 1000, currency: 'SGD' };
  const catMax = Math.max(1, ...Object.values(s.cats));
  return `<div class="card hero row">${ringMini(100 * s.inc / (g.monthly || 1000), 'goal', Math.round(100 * s.inc / (g.monthly || 1000)) + '%', 'var(--gold)')}<div style="flex:1"><div class="eyebrow">Income this month</div><div class="hl" style="margin:2px 0">${Math.round(s.inc)} / ${g.monthly} ${esc(g.currency)}</div><div class="small muted">Out ${Math.round(s.out)} · Net ${Math.round(s.net)}</div></div></div>
  <div class="card"><h2>Add</h2><div class="addrow"><input id="mamt" inputmode="decimal" placeholder="Amount (- for spend)"><input id="mnote" placeholder="What"><button class="btn pri" data-act="madd">+</button></div><div class="row" style="gap:6px;flex-wrap:wrap;margin-top:6px">${['food', 'transport', 'going out', 'shopping', 'business', 'income'].map(c => `<button class="btn ${S._mcat === c ? 'pri' : ''}" data-act="mcat" data-c="${c}">${c}</button>`).join('')}</div><div class="small dim" style="margin-top:8px">Or just tell Jarvis: "spent 14 on Grab", "got paid 200".</div></div>
  ${Object.keys(s.cats).length ? `<div class="card"><h2>Spending by category</h2>${Object.entries(s.cats).sort((a, b) => b[1] - a[1]).map(([c, v]) => `<div class="chartrow"><span>${esc(c)}</span><div class="bar"><i class="grow" style="width:${100 * v / catMax}%"></i></div><b>${Math.round(v)}</b></div>`).join('')}</div>` : ''}
  <div class="card"><h2>Recent</h2>${s.ms.length ? s.ms.slice(0, 15).map(m => `<div class="item"><div class="main"><div class="t">${esc(m.note || m.cat || '')}</div><div class="m">${dayName(m.t)} · ${esc(m.cat || '')}</div></div><b style="color:${m.amount > 0 ? 'var(--ok)' : 'var(--tx)'};font-family:var(--hud)">${m.amount > 0 ? '+' : ''}${m.amount}</b></div>`).join('') : '<div class="empty">Nothing this month yet</div>'}</div>
  <div class="card"><h2>Subscriptions</h2>${(D.subscriptions || []).map(x => `<div class="item"><div class="main"><div class="t">${esc(x.name)}</div><div class="m">${esc(x.cycle || '')}${x.price ? ' · ' + x.price : ''}${x.ends ? ' · ends ' + x.ends : ''}${x.renews ? ' · renews ' + x.renews : ''}</div>${x.note ? `<div class="d">${esc(x.note)}</div>` : ''}</div><span class="pill ${x.status === 'active' ? 'ok' : x.status === 'cancelling' ? 'warn' : ''}">${esc(x.status || '')}</span></div>`).join('')}</div>
  <div class="card"><h2>Revolut</h2><div class="small muted">Not connected yet. Log in once on your Mac at app.revolut.com (scan the QR with your phone) and tell Jarvis "Revolut done": your spending will then come in automatically every hour.</div></div>`;
};
ACT.mcat = (el) => { S._mcat = el.dataset.c; };
ACT.madd = () => { let a = parseFloat($('#mamt').value); if (!a) return false; const cat = S._mcat || (a > 0 ? 'income' : 'other'); if (cat !== 'income' && a > 0 && !/^\+/.test($('#mamt').value)) a = -a; L('money', []).push({ amount: a, note: $('#mnote').value.trim(), cat, t: Date.now() }); toast('Saved'); };

// ---------- 14/13. business extras (pipeline + market brief) ----------
const origBiz = V.business;
V.business = () => {
  const p = D.pipeline || { stages: [] }, items = p.items || [];
  const pipe = `<div class="card"><h2>${esc(p.name || 'Pipeline')}</h2><div class="pipe">${(p.stages || []).map(st => { const its = items.filter(x => (x.stage || '').toLowerCase() === st.toLowerCase()); return `<div><div class="tag">${esc(st)} <b>${its.length}</b></div>${its.map(x => `<div class="pcard">${esc(x.name)}${x.value ? `<span class="dim"> · ${esc(String(x.value))}</span>` : ''}</div>`).join('') || '<div class="dim small">–</div>'}</div>`; }).join('')}</div><div class="small dim" style="margin-top:8px">Tell Jarvis "new lead: X" or "X moved to demo".</div></div>`;
  const brief = (D.marketBrief || []).length ? `<div class="card"><h2>Market brief</h2><ul class="bul">${D.marketBrief.map(b => `<li>${esc(typeof b === 'string' ? b : b.text)}</li>`).join('')}</ul></div>` : '';
  return brief + (items.length ? pipe : '') + origBiz();
};
F.brief = () => (D.marketBrief || []).length ? `<div class="card"><h2>Market brief</h2><ul class="bul">${D.marketBrief.slice(0, 5).map(b => `<li>${esc(typeof b === 'string' ? b : b.text)}</li>`).join('')}</ul></div>` : '';

// ---------- 34/37. people ----------
function peopleAll() { const loc = L('peopleEdits', {}); return (D.people || []).map(p => ({ ...p, ...(loc[p.name] || {}) })).concat(L('peopleNew', [])); }
function bdayIn(b) { if (!b) return null; const [mm, dd] = b.split('-').slice(-2).map(Number); if (!mm || !dd) return null; const now = new Date(Date.now() + 8 * 3600000); let d = Date.UTC(now.getUTCFullYear(), mm - 1, dd); const t0 = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()); if (d < t0) d = Date.UTC(now.getUTCFullYear() + 1, mm - 1, dd); return Math.round((d - t0) / DAY); }
V.people = () => { const ps = peopleAll(); const bd = ps.filter(p => bdayIn(p.birthday) != null).sort((a, b) => bdayIn(a.birthday) - bdayIn(b.birthday)); return `${bd.length ? `<div class="card"><h2>Birthdays</h2>${bd.slice(0, 5).map(p => `<div class="chartrow"><span>${esc(p.name)}</span><span></span><b>${bdayIn(p.birthday) === 0 ? 'today' : bdayIn(p.birthday) + 'd'}</b></div>`).join('')}</div>` : ''}
  ${ps.map((p, i) => `<div class="card"><div class="row between"><div><div style="font-weight:700">${esc(p.name)}</div><div class="small muted">${esc(p.role || '')}</div></div>${p.next ? `<span class="pill ${p.next <= today() ? 'warn' : 'acc'}">follow up ${esc(p.next)}</span>` : ''}</div>${p.notes ? `<div class="small" style="margin-top:6px;color:#cfe9f2">${esc(p.notes)}</div>` : ''}<details><summary>Edit ▾</summary><div class="addrow" style="margin-top:8px"><input id="pn${i}" value="${esc(p.notes || '')}" placeholder="Notes"></div><div class="addrow"><input id="pd${i}" type="date" value="${esc(p.next || '')}"><input id="pb${i}" placeholder="Birthday MM-DD" value="${esc(p.birthday || '')}"><button class="btn pri" data-act="psave" data-i="${i}" data-name="${esc(p.name)}">Save</button></div></details></div>`).join('')}
  <div class="card"><h2>Add person</h2><div class="addrow"><input id="npn" placeholder="Name"><input id="npr" placeholder="Role"><button class="btn pri" data-act="padd">+</button></div><div class="small dim">Or: "Jarvis, remind me to follow up with Paolo Friday".</div></div>`; };
ACT.psave = (el) => { const i = el.dataset.i; (L('peopleEdits', {}))[el.dataset.name] = { notes: $('#pn' + i).value, next: $('#pd' + i).value, birthday: $('#pb' + i).value }; toast('Saved'); };
ACT.padd = () => { const name = $('#npn').value.trim(); if (!name) return false; L('peopleNew', []).push({ name, role: $('#npr').value.trim() }); };

// ---------- 31/32/33. habits, focus timer, weekly score ----------
const habitList = () => L('habitList', null) || D.habits || [];
function habitStreak(i) { let s = 0; for (let d = 0; d < 365; d++) { const k = dayKey(Date.now() - d * DAY); if ((S.hab?.[k] || {})[i]) s++; else if (d > 0) break; } return s; }
const focusLog = () => L('focusLog', []);
function focusWeekMin() { const ws = weekStart(); return sum(focusLog().filter(f => f.t >= ws), f => f.min); }
function weekScore(t = Date.now()) {
  const ws = weekStart(t), we = ws + 7 * DAY, days = [...Array(7)].map((_, i) => dayKey(ws + i * DAY + 3600000));
  const gym = Math.min(1, sportsWeek(t).done / (D.sports.weeklyTarget || 6));
  const md = days.map(k => S.focus?.[k] || {}).reduce((s, o) => s + Object.values(o).filter(Boolean).length, 0) / 21;
  let qs = 0; for (const k in SST()) for (const s of SST()[k].sessions || []) if (s.t >= ws && s.t < we) qs += s.n;
  const hb = days.reduce((s, k) => s + Object.values(S.hab?.[k] || {}).filter(Boolean).length, 0) / Math.max(1, 7 * habitList().length);
  const fm = sum(focusLog().filter(f => f.t >= ws && f.t < we), f => f.min) / 600;
  return Math.round(30 * gym + 25 * Math.min(1, md) + 20 * Math.min(1, qs / 140) + 15 * Math.min(1, hb) + 10 * Math.min(1, fm));
}
F.score = () => { const s = weekScore(), last = weekScore(Date.now() - 7 * DAY); return `<a class="card row" href="#life/habits">${ringMini(s, 'week', s, s >= 70 ? 'var(--ok)' : s >= 40 ? 'var(--warn)' : 'var(--bad)')}<div style="flex:1"><div class="tag">Weekly score</div><div style="font-family:var(--hud);font-size:22px;font-weight:700">${s}/100 <span class="small ${s >= last ? '' : 'dim'}" style="color:${s >= last ? 'var(--ok)' : 'var(--bad)'}">${s >= last ? '▲' : '▼'} ${Math.abs(s - last)} vs last week</span></div><div class="small muted">gym 30 · must-dos 25 · study 20 · habits 15 · focus 10</div></div></a>`; };
F.habits = () => { const k = today(), d = S.hab?.[k] || {}; return `<div class="card"><h2>Habits</h2><div class="list">${habitList().map((h, i) => `<div class="item ${d[i] ? 'done' : ''}"><button class="check ${d[i] ? 'on' : ''}" data-act="habit" data-i="${i}"></button><div class="main"><div class="t">${esc(h)}</div></div><span class="pill ${habitStreak(i) >= 3 ? 'ok' : ''}">${habitStreak(i)}d</span></div>`).join('')}</div></div>`; };
ACT.habit = (el) => { const k = today(); ((S.hab ||= {})[k] ||= {})[el.dataset.i] = !S.hab[k][el.dataset.i]; };
F.focus = () => { const ft = S.focusTimer; const left = ft ? ft.end - Date.now() : 0; return `<div class="card focuscard"><h2>Focus <span class="small muted">${Math.round(focusWeekMin() / 6) / 10}h this week</span></h2>${ft && left > 0 ? `<div class="row between"><div class="focusclock" id="focusClock">${Math.floor(left / 60000)}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')}</div><button class="btn" data-act="focusstop">Stop</button></div>` : `<div class="row" style="gap:8px">${[25, 50, 90].map(m => `<button class="btn ${m === 50 ? 'pri' : ''}" data-act="focusgo" data-m="${m}">${m} min</button>`).join('')}</div>`}</div>`; };
ACT.focusgo = (el) => { const m = +el.dataset.m; S.focusTimer = { start: Date.now(), end: Date.now() + m * 60000, min: m }; beep(523, 0.1); };
ACT.focusstop = () => { const ft = S.focusTimer; if (ft) { const min = Math.round((Date.now() - ft.start) / 60000); if (min >= 5) focusLog().push({ t: ft.start, min }); } S.focusTimer = null; };
setInterval(() => { const ft = S.focusTimer; if (!ft) return; const left = ft.end - Date.now(); const c = document.getElementById('focusClock'); if (left <= 0) { focusLog().push({ t: ft.start, min: ft.min }); S.focusTimer = null; save(); beep(784, 0.3, 0.08); buzz(400); toast(`Focus block done: ${ft.min} min`); speak && speak(`Focus block complete. ${ft.min} minutes.`); render(); } else if (c) c.textContent = Math.floor(left / 60000) + ':' + String(Math.floor(left / 1000) % 60).padStart(2, '0'); }, 1000);
V.habits = () => { const hist = [...Array(6)].map((_, i) => weekScore(Date.now() - (5 - i) * 7 * DAY)); return F.score() + F.habits() + F.focus() + `<div class="card"><h2>Weekly score history</h2><div class="vbars">${hist.map(v => `<div><i class="grow" style="height:${v}%"></i><span>${v}</span></div>`).join('')}</div></div><div class="card"><h2>Edit habits</h2>${habitList().map((h, i) => `<div class="addrow"><input id="hb${i}" value="${esc(h)}"></div>`).join('')}<button class="btn pri" data-act="habsave">Save habits</button></div>`; };
ACT.habsave = () => { S.habitList = habitList().map((_, i) => $('#hb' + i).value.trim()).filter(Boolean); toast('Saved'); };

// ---------- 38. journal ----------
V.journal = () => { const loc = L('journal', []); const all = [...(D.journal || []).map(j => ({ ...j, t: j.t || new Date(j.time).getTime() })), ...loc].sort((a, b) => b.t - a.t); const todayHas = all.some(j => dayKey(j.t) === today()); return `<div class="card hero"><div class="eyebrow">One line a day</div><div class="hl">${todayHas ? 'Logged today' : 'How was today?'}</div><div class="addrow" style="margin-top:10px"><input id="jtext" placeholder="One sentence"><button class="btn pri" data-act="jadd">Save</button></div><div class="small dim">Or tell Jarvis "Journal: ..."</div></div>${D.weeklyRecap ? `<div class="card"><h2>Recap</h2><div class="small">${esc(D.weeklyRecap)}</div></div>` : ''}<div class="card"><h2>Entries</h2>${all.slice(0, 40).map(j => `<div class="item"><div class="time" style="width:70px;font-family:var(--hud);color:var(--mut)">${new Date(j.t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div><div class="main"><div class="t" style="font-weight:500">${esc(j.text)}</div></div></div>`).join('') || '<div class="empty">No entries yet</div>'}</div>`; };
ACT.jadd = () => { const t = $('#jtext').value.trim(); if (!t) return false; L('journal', []).push({ text: t, t: Date.now() }); };

// ---------- 35. travel ----------
V.travel = () => (D.trips || []).map((tr, ti) => { const st = new Date(tr.start).getTime(), d = Math.ceil((st - Date.now()) / DAY), pk = (S.pack ||= {})[ti] || {}; return `<div class="card"><div class="row between"><div><div class="tag">${d > 0 ? 'in ' + d + ' days' : d === 0 ? 'today' : 'ongoing / done'}</div><div style="font-family:var(--hud);font-size:20px;font-weight:700">${esc(tr.name)}</div><div class="small muted">${new Date(st).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} → ${new Date(tr.end).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div></div><div class="ring" style="--p:${Math.max(0, 100 - d * 3)}"><span>${Math.max(0, d)}d</span></div></div>${tr.details?.length ? `<ul class="bul" style="margin-top:8px">${tr.details.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}<div class="tag" style="margin-top:10px">Packing ${Object.values(pk).filter(Boolean).length}/${tr.packing?.length || 0}</div><div class="list">${(tr.packing || []).map((p, i) => `<div class="item ${pk[i] ? 'done' : ''}"><button class="check ${pk[i] ? 'on' : ''}" data-act="pack" data-t="${ti}" data-i="${i}"></button><div class="main"><div class="t" style="font-weight:500">${esc(p)}</div></div></div>`).join('')}</div></div>`; }).join('') || '<div class="card"><div class="empty">No trips</div></div>';
ACT.pack = (el) => { const p = ((S.pack ||= {})[el.dataset.t] ||= {}); p[el.dataset.i] = !p[el.dataset.i]; };

// ---------- 36. lists ----------
V.lists = () => { const loc = L('shop', []); const srv = (D.shopping || []).map((x, i) => ({ id: 's' + i, text: x.text || x.item || x, done: x.done })); const doneMap = L('shopDone', {}); const items = [...srv, ...loc]; return `<div class="card"><h2>Shopping</h2><div class="addrow"><input id="shopIn" placeholder="Add item"><button class="btn pri" data-act="shopadd">+</button></div><div class="list">${items.map(x => { const d = doneMap[x.id] || x.done; return `<div class="item ${d ? 'done' : ''}"><button class="check ${d ? 'on' : ''}" data-act="shop" data-id="${x.id}"></button><div class="main"><div class="t" style="font-weight:500">${esc(x.text)}</div></div></div>`; }).join('') || '<div class="empty">Empty. Tell Jarvis "add protein powder".</div>'}</div>${items.some(x => doneMap[x.id]) ? '<button class="btn" data-act="shopclear">Clear done</button>' : ''}</div>`; };
ACT.shopadd = () => { const t = $('#shopIn').value.trim(); if (!t) return false; L('shop', []).push({ id: 'u' + Date.now(), text: t }); };
ACT.shop = (el) => { const m = L('shopDone', {}); m[el.dataset.id] = !m[el.dataset.id]; };
ACT.shopclear = () => { const m = L('shopDone', {}); S.shop = L('shop', []).filter(x => !m[x.id]); };

// ---------- 40/41/42. going out extras ----------
const origOut = V.out;
V.out = () => origOut().replace(/<a class="btn" href="(https:\/\/aentry\.app\/events\/(\d+))" target="_blank" rel="noopener">Aentry ↗<\/a>/g, (m, url, id) => `${m}<button class="btn" data-act="share" data-url="${url}" data-id="${id}">Share</button><button class="btn" data-act="fav" data-id="${id}">${(S.favs || {})[id] ? '★' : '☆'} Auto</button>`) + (true ? '' : `<div class="sec">Other guest lists</div><div class="card"><div class="small muted" style="margin-bottom:8px">Not on Aentry: ask Jarvis to check these for a free guest list.</div>${[['Zouk', 'https://zoukclub.com'], ['Marquee Singapore', 'https://marqueesingapore.com'], ['CE LA VI', 'https://www.celavi.com/en/singapore']].map(([nm, u]) => `<a class="chartrow" href="${u}" target="_blank" rel="noopener"><span>${nm}</span><span></span><b>↗</b></a>`).join('')}</div>`);
ACT.share = (el) => { const e = (D.goingOut || []).find(x => String(x.id) === el.dataset.id); const text = e ? `${cleanTitle(e.title)} · ${dayName(e.start)} ${hm(e.start)} · free on Aentry` : 'Night out'; if (navigator.share) navigator.share({ title: 'Night out', text, url: el.dataset.url }).catch(() => { }); else { navigator.clipboard?.writeText(text + ' ' + el.dataset.url); toast('Link copied'); } return false; };
ACT.fav = (el) => { const e = (D.goingOut || []).find(x => String(x.id) === el.dataset.id); (S.favs ||= {})[el.dataset.id] = !S.favs[el.dataset.id]; if (S.favs[el.dataset.id] && e) { sendText(`Auto-book every week (free tickets only): ${cleanTitle(e.title).replace(/\(.*\)/, '').trim()} at ${(e.location || '').split(',')[0]}`); toast('Jarvis will auto-book this weekly'); } };

// ---------- 50 + settings (44/45/47/48/49). system ----------
const BLOCKS = [['alerts', 'Alerts'], ['todo', 'To-do'], ['next', 'Next up'], ['chips', 'Countdowns'], ['mustdo', 'Must do'], ['revision', 'Revision today'], ['schedule', 'Today'], ['focus', 'Focus timer'], ['habits', 'Habits'], ['score', 'Weekly score'], ['tonight', 'Tonight'], ['study', 'Quick study'], ['moneymoves', 'Money moves'], ['brief', 'Market brief'], ['new', "What's new"], ['ideas', 'Ideas'], ['errors', 'Sync issues']];
const homeOrder = () => { const o = (S.homeOrder || []).filter(k => BLOCKS.some(b => b[0] === k)); for (const [k] of BLOCKS) if (!o.includes(k)) o.push(k); return o; };
V.system = () => {
  const st = D.status || {}, P = st.partsAt || {}, E = st.errorsByPart || {};
  const age = (t) => t ? rel(new Date(t).getTime()) : 'never';
  const row = (nm, t, err, maxMin) => { const old = !t || (Date.now() - new Date(t).getTime()) > maxMin * 60000; return `<div class="chartrow"><span>${nm}</span><span class="small ${err?.length ? '' : 'dim'}" style="${err?.length ? 'color:var(--bad)' : ''}">${err?.length ? esc(err[0]).slice(0, 60) : age(t)}</span><b style="color:${err?.length || old ? 'var(--warn)' : 'var(--ok)'}">${err?.length ? 'ERR' : old ? 'STALE' : 'OK'}</b></div>`; };
  return `<div class="card"><h2>Systems</h2>${row('Moodle', P.moodle, E.moodle, 180)}${row('Gmail', P.mail, E.mail, 120)}${row('Zoho · Shopify', P.biz, E.biz, 300)}${row('Calendar · Aentry', P.light, E.light, 120)}${row('Jarvis agent', st.agentLastReply, null, 24 * 60)}<div class="small dim" style="margin-top:8px">Data built ${rel(D.updatedAt)}. Everything runs on your Mac: keep it awake with Aside open.</div></div>
  <div class="card"><h2>Logins</h2>${[['Bookings ONE', 'essec.bookings.one'], ['Aentry', 'aentry.app'], ['Revolut', 'app.revolut.com'], ['Moodle', 'moodle.essec.fr']].map(([nm, u]) => { const s = (st.logins || {})[nm]; return `<div class="chartrow"><span>${nm}</span><span class="small dim">${esc(u)}</span><b style="color:${s === 'ok' ? 'var(--ok)' : s === 'out' ? 'var(--bad)' : 'var(--dim)'}">${s === 'ok' ? 'OK' : s === 'out' ? 'LOG IN' : '?'}</b></div>`; }).join('')}<div class="small dim" style="margin-top:6px">If one says LOG IN: open that site on your Mac and log in once with "Remember me".</div></div>
  <div class="card"><h2>Look & feel</h2><div class="chartrow"><span>Theme</span><span></span><span class="row" style="gap:6px">${['dark', 'light'].map(t => `<button class="btn ${setting('theme', 'dark') === t ? 'pri' : ''}" data-act="theme" data-t="${t}">${t}</button>`).join('')}</span></div><div class="chartrow"><span>Sounds & haptics</span><span></span><button class="btn ${setting('sounds', true) ? 'pri' : ''}" data-act="toggleset" data-k="sounds">${setting('sounds', true) ? 'on' : 'off'}</button></div><div class="chartrow"><span>Morning briefing (voice)</span><span></span><button class="btn ${setting('brief', true) ? 'pri' : ''}" data-act="toggleset" data-k="brief">${setting('brief', true) ? 'on' : 'off'}</button></div><div class="chartrow"><span>Face ID lock</span><span></span><button class="btn ${setting('faceid', false) ? 'pri' : ''}" data-act="faceid">${setting('faceid', false) ? 'on' : 'off'}</button></div></div>
  <div class="card"><h2>Home layout</h2>${homeOrder().map((k, i) => { const nm = BLOCKS.find(b => b[0] === k)[1]; const hid = (S.homeHidden || { new: true, ideas: true, brief: true, errors: true, focus: true })[k]; return `<div class="chartrow"><span style="${hid ? 'opacity:.4' : ''}">${nm}</span><span class="row" style="gap:4px"><button class="mini" data-act="mv" data-i="${i}" data-d="-1">▲</button><button class="mini" data-act="mv" data-i="${i}" data-d="1">▼</button></span><button class="mini" data-act="hide" data-k="${k}">${hid ? 'show' : 'hide'}</button></div>`; }).join('')}</div>
  ${'' && `<div class="card"><h2>Home screen widget</h2><div class="small muted">Install the free <b>Scriptable</b> app, then ask Jarvis "send me the widget script". It shows your next event, homework and exam countdown on your iPhone home screen.</div></div>
  <div class="card"><h2>Online backup agent</h2><div class="small muted">Lets Jarvis answer and log things even when your Mac is off. Needs a Claude API key (console.anthropic.com, a few dollars a month). Not set up yet.</div></div>`}
  <div class="card"><h2>Jarvis remembers</h2>${Object.keys(D.prefs || {}).length ? `<ul class="bul">${Object.entries(D.prefs).map(([k, v]) => `<li>${esc(k)}: ${esc(String(v))}</li>`).join('')}</ul>` : '<div class="small muted">Nothing yet. Tell Jarvis things like "my usual room is 4M2" or "I train at 9pm".</div>'}</div>
  <div class="small dim" style="text-align:center">J.A.R.V.I.S. v23 · data ${Math.round(JSON.stringify(D).length / 1024)} KB</div>`;
};
ACT.theme = (el) => { (S.set ||= {}).theme = el.dataset.t; applyTheme(); };
ACT.toggleset = (el) => { (S.set ||= {})[el.dataset.k] = !setting(el.dataset.k, true); };
ACT.mv = (el) => { const o = homeOrder(), i = +el.dataset.i, j = i + +el.dataset.d; if (j < 0 || j >= o.length) return false; [o[i], o[j]] = [o[j], o[i]]; S.homeOrder = o; };
ACT.hide = (el) => { S.homeHidden ||= { new: true, ideas: true, brief: true, errors: true, focus: true }; S.homeHidden[el.dataset.k] = !S.homeHidden[el.dataset.k]; };

// 48. Face ID (WebAuthn platform authenticator as a local gate)
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
ACT.faceid = () => {
  if (setting('faceid', false)) { S.set.faceid = false; delete S.set.credId; toast('Face ID lock off'); return; }
  if (!window.PublicKeyCredential) { toast('Not supported on this device'); return false; }
  navigator.credentials.create({ publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)), rp: { name: 'Jarvis' }, user: { id: crypto.getRandomValues(new Uint8Array(16)), name: 'malone', displayName: 'Malone' }, pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }], authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' }, timeout: 60000 } })
    .then(c => { (S.set ||= {}).faceid = true; S.set.credId = b64u(c.rawId); save(); render(); toast('Face ID lock on'); }).catch(() => toast('Face ID setup cancelled'));
  return false;
};
function faceGate() { return new Promise(res => { if (!setting('faceid', false) || sessionStorage.getItem('faceok')) return res(); const ov = document.createElement('div'); ov.className = 'boot'; ov.innerHTML = reactor(0, 'LOCKED') + '<button class="btn pri" id="faceBtn">Unlock with Face ID</button>'; document.body.appendChild(ov); ov.querySelector('#faceBtn').onclick = () => navigator.credentials.get({ publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)), allowCredentials: S.set.credId ? [{ type: 'public-key', id: unb64u(S.set.credId) }] : [], userVerification: 'required', timeout: 60000 } }).then(() => { sessionStorage.setItem('faceok', '1'); ov.remove(); res(); }).catch(() => toast('Try again')); }); }

// ---------- to-do: one tap away (Home > To-do) ----------
if (HIDE.food) foodCard = () => '';
F.todo = () => { const open = todoItems().filter(t => !isDone(t.id)); return `<div class="card todocard"><h2>To-do <a class="small muted" href="#home/todo">${open.length} open →</a></h2><form class="addrow" id="addTodo"><input id="todoText" placeholder="Add a to-do…" autocomplete="off"><button class="btn pri">+</button></form><div class="list">${open.slice(0, 3).map(todoRow).join('') || '<div class="empty">All clear</div>'}</div></div>`; };
V.todo = () => { const items = todoItems(); const open = items.filter(t => !isDone(t.id)), done = items.filter(t => isDone(t.id)); const groups = [['Urgent', t => t.priority === 1], ['School', t => t.priority !== 1 && t.tag === 'school'], ['Business', t => t.priority !== 1 && t.tag === 'business'], ['Mine', t => t.priority !== 1 && t.tag === 'mine'], ['Other', t => t.priority !== 1 && !['school', 'business', 'mine'].includes(t.tag)]]; return `<div class="card hero"><form class="addrow" id="addTodo" style="margin:0"><input id="todoText" placeholder="Add a to-do…" autocomplete="off"><button class="btn pri">Add</button></form><div class="small muted" style="margin-top:8px">${open.length} open · or tell Jarvis "add to-do: ..."</div></div>${groups.map(([nm, fn]) => { const xs = open.filter(fn); return xs.length ? `<div class="card"><h2>${nm} <span class="pill">${xs.length}</span></h2><div class="list">${xs.map(todoRow).join('')}</div></div>` : ''; }).join('') || '<div class="card"><div class="empty">All clear</div></div>'}${done.length ? `<details class="card"><summary>${done.length} done ▾</summary><div class="list" style="margin-top:8px">${done.map(todoRow).join('')}</div></details>` : ''}`; };


// ---------- v6 Wayne × J.A.R.V.I.S. ----------
let _ticks2 = '', _gold = '';
reactor = function (score, label) {
  if (!_ticks2) { for (let i = 0; i < 72; i++) { const a = i * 5 * Math.PI / 180, r1 = i % 6 ? 89 : 84, r2 = 94; _ticks2 += `<line x1="${100 + r1 * Math.sin(a)}" y1="${100 - r1 * Math.cos(a)}" x2="${100 + r2 * Math.sin(a)}" y2="${100 - r2 * Math.cos(a)}"/>`; } for (let i = 0; i < 12; i++) { const a0 = (i * 30 + 3) * Math.PI / 180, a1 = (i * 30 + 24) * Math.PI / 180, r = 80; _gold += `<path d="M${100 + r * Math.sin(a0)} ${100 - r * Math.cos(a0)} A${r} ${r} 0 0 1 ${100 + r * Math.sin(a1)} ${100 - r * Math.cos(a1)}"/>`; } }
  const C = 2 * Math.PI * 64, off = C * (1 - Math.max(0, Math.min(100, score)) / 100);
  return `<svg class="reactor" viewBox="0 0 200 200" aria-label="Day score ${score}%"><defs>
    <linearGradient id="arcg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7fe9ff"/><stop offset=".55" stop-color="#5cc8ff"/><stop offset="1" stop-color="#f3c969"/></linearGradient>
    <radialGradient id="rg" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#f6ffff"/><stop offset=".3" stop-color="#8eefff"/><stop offset=".62" stop-color="#2a8cff" stop-opacity=".7"/><stop offset="1" stop-color="#020814" stop-opacity="0"/></radialGradient>
    <linearGradient id="goldg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff1c1"/><stop offset=".45" stop-color="#d9b45a"/><stop offset="1" stop-color="#8a6a1f"/></linearGradient>
    <linearGradient id="sweepg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7fe9ff" stop-opacity="0"/><stop offset="1" stop-color="#7fe9ff" stop-opacity=".35"/></linearGradient></defs>
    <g class="r-ticks" stroke="rgba(217,180,90,.55)" stroke-width="1.3">${_ticks2}</g>
    <g class="r-gold" fill="none" stroke="url(#goldg)" stroke-width="2.4" stroke-linecap="round">${_gold}</g>
    <circle cx="100" cy="100" r="64" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="8"/>
    <circle class="r-arc" cx="100" cy="100" r="64" fill="none" stroke="url(#arcg)" stroke-width="8" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${off}" transform="rotate(-90 100 100)" style="filter:drop-shadow(0 0 6px rgba(127,233,255,.7))"/>
    <path class="r-sweep" d="M100 100 L100 40 A60 60 0 0 1 152 70 Z" fill="url(#sweepg)"/>
    <circle class="r-core" cx="100" cy="100" r="44" fill="url(#rg)"/>
    <circle cx="100" cy="100" r="44" fill="none" stroke="rgba(255,255,255,.25)" stroke-width=".8"/>
    <text x="100" y="104" text-anchor="middle" font-size="30">${score}%</text>
    <text x="100" y="124" text-anchor="middle" font-size="10" letter-spacing="3" fill="#e8d7a6">${label || 'DAY'}</text></svg>`;
};
bootSeq = function () {
  if (sessionStorage.getItem('booted')) return; sessionStorage.setItem('booted', '1');
  const el = document.createElement('div'); el.className = 'boot';
  el.innerHTML = `<div class="brandline">Pageaud Industries · Private</div><div class="scanbox">${reactor(100, 'SCAN')}<div class="scanline"></div></div><div class="welcome"></div><div class="boot-lines"></div>`;
  document.body.appendChild(el); beep(440, 0.08, 0.03);
  const lines = ['Biometric match confirmed', 'Decrypting private data', 'Syncing Moodle · Mail · Calendar', 'J.A.R.V.I.S. online'];
  const box = el.querySelector('.boot-lines'); let i = 0;
  const done = () => { el.classList.add('out'); setTimeout(() => el.remove(), 380); };
  setTimeout(() => { el.querySelector('.welcome').textContent = 'Welcome back, Mr. Pageaud'; beep(880, 0.07, 0.03); }, 420);
  const step = () => { if (i < lines.length) { box.insertAdjacentHTML('beforeend', `<div>${lines[i++]}</div>`); setTimeout(step, 190); } else setTimeout(done, 380); };
  setTimeout(step, 520); el.addEventListener('click', done);
};
const origHeader = header;
header = function (t) { origHeader(t); const dl = $('#dateLine'); if (dl) dl.innerHTML = `${esc(fmt(Date.now(), { weekday: 'short', day: 'numeric', month: 'short' }))}<span class="clock" id="clk"></span>`; tickClock(); };
function tickClock() { const c = document.getElementById('clk'); if (c) c.textContent = fmt(Date.now(), { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }); }
setInterval(tickClock, 1000);
const WX = { 0: 'Clear', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Overcast', 45: 'Fog', 48: 'Fog', 51: 'Drizzle', 53: 'Drizzle', 55: 'Drizzle', 61: 'Light rain', 63: 'Rain', 65: 'Heavy rain', 80: 'Showers', 81: 'Showers', 82: 'Heavy showers', 95: 'Thunderstorm', 96: 'Thunderstorm', 99: 'Thunderstorm' };
async function weather() { try { const c = JSON.parse(localStorage.getItem('life:wx') || 'null'); if (c && Date.now() - c.t < 30 * 60000) return c; const r = await fetch('https://api.open-meteo.com/v1/forecast?latitude=1.284&longitude=103.842&current=temperature_2m,apparent_temperature,weather_code&timezone=Asia%2FSingapore'); const j = await r.json(); const w = { t: Date.now(), temp: Math.round(j.current.temperature_2m), feels: Math.round(j.current.apparent_temperature), txt: WX[j.current.weather_code] || '' }; localStorage.setItem('life:wx', JSON.stringify(w)); return w; } catch { return null; } }
function paintWeather() { const el = document.getElementById('wx'); if (!el) return; weather().then(w => { if (w && document.getElementById('wx')) document.getElementById('wx').innerHTML = `Singapore <b>${w.temp}°C</b> · ${esc(w.txt)} · feels ${w.feels}°`; }); }

// ---------- home composition (47) ----------
const origToday = V.today;
V.today = () => {
  const html = origToday().replace(/<div class="name">[^<]*<\/div>/, '<div class="name">Mr. Pageaud</div><div class="weather" id="wx">Singapore</div>'); const parts = html.split(/<!--blk:(\w+)-->/); const blocks = {}; let top = parts[0];
  for (let i = 1; i < parts.length; i += 2) { if (parts[i] === 'top') top += parts[i + 1]; else blocks[parts[i]] = parts[i + 1]; }
  for (const k of ['alerts', 'todo', 'revision', 'focus', 'habits', 'score', 'brief']) blocks[k] = F[k]();
  const hid = S.homeHidden || { new: true, ideas: true, brief: true, errors: true, focus: true };
  return top + homeOrder().filter(k => !hid[k]).map(k => blocks[k] || '').join('') + `<div style="text-align:center;margin-top:8px"><a class="small dim" href="#work/system">Customise home · systems</a></div>`;
};

// ---------- chat: quick chips (3), undo (6), hold-to-talk (2), morning briefing (1) ----------
(function chatUpgrades() {
  const comp = document.querySelector('.composer'); if (comp && !document.querySelector('.qchips')) comp.insertAdjacentHTML('beforebegin', `<div class="qchips">${[["What's next?", 1], ['Log gym done', 1], ['Add to-do: ', 0], ['Book a room ', 0], ['Explain ', 0], ['Journal: ', 0], ['Add to shopping: ', 0]].map(([t, s]) => `<button data-act="qchip" data-t="${esc(t)}" data-s="${s}">${esc(t.trim())}</button>`).join('')}</div>`);
})();
ACT.qchip = (el) => { if (el.dataset.s === '1') { sendText(el.dataset.t); } else { const m = $('#msg'); m.value = el.dataset.t; m.focus(); } return false; };
ACT.undo = (el) => { if (!confirm('Undo this action?')) return false; sendText(`Undo this: ${el.dataset.r}`); toast('Undo requested'); return false; };
let holdT = null, holding = false, swallowClick = false;
document.addEventListener('pointerdown', (e) => { const orb = e.target.closest('.orb'); if (!orb) return; holdT = setTimeout(() => { holding = true; swallowClick = true; openSheet(false); startMic(); beep(660, 0.06); buzz(20); }, 320); });
document.addEventListener('pointerup', () => { clearTimeout(holdT); if (holding) { holding = false; stopMic(); setTimeout(() => { const t = $('#msg').value.trim(); if (t) { $('#msg').value = ''; sendText(t); beep(880, 0.06); } }, 350); } });
document.addEventListener('click', (e) => { if (swallowClick && e.target.closest('.orb')) { e.stopPropagation(); e.preventDefault(); swallowClick = false; } }, true);
let briefPending = false;
function maybeBrief() { const h = sgParts(Date.now()).h; if (!setting('brief', true) || h >= 11 || h < 5 || S.briefedDay === today() || !D) return; briefPending = true; }
document.addEventListener('pointerdown', () => { if (!briefPending) return; briefPending = false; S.briefedDay = today(); save(); const f = (D.briefing.focus || []).slice(0, 3); const nx = D.calendar.events.find(e => !e.allDay && e.start > Date.now() && e.start < sgMidnight() + DAY); speak(`Good morning, Malone. ${D.briefing.headline} ${f.length ? 'Your must-dos: ' + f.join('. ') + '.' : ''} ${nx ? 'First up, ' + nx.title + ' at ' + hm(nx.start) + '.' : ''}`); }, true);

// ---------- 19. steps via Shortcut deep link ----------
(function stepsLink() { const m = location.hash.match(/steps=(\d+)/); if (m) { L('steps', []).push({ n: +m[1], t: Date.now() }); save(); history.replaceState(null, '', location.pathname + '#life/body'); setTimeout(() => toast(`Steps synced: ${(+m[1]).toLocaleString()}`), 800); } })();

// ---------- render hooks ----------
const origRender = render;
render = function () { origRender(); const r = route(); if (r.s === 'body') paintPhotos(); if (r.g === 'home') paintWeather(); };

// ---------- boot ----------
applyTheme();
(async () => { await faceGate(); boot(); setTimeout(maybeBrief, 1500); })();
