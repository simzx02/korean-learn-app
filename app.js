/* KorLearn — TOPIK 1–6 vocabulary and grammar trainer. No build step for the site, no dependencies. */
'use strict';

const LEVELS = [1, 2, 3, 4, 5, 6];
const LEVEL_NAMES = { 1: 'TOPIK I · beginner', 2: 'TOPIK I · upper beginner', 3: 'TOPIK II · intermediate', 4: 'TOPIK II · upper intermediate', 5: 'TOPIK II · advanced', 6: 'TOPIK II · upper advanced' };
const STATUS = ['New', 'Learning', 'Known'];
const STORE_KEY = 'hangeoreum.progress.v1';
const GRAMMAR_PER_UNIT = 20;
const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';

const app = document.getElementById('app');
const nav = document.getElementById('nav');
let meta = null, grammar = null;
const levelData = {};          // level -> { id: word }
const unitOf = {};             // word id -> [level, unit number]
let progress = loadProgress();
let session = null;            // current flashcard, quiz or typing session
let notice = '';
let results = () => '';        // renders the current list for the search box
const matches = (x, q) => x.w.includes(q) || x.origin.toLowerCase().includes(q) || x.m.toLowerCase().includes(q) || x.senses.some(s => s[0].toLowerCase().includes(q));

/* ---------- utilities ---------- */
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const sample = (a, n) => shuffle(a).slice(0, n);
const norm = s => String(s).normalize('NFC').replace(/[\s.?!~]/g, '');
const hasHanja = s => /[㐀-鿿]/.test(s);
const choseong = w => [...w].map(ch => { const c = ch.charCodeAt(0) - 0xAC00; return c >= 0 && c < 11172 ? CHO[Math.floor(c / 588)] : ch; }).join(' ');

function loadProgress() {
  try { const p = JSON.parse(localStorage.getItem(STORE_KEY)); if (p && p.v && p.g) return p; } catch (e) { /* storage unavailable */ }
  return { v: {}, g: {} };
}
function saveProgress() { try { localStorage.setItem(STORE_KEY, JSON.stringify(progress)); } catch (e) { /* keep in memory */ } }
const vStatus = id => progress.v[id] || 0;
const gDone = p => !!progress.g[p];

function speak(text) {
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ko-KR'; u.rate = 0.9;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  } catch (e) { /* speech not supported */ }
}
const sayBtn = text => `<button type="button" class="say" data-act="say" data-text="${esc(text)}" aria-label="Listen" title="Listen">▶</button>`;

/* ---------- data ---------- */
const getJSON = f => fetch('data/' + f).then(r => { if (!r.ok) throw new Error(f); return r.json(); });
async function loadBase() {
  [meta, grammar] = await Promise.all([getJSON('meta.json'), getJSON('grammar.json')]);
  for (const lv of LEVELS) meta.levels[lv].units.forEach((u, i) => u.ids.forEach(id => { unitOf[id] = [lv, i + 1]; }));
}
async function loadLevel(lv) {
  if (levelData[lv]) return levelData[lv];
  const raw = await getJSON(`L${lv}.json`), out = {};
  for (const id in raw) {
    const [w, pos, origin, cat, senses, m, x] = raw[id];
    out[id] = { id, w, pos, origin, cat, senses, m: m || (senses[0] ? senses[0][0] : ''), x: x || null };
    if (x && progress.v[w] !== undefined && progress.v[id] === undefined) { progress.v[id] = progress.v[w]; delete progress.v[w]; }   // carry over progress saved by the first version
  }
  saveProgress();
  return (levelData[lv] = out);
}
const unitWords = (lv, u) => meta.levels[lv].units[u - 1].ids.map(id => levelData[lv][id]);
function unitGrammar(lv, u) {
  const all = grammar[lv], n = all.length;
  const pick = k => Array.from({ length: Math.min(GRAMMAR_PER_UNIT, n) }, (_, i) => all[(Math.round((k - 1) * n / 20) % n + i) % n]);
  const prev = u > 1 ? new Set(pick(u - 1)) : new Set();
  return pick(u).map(g => ({ g, isNew: !prev.has(g) }));
}

function originInfo(o) {
  if (!o) return { cls: 'native', html: '고유어 · native Korean' };
  if (hasHanja(o)) return { cls: 'hanja', html: esc(o), hanja: o };
  return { cls: 'loan', html: `외래어 · from “${esc(o)}”` };
}
const lookup = w => `<p class="look">Look up: <a href="https://en.dict.naver.com/#/search?query=${encodeURIComponent(w)}" target="_blank" rel="noopener">Naver dictionary</a> · <a href="https://en.wiktionary.org/wiki/${encodeURIComponent(w)}" target="_blank" rel="noopener">Wiktionary</a></p>`;

