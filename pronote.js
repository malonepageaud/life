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
  const KEYS = [['macro', 'Macro'], ['math', 'Maths'], ['financial', 'FinAcc'], ['finacc', 'FinAcc'], ['spoc', 'SPOC'], ['communication', 'Comm'], ['chinese', 'Chinese'], ['stat', 'Stats'], ['geopol', 'Geo'], ['excel', 'Excel'], ['marketing', 'Marketing'], ['brain', 'Br.AI.n'], ['br.ai.n', 'Br.AI.n'], ['japanese', 'Japanese']];
  function courseOf(title) { const t = String(title).toLowerCase(); const k = KEYS.find(([w]) => t.includes(w)); return k ? courses().find(c => c.short === k[1]) : null; }
  const colorOf = (title, fallback) => courseOf(title)?.color || fallback || '#8aa1b1';
  const nameOf = (title) => courseOf(title)?.name || String(title).replace(/ Gr(ou)?p [A-Z0-9]+$/i, '');
  const uniqHw = () => { const seen = new Set(); return (D.homework || []).filter(h => { const k = h.url || (h.course + h.title); if (seen.has(k)) return false; seen.add(k); return true; }); };
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
        ${ev.map(e => `<div class="pn-cours"><span class="pn-h">${hhmm(e.start)}<br><em>${hhmm(e.end)}</em></span><i style="background:${colorOf(e.title)}"></i><div><b>${esc(nameOf(e.title))}</b>${e.location ? `<span>${esc(e.location)}</span>` : ''}</div></div>`).join('') || '<div class="pn-empty">Pas de cours</div>'}
        <a class="pn-more" href="#school/pn_edt">Voir l'emploi du temps</a></section>
      <section class="pn-card"><h3>Travail à faire</h3>
        ${hw.map(h => `<div class="pn-taf-mini"><i style="background:${esc(h.color)}"></i><div><span class="pn-mat">${esc(courseOf(h.course)?.name || h.course)}</span><b>${esc(h.title)}</b><span class="pn-pour">Pour ${pourLabel(h.due)}</span></div></div>`).join('') || '<div class="pn-empty">Aucun travail</div>'}
        <a class="pn-more" href="#school/pn_taf">Tout le travail à faire</a></section>
      <section class="pn-card"><h3>Dernières notes</h3>
        ${items.map(({ c, i }) => `<div class="pn-note-mini"><i style="background:${c.color}"></i><div><span class="pn-mat">${esc(c.name)}</span><span>${esc(i.name)}</span></div><b>${num(parseFloat(i.grade))}<small>/20</small></b></div>`).join('') || '<div class="pn-empty">Aucune note</div>'}
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
        ${ev.map(e => { const c = colorOf(e.title, isClass(e) ? null : '#9aa7b0'); const top = Math.max(0, pos(e.start)), h = Math.max(26, pos(e.end) - top - 2); return `<div class="pn-bloc ${isClass(e) ? '' : 'perso'}" style="top:${top}px;height:${h}px;--c:${c}"><b>${esc(nameOf(e.title))}</b><span>${hhmm(e.start)} - ${hhmm(e.end)}${e.location ? ' · ' + esc(e.location) : ''}</span></div>`; }).join('')}
        ${exams.map(e => `<div class="pn-bloc exam" style="top:${Math.max(0, pos(e.t))}px;height:${PX * 1.5}px"><b>DEVOIR SURVEILLÉ · ${esc(e.course.split(' (')[0])}</b><span>${hhmm(e.t)}</span></div>`).join('')}
        ${now >= day && now < day + DAYMS ? `<div class="pn-now" style="top:${pos(now)}px"></div>` : ''}
        ${!ev.length && !exams.length ? '<div class="pn-empty" style="position:absolute;top:40%;width:100%">Pas de cours ce jour</div>' : ''}
      </div></div>`;
  };
  ACT.pnday = (el) => { const d = +el.dataset.d; S._pnDay = d === 0 ? 0 : (S._pnDay || 0) + d; };

  // ---------- Travail à faire ----------
  V.pn_taf = () => {
    const now = Date.now(), done = L('pnDone', {});
    const list = uniqHw().filter(h => h.due && h.due > now - DAYMS).sort((a, b) => a.due - b.due);
    const groups = {}; for (const h of list) (groups[sgMid(h.due)] ||= []).push(h);
    const nodue = uniqHw().filter(h => !h.due);
    const row = (h) => { const k = h.id || h.title, on = done[k] || isDone(h.id); return `<div class="pn-taf ${on ? 'fait' : ''}"><i style="background:${esc(h.color)}"></i><div class="pn-taf-body"><div class="pn-mat">${esc(courseOf(h.course)?.name || h.course)}</div><b>${esc(h.title)}</b>${h.desc || h.note ? `<p>${esc((h.note || h.desc).slice(0, 220))}${(h.note || h.desc).length > 220 ? '…' : ''}</p>` : ''}<div class="pn-taf-foot"><span>${h.label ? esc(h.label) + ' · ' : ''}${hhmm(h.due)}</span>${h.url ? `<a href="${esc(h.url)}" target="_blank" rel="noopener">Ouvrir sur Moodle</a>` : ''}</div></div><button class="pn-fait ${on ? 'on' : ''}" data-act="pnfait" data-k="${esc(k)}">${on ? '✓ Fait' : 'Fait'}</button></div>`; };
    return Object.entries(groups).map(([d, hs]) => `<div class="pn-card"><h3>Pour ${pourLabel(+d)}</h3>${hs.map(row).join('')}</div>`).join('') + (nodue.length ? `<div class="pn-card"><h3>Sans date</h3>${nodue.map(row).join('')}</div>` : '') || '<div class="pn-card"><div class="pn-empty">Aucun travail à faire</div></div>';
  };
  ACT.pnfait = (el) => { const d = L('pnDone', {}); d[el.dataset.k] = !d[el.dataset.k]; };

  // ---------- Notes ----------
  V.pn_notes = () => {
    const cs = courses();
    return `<div class="pn-card pn-moy-top"><div><h3>Moyenne générale</h3><span>Pondérée par les ECTS, sur les notes publiées</span></div><div class="pn-big">${num(D.grades?.average)}<small>/20</small></div></div>` +
      cs.map(c => {
        const items = (c.items || []).filter(i => i.grade && !isNaN(parseFloat(i.grade)));
        return `<div class="pn-card pn-mat-card"><div class="pn-mat-head" style="--c:${c.color}"><div><b>${esc(c.name)}</b><span>Coef. ${c.ects || '-'} ECTS${c.gradedShare != null ? ' · ' + c.gradedShare + '% de la note publié' : ''}</span></div><div class="pn-moy-mat">${c.current != null ? num(c.current) : '<em>-</em>'}</div></div>
          ${(c.components || []).map(p => `<div class="pn-ligne"><span>${esc(p.name)} <small>${p.weight}%</small></span><b class="${p.grade == null ? 'np' : ''}">${p.grade != null ? num(p.grade) + '<small>/20</small>' : 'Non publié'}</b></div>`).join('')}
          ${items.length ? `<details><summary>Détail des notes (${items.length})</summary>${items.map(i => `<div class="pn-ligne sub"><span>${esc(i.name)}</span><b>${num(parseFloat(i.grade))}<small>/20</small></b></div>`).join('')}</details>` : ''}</div>`;
      }).join('');
  };

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
  };
  // System setting
  const prevSys = V.system;
  V.system = () => prevSys().replace('<div class="card"><h2>Security</h2>', `<div class="card"><h2>Style Pronote</h2><div class="chartrow"><span>Interface façon Pronote</span><span></span><span class="row" style="gap:6px">${[['school', 'School'], ['all', 'Toute l\'app'], ['off', 'Off']].map(([v, l]) => `<button class="btn ${PN() === v ? 'pri' : ''}" data-act="pnmode" data-v="${v}">${l}</button>`).join('')}</span></div></div><div class="card"><h2>Security</h2>`);
  ACT.pnmode = (el) => { (S.set ||= {}).pronote = el.dataset.v; applySegs(); };
  if (typeof D !== 'undefined' && D) render();
})();
