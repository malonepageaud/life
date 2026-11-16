'use strict';
// Wayne pack: cinematic briefing, Batcave night mode, Command Center, better voice, haptics, Life Index,
// dossiers (LinkedIn), missions, luxury sounds, DND, weekly report, gold particles, "Hey Jarvis".
(function () {
  const sgH = () => sgParts(Date.now()).h;

  // ---------- 5. haptics (iOS 18 switch trick + Android vibrate) ----------
  let hapEl = null;
  function hap(kind = 'light') {
    if (!setting('sounds', true)) return;
    const pulses = kind === 'success' ? 2 : kind === 'alert' ? 3 : 1;
    try { if (navigator.vibrate) { navigator.vibrate(kind === 'success' ? [12, 60, 18] : kind === 'alert' ? [20, 50, 20, 50, 30] : 10); return; } } catch { }
    try {
      if (!hapEl) { hapEl = document.createElement('label'); hapEl.style.cssText = 'position:fixed;left:-99px;top:0;opacity:0'; hapEl.innerHTML = '<input type="checkbox" switch>'; document.body.appendChild(hapEl); }
      for (let i = 0; i < pulses; i++) setTimeout(() => hapEl.click(), i * 90);
    } catch { }
  }
  window.hap = hap;

  // ---------- 10. luxury sounds (FM chime) ----------
  let ac = null;
  function chime(notes = [880, 1318], dur = 0.5, vol = 0.05) {
    if (!setting('sounds', true)) return;
    try {
      ac ||= new (window.AudioContext || window.webkitAudioContext)();
      notes.forEach((f, i) => {
        const t0 = ac.currentTime + i * 0.09;
        const car = ac.createOscillator(), mod = ac.createOscillator(), mg = ac.createGain(), g = ac.createGain();
        car.type = 'sine'; car.frequency.value = f; mod.type = 'sine'; mod.frequency.value = f * 2.76; mg.gain.value = f * 0.9;
        mod.connect(mg); mg.connect(car.frequency); car.connect(g); g.connect(ac.destination);
        g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        mg.gain.exponentialRampToValueAtTime(1, t0 + dur);
        car.start(t0); mod.start(t0); car.stop(t0 + dur + 0.05); mod.stop(t0 + dur + 0.05);
      });
    } catch { }
  }
  let muteUntil = 0;
  beep = function (f = 880, d = 0.06) { if (Date.now() < muteUntil) return; chime([f], Math.max(0.18, d * 3), 0.035); };
  window.chime = chime;
  window.addEventListener('click', (e) => {
    const a = e.target.closest('[data-act]')?.dataset.act; if (!a) return; muteUntil = Date.now() + 120;
    if (/^(todo|focus|biz|ex|ms|habit|pack|shop|rev|rate)$/.test(a)) { const on = !e.target.closest('.check')?.classList.contains('on'); if (on) { chime([1046, 1568], 0.45, 0.04); hap('success'); } else hap(); }
    else if (/send|orb|askopt|qchip/.test(a)) hap();
  }, true);
  let opened = false; document.addEventListener('pointerdown', () => { if (opened) return; opened = true; chime([523, 784, 1046], 0.7, 0.03); }, { once: true, capture: true });

  // ---------- 4. better Jarvis voice ----------
  speak = function (text) {
    if (!voiceOn() || !('speechSynthesis' in window) || !text) return;
    try {
      const vs = speechSynthesis.getVoices();
      const pick = vs.find(v => /Daniel.*(Enhanced|Premium)/i.test(v.name)) || vs.find(v => /Arthur|Jamie.*Enhanced|Oliver/i.test(v.name) && /en-GB/i.test(v.lang)) || vs.find(v => /Daniel/i.test(v.name)) || vs.find(v => /en-GB/i.test(v.lang)) || null;
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(String(text)); u.voice = pick; u.rate = 1.05; u.pitch = 1.0; speechSynthesis.speak(u);
    } catch { }
  };


  // ---------- neural voice: encrypted MP3 made on the Mac (briefing + latest reply) ----------
  const voiceEl = new Audio(); voiceEl.preload = 'auto'; let voiceUnlocked = false;
  document.addEventListener('pointerdown', () => { if (voiceUnlocked) return; voiceUnlocked = true; try { voiceEl.src = 'data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQxAADB8AhSmxhIIEVCSiJrDCQBTcu3UrAIwUdkRgQbFAZC1CQEwTJ9mjRvBA4UOLD8nKVOWfh+UlK3z/177OXrfOdKl7pyn3Xf//WreyTRUoAWgBgkOAGbZHBgG1OF6zM82DWbZaUmMBptgQhGjsyYqc9ae9XFz280948NMBWInljyzsNRFLPWdnZGWrddDsjK1unuSrVN9jJsK8KuQtQCtMBjCEtImISdNKJOopIpBFpNSMbIHCSRpRR5iakjTiyzLhchUUBwCgyKiweBv/7UsQbg8isVNoMPMjAAAA0gAAABEVFGmgqK////9bP/6XCykxBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq'; voiceEl.play().then(() => voiceEl.pause()).catch(() => { }); } catch { } }, { capture: true });
  const audioCache = {}, audioEnv = {}; let curFile = null, lastSaid = '';
  async function computeEnv(file, buf) {
    try { const ac = new OfflineAudioContext(1, 1, 24000); const ab = await ac.decodeAudioData(buf); const d = ab.getChannelData(0), step = Math.floor(ab.sampleRate / 30), out = new Float32Array(Math.ceil(d.length / step)); let mx = 1e-4;
      for (let i = 0; i < out.length; i++) { let s = 0; const e = Math.min(d.length, (i + 1) * step); for (let j = i * step; j < e; j += 4) s += d[j] * d[j]; out[i] = Math.sqrt(s / (step / 4)); if (out[i] > mx) mx = out[i]; }
      for (let i = 0; i < out.length; i++) out[i] = Math.min(1, Math.pow(out[i] / mx, 0.7) * 1.1); audioEnv[file] = out; } catch (e) { }
  }
  function voiceLevel() { if (voiceEl.paused || voiceEl.ended) return 0; const e = audioEnv[curFile]; if (!e) return 0.45 + 0.25 * Math.sin(performance.now() / 90); return e[Math.min(e.length - 1, Math.floor(voiceEl.currentTime * 30))] || 0; }
  const sha12 = async (t) => [...new Uint8Array(await crypto.subtle.digest('SHA-1', new TextEncoder().encode(String(t).trim())))].map(x => x.toString(16).padStart(2, '0')).join('').slice(0, 12);
  async function clipUrl(file) {
    if (audioCache[file]) return audioCache[file];
    const r = await fetch(file, { cache: 'force-cache' }); if (!r.ok) throw new Error('no audio');
    const buf = new Uint8Array(await r.arrayBuffer());
    const key = await getKey(localStorage.getItem('life:pass'), D.voice.salt);
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: buf.slice(0, 12) }, key, buf.slice(12));
    computeEnv(file, pt.slice(0));
    return (audioCache[file] = URL.createObjectURL(new Blob([pt], { type: 'audio/mpeg' })));
  }
  const reqd = {};
  // say(text, {force}) : plays Jarvis' studio voice for this exact text. If the clip is not made yet, asks the Mac to make it.
  async function say(text, opt = {}) {
    if (!text || (!opt.force && !voiceOn())) return false;
    const k = await sha12(text), file = D?.voice?.clips?.[k];
    if (file) { try { const url = await clipUrl(file); speechSynthesis?.cancel(); curFile = file; lastSaid = String(text); voiceEl.src = url; await Promise.race([voiceEl.play(), new Promise((_, rej) => setTimeout(() => rej(new Error('play timeout')), 3000))]); onSpeakStart(String(text)); return true; } catch (e) { console.warn('clip failed', e); } }
    if (!reqd[k]) { reqd[k] = 1; postMsg({ id: 'tts' + Date.now(), t: Date.now(), time: new Date().toISOString(), text: '[tts] ' + String(text).trim() }).catch(() => { }); }
    if (opt.force && !opt.quiet) toast('Jarvis is preparing this in his voice. Ready in about 3 minutes.');
    return false;
  }
  // prefetch so playback starts instantly
  async function prefetch(text) { try { const f = D?.voice?.clips?.[await sha12(text)]; if (f) clipUrl(f); } catch { } }
  async function playNeural(kind) { if (kind === 'briefing' && D?.voice?.briefing) return say(D.voice.briefing.lines.join(' '), { force: true }); return false; }
  window.playNeural = playNeural; window.jarvisSay = say;
  window.playBriefingAudio = () => playNeural('briefing');
  const deviceSpeak = () => { };  // device robot voice retired
  speak = function (text) { say(text); };
  setTimeout(() => { if (D?.voice?.briefing) prefetch(D.voice.briefing.lines.join(' ')); }, 5000);
  ACT.vtest = () => { say('At your service, Mr. Pageaud. All systems are online.', { force: true }); return false; };
  ACT.setvoice = (el) => { postMsg({ id: 'vc' + Date.now(), t: Date.now(), time: new Date().toISOString(), text: '[voice] ' + el.dataset.v }); S._voicePending = el.dataset.v; toast('Switching voice. Ready in about 3 minutes.'); };


  // ---------- Jarvis reacts to what you do (lines written daily by Jarvis, see brain.jarvis) ----------
  let lastReact = 0;
  function jarvisLine(text) {
    document.querySelector('.jline')?.remove();
    const el = document.createElement('div'); el.className = 'jline'; el.innerHTML = `<span>J.A.R.V.I.S.</span>${esc(text)}`;
    document.body.appendChild(el); setTimeout(() => el.classList.add('out'), 5200); setTimeout(() => el.remove(), 5800);
  }
  function react(kind, opt = {}) {
    const pool = D?.jarvis?.reactions?.[kind]; if (!pool?.length) return false;
    if (!opt.always && Date.now() - lastReact < 12000) return false; lastReact = Date.now();
    const used = (S._rx ||= {})[kind] || []; const fresh = pool.filter(t => !used.includes(t)); const text = (fresh.length ? fresh : pool)[Math.floor(Math.random() * (fresh.length || pool.length))];
    S._rx[kind] = [text, ...used].slice(0, Math.min(3, pool.length - 1)); save();
    if (!vm) jarvisLine(text); if (setting('talk', true)) say(text, { force: true, quiet: true });
    return true;
  }
  window.jarvisReact = react;
  // check-offs
  window.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]'); if (!el) return; const a = el.dataset.act;
    const wasOn = el.closest('.item, .row, li')?.querySelector('.check')?.classList.contains('on') || el.classList.contains('on');
    if ((a === 'todo' || a === 'ms') && !wasOn) setTimeout(() => react('todo'), 250);
    if (a === 'habit' && !wasOn) setTimeout(() => react('habit'), 250);
  }, true);
  const origLift = ACT.liftsave; if (origLift) ACT.liftsave = (el) => { const r = origLift(el); setTimeout(() => react('gym', { always: true }), 300); return r; };
  const origQF = quizFinish; quizFinish = function () { const r = origQF.apply(this, arguments); try { const n = quiz?.qs?.length || 0, sc = quiz?.score || 0; if (n >= 3) setTimeout(() => react(sc / n >= 0.8 ? 'quizGood' : sc / n >= 0.5 ? 'quizMid' : 'quizBad', { always: true }), 600); } catch { } return r; };
  // opening the app
  function onOpen() {
    const h = sgH(), now = Date.now();
    if (document.querySelector('.cine')) return;
    if (h < 4) { if (S._lateDay !== today()) { S._lateDay = today(); save(); react('late', { always: true }); } return; }
    if (h >= 5 && h < 11 && S.cineDay !== today()) return;  // morning briefing takes over
    if (now - (S._openAt || 0) > 3 * 3600000 && Math.random() < 0.5) { S._openAt = now; save(); react('open', { always: true }); }
  }
  let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') hiddenAt = Date.now(); else if (hiddenAt && Date.now() - hiddenAt > 20 * 60000) setTimeout(onOpen, 1200); });
  setTimeout(onOpen, 5200);



  // ---------- AI mist: the living voice of Jarvis ----------
  const mists = new Set();
  function mkMist(canvas) { if (!window.Mist) return null; const m = new Mist(canvas).start(); mists.add(m); return m; }
  function dropMist(m) { if (m) { m.stop(); mists.delete(m); } }
  (function lvLoop() { const lv = voiceLevel(); for (const m of mists) if (m.mode === 'speak') m.level = lv; requestAnimationFrame(lvLoop); })();
  let dock = null, dockMist = null, vm = null, vmMist = null, vmIdleT = null;
  function showDock() {
    if (vm || document.querySelector('.cine')) return;
    if (!dock) { dock = document.createElement('div'); dock.className = 'mistdock'; dock.innerHTML = '<canvas class="mist"></canvas>'; document.body.appendChild(dock); dockMist = mkMist(dock.querySelector('canvas')); }
    dock.classList.add('on'); if (dockMist) { dockMist.mode = 'speak'; if (!dockMist.on) { dockMist.start(); mists.add(dockMist); } }
  }
  function hideDock() { if (dock) dock.classList.remove('on'); if (dockMist) setTimeout(() => { if (!dock?.classList.contains('on')) { dockMist.stop(); mists.delete(dockMist); } }, 700); }
  function onSpeakStart(text) { if (vm) { vmSet('speak', 'Jarvis'); vm.querySelector('.vm-say').textContent = text; } else showDock(); }
  voiceEl.addEventListener('ended', () => { hideDock(); if (vm) afterSpeak(); });
  voiceEl.addEventListener('pause', () => { if (voiceEl.ended) return; hideDock(); });
  function vmOpen() {
    if (vm) return vm;
    vm = document.createElement('div'); vm.className = 'vmode';
    vm.innerHTML = `<div class="vm-top"><span>J.A.R.V.I.S.</span><button class="vm-x">Close</button></div><div class="vm-stage"><canvas class="mist"></canvas></div><div class="vm-status"></div><div class="vm-you"></div><div class="vm-say"></div><div class="vm-hint">Tap the mist to talk</div>`;
    document.body.appendChild(vm); vmMist = mkMist(vm.querySelector('canvas'));
    vm.querySelector('.vm-x').onclick = vmClose;
    vm.querySelector('.vm-stage').onclick = () => { if (listening) { stopMic(); vmSet('idle', ''); } else { try { voiceEl.pause(); } catch { } startMic({ quiet: true }); } };
    hideDock(); return vm;
  }
  function vmClose() { stopMic(); try { voiceEl.pause(); } catch { } if (!vm) return; const el = vm; vm = null; dropMist(vmMist); vmMist = null; el.classList.add('out'); setTimeout(() => el.remove(), 350); }
  function vmSet(mode, status) { if (!vm) return; if (vmMist) vmMist.mode = mode; vm.dataset.mode = mode; vm.querySelector('.vm-status').textContent = status ?? ''; vm.querySelector('.vm-hint').style.opacity = (mode === 'idle') ? 1 : 0; }
  function afterSpeak() {
    if (!vm) return;
    const waiting = pending().some(m => m.status === 'sent');
    if (waiting) { vmSet('think', 'Working on it, sir…'); return; }
    vmSet('idle', ''); clearTimeout(vmIdleT); vmIdleT = setTimeout(() => { if (vm && !listening && voiceEl.paused) startMic({ quiet: true, followUp: true }); }, 450);
  }

  // ---------- Talk to Jarvis: tap the mic, speak, he answers out loud ----------
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const isFr = () => (localStorage.getItem('life:lang') || 'en-US').startsWith('fr');
  function playAndWait(text) { return say(text, { force: true, quiet: true }).then(ok => ok ? new Promise(r => { const done = () => { voiceEl.removeEventListener('ended', done); r(true); }; voiceEl.addEventListener('ended', done); setTimeout(done, 4000); }) : false); }
  function localIntent(t) {
    const s = t.toLowerCase();
    if (/\b(book|add|send|email|mail|remind|reserve|cancel|buy|create|schedule|move|delete|write|draft|réserve|ajoute|envoie|rappelle|annule|achète|crée|écris|mets)\b/.test(s)) return null;
    if (/brief(ing)?|résumé de (la|ma) journée|morning report/.test(s)) return 'brief';
    if (/weekly report|my week|ma semaine|rapport/.test(s)) return 'report';
    if (/what('s| is)? next|next (class|event|thing)|prochain|c'est quoi après|après quoi/.test(s)) return 'next';
    if (/tomorrow|demain/.test(s)) return 'tomorrow';
    if (/homework|due|deadline|devoirs?|à rendre|assignments?/.test(s)) return 'due';
    if (/grades?|average|moyenne|notes?\b|gpa/.test(s)) return 'grades';
    if (/exams?|partiels?|finals?\b|examens?/.test(s)) return 'exam';
    if (/weather|météo|temperature|il fait (beau|chaud)|rain|pluie/.test(s)) return 'weather';
    if (/today|my day|schedule|agenda|aujourd'hui|ma journée|planning/.test(s)) return 'today';
    return null;
  }
  let convoUntil = 0, convoPoll = null;
  async function handleUtterance(text) {
    text = text.trim(); if (!text) { if (vm) vmSet('idle', ''); return; }
    $('#msg').value = ''; vmOpen(); vm.querySelector('.vm-you').textContent = '“' + text + '”'; vm.querySelector('.vm-say').textContent = ''; vmSet('think', 'Thinking…');
    const it = localIntent(text);
    if (it === 'brief') { vmClose(); closeSheet(); cinematic(false); return; }
    if (it === 'report') { vmClose(); closeSheet(); location.hash = 'home/report'; setTimeout(() => ACT.playreport(), 900); return; }
    const ans = it && D.voice?.answers?.[it];
    if (ans) { const ok = await playAndWait(ans); if (!ok && vm) { vm.querySelector('.vm-say').textContent = ans; vmSet('idle', ''); } return; }
    sendText(text);
    const ack = isFr() ? pick(D.voice?.acks?.filter(a => /monsieur/.test(a)) || []) : pick(D.voice?.acks?.filter(a => !/monsieur/.test(a)) || []);
    if (ack) say(ack, { force: true, quiet: true }).then(ok => { if (!ok && vm) { vm.querySelector('.vm-say').textContent = ack; vmSet('think', 'Working on it, sir…'); } });
    convoUntil = Date.now() + 12 * 60000;
    clearInterval(convoPoll); convoPoll = setInterval(() => { if (Date.now() > convoUntil) return clearInterval(convoPoll); if (document.visibilityState === 'visible') load().catch(() => { }); }, 12000);
  }
  window.jarvisHandle = handleUtterance;
  // replies from the agent are spoken as soon as they land, even with the chat closed
  const origSpeakNew = speakNew;
  speakNew = function () {
    const last = +(localStorage.getItem('life:spoken') || 0);
    const fresh = (D?.log || []).filter(l => l.reply && l.repliedAt && new Date(l.repliedAt).getTime() > last).sort((a, b) => new Date(a.repliedAt) - new Date(b.repliedAt));
    if (last && fresh.length && (Date.now() < convoUntil || !$('#sheet').classList.contains('hidden'))) {
      const r = fresh.at(-1).reply; if ($('#sheet').classList.contains('hidden') && !vm) jarvisLine(r);
      say(r, { force: true, quiet: true }); localStorage.setItem('life:spoken', String(new Date(fresh.at(-1).repliedAt).getTime()));
      if (!pending().some(m => m.status === 'sent')) convoUntil = Math.min(convoUntil, Date.now() + 60000);
      return;
    }
    origSpeakNew();
  };
  // conversational mic: voice mode, "Yes, sir?", listen, auto-send when you stop talking, follow-ups
  const SRx = window.SpeechRecognition || window.webkitSpeechRecognition;
  let holdingMic = false;
  document.addEventListener('pointerdown', (e) => { if (e.target.closest('.orb')) holdingMic = true; }, true);
  document.addEventListener('pointerup', () => { holdingMic = false; }, true);
  if (SRx) {
    let crec = null, silence = null, noWords = null, heard = '';
    const stopC = () => { listening = false; clearTimeout(silence); clearTimeout(noWords); if (crec) { try { crec.onend = null; crec.stop(); } catch { } crec = null; } $('#mic')?.classList.remove('on'); $('#micState') && ($('#micState').textContent = ''); $('#wave')?.classList.remove('on'); };
    stopMic = stopC;
    startMic = async function (opt = {}) {
      if (listening) return;
      vmOpen(); listening = true; $('#mic')?.classList.add('on');
      if (!opt.quiet && D?.voice?.hellos?.length && !holdingMic) { vmSet('speak', 'Jarvis'); vm.querySelector('.vm-you').textContent = ''; vm.querySelector('.vm-say').textContent = ''; await playAndWait(pick(D.voice.hellos)); }
      if (!listening || !vm) return;
      vmSet('listen', 'Listening…'); if (!opt.followUp) vm.querySelector('.vm-you').textContent = '';
      heard = ''; crec = new SRx(); crec.lang = localStorage.getItem('life:lang') || 'en-US'; crec.continuous = true; crec.interimResults = true;
      clearTimeout(noWords); noWords = setTimeout(() => { if (!heard) { stopC(); vmSet('idle', ''); } }, opt.followUp ? 6000 : 9000);
      crec.onresult = (e) => { let fin = '', int = ''; for (let i = 0; i < e.results.length; i++) { const r = e.results[i]; if (r.isFinal) fin += r[0].transcript; else int += r[0].transcript; } heard = (fin + int).replace(/\s+/g, ' ').trim(); $('#msg').value = heard; if (vm) vm.querySelector('.vm-you').textContent = heard; clearTimeout(silence); if (!holdingMic) silence = setTimeout(() => { const t = heard; stopC(); handleUtterance(t); }, 1600); };
      crec.onerror = (e) => { if (e.error === 'not-allowed') toast('Microphone blocked. Allow it in Settings > Safari > Microphone.'); stopC(); vmSet('idle', ''); };
      crec.onend = () => { if (listening && crec) { try { crec.start(); } catch { stopC(); } } };
      try { crec.start(); } catch { stopC(); vmSet('idle', ''); toast('Mic unavailable'); }
    };
  }
  // typed messages also get the acknowledgment + spoken reply
  $('#send')?.addEventListener('click', () => { if (!$('#msg').value.trim()) return; const t = $('#msg').value.trim(); convoUntil = Date.now() + 12 * 60000; clearInterval(convoPoll); convoPoll = setInterval(() => { if (Date.now() > convoUntil) return clearInterval(convoPoll); if (document.visibilityState === 'visible') load().catch(() => { }); }, 12000); }, true);

  // ---------- 6. Life Index ----------
  function lifeIndex() {
    const g = D.grades.average ? Math.min(1, D.grades.average / 18) : 0.5;
    let gym = 0; for (let w = 0; w < 4; w++) gym += Math.min(D.sports.weeklyTarget, sportsWeek(Date.now() - w * 7 * DAY).done); gym /= 4 * (D.sports.weeklyTarget || 6);
    const money = ((D.goals || []).find(x => x.id === 'money')?.current || 0) / 100;
    const st = (D.study || []).map(s => mastery(s.key, s.count || 30)); const study = st.length ? st.reduce((a, b) => a + b, 0) / st.length / 100 : 0;
    const ppl = peopleAll(); const overdue = ppl.filter(p => p.next && p.next < today()).length; const net = Math.max(0, 1 - overdue / Math.max(1, ppl.length)) * 0.7 + Math.min(1, ((D.linkedin?.inbox || []).filter(c => !c.fromMe).length) / 5) * 0.3;
    const v = Math.round(100 * (0.30 * g + 0.25 * gym + 0.20 * money + 0.15 * study + 0.10 * net));
    const hist = (S.lifeIdx ||= {}); hist[today()] = v;
    return { v, parts: { School: Math.round(g * 100), Body: Math.round(gym * 100), Business: Math.round(money * 100), Study: Math.round(study * 100), Network: Math.round(net * 100) }, hist };
  }
  window.lifeIndex = lifeIndex;
  function idxCard() {
    const L = lifeIndex(); const days = Object.keys(L.hist).sort().slice(-30); const pts = days.map(d => ({ t: new Date(d).getTime(), v: L.hist[d] }));
    const prevV = days.length > 1 ? L.hist[days[days.length - 2]] : L.v; const delta = L.v - prevV;
    return `<a class="card idx" href="#home/command"><div class="row between"><div><div class="tag">Life Index</div><div class="idxv">${L.v}<span>/100</span> <em style="color:${delta >= 0 ? 'var(--ok)' : 'var(--bad)'}">${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta)}</em></div></div><div class="idxbars">${Object.entries(L.parts).map(([k, v]) => `<div title="${k}"><i style="height:${Math.max(6, v)}%"></i><span>${k[0]}</span></div>`).join('')}</div></div>${pts.length > 1 ? spark(pts) : '<div class="small dim">Your index builds a curve day by day.</div>'}</a>`;
  }

  // ---------- 3. Command Center ----------
  V.command = () => {
    const L = lifeIndex(), now = Date.now();
    const li = (D.linkedin?.inbox || []).filter(c => c.unread && !c.fromMe).length;
    const fu = peopleAll().filter(p => p.next && p.next <= today()).length;
    const nodes = [
      ['School', D.grades.average != null ? D.grades.average.toFixed(1) : '–', 'avg /20', '#school/grades', 'var(--c-school)'],
      ['Body', `${sportsWeek().done}/${D.sports.weeklyTarget}`, 'gym this week', '#life/sports', 'var(--c-life)'],
      ['Business', `${(D.goals || []).find(x => x.id === 'money')?.current || 0}%`, 'mission', '#work/business', 'var(--c-work)'],
      ['Network', `${li + fu}`, li ? 'unread LinkedIn' : 'follow-ups', '#work/people', 'var(--c-home)'],
    ];
    const ex = (D.exams || [])[0], nx = D.calendar.events.find(e => !e.allDay && e.end > now);
    return `<div class="cc"><div class="cc-ring"></div><div class="cc-core">${reactor(L.v, 'INDEX')}</div>${nodes.map((n, i) => `<a class="cc-node n${i}" href="${n[3]}" style="--nc:${n[4]}"><b>${esc(n[1])}</b><span>${esc(n[0])}</span><em>${esc(n[2])}</em></a>`).join('')}</div>
    <div class="card"><h2>Status</h2>
      <div class="chartrow"><span>Next</span><span class="small dim">${nx ? hm(nx.start) : ''}</span><b>${nx ? esc(nx.title.slice(0, 26)) : '–'}</b></div>
      <div class="chartrow"><span>Next exam</span><span class="small dim">${ex ? Math.ceil((ex.t - now) / DAY) + 'd' : ''}</span><b>${ex ? esc(ex.course.split(' (')[0].split(':')[0].slice(0, 22)) : '–'}</b></div>
      <div class="chartrow"><span>Weekly score</span><span></span><b>${weekScore()}/100</b></div>
      <div class="chartrow"><span>Systems</span><span></span><b style="color:${Date.now() - D.updatedAt > 75 * 60000 ? 'var(--bad)' : 'var(--ok)'}">${Date.now() - D.updatedAt > 75 * 60000 ? 'MAC OFFLINE' : 'ONLINE'}</b></div></div>
    <button class="btn pri" style="width:100%;justify-content:center;padding:14px" data-act="cine">▶ Briefing</button>`;
  };

  // ---------- 1. cinematic briefing ----------
  function cineLines() {
    const now = Date.now(), f = (D.briefing.focus || []).slice(0, 3), nx = D.calendar.events.find(e => !e.allDay && e.start > now && e.start < sgMidnight() + DAY + 6 * 3600000);
    const w = JSON.parse(localStorage.getItem('life:wx') || 'null'); const ex = (D.exams || [])[0];
    const lines = [`${greetWord()}, Mr. Pageaud.`];
    if (w) lines.push(`Singapore, ${w.temp} degrees. ${w.txt}.`);
    if (D.briefing.headline) lines.push(D.briefing.headline);
    if (nx) lines.push(`First up: ${nx.title} at ${hm(nx.start)}.`);
    f.forEach((x, i) => lines.push(`Priority ${i + 1}: ${x}.`));
    if (ex) lines.push(`${ex.course.split(' (')[0].split(':')[0]} exam in ${Math.ceil((ex.t - now) / DAY)} days.`);
    lines.push('Systems green. Have a productive day, sir.');
    return lines;
  }
  function cinematic(auto) {
    const neural = !!D?.voice?.briefing;
    const lines = neural ? D.voice.briefing.lines : cineLines();
    const el = document.createElement('div'); el.className = 'cine';
    el.innerHTML = `<div class="cine-top"><span>Pageaud Industries</span><span>${fmt(Date.now(), { weekday: 'long', day: 'numeric', month: 'long' })}</span></div><div class="cine-core"><canvas class="mist cine-mist"></canvas></div><div class="cine-lines"></div><div class="cine-offer"></div>${auto ? '<button class="btn pri cine-go">Begin briefing</button>' : ''}<button class="cine-x">Skip</button>`;
    document.body.appendChild(el); hideDock();
    const cm = mkMist(el.querySelector('.cine-mist')); if (cm) cm.mode = 'idle';
    const close = () => { speechSynthesis?.cancel(); try { voiceEl.pause(); } catch { } dropMist(cm); el.classList.add('out'); setTimeout(() => el.remove(), 400); };
    el.querySelector('.cine-x').onclick = close;
    const play = () => {
      el.querySelector('.cine-go')?.remove(); chime([523, 784, 1046], 0.8, 0.035); hap('success');
      const box = el.querySelector('.cine-lines'); let i = 0;
      const total = lines.reduce((a, l) => a + l.length, 0);
      const show = () => { box.insertAdjacentHTML('beforeend', `<div>${esc(lines[i])}</div>`); box.scrollTop = box.scrollHeight; i++; };
      const fallback = () => { const step = () => { if (!document.body.contains(el)) return; if (i < lines.length) { show(); setTimeout(step, Math.max(1400, lines[i - 1].length * 62)); } else setTimeout(close, 2600); }; step(); };
      if (!neural) return fallback();
      setTimeout(() => playNeural('briefing').then(ok => {
        if (!ok) return fallback();
        const B = D.voice.briefing; let shown0 = false; const tick = () => { if (!document.body.contains(el)) { voiceEl.pause(); return; } if (cm) cm.mode = voiceEl.currentTime < (B.intro || 0) - 0.1 ? 'think' : 'speak'; const d = Math.max(1, (voiceEl.duration || 1) - (B.intro || 0) - (B.tail || 0)); const prog = Math.max(0, (voiceEl.currentTime - (B.intro || 0)) / d); if (!shown0) { if (voiceEl.currentTime < (B.intro || 0) - 0.2) return requestAnimationFrame(tick); shown0 = true; } let acc = 0; for (let j = 0; j < i; j++) acc += lines[j].length; while (i < lines.length && prog >= acc / total) { show(); acc += lines[i - 1].length; } if (!voiceEl.ended) requestAnimationFrame(tick); else { while (i < lines.length) show(); if (cm) cm.mode = 'idle'; if (B.offer) offer(B.offer); else setTimeout(close, 2200); } };
        requestAnimationFrame(tick);
      }), 650);
    };
    function offer(o) {
      const box = el.querySelector('.cine-offer');
      box.innerHTML = `<button class="btn pri" data-o="y">Yes, please</button><button class="btn" data-o="n">Not now</button>`;
      let done = false, rec = null;
      const finish = (yes) => {
        if (done) return; done = true; try { rec && rec.stop(); } catch { } box.innerHTML = '';
        if (cm) cm.mode = 'speak';
        if (yes) { say(o.yesSay || 'Very good, sir.', { force: true, quiet: true }); if (o.local === 'focus') ACT.focusgo({ dataset: { m: 50 } }); else if (o.yes) { sendText(o.yes); convoUntil = Date.now() + 12 * 60000; clearInterval(convoPoll); convoPoll = setInterval(() => { if (Date.now() > convoUntil) return clearInterval(convoPoll); if (document.visibilityState === 'visible') load().catch(() => { }); }, 12000); } }
        else say('As you wish, sir.', { force: true, quiet: true });
        setTimeout(close, 2600);
      };
      box.querySelector('[data-o=y]').onclick = () => finish(true); box.querySelector('[data-o=n]').onclick = () => finish(false);
      if (SRx) { try { rec = new SRx(); rec.lang = /monsieur|oui/i.test(o.q || '') ? 'fr-FR' : 'en-US'; rec.interimResults = true; if (cm) cm.mode = 'listen';
        rec.onresult = (e) => { const t = [...e.results].map(r => r[0].transcript).join(' ').toLowerCase(); if (/(yes|yeah|yep|sure|please|go ahead|do it|absolutely|of course|oui|vas-y|ok|okay)/.test(t)) finish(true); else if (/(no|nope|not now|later|non|pas)/.test(t)) finish(false); };
        rec.onend = () => { if (!done && cm) cm.mode = 'idle'; }; rec.start(); setTimeout(() => { try { rec.stop(); } catch { } }, 8000); } catch { } }
    }
    if (auto) el.querySelector('.cine-go').onclick = play; else play();
  }
  ACT.cine = () => { cinematic(false); return false; };

  // ---------- 2. Batcave night mode ----------
  const isNight = () => { const m = setting('night', 'auto'); const h = sgH(); return m === 'on' || (m === 'auto' && (h >= 22 || h < 5)); };
  function applyNight() { document.body.classList.toggle('night', isNight() && !S._nightOff); }
  function nightView() {
    const t0 = sgMidnight() + (sgH() >= 5 ? DAY : 0), t1 = t0 + DAY;
    const ev = D.calendar.events.filter(e => !e.allDay && e.start >= t0 && e.start < t1).slice(0, 5);
    const top = todoItems().filter(t => !isDone(t.id)).sort((a, b) => (a.priority - b.priority) || ((a.due ?? 9e15) - (b.due ?? 9e15))).slice(0, 3);
    const first = ev[0];
    return `<div class="card hero bat"><div class="tag">Batcave · night mode</div><div class="hl">Tomorrow, ${fmt(t0 + 3600000, { weekday: 'long' })}</div><div class="small" style="color:#e9c9c9">${first ? `First: ${esc(first.title)} at ${hm(first.start)}. ` : 'Nothing early. '}Lights out by 1am.</div></div>
    <div class="card"><h2>Tomorrow</h2><div class="tl">${ev.map(e => `<div class="item"><div class="time">${hm(e.start)}</div><div class="main"><div class="t">${esc(e.title)}</div></div></div>`).join('') || '<div class="empty">Free day</div>'}</div></div>
    <div class="card"><h2>Top 3</h2><div class="list">${top.map(todoRow).join('') || '<div class="empty">All clear</div>'}</div></div>
    <button class="btn" style="width:100%;justify-content:center" data-act="nightoff">Full dashboard</button>`;
  }
  ACT.nightoff = () => { S._nightOff = true; applyNight(); };
  setInterval(() => { const before = document.body.classList.contains('night'); applyNight(); if (before !== document.body.classList.contains('night') && route().g === 'home') render(); }, 60000);

  // ---------- 7. dossiers (LinkedIn) ----------
  V.people = () => {
    const L = D.linkedin || {}, inbox = L.inbox || [];
    const ppl = peopleAll();
    const conv = inbox.slice(0, 8);
    return `<div class="card"><h2>LinkedIn <span class="small muted">${inbox.filter(c => c.unread && !c.fromMe).length} unread</span></h2>${conv.map(c => `<a class="item" href="${esc(c.url)}" target="_blank" rel="noopener"><span class="cdot" style="background:${c.unread && !c.fromMe ? 'var(--c-home)' : 'transparent'};color:var(--c-home)"></span><div class="main"><div class="t">${esc(c.name)}</div><div class="m">${c.fromMe ? 'You: ' : ''}${esc(c.text)}</div></div><span class="small dim">${c.time ? rel(new Date(c.time).getTime()) : ''}</span></a>`).join('') || '<div class="empty">No conversations synced yet</div>'}</div>
    <div class="sec">Dossiers</div>
    ${ppl.map((p, i) => { const li = (L.people || {})[p.name] || {}; const last = inbox.find(c => c.name && p.name && c.name.toLowerCase().includes(p.name.split(' ')[0].toLowerCase())); return `<div class="card dossier"><div class="row">${li.photo ? `<img class="dphoto" src="${esc(li.photo)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : `<div class="dphoto dinit">${esc(p.name.split(' ').map(x => x[0]).join('').slice(0, 2))}</div>`}<div style="flex:1;min-width:0"><div class="dname">${esc(p.name)}</div><div class="small muted dclamp">${esc(li.headline || p.role || '')}</div></div>${li.url ? `<a class="mini" href="${esc(li.url)}" target="_blank" rel="noopener">in</a>` : ''}</div>
      <div class="dgrid"><div><span>Role</span><b>${esc(p.role || '–')}</b></div><div><span>Next</span><b style="color:${p.next && p.next <= today() ? 'var(--warn)' : 'inherit'}">${esc(p.next || '–')}</b></div></div>
      ${last ? `<div class="small dim dclamp" style="margin-top:8px">Last: ${esc(last.text)}</div>` : ''}${p.notes ? `<div class="small dclamp" style="margin-top:6px;color:#e8dcc0">${esc(p.notes)}</div>` : ''}
      <details><summary>Edit ▾</summary><div class="addrow" style="margin-top:8px"><input id="pn${i}" value="${esc(p.notes || '')}" placeholder="Notes"></div><div class="addrow"><input id="pd${i}" type="date" value="${esc(p.next || '')}"><input id="pb${i}" placeholder="Birthday MM-DD" value="${esc(p.birthday || '')}"><button class="btn pri" data-act="psave" data-i="${i}" data-name="${esc(p.name)}">Save</button></div></details></div>`; }).join('')}
    <div class="card"><h2>Add a dossier</h2><div class="addrow"><input id="npn" placeholder="Name"><input id="npr" placeholder="Role"><button class="btn pri" data-act="padd">+</button></div></div>`;
  };
  GROUPS.work.segs = GROUPS.work.segs.map(s => s[0] === 'people' ? ['people', 'Network'] : s);

  // ---------- 8. missions ----------
  V.goals = () => (D.goals || []).map((g, gi) => {
    const p = goalProgress(g); const pc = p == null ? 0 : Math.round(p * 100); const ms = S.ms[g.id] || {};
    const done = g.milestones?.length && g.milestones.every((_, i) => ms[i]);
    if (done && !(S.missionDone ||= {})[g.id]) { S.missionDone[g.id] = Date.now(); save(); setTimeout(() => accomplished(g.title), 300); }
    return `<div class="card mission ${done ? 'complete' : ''}"><div class="row between"><div class="tag">Mission ${String(gi + 1).padStart(2, '0')} · ${esc(g.area || '')}</div><span class="pill ${done ? 'ok' : 'acc'}">${done ? 'COMPLETE' : 'ACTIVE'}</span></div>
      <div class="row" style="margin-top:10px"><div class="ring" style="--p:${pc}"><span>${pc}%</span></div><div style="flex:1;min-width:0"><div class="mtitle">${esc(g.title)}</div><div class="small muted">${g.daysLeft >= 0 ? g.daysLeft + ' days left' : 'deadline passed'}</div></div></div>
      ${g.nextStep ? `<div class="mnext"><span>Next</span> ${esc(g.nextStep)}</div>` : ''}
      ${g.milestones?.length ? `<div class="list" style="margin-top:6px">${g.milestones.map((m, i) => `<div class="item ${ms[i] ? 'done' : ''}"><button class="check ${ms[i] ? 'on' : ''}" data-act="ms" data-g="${esc(g.id)}" data-i="${i}"></button><div class="main"><div class="t" style="font-weight:500">${esc(m)}</div></div></div>`).join('')}</div>` : ''}</div>`;
  }).join('');
  function accomplished(title) { chime([523, 659, 784, 1046], 1.1, 0.05); hap('success'); const el = document.createElement('div'); el.className = 'cine accomplished'; el.innerHTML = `<div class="cine-core">${reactor(100, 'DONE')}</div><div class="welcome">Mission accomplished</div><div class="small" style="color:#e8dcc0;text-align:center;max-width:300px">${esc(title)}</div>`; document.body.appendChild(el); say('Mission accomplished, sir.', { force: true }); el.onclick = () => el.remove(); setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, 3200); }

  // ---------- 11. Do not disturb, sir ----------
  const origFocusGo = ACT.focusgo, origFocusStop = ACT.focusstop;
  const dndPost = (until) => postMsg({ id: 'dnd' + Date.now(), t: Date.now(), time: new Date().toISOString(), text: `[dnd] until=${until}` }).catch(() => { });
  ACT.focusgo = (el) => { origFocusGo(el); dndPost(S.focusTimer.end); toast(`Do not disturb, sir. Urgent alerts only until ${hm(S.focusTimer.end)}.`); speak('Do not disturb engaged.'); };
  ACT.focusstop = (el) => { origFocusStop(el); dndPost(0); toast('Do not disturb off'); };

  // ---------- 12. weekly report ----------
  V.report = () => {
    const ws = weekStart(), s = weekScore(), last = weekScore(Date.now() - 7 * DAY);
    const days = [...Array(7)].map((_, i) => dayKey(ws + i * DAY + 3600000));
    const gym = sportsWeek().done; let qs = 0; for (const k in SST()) for (const x of SST()[k].sessions || []) if (x.t >= ws) qs += x.n;
    const md = days.reduce((a, k) => a + Object.values(S.focus?.[k] || {}).filter(Boolean).length, 0);
    const todosDone = Object.keys(S.todosDone || {}).length;
    const fh = Math.round(focusWeekMin() / 6) / 10;
    const wins = [], slips = [];
    if (gym) wins.push(`${gym} gym session${gym > 1 ? 's' : ''}`); else slips.push('No gym logged yet');
    if (qs) wins.push(`${qs} study questions`); else slips.push('No study questions');
    if (md) wins.push(`${md} must-dos done`); if (fh) wins.push(`${fh}h deep focus`);
    if (gym < D.sports.weeklyTarget) slips.push(`${D.sports.weeklyTarget - gym} gym sessions short of target`);
    const nextEx = (D.exams || []).filter(e => e.t - Date.now() < 14 * DAY).slice(0, 3);
    const text = `Weekly report. Score ${s} out of 100, ${s >= last ? 'up' : 'down'} ${Math.abs(s - last)} from last week. Wins: ${wins.join(', ') || 'none yet'}. To fix: ${slips.join(', ') || 'nothing major'}. ${nextEx.length ? 'Coming up: ' + nextEx.map(e => e.course.split(' (')[0].split(':')[0]).join(', ') + '.' : ''}`;
    S._reportText = text; setTimeout(() => sha12(text).then(k => { if (!D.voice?.clips?.[k] && !reqd[k]) { reqd[k] = 1; postMsg({ id: 'tts' + Date.now(), t: Date.now(), time: new Date().toISOString(), text: '[tts] ' + text.trim() }).catch(() => { }); } else prefetch(text); }), 800);
    return `<div class="card hero"><div class="row between"><div><div class="tag">Week of ${fmt(ws + 3600000, { day: 'numeric', month: 'short' })}</div><div class="idxv">${s}<span>/100</span> <em style="color:${s >= last ? 'var(--ok)' : 'var(--bad)'}">${s >= last ? '▲' : '▼'} ${Math.abs(s - last)}</em></div></div><div class="ring big" style="--p:${s}"><span>${s}</span></div></div><button class="btn pri" style="margin-top:12px" data-act="playreport">▶ Play report</button></div>
    <div class="card"><h2>Wins</h2><ul class="bul">${wins.map(w => `<li>${esc(w)}</li>`).join('') || '<li>Nothing logged yet this week</li>'}</ul></div>
    <div class="card"><h2>To fix</h2><ul class="bul">${slips.map(w => `<li>${esc(w)}</li>`).join('') || '<li>Clean week</li>'}</ul></div>
    ${nextEx.length ? `<div class="card"><h2>Next 14 days</h2>${nextEx.map(e => `<div class="chartrow"><span>${esc(e.course.split(' (')[0].split(':')[0])}</span><span></span><b>${Math.ceil((e.t - Date.now()) / DAY)}d</b></div>`).join('')}</div>` : ''}
    ${idxCard()}`;
  };
  ACT.playreport = () => { say(S._reportText || '', { force: true }); return false; };
  GROUPS.home.segs = [['home', 'Today'], ['command', 'Command'], ['todo', 'To-do'], ['report', 'Report']];
  for (const [g, v] of Object.entries(GROUPS)) for (const [s] of v.segs) SEG2GROUP[s] = g;

  // ---------- home wiring: night mode, Life Index card, briefing button ----------
  const prevToday = V.today;
  V.today = () => {
    applyNight();
    if (document.body.classList.contains('night')) return F.facecard() + nightView();
    let h = prevToday();
    h = h.replace('<div class="card hero hud-hero">', F.facecard() + '<div class="card hero hud-hero">');
    h = h.replace('<div class="weather" id="wx">', '<button class="cinebtn" data-act="cine">▶ Briefing</button><div class="weather" id="wx">');
    const cut = h.indexOf('<div class="telemetry">'); const end = cut >= 0 ? h.indexOf('</a></div>', cut) : -1;
    if (end > 0) { const pos = end + '</a></div>'.length; h = h.slice(0, pos) + idxCard() + h.slice(pos); }
    return h;
  };

  // ---------- 13. gold particles ----------
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const layer = document.createElement('div'); layer.className = 'particles';
    layer.innerHTML = [...Array(18)].map((_, i) => `<i style="left:${Math.round(Math.random() * 100)}%;animation-duration:${18 + Math.round(Math.random() * 22)}s;animation-delay:-${Math.round(Math.random() * 30)}s;width:${2 + (i % 3)}px;height:${2 + (i % 3)}px"></i>`).join('');
    document.body.prepend(layer);
  }

  // ---------- 14. "Hey Jarvis" (while the app is open) ----------
  let wake = null, wakeOn = false, capture = false, capText = '', capTimer = null;
  function startWake() {
    if (!SR || wakeOn || !setting('wake', false)) return;
    try {
      wake = new SR(); wake.lang = lang || 'en-US'; wake.continuous = true; wake.interimResults = true; wakeOn = true;
      wake.onresult = (e) => {
        const r = e.results[e.results.length - 1]; const t = r[0].transcript.toLowerCase();
        if (!capture && /\bjarvis\b/.test(t)) { capture = true; capText = ''; openSheet(false); chime([880, 1318], 0.35, 0.04); hap(); }
        if (capture) { capText = t.split(/\bjarvis\b/).pop().replace(/^[\s,.]+/, ''); $('#msg').value = capText; clearTimeout(capTimer); capTimer = setTimeout(() => { if (capText.trim().length > 2) { sendText(capText.trim()); $('#msg').value = ''; chime([1046, 1568], 0.4, 0.04); } capture = false; }, 1600); }
      };
      wake.onend = () => { wakeOn = false; if (setting('wake', false) && document.visibilityState === 'visible' && !listening) setTimeout(startWake, 400); };
      wake.onerror = () => { wakeOn = false; };
      wake.start();
    } catch { wakeOn = false; }
  }
  function stopWake() { try { wake && wake.stop(); } catch { } wakeOn = false; }
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' ? startWake() : stopWake());
  ACT.wake = () => { (S.set ||= {}).wake = !setting('wake', false); save(); if (setting('wake', false)) { startWake(); toast('Say "Jarvis" followed by your request'); } else { stopWake(); toast('Hey Jarvis off'); } };
  ACT.night = (el) => { (S.set ||= {}).night = el.dataset.v; S._nightOff = false; applyNight(); };

  // system panel additions
  const prevSystem = V.system;
  V.system = () => `<div class="card"><h2>Security</h2><div class="chartrow"><span>Face ID lock</span><span class="small dim">${setting('faceid', false) ? 'on' : 'off'}</span><button class="btn ${setting('faceid', false) ? '' : 'pri'}" data-act="faceid">${setting('faceid', false) ? 'Turn off' : 'Enable'}</button></div></div>` + prevSystem().replace('<div class="card"><h2>Home layout</h2>', `<div class="card"><h2>J.A.R.V.I.S.</h2>
    <div class="chartrow"><span>"Hey Jarvis" (app open)</span><span class="small dim">${SR ? '' : 'not supported'}</span><button class="btn ${setting('wake', false) ? 'pri' : ''}" data-act="wake">${setting('wake', false) ? 'on' : 'off'}</button></div>
    <div class="chartrow"><span>Jarvis comments on what you do</span><span></span><button class="btn ${setting('talk', true) ? 'pri' : ''}" data-act="toggleset" data-k="talk">${setting('talk', true) ? 'on' : 'off'}</button></div>
    <div class="chartrow"><span>Night mode (Batcave)</span><span></span><span class="row" style="gap:6px">${['auto', 'on', 'off'].map(v => `<button class="btn ${setting('night', 'auto') === v ? 'pri' : ''}" data-act="night" data-v="${v}">${v}</button>`).join('')}</span></div>
    <div class="chartrow"><span>Voice</span><span class="small dim">${esc(D.voice?.label || '')}</span><button class="btn" data-act="vtest">test</button></div>
    <div class="row" style="gap:6px;flex-wrap:wrap;margin-top:8px">${Object.entries(D.voice?.voices || {}).map(([k, l]) => `<button class="btn ${D.voice.id === k ? 'pri' : ''}" data-act="setvoice" data-v="${k}">${esc(l.split(' (')[0])}${S._voicePending === k && D.voice.id !== k ? ' …' : ''}</button>`).join('')}</div>
    <div class="small dim" style="margin-top:6px">Studio neural voices, British accent, your name said in French.</div></div>
    <div class="card"><h2>Backup</h2><div class="chartrow"><span>Last backup</span><span class="small dim">${S.lastSync ? rel(S.lastSync) : 'never'}</span><button class="btn" data-act="backupnow">Back up now</button></div><div class="chartrow"><span>Restore from server</span><span class="small dim">${D.devState?.at ? rel(D.devState.at) : 'no backup yet'}</span><button class="btn" data-act="restore">Restore</button></div><div class="small dim" style="margin-top:6px">Everything you do in the app is backed up encrypted every few minutes and restored automatically after a reinstall.</div></div><div class="card"><h2>Home layout</h2>`);


  // ---------- device-state backup + restore (survives reinstalls, syncs devices) ----------
  const TRANSIENT = ['_liftform', '_nightOff', '_reportText', '_mcat'];
  const snapshot = () => { const o = {}; for (const k in S) if (!TRANSIENT.includes(k)) o[k] = S[k]; return o; };
  async function gz(str) { const b = await new Response(new Blob([str]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer(); let s = ''; const u = new Uint8Array(b); for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); }
  async function gunz(b64) { const u = Uint8Array.from(atob(b64), c => c.charCodeAt(0)); return await new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip'))).text(); }
  let lastUp = 0, lastHash = '';
  async function backup(force) {
    try {
      const snap = snapshot(); delete snap.lastSync; const str = JSON.stringify(snap); if (!force && str === lastHash) return; if (!force && Date.now() - lastUp < 90000) return;
      const z = await gz(str); await postMsg({ id: 'st' + Date.now(), t: Date.now(), time: new Date().toISOString(), text: '[state] ' + z });
      lastHash = str; lastUp = Date.now(); S.lastSync = Date.now(); localStorage.setItem('life:v1', JSON.stringify(S));
    } catch (e) { console.warn('backup failed', e); }
  }
  async function restore(manual) {
    try {
      if (!D?.devState?.z) { if (manual) toast('No backup on the server yet'); return false; }
      const srv = JSON.parse(await gunz(D.devState.z));
      const isEmpty = (v) => v == null || (typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length) || (Array.isArray(v) && !v.length);
      let n = 0;
      for (const k in srv) { if (TRANSIENT.includes(k)) continue; if (manual || isEmpty(S[k])) { S[k] = srv[k]; n++; } else if (typeof S[k] === 'object' && !Array.isArray(S[k]) && typeof srv[k] === 'object' && !Array.isArray(srv[k])) { S[k] = { ...srv[k], ...S[k] }; n++; } }
      S.lastSync = Date.now(); save(); applyTheme && applyTheme(); render();
      if (n) toast(manual ? 'Restored from backup' : 'Your data is back'); return true;
    } catch (e) { console.warn('restore failed', e); if (manual) toast('Restore failed'); return false; }
  }
  ACT.restore = () => { if (confirm('Replace this device data with the server backup?')) restore(true); return false; };
  ACT.backupnow = () => { backup(true).then(() => toast('Backed up')); return false; };
  setTimeout(async () => { if (!S.lastSync && D?.devState?.z) await restore(false); setInterval(() => { if (document.visibilityState === 'visible') backup(false); }, 30000); }, 3500);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') backup(false); });

  // ---------- Face ID: easy to turn back on ----------
  F.facecard = () => (setting('faceid', false) || S._faceDismiss || !window.PublicKeyCredential) ? '' : `<div class="card pushcard"><div class="row between"><div><div style="font-weight:700">Face ID lock</div><div class="small muted">Lock Jarvis behind Face ID, like before.</div></div><div class="row" style="gap:6px"><button class="btn" data-act="facedismiss">Later</button><button class="btn pri" data-act="faceid">Enable</button></div></div></div>`;
  ACT.facedismiss = () => { S._faceDismiss = true; };
  // Face ID setup prompt on launch (shown until enabled; "Not now" hides it for the day)
  function facePrompt() {
    if (setting('faceid', false) || !window.PublicKeyCredential || S._faceLater === today() || document.querySelector('.faceprompt')) return;
    const el = document.createElement('div'); el.className = 'cine faceprompt';
    el.innerHTML = `<div class="cine-top"><span>Security</span><span>J.A.R.V.I.S.</span></div><div class="cine-core">${reactor(100, 'SECURE')}</div>
      <div style="text-align:center;max-width:340px"><div class="hl" style="font-size:24px">Face ID lock</div><div class="small muted" style="margin-top:8px">Protect Jarvis with your face, like before. You will be asked for Face ID each time you open the app.</div></div>
      <button class="btn pri cine-go" data-fp="on">Enable Face ID</button><button class="btn" data-fp="later">Not now</button>`;
    document.body.appendChild(el);
    el.querySelector('[data-fp=on]').onclick = () => { ACT.faceid(); el.remove(); };
    el.querySelector('[data-fp=later]').onclick = () => { S._faceLater = today(); save(); el.remove(); };
  }
  setTimeout(facePrompt, 4500);


  // ---------- auto cinematic briefing: first open before 11am ----------
  setTimeout(() => (() => {
    if (!D || !setting('brief', true)) return; const h = sgH();
    if (h >= 5 && h < 11 && S.cineDay !== today()) { S.cineDay = today(); S.briefedDay = today(); save(); cinematic(true); }
  })(), 2600);
  setTimeout(startWake, 2500);
  if (typeof D !== 'undefined' && D) render();
})();