/* ---------- shared view pieces ---------- */
const chips = (items, on, cls = '') => `<div class="chips ${cls}">${items.map(([href, label, key]) => `<a class="chip ${key === on ? 'on' : ''}" href="${href}">${label}</a>`).join('')}</div>`;
const koLine = (ko, en) => `<li><span class="ko" lang="ko">${esc(ko)}</span>${sayBtn(ko)}${en ? `<span class="tr">${esc(en)}</span>` : ''}</li>`;
const seg = id => `<div class="seg" role="group" aria-label="Status">${STATUS.map((s, i) =>
  `<button data-act="status" data-id="${id}" data-s="${i}" class="${vStatus(id) === i ? 'on' : ''}">${s}</button>`).join('')}</div>`;
const bar = (n, total) => `<div class="bar"><i style="width:${total ? Math.round(n / total * 100) : 0}%"></i></div>`;
const countKnown = ids => ids.reduce((n, id) => n + (vStatus(id) === 2), 0);

function wordBody(x) {
  const o = originInfo(x.origin);
  const tags = `<span class="origin ${o.cls}" ${o.cls === 'hanja' ? 'title="Hanja (Chinese-character) form"' : ''}>${o.html}</span><span class="pos">${esc(x.pos)}</span>${x.cat ? `<span class="tag">${esc(x.cat)}</span>` : ''}`;
  let body;
  if (x.x) {
    body = `<p class="meaning">${esc(x.m)}</p><ul class="ex">${x.x.map(e => koLine(e[0], e[1])).join('')}</ul>` +
      (x.senses.length ? `<p class="def">${x.senses.map(s => esc(s[1])).join(' / ')}</p>` : '');
  } else {
    body = `<ol class="senses">${x.senses.map(s => `<li><p class="meaning"><b>${esc(s[0])}</b></p><p class="def">${esc(s[1])}</p>
      ${s[2].length ? `<ul class="ex">${s[2].map(e => koLine(e)).join('')}</ul>` : ''}</li>`).join('')}</ol>`;
  }
  return { tags, body };
}
function wordCard(x, where) {
  const b = wordBody(x);
  return `<article class="card">
    <div class="card-head"><h3 class="word" lang="ko">${esc(x.w)}</h3>${sayBtn(x.w)}${b.tags}${seg(x.id)}</div>
    ${b.body}${where || ''}${lookup(x.w)}</article>`;
}

/* ---------- home ---------- */
function viewHome() {
  let nv = 0, ng = 0;
  const cards = LEVELS.map(l => {
    const L = meta.levels[l], ids = L.units.flatMap(u => u.ids), g = grammar[l];
    const known = countKnown(ids), learning = ids.reduce((n, id) => n + (vStatus(id) === 1), 0), done = g.filter(x => gDone(x.p)).length;
    nv += ids.length; ng += g.length;
    return `<section class="level">
      <div class="level-head">${Mascots.media(l, 'thumb')}<span class="level-num">${l}급</span><div><h2>Level ${l}</h2><small>${LEVEL_NAMES[l]} · ${L.units.length} units · with ${Mascots.byLevel(l).name}</small></div></div>
      <div><div class="stat"><span>Vocabulary</span><span>${known} known · ${learning} learning · ${ids.length.toLocaleString()}</span></div>${bar(known, ids.length)}</div>
      <div><div class="stat"><span>Grammar</span><span>${done} of ${g.length} learned</span></div>${bar(done, g.length)}</div>
      <div class="level-actions"><a class="btn primary grow" href="#/L/${l}">Open units</a><a class="btn grow" href="#/L/${l}/grammar">All grammar</a></div>
    </section>`;
  }).join('');
  app.innerHTML = `<h1>Korean for TOPIK, level by level</h1>
    <p class="lede">${nv.toLocaleString()} graded words and ${ng} grammar patterns. Each level has 20 core units of 50 words and 20 grammar points, then extension units for the rest of that level's vocabulary. Every word shows its hanja (漢字) or loanword source.</p>
    <div class="levels">${cards}</div>
    ${notice ? `<p class="note" role="status">${esc(notice)}</p>` : ''}
    <div class="toolbar"><span class="spacer"></span>
      <a class="btn" href="#/mascots">Meet the mascots</a>
      <button class="btn" data-act="export">Export progress</button>
      <button class="btn" data-act="import">Import progress</button><input type="file" id="imp" accept="application/json,.json" hidden>
      <button class="btn" data-act="reset">Reset</button></div>`;
  notice = '';
}

