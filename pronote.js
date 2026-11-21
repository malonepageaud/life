// Pronote-style School hub: Accueil, Emploi du temps, Travail à faire, Notes (+ Révisions, Study).
// Setting 'pronote': 'school' (default) | 'all' | 'off'.
(function () {
  const PN = () => setting('pronote', 'school');
  const TZ = 'Asia/Singapore', DAYMS = 864e5;
  const fr = (t, o) => new Date(t).toLocaleDateString('fr-FR', { timeZone: TZ, ...o });
  const hhmm = (t) => new Date(t).toLocaleTimeString('fr-FR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }).replace(':', 'h');
  const num = (v, d = 2) => v == null || isNaN(v) ? '-' : (+v).toFixed(d).replace('.', ',').replace(/,00$/, '');
  const sgMid = (t = Date.now()) => { const d = new Date(t + 8 * 3600000); d.setUTCHours(0, 0, 0, 0); return d.getTime() - 8 * 3600000; };
  const courses = () => D.grades?.courses || [];
  const KEYS = [['macro', 'Macro'], ['math', 'Maths'], ['financial', 'FinAcc'], ['finacc', 'FinAcc'], ['spoc', 'SPOC'], ['communication', 'Comm'], ['comm', 'Comm'], ['chinese', 'Chinese'], ['stat', 'Stats'], ['geopol', 'Geo'], ['excel', 'Excel'], ['marketing', 'Marketing'], ['brain', 'Br.AI.n'], ['br.ai.n', 'Br.AI.n'], ['japanese', 'Japanese']];
  function courseOf(title) { const t = String(title).toLowerCase(); const k = KEYS.find(([w]) => t.includes(w)); return k ? courses().find(c => c.short === k[1]) : null; }
  const colorOf = (title, fallback) => courseOf(title)?.color || fallback || '#8aa1b1';
  const nameOf = (title) => courseOf(title)?.name || String(title).replace(/ Gr(ou)?p [A-Z0-9]+$/i, '');
  const uniqHw = () => { const seen = new Set(); return (D.homework || []).filter(h => { const k = h.url || (h.course + h.title); if (seen.has(k)) return false; seen.add(k); return true; }); };
  const roomOf = (e) => e.location || (D.rooms || {})[courseOf(e.title)?.short] || '';
  const isClass = (e) => !e.allDay && (courseOf(e.title) || /group|grp|lv3/i.test(e.title));

  // ---------- Accueil ----------
  V.pn_home = () => {
    const now = Date.now(), m0 = sgMid(), hasToday = D.calendar.events.some(e => isClass(e) && e.start >= m0 && e.start < m0 + DAYMS && e.end > now);
    let day = hasToday ? m0 : null; if (!day) { for (let i = 1; i < 10; i++) if (D.calendar.events.some(e => isClass(e) && e.start >= m0 + i * DAYMS && e.start < m0 + (i + 1) * DAYMS)) { day = m0 + i * DAYMS; break; } }
    const ev = day ? D.calendar.events.filter(e => isClass(e) && e.start >= day && e.start < day + DAYMS) : [];
    const hw = uniqHw().filter(h => h.due && h.due > now).sort((a, b) => a.due - b.due).slice(0, 4);
    const items = courses().flatMap(c => (c.items || []).filter(i => i.grade && !isNaN(parseFloat(i.grade))).map(i => ({ c, i }))).slice(-6).reverse();
    const ex = (D.exams || []).filter(e => e.t > now).slice(0, 4);
    return `<div class="pn-grid">
      <section class="pn-card"><h3>Emploi du temps <small>${day ? (day === m0 ? "aujourd'hui" : fr(day, { weekday: 'long', day: 'numeric', month: 'long' })) : ''}</small></h3>
        ${ev.map(e => `<div class="pn-cours"><span class="pn-h">${hhmm(e.start)}<br><em>${hhmm(e.end)}</em></span><i style="background:${colorOf(e.title)}"></i><div><b>${esc(nameOf(e.title))}</b>${roomOf(e) ? `<span>Salle ${esc(roomOf(e))}</span>` : ''}</div></div>`).join('') || '<div class="pn-empty">Pas de cours</div>'}
        <a class="pn-more" href="#school/pn_edt">Voir l'emploi du temps</a></section>
      <section class="pn-card"><h3>Travail à faire</h3>
        ${hw.map(h => `<div class="pn-taf-mini"><i style="background:${esc(h.color)}"></i><div><span class="pn-mat">${esc(courseOf(h.course)?.name || h.course)}</span><b>${esc(h.title)}</b><span class="pn-pour">Pour ${pourLabel(h.due)}</span></div></div>`).join('') || '<div class="pn-empty">Aucun travail</div>'}
        <a class="pn-more" href="#school/pn_taf">Tout le travail à faire</a></section>
      <section class="pn-card pr-home"><h3>Dernières notes</h3>
        ${items.map(({ c, i }) => `<div class="pr-last"><i style="background:${c.color}"></i><div><b>${esc(c.name.toUpperCase())}</b><span>${esc(i.name)}</span></div><em>${(() => { const g = parseFloat(i.grade); return num(g) + (g > 20 ? '<small>/100</small>' : ''); })()}</em></div>`).join('') || '<div class="pn-empty">Aucune note</div>'}
        <a class="pn-more" href="#school/pn_notes">Toutes les notes</a></section>
      <section class="pn-card"><h3>Examens à venir</h3>
        ${ex.map(e => `<div class="pn-ex"><span class="pn-j">J-${Math.max(0, Math.ceil((e.t - now) / DAYMS))}</span><div><b>${esc(e.course.split(' (')[0])}</b><span>${fr(e.t, { weekday: 'long', day: 'numeric', month: 'long' })} à ${hhmm(e.t)}</span></div></div>`).join('') || '<div class="pn-empty">Aucun examen</div>'}</section>
      <section class="pn-card pn-moy"><h3>Moyenne générale</h3><div class="pn-big">${num(D.grades?.average)}<small>/20</small></div><span>Pondérée par les ECTS, sur les notes publiées</span></section>
    </div>`;
  };
  function pourLabel(t) { const d = Math.round((sgMid(t) - sgMid()) / DAYMS); return d === 0 ? "aujourd'hui" : d === 1 ? 'demain' : fr(t, { weekday: 'long', day: 'numeric', month: 'long' }); }

  // ---------- Emploi du temps ----------
  V.pn_edt = () => {
    const off = S._pnDay || 0, day = sgMid() + off * DAYMS, H0 = 8, H1 = 21, PX = 54;
    const ev = D.calendar.events.filter(e => !e.allDay && e.start >= day && e.start < day + DAYMS);
    const exams = (D.exams || []).filter(e => e.t >= day && e.t < day + DAYMS);
    const pos = (t) => ((t - day) / 3600000 - H0) * PX;
    const now = Date.now();
    return `<div class="pn-card pn-edt"><div class="pn-daynav"><button class="pn-arrow" data-act="pnday" data-d="-1">‹</button><b>${fr(day, { weekday: 'long', day: 'numeric', month: 'long' })}</b><button class="pn-arrow" data-act="pnday" data-d="1">›</button>${off ? '<button class="pn-today" data-act="pnday" data-d="0">Aujourd\'hui</button>' : ''}</div>
      <div class="pn-grille" style="height:${(H1 - H0) * PX}px">
        ${Array.from({ length: H1 - H0 }, (_, i) => `<div class="pn-heure" style="top:${i * PX}px"><span>${H0 + i}h00</span></div>`).join('')}
        ${ev.map(e => { const c = colorOf(e.title, isClass(e) ? null : '#9aa7b0'); const top = Math.max(0, pos(e.start)), h = Math.max(26, pos(e.end) - top - 2); return `<div class="pn-bloc ${isClass(e) ? '' : 'perso'}" style="top:${top}px;height:${h}px;--c:${c}"><b>${esc(nameOf(e.title))}</b><span>${hhmm(e.start)} - ${hhmm(e.end)}${roomOf(e) ? ' · Salle ' + esc(roomOf(e)) : ''}</span></div>`; }).join('')}
        ${exams.map(e => `<div class="pn-bloc exam" style="top:${Math.max(0, pos(e.t))}px;height:${PX * 1.5}px"><b>DEVOIR SURVEILLÉ · ${esc(e.course.split(' (')[0])}</b><span>${hhmm(e.t)}</span></div>`).join('')}
        ${now >= day && now < day + DAYMS ? `<div class="pn-now" style="top:${pos(now)}px"></div>` : ''}
        ${!ev.length && !exams.length ? '<div class="pn-empty" style="position:absolute;top:40%;width:100%">Pas de cours ce jour</div>' : ''}
      </div></div>`;
  };
  ACT.pnday = (el) => { const d = +el.dataset.d; S._pnDay = d === 0 ? 0 : (S._pnDay || 0) + d; };

  // ---------- Travail à faire ----------
  V.pn_taf = () => {
    const now = Date.now(), done = L('pnDone', {});
    const allTaf = [...uniqHw(), ...(D.pronoteTaf || []).filter(t => !uniqHw().some(h => h.title === t.title)).map(t => ({ ...t, label: t.kind, desc: t.desc }))];
    const list = allTaf.filter(h => h.due && h.due > now - DAYMS).sort((a, b) => a.due - b.due);
    const groups = {}; for (const h of list) (groups[sgMid(h.due)] ||= []).push(h);
    const nodue = allTaf.filter(h => !h.due);
    const row = (h) => { const k = h.id || h.title, on = done[k] || isDone(h.id); return `<div class="pn-taf ${on ? 'fait' : ''}"><i style="background:${esc(h.color)}"></i><div class="pn-taf-body"><div class="pn-mat">${esc(courseOf(h.course)?.name || h.course)}</div><b>${esc(h.title)}</b>${h.desc || h.note ? `<p>${esc((h.note || h.desc).slice(0, 220))}${(h.note || h.desc).length > 220 ? '…' : ''}</p>` : ''}<div class="pn-taf-foot"><span>${h.label ? esc(h.label) : ''}${h.label && h.due ? ' · ' : ''}${h.due ? hhmm(h.due) : ''}</span>${h.url ? `<a href="${esc(h.url)}" target="_blank" rel="noopener">Ouvrir sur Moodle</a>` : ''}</div></div><button class="pn-fait ${on ? 'on' : ''}" data-act="pnfait" data-k="${esc(k)}">${on ? '✓ Fait' : 'Fait'}</button></div>`; };
    return Object.entries(groups).map(([d, hs]) => `<div class="pn-card"><h3>Pour ${pourLabel(+d)}</h3>${hs.map(row).join('')}</div>`).join('') + (nodue.length ? `<div class="pn-card"><h3>Sans date</h3>${nodue.map(row).join('')}</div>` : '') || '<div class="pn-card"><div class="pn-empty">Aucun travail à faire</div></div>';
  };
  ACT.pnfait = (el) => { const d = L('pnDone', {}); d[el.dataset.k] = !d[el.dataset.k]; };

  // ---------- Notes (copie de l'écran "Mes notes" de l'app Pronote) ----------
  const den = (g) => g > 20 ? 100 : 20;
  const gradeCell = (g) => { const d = den(g); return `${num(g)}${d !== 20 ? `<small>/${d}</small>` : ''}`; };
  const frDate = (t) => t ? 'le ' + fr(t, { day: 'numeric', month: 'long' }) : '';
  const STATUS = { attente: 'En attente', nnot: 'Non publié' };
  const evalCell = (e) => e.grade != null ? gradeCell(e.grade) : `<em class="pr-np">${STATUS[e.status] || '-'}</em>`;
  V.pn_notes = () => {
    const tab = S._pnNotesTab || 'matiere', cs = courses();
    const tabs = `<div class="pr-period"><button disabled>‹</button><b>Semestre 1</b><button disabled>›</button></div>
      <div class="pr-tabs">${[['date', 'Date'], ['matiere', 'Matière'], ['bulletin', 'Bulletin']].map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-act="pnntab" data-t="${k}">${l}</button>`).join('')}</div>`;
    const head = (c) => `<div class="pr-mat-h" style="--c:${c.color}"><span>${esc(c.name.toUpperCase())}<small>Coefficient ${c.ects ?? '-'}</small></span><b>${c.current != null ? num(c.current) : ''}</b></div>`;
    let body = '';
    if (tab === 'matiere') {
      body = cs.map((c, ci) => { const ev = c.evals || []; return `<div class="pr-mat">${head(c)}
        ${ev.map((e, ei) => `<button class="pr-row" data-act="pnnote" data-c="${ci}" data-i="${ei}"><span>${esc(e.name)}${e.date ? `<small>${frDate(e.date)}</small>` : ''}</span><b>${evalCell(e)}</b></button>`).join('') || `<div class="pr-row empty"><span>Aucune note pour l'instant</span></div>`}
        <div class="pr-row moy"><span>Moyenne ${esc(c.short)}${c.gradedShare ? ` <small>sur ${c.gradedShare} % de la note</small>` : ''}</span><b>${c.current != null ? num(c.current) : '-'}</b></div></div>`; }).join('');
    } else if (tab === 'date') {
      const all = cs.flatMap((c, ci) => (c.evals || []).map((e, ei) => ({ c, ci, e, ei }))).filter(x => x.e.grade != null || x.e.date).sort((x, y) => (y.e.date || 0) - (x.e.date || 0));
      body = all.map(({ c, ci, e, ei }) => `<button class="pr-row pr-daterow" data-act="pnnote" data-c="${ci}" data-i="${ei}" style="--c:${c.color}"><span><strong>${esc(c.name.toUpperCase())}</strong>${esc(e.name)}${e.date ? ` · ${frDate(e.date)}` : ''}</span><b>${evalCell(e)}</b></button>`).join('');
    } else {
      body = cs.map(c => `<div class="pr-mat">${head(c)}
        ${(c.components || []).map(p => `<div class="pr-row info"><span>${esc(p.name)} (${p.weight} %)</span><b class="${p.grade == null ? 'np' : ''}">${p.grade != null ? num(p.grade) : 'Non publié'}</b></div>`).join('')}
        <div class="pr-row moy"><span>Moyenne</span><b>${c.current != null ? num(c.current) : '-'}</b></div></div>`).join('');
    }
    const counted = cs.filter(c => c.current != null), coefSum = counted.reduce((t, c) => t + (c.ects || 0), 0);
    return `<div class="pr-wrap">${tabs}${body}<div class="pr-moygen"><div><span>Moyenne générale élève</span><small>${counted.map(c => `${esc(c.short)} ×${c.ects}`).join(' · ')} = coef. ${coefSum}</small></div><b>${num(D.grades?.average)}</b></div></div>`;
  };
  ACT.pnntab = (el) => { S._pnNotesTab = el.dataset.t; };
  ACT.pnnote = (el) => {
    const c = courses()[+el.dataset.c], e = (c.evals || [])[+el.dataset.i]; if (!e) return false;
    document.querySelector('.pr-sheet')?.remove();
    const sh = document.createElement('div'); sh.className = 'pr-sheet';
    sh.innerHTML = `<div class="pr-sheet-card"><div class="pr-mat-h" style="--c:${c.color}"><span>${esc(c.name.toUpperCase())}<small>Coefficient ${c.ects ?? '-'}</small></span></div><div class="pr-sheet-t">${esc(e.name)}${e.date ? `<small>${frDate(e.date)}</small>` : ''}</div>
      <div class="pr-row info"><span>Note élève</span><b>${evalCell(e)}</b></div>
      <div class="pr-row info"><span>Moyenne de la matière</span><b>${c.current != null ? num(c.current) : '-'}</b></div>
      ${e.url ? `<a class="pr-sheet-btn" href="${esc(e.url)}" target="_blank" rel="noopener">Voir sur Moodle</a>` : ''}<button class="pr-sheet-x">Fermer</button></div>`;
    sh.onclick = (ev) => { if (ev.target === sh || ev.target.closest('.pr-sheet-x')) sh.remove(); };
    document.body.appendChild(sh); return false;
  };

  // Pronote mobile header
  const TITLES = { pn_home: "Page d'accueil", pn_edt: 'Emploi du temps', pn_taf: 'Travail à faire', pn_notes: 'Mes notes', planner: 'Révisions', study: 'Study' };
  function pnHeader(seg) {
    const top = document.querySelector('.top'); if (!top) return;
    let h = document.getElementById('prHead');
    if (!document.body.classList.contains('pn')) { h?.remove(); return; }
    if (!h) { h = document.createElement('div'); h.id = 'prHead'; h.className = 'pr-head'; top.parentNode.insertBefore(h, top); }
    h.innerHTML = `<i class="pr-blob"></i><div class="pr-av">MP</div><div class="pr-who"><small>PAGEAUD Malone</small><b>${TITLES[seg] || 'School'}</b></div><a class="pr-ic" href="#school/pn_home" aria-label="Accueil"><svg viewBox="0 0 24 24" width="24" height="24" fill="#fff"><path d="M12 3 2 12h3v8h5v-5h4v5h5v-8h3z"/></svg></a><button class="pr-ic" data-act="pnsync" aria-label="Actualiser"><svg viewBox="0 0 24 24" width="26" height="26" stroke="#fff" stroke-width="2.2" stroke-linecap="round"><path d="M4 7h16M8 12h12M12 17h8"/></svg></button>`;
  }
  ACT.pnsync = () => { load(true).catch(() => toast('Actualisation impossible')); return false; };

  // ---------- wiring ----------
  const seg0 = GROUPS.school.segs;
  function applySegs() {
    if (PN() === 'off') GROUPS.school.segs = seg0;
    else GROUPS.school.segs = [['pn_home', 'Accueil'], ['pn_edt', 'Emploi du temps'], ['pn_taf', 'Travail à faire'], ['pn_notes', 'Notes'], ['planner', 'Révisions'], ['study', 'Study'], ...seg0.filter(s => !['homework', 'grades', 'planner', 'study', 'classes'].includes(s[0]))];
    for (const [s] of GROUPS.school.segs) SEG2GROUP[s] = 'school';
    if (S.lastSeg?.school && !GROUPS.school.segs.some(x => x[0] === S.lastSeg.school)) S.lastSeg.school = GROUPS.school.segs[0][0];
  }
  applySegs();
  const prevRender = render;
  render = function () {
    applySegs();
    const r = route(), mode = PN();
    document.body.classList.toggle('pn', mode !== 'off' && (mode === 'all' || r.g === 'school'));
    prevRender();
    pnHeader(r.s);
  };
  // System setting
  const prevSys = V.system;
  V.system = () => prevSys().replace('<div class="card"><h2>Security</h2>', `<div class="card"><h2>Style Pronote</h2><div class="chartrow"><span>Interface façon Pronote</span><span></span><span class="row" style="gap:6px">${[['school', 'School'], ['all', 'Toute l\'app'], ['off', 'Off']].map(([v, l]) => `<button class="btn ${PN() === v ? 'pri' : ''}" data-act="pnmode" data-v="${v}">${l}</button>`).join('')}</span></div></div><div class="card"><h2>Security</h2>`);
  ACT.pnmode = (el) => { (S.set ||= {}).pronote = el.dataset.v; applySegs(); };
  if (typeof D !== 'undefined' && D) render();
})();