/* ---------- level: unit grid ---------- */
function unitTile(l, u, i) {
  const known = countKnown(u.ids);
  return `<a class="unit ${known === u.ids.length ? 'done' : ''}" href="#/L/${l}/U/${i + 1}/words">
    <span class="unit-n">Unit ${i + 1}</span><span class="unit-t">${esc(u.t)}</span>
    ${bar(known, u.ids.length)}<span class="unit-c">${known} / ${u.ids.length} words known</span></a>`;
}
function viewLevel(l) {
  const L = meta.levels[l];
  const tiles = L.units.map((u, i) => unitTile(l, u, i));
  app.innerHTML = `<div class="with-mascot">${Mascots.media(l, 'thumb')}<h1>Level ${l}</h1></div><p class="lede">${LEVEL_NAMES[l]}. Work through the units in order: each has 50 words, ${GRAMMAR_PER_UNIT} grammar points (new ones plus review), flashcards, a multiple-choice quiz and a typing test.</p>
    <div class="toolbar">${chips(LEVELS.map(x => [`#/L/${x}`, x, x]), l, 'lv')}<span class="spacer"></span><a class="btn" href="#/L/${l}/grammar">All level ${l} grammar (${grammar[l].length})</a></div>
    <h2 class="section">Core units 1–${L.core}</h2><p class="hint-line">The most frequent ${L.core * 50} words of this level, grouped by topic.</p>
    <div class="units">${tiles.slice(0, L.core).join('')}</div>
    ${tiles.length > L.core ? `<h2 class="section">Extension units ${L.core + 1}–${tiles.length}</h2><p class="hint-line">The remaining graded words of this level. Their grammar sets are review of the level's patterns.</p>
    <div class="units">${tiles.slice(L.core).join('')}</div>` : ''}`;
}

/* ---------- unit ---------- */
const MODES = [['words', 'Words'], ['cards', 'Flashcards'], ['quiz', 'Quiz'], ['type', 'Typing test'], ['grammar', 'Grammar'], ['gquiz', 'Grammar quiz']];
function unitHead(l, u, mode) {
  const L = meta.levels[l], U = L.units[u - 1];
  return `<p class="crumb"><a href="#/L/${l}">Level ${l}</a> · ${u > L.core ? 'Extension' : 'Core'}</p>
    <h1>Unit ${u} <span class="h1-sub">${esc(U.t)}</span></h1>
    <div class="toolbar">${chips(MODES.map(([m, label]) => [`#/L/${l}/U/${u}/${m}`, label, m]), mode)}<span class="spacer"></span>
      ${u > 1 ? `<a class="btn" href="#/L/${l}/U/${u - 1}/${mode}" aria-label="Previous unit">←</a>` : ''}${u < L.units.length ? `<a class="btn" href="#/L/${l}/U/${u + 1}/${mode}" aria-label="Next unit">→</a>` : ''}</div>`;
}
function viewUnit(l, u, mode, state) {
  const head = unitHead(l, u, mode), items = unitWords(l, u), key = `${l}/${u}`;
  if (mode === 'cards') return viewFlash(head, key, items);
  if (mode === 'quiz') return viewQuiz(head, 'vocab', key, () => vocabQuestions(items), `#/L/${l}/U/${u}/words`);
  if (mode === 'type') return viewType(head, key, items, `#/L/${l}/U/${u}/words`);
  if (mode === 'grammar') return viewUnitGrammar(head, l, u);
  if (mode === 'gquiz') return viewQuiz(head, 'grammar', key, () => grammarQuestions(unitGrammar(l, u).map(x => x.g)), `#/L/${l}/U/${u}/grammar`);
  const f = state.filter;
  results = () => {
    const q = state.q.trim().toLowerCase();
    const shown = items.filter(x => (f === 'all' || vStatus(x.id) === +f) && (!q || matches(x, q)));
    return shown.map(x => wordCard(x)).join('') || '<p class="empty">No words match.</p>';
  };
  app.innerHTML = head + `<div class="toolbar">
      <div class="chips">${[['all', 'All'], ['0', 'New'], ['1', 'Learning'], ['2', 'Known']].map(([k, label]) =>
        `<button class="chip ${f === k ? 'on' : ''}" data-act="filter" data-f="${k}">${label}</button>`).join('')}</div>
      <span class="spacer"></span><input type="search" id="q" placeholder="Search this unit" value="${esc(state.q)}" aria-label="Search this unit"></div>
    <p class="hint-line">Definitions and Korean examples are from the NIKL Korean Learners' Dictionary. Examples with an English line were written for this app.</p>
    <div class="list" id="results">${results()}</div>`;
}

function viewFlash(head, key, items) {
  if (!session || session.kind !== 'flash' || session.key !== key) {
    const pending = items.filter(x => vStatus(x.id) !== 2);
    session = { kind: 'flash', key, deck: shuffle(pending.length ? pending : items), i: 0, flipped: false, all: !pending.length };
  }
  const s = session;
  if (s.i >= s.deck.length) {
    app.innerHTML = head + `<div class="stage result"><p class="score">끝!</p><p>You went through ${s.deck.length} cards.</p>
      <div class="row center"><button class="btn primary" data-act="restart">Go again</button></div></div>`;
    return;
  }
  const x = s.deck[s.i], b = wordBody(x);
  app.innerHTML = head + `<div class="stage">
    <p class="count">Card ${s.i + 1} of ${s.deck.length}${s.all ? ' · reviewing all (everything here is marked Known)' : ''}</p>
    <div class="flash"><h2 class="word" lang="ko">${esc(x.w)}</h2>${sayBtn(x.w)}
      ${s.flipped ? `<div class="card-head center">${b.tags}</div><div class="flash-body">${b.body}</div>` : '<p class="hint">Say the meaning to yourself, then reveal.</p>'}</div>
    <div class="row">${s.flipped
      ? `<button class="btn grow" data-act="grade" data-s="1">Still learning <kbd>1</kbd></button><button class="btn jade grow" data-act="grade" data-s="2">I know it <kbd>2</kbd></button>`
      : `<button class="btn primary grow" data-act="flip">Show answer <kbd>Space</kbd></button>`}</div></div>`;
}

function quizPool(items) {
  const pending = items.filter(x => vStatus(x.id) !== 2);
  return sample(pending.length >= 10 ? pending : items, 10);
}
function vocabQuestions(items) {
  const withHanja = items.filter(x => hasHanja(x.origin));
  return quizPool(items).map(x => {
    const kinds = ['ko-en', 'en-ko'];
    if (hasHanja(x.origin) && withHanja.length >= 4) kinds.push('hanja');
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    const from = (kind === 'hanja' ? withHanja : items).filter(y => y.w !== x.w && y.m !== x.m && (kind !== 'hanja' || y.origin !== x.origin));
    const seen = new Set(), others = [];
    for (const y of shuffle(from)) { const k = kind === 'ko-en' ? y.m : y.w; if (!seen.has(k)) { seen.add(k); others.push(y); } if (others.length === 3) break; }
    const options = shuffle([x, ...others]);
    const q = { id: x.id, answer: options.indexOf(x), review: `${x.w}${hasHanja(x.origin) ? ' (' + x.origin + ')' : ''} — ${x.m}` };
    if (kind === 'ko-en') Object.assign(q, { kindLabel: 'What does this word mean?', prompt: x.w, ko: true, say: x.w, options: options.map(y => y.m) });
    else if (kind === 'en-ko') Object.assign(q, { kindLabel: 'Which Korean word matches?', prompt: x.m, sub: x.senses[0] && x.senses[0][1], subNow: true, options: options.map(y => y.w), koOpts: true });
    else Object.assign(q, { kindLabel: 'Which Korean word is written with these characters?', prompt: x.origin, ko: true, options: options.map(y => y.w), koOpts: true });
    return q;
  });
}

/* ---------- typing test ---------- */
function viewType(head, key, items, back) {
  if (!session || session.kind !== 'type' || session.key !== key) session = { kind: 'type', key, qs: quizPool(items), i: 0, given: null, ok: false, right: 0, missed: [], hint: false, items };
  const s = session;
  if (s.i >= s.qs.length) return viewResult(head, s, back);
  const x = s.qs[s.i], done = s.given !== null, o = originInfo(x.origin);
  app.innerHTML = head + `<div class="stage">
    <p class="count">Question ${s.i + 1} of ${s.qs.length} · ${s.right} correct</p>
    <p class="q-kind">Type the Korean word for this meaning (${esc(x.pos)})</p>
    <p class="q-prompt en">${esc(x.m)}</p>
    ${x.senses[0] ? `<p class="q-kind">${esc(x.senses[0][1])}</p>` : ''}
    <form data-form="type" class="type-form" autocomplete="off">
      <input id="ans" class="type-in ${done ? (s.ok ? 'right' : 'wrong') : ''}" lang="ko" inputmode="text" autocapitalize="off" autocorrect="off" spellcheck="false"
        placeholder="한국어로 입력하세요" value="${done ? esc(s.given) : ''}" ${done ? 'readonly' : ''} aria-label="Your answer in Korean">
      ${done ? `<button class="btn primary" data-act="next">${s.i + 1 === s.qs.length ? 'See result' : 'Next'} <kbd>Enter</kbd></button>`
             : `<button class="btn primary">Check <kbd>Enter</kbd></button>`}
    </form>
    ${!done ? `<div class="row"><button type="button" class="btn" data-act="hint">${s.hint ? 'Hint shown' : 'Show a hint'}</button><button type="button" class="btn" data-act="giveup">I don't know</button></div>` : ''}
    ${s.hint && !done ? `<p class="q-kind">First sounds: <b lang="ko">${esc(choseong(x.w))}</b> · ${[...x.w].length} syllable${[...x.w].length > 1 ? 's' : ''}</p>` : ''}
    ${done ? `<div class="card answer"><div class="card-head"><h3 class="word" lang="ko">${esc(x.w)}</h3>${sayBtn(x.w)}<span class="origin ${o.cls}">${o.html}</span>
      <span class="verdict ${s.ok ? 'ok' : 'no'}">${s.ok ? 'Correct' : 'Not quite'}</span></div>
      ${(x.x ? x.x.slice(0, 1).map(e => `<ul class="ex">${koLine(e[0], e[1])}</ul>`) : x.senses.slice(0, 1).map(sn => sn[2].length ? `<ul class="ex">${sn[2].slice(-1).map(e => koLine(e)).join('')}</ul>` : '')).join('')}</div>` : ''}
    <p class="hint-line">You need a Korean keyboard (Windows: add Korean in Language settings, then switch with Win + Space and the 한/영 key).</p></div>`;
  const el = document.getElementById(done ? '' : 'ans') || app.querySelector('[data-act="next"]');
  if (el) el.focus();
}
function checkTyped(value, gaveUp) {
  const s = session, x = s.qs[s.i];
  if (s.given !== null) return;
  const v = gaveUp ? '' : norm(value);
  if (!v && !gaveUp) return;
  s.given = gaveUp ? '' : value.trim();
  s.ok = !gaveUp && (v === norm(x.w) || s.items.some(y => y.m === x.m && norm(y.w) === v));
  Mascots.react(s.ok);
  if (s.ok) s.right++;
  else { s.missed.push(`${x.w} — ${x.m}`); progress.v[x.id] = 1; saveProgress(); }
  render();
}

/* ---------- grammar ---------- */
function grammarCard(x, isNew) {
  const body = x.f
    ? `<dl><dt>Form</dt><dd lang="ko">${esc(x.f)}</dd><dt>Usage</dt><dd>${esc(x.n)}</dd></dl><ul class="ex">${x.x.map(e => koLine(e[0], e[1])).join('')}</ul>`
    : `${x.k ? `<dl><dt>Attaches</dt><dd lang="ko">${esc(x.k)}</dd></dl>` : ''}<ol class="senses">${x.s.map(s => `<li><p class="def">${esc(s[0])}</p><ul class="ex">${s[1].map(e => koLine(e)).join('')}</ul></li>`).join('')}</ol>`;
  return `<article class="card gram">
    <div class="card-head"><h3 class="pattern" lang="ko">${esc(x.p)}</h3>${isNew ? '<span class="tag t1">new in this unit</span>' : isNew === false ? '<span class="tag">review</span>' : ''}
      <div class="seg"><button data-act="gdone" data-p="${esc(x.p)}" data-s="2" class="${gDone(x.p) ? 'on' : ''}">${gDone(x.p) ? '✓ Learned' : 'Mark learned'}</button></div></div>
    <p class="meaning">${esc(x.m)}</p>${body}</article>`;
}
function viewUnitGrammar(head, l, u) {
  const items = unitGrammar(l, u);
  app.innerHTML = head + `<p class="hint-line">${items.length} grammar points for this unit: ${items.filter(x => x.isNew).length} new, the rest carried over for review.</p>
    <div class="list">${items.map(x => grammarCard(x.g, x.isNew)).join('')}</div>`;
}
function viewLevelGrammar(l) {
  app.innerHTML = `<p class="crumb"><a href="#/L/${l}">Level ${l}</a></p><h1>Level ${l} grammar</h1>
    <p class="lede">All ${grammar[l].length} patterns for this level. Patterns with a Form and Usage note have translated examples; the others use the NIKL dictionary's definition and Korean examples.</p>
    <div class="toolbar">${chips(LEVELS.map(x => [`#/L/${x}/grammar`, x, x]), l, 'lv')}</div>
    <div class="list">${grammar[l].map(x => grammarCard(x)).join('')}</div>`;
}
function grammarQuestions(items) {
  return sample(items, 10).map(x => {
    const options = shuffle([x, ...sample(items.filter(y => y !== x && y.m !== x.m), 3)]);
    const q = { id: x.p, answer: options.indexOf(x), review: `${x.p} — ${x.m}` };
    const exs = x.x ? x.x : x.s.flatMap(s => s[1].map(e => [e]));
    const r = Math.random();
    if (r < 0.4 || !exs.length) return Object.assign(q, { kindLabel: 'What does this pattern express?', prompt: x.p, ko: true, options: options.map(y => y.m) });
    if (r < 0.7) return Object.assign(q, { kindLabel: 'Which pattern expresses this?', prompt: x.m, options: options.map(y => y.p), koOpts: true });
    const e = exs[Math.floor(Math.random() * exs.length)];
    return Object.assign(q, { kindLabel: 'Which pattern is used in this sentence?', prompt: e[0], sub: e[1], ko: true, small: true, say: e[0], options: options.map(y => y.p), koOpts: true });
  });
}

/* ---------- quiz engine ---------- */
function viewResult(head, s, back) {
  if (!s.cheered) { s.cheered = true; Mascots.cheer(s.right, s.qs.length); }
  app.innerHTML = head + `<div class="stage result"><p class="score">${s.right} / ${s.qs.length}</p>
    <p>${s.right === s.qs.length ? 'Perfect — 잘했어요!' : 'Review what you missed, then try again.'}</p>
    ${s.missed.length ? `<div class="card missed"><h2>To review</h2><ul>${s.missed.map(m => `<li lang="ko">${esc(m)}</li>`).join('')}</ul></div>` : ''}
    <div class="row center"><button class="btn primary" data-act="restart">Try another round</button><a class="btn" href="${back}">Back to the list</a></div></div>`;
}
function viewQuiz(head, section, key, build, back) {
  if (!session || session.kind !== 'quiz' || session.section !== section || session.key !== key) session = { kind: 'quiz', section, key, qs: build(), i: 0, picked: null, right: 0, missed: [] };
  const s = session;
  if (s.i >= s.qs.length) return viewResult(head, s, back);
  const q = s.qs[s.i], done = s.picked !== null;
  app.innerHTML = head + `<div class="stage">
    <p class="count">Question ${s.i + 1} of ${s.qs.length} · ${s.right} correct</p>
    <p class="q-kind">${q.kindLabel}</p>
    <p class="q-prompt ${q.ko && !q.small ? '' : 'en'}" ${q.ko ? 'lang="ko"' : ''}>${esc(q.prompt)}${q.say ? sayBtn(q.say) : ''}</p>
    ${q.sub && (done || q.subNow) ? `<p class="q-kind">${esc(q.sub)}</p>` : ''}
    <div class="opts">${q.options.map((o, i) => `<button class="opt ${done && i === q.answer ? 'right' : ''} ${done && i === s.picked && i !== q.answer ? 'wrong' : ''}"
      data-act="pick" data-i="${i}" ${done ? 'disabled' : ''} ${q.koOpts ? 'lang="ko"' : ''}><kbd>${i + 1}</kbd> ${esc(o)}</button>`).join('')}</div>
    ${done ? `<p class="q-kind after" lang="ko">${esc(q.review)}</p><div class="row"><button class="btn primary grow" data-act="next">${s.i + 1 === s.qs.length ? 'See result' : 'Next'} <kbd>Enter</kbd></button></div>` : ''}</div>`;
}
function pick(i) {
  const s = session, q = s.qs[s.i];
  if (s.picked !== null) return;
  s.picked = i;
  Mascots.react(i === q.answer);
  if (i === q.answer) s.right++;
  else {
    s.missed.push(q.review);
    if (s.section === 'vocab') { progress.v[q.id] = 1; saveProgress(); }
  }
  render();
}

/* ---------- search across all levels ---------- */
let allWords = null;
async function viewSearch(state) {
  if (!allWords) {
    app.innerHTML = '<p class="loading">Loading all six levels…</p>';
    await Promise.all(LEVELS.map(loadLevel));
    allWords = LEVELS.flatMap(l => Object.values(levelData[l]));
  }
  const where = x => { const [l, u] = unitOf[x.id]; return `<p class="look"><a href="#/L/${l}/U/${u}/words">Level ${l} · Unit ${u}</a></p>`; };
  results = () => {
    const q = state.q.trim().toLowerCase();
    if (!q) return '';
    const score = x => x.w === q ? 0 : x.w.startsWith(q) ? 1 : x.w.includes(q) ? 2 : x.origin.toLowerCase().includes(q) ? 3 : x.m.toLowerCase() === q ? 4 : 5;
    const hits = allWords.filter(x => matches(x, q)).sort((a, b) => score(a) - score(b) || unitOf[a.id][0] - unitOf[b.id][0] || a.w.length - b.w.length);
    return `<p class="count">${hits.length.toLocaleString()} matching${hits.length > 40 ? ' · showing the first 40' : ''}</p>` +
      (hits.slice(0, 40).map(x => wordCard(x, where(x))).join('') || '<p class="empty">No words match.</p>');
  };
  app.innerHTML = `<h1>Search all words</h1><p class="lede">Search ${allWords.length.toLocaleString()} words by Korean, 漢字 or English meaning.</p>
    <div class="toolbar"><input type="search" id="q" class="wide" placeholder="e.g. 여행, 旅行 or travel" value="${esc(state.q)}" aria-label="Search all words"></div>
    <div class="list" id="results">${results()}</div>`;
}

/* ---------- export / import ---------- */
function exportProgress() {
  const blob = new Blob([JSON.stringify({ app: 'hangeoreum', version: 2, exported: new Date().toISOString(), progress }, null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `korlearn-progress-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
async function importProgress(file) {
  try {
    const d = JSON.parse(await file.text()), p = d && d.progress;
    if (!d || d.app !== 'hangeoreum' || !p || typeof p.v !== 'object' || typeof p.g !== 'object') throw new Error('not a progress file');
    let n = 0;
    for (const id in p.v) { const s = +p.v[id]; if ([0, 1, 2].includes(s) && s > (progress.v[id] || 0)) { progress.v[id] = s; n++; } }
    for (const k in p.g) if (p.g[k] && !progress.g[k]) { progress.g[k] = 1; n++; }
    saveProgress();
    notice = `Imported. ${n} item${n === 1 ? '' : 's'} updated; existing progress was kept where it was further along.`;
  } catch (e) { notice = 'That file could not be imported. Choose a file made with “Export progress”.'; }
  render();
}

/* ---------- router ---------- */
const listState = { key: '', filter: 'all', q: '' };
function route() {
  const p = location.hash.replace(/^#\/?/, '').split('/');
  if (p[0] === 'search') return { view: 'search' };
  if (p[0] === 'mascots') return { view: 'mascots', id: p[1] || Mascots.byLevel(1).id };
  if (p[0] === 'L' && LEVELS.includes(+p[1])) {
    const l = +p[1], n = meta.levels[l].units.length;
    if (p[2] === 'grammar') return { view: 'lgrammar', l };
    if (p[2] === 'U' && +p[3] >= 1 && +p[3] <= n) return { view: 'unit', l, u: +p[3], mode: MODES.some(m => m[0] === p[4]) ? p[4] : 'words' };
    return { view: 'level', l };
  }
  return { view: 'home' };
}
let renderSeq = 0, modeKey = '';
async function render() {
  const r = route(), seq = ++renderSeq;
  const key = location.hash;
  if (listState.key !== key) Object.assign(listState, { key, filter: 'all', q: '' });
  if (r.view !== 'unit' || ['words', 'grammar'].includes(r.mode)) session = null;
  const l = r.l || 1;
  nav.innerHTML = [['home', '#/', 'Home'], ['level', `#/L/${l}`, 'Units'], ['lgrammar', `#/L/${l}/grammar`, 'Grammar'], ['search', '#/search', 'Search'], ['mascots', '#/mascots', 'Mascots']]
    .map(([v, href, label]) => `<a href="${href}" class="${r.view === v || (v === 'level' && r.view === 'unit') ? 'on' : ''}">${label}</a>`).join('');
  if (r.view === 'unit') {
    if (!levelData[r.l]) { app.innerHTML = '<p class="loading">Loading level…</p>'; await loadLevel(r.l); if (seq !== renderSeq) return; }
    viewUnit(r.l, r.u, r.mode, listState);
  } else if (r.view === 'level') viewLevel(r.l);
  else if (r.view === 'lgrammar') viewLevelGrammar(r.l);
  else if (r.view === 'search') { await viewSearch(listState); if (seq !== renderSeq) return; }
  else if (r.view === 'mascots') app.innerHTML = Mascots.page(r.id);
  else viewHome();
  Mascots.theme(r.view === 'mascots' ? Mascots.byId(r.id) : r.l && r.view !== 'home' ? Mascots.byLevel(r.l) : null);
  if (r.view === 'unit') Mascots.setLevel(r.l, `${r.l}/${r.u}`, [`${r.u}과를 시작해요!`, `Let's start unit ${r.u}!`]);
  else if (r.view === 'level') Mascots.setLevel(r.l, `L${r.l}`, [`${r.l}급에 오신 것을 환영해요!`, `Welcome to level ${r.l}!`]);
  else Mascots.setLevel(0);
  if (r.view === 'unit' && ['quiz', 'type', 'gquiz', 'cards'].includes(r.mode) && modeKey !== key) setTimeout(() => Mascots.move('start'), 300);
  modeKey = key;
}

/* ---------- events ---------- */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const act = b.dataset.act, y = window.scrollY, stay = () => render().then(() => window.scrollTo(0, y));
  if (act === 'say') return speak(b.dataset.text);
  if (act === 'status') { progress.v[b.dataset.id] = +b.dataset.s; saveProgress(); return stay(); }
  if (act === 'gdone') { if (gDone(b.dataset.p)) delete progress.g[b.dataset.p]; else progress.g[b.dataset.p] = 1; saveProgress(); return stay(); }
  if (act === 'filter') { listState.filter = b.dataset.f; return render(); }
  if (act === 'flip') { session.flipped = true; Mascots.move('next'); return render(); }
  if (act === 'grade') { progress.v[session.deck[session.i].id] = +b.dataset.s; saveProgress(); session.i++; session.flipped = false; return render(); }
  if (act === 'pick') return pick(+b.dataset.i);
  if (act === 'next') { e.preventDefault(); Mascots.move('next'); session.i++; session.picked = null; session.given = null; session.hint = false; return render(); }
  if (act === 'hint') { session.hint = true; return render(); }
  if (act === 'giveup') return checkTyped('', true);
  if (act === 'restart') { session = null; Mascots.move('start'); return render(); }
  if (act === 'export') return exportProgress();
  if (act === 'import') return document.getElementById('imp').click();
  if (act === 'reset' && b.dataset.sure) { progress = { v: {}, g: {} }; saveProgress(); notice = 'Progress erased.'; return render(); }
  if (act === 'reset') { b.dataset.sure = '1'; b.textContent = 'Click again to erase all progress'; }
});
document.addEventListener('change', e => { if (e.target.id === 'imp' && e.target.files[0]) importProgress(e.target.files[0]); });
document.addEventListener('submit', e => {
  if (e.target.dataset.form !== 'type') return;
  e.preventDefault();
  if (session && session.kind === 'type' && session.given === null) checkTyped(document.getElementById('ans').value);
});
let typing;
document.addEventListener('input', e => {
  if (e.target.id !== 'q') return;
  listState.q = e.target.value;
  clearTimeout(typing); typing = setTimeout(() => { const el = document.getElementById('results'); if (el) el.innerHTML = results(); }, 150);
});
document.addEventListener('keydown', e => {
  if (!session || session.kind === 'type' || e.isComposing || e.target.matches('input, textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
  const click = sel => { const el = app.querySelector(sel); if (el) { e.preventDefault(); el.click(); } };
  if (session.kind === 'flash') {
    if (e.key === ' ' || e.key === 'Enter') click('[data-act="flip"]');
    if (e.key === '1' || e.key === '2') click(`[data-act="grade"][data-s="${e.key}"]`);
  } else {
    if (/^[1-4]$/.test(e.key)) click(`[data-act="pick"][data-i="${e.key - 1}"]:not(:disabled)`);
    if (e.key === 'Enter') click('[data-act="next"]');
  }
});
let lastView = '';
window.addEventListener('hashchange', () => { const v = route().view, keep = v === 'mascots' && lastView === 'mascots'; lastView = v; render().then(() => { if (!keep) window.scrollTo(0, 0); }); });

loadBase().then(() => render()).catch(err => {
  app.innerHTML = `<p class="empty">Could not load the study data (${esc(err.message)}). If you opened this file directly, run it through a local server instead: <code>npx serve</code>.</p>`;
});
