/* 한걸음 — TOPIK 1–6 vocabulary and grammar trainer. No build step, no dependencies. */
'use strict';

const LEVELS = [1, 2, 3, 4, 5, 6];
const LEVEL_NAMES = { 1: 'TOPIK I · beginner', 2: 'TOPIK I · upper beginner', 3: 'TOPIK II · intermediate', 4: 'TOPIK II · upper intermediate', 5: 'TOPIK II · advanced', 6: 'TOPIK II · upper advanced' };
const POS = { n: 'noun', v: 'verb', adj: 'adjective', adv: 'adverb' };
const POS_KO = { '명사': 'noun', '동사': 'verb', '형용사': 'adjective', '부사': 'adverb', '관형사': 'determiner', '의존명사': 'bound noun', '접사': 'affix', '수사': 'numeral', '고유 명사': 'proper noun', '대명사': 'pronoun', '감탄사': 'interjection', '보조 용언': 'auxiliary' };
const LOAN_LANG = { 'Eng.': 'English', 'Ger.': 'German', 'Fr.': 'French', 'Jp.': 'Japanese', 'It.': 'Italian' };
const LOAN_KO = { '일': 'Japanese', '프': 'French', '독': 'German', '중': 'Chinese', '이': 'Italian' };
const STATUS = ['New', 'Learning', 'Known'];
const STORE_KEY = 'hangeoreum.progress.v1';

const app = document.getElementById('app');
const nav = document.getElementById('nav');
const data = { v: {}, g: {}, index: null };
let progress = loadProgress();
let session = null; // current flashcard or quiz session

/* ---------- utilities ---------- */
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const sample = (a, n) => shuffle(a).slice(0, n);

function loadProgress() {
  try { const p = JSON.parse(localStorage.getItem(STORE_KEY)); if (p && p.v && p.g) return p; } catch (e) { /* storage unavailable */ }
  return { v: {}, g: {} };
}
function saveProgress() { try { localStorage.setItem(STORE_KEY, JSON.stringify(progress)); } catch (e) { /* keep in memory */ } }
const vStatus = w => progress.v[w] || 0;
const gDone = p => !!progress.g[p];

function speak(text) {
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ko-KR'; u.rate = 0.9;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  } catch (e) { /* speech not supported */ }
}
const sayBtn = text => `<button class="say" data-act="say" data-text="${esc(text)}" aria-label="Listen" title="Listen">▶</button>`;

/* ---------- data ---------- */
const parseEx = s => { const i = s.indexOf('='); return { ko: s.slice(0, i), en: s.slice(i + 1) }; };
function parseVocab(text, level) {
  return text.trim().split('\n').map(line => {
    const f = line.split('|');
    return { word: f[0], origin: f[1], pos: f[2], meaning: f[3], ex: f.slice(4).map(parseEx), level };
  });
}
function parseGrammar(text, level) {
  return text.trim().split('\n').map(line => {
    const f = line.split('|');
    return { pattern: f[0], meaning: f[1], form: f[2], note: f[3], ex: f.slice(4).map(parseEx), level };
  });
}
async function loadAll() {
  const get = f => fetch('data/' + f).then(r => { if (!r.ok) throw new Error(f); return r.text(); });
  await Promise.all(LEVELS.flatMap(l => [
    get(`v${l}.txt`).then(t => { data.v[l] = parseVocab(t, l); }),
    get(`g${l}.txt`).then(t => { data.g[l] = parseGrammar(t, l); }),
  ]));
}
async function loadIndex() {
  if (!data.index) data.index = await fetch('data/index.json').then(r => r.json());
  return data.index;
}

function originInfo(o) {
  if (!o) return { cls: 'native', html: '고유어 · native Korean', plain: 'native Korean word' };
  if (/^[A-Za-z]/.test(o)) {
    const [abbr, ...rest] = o.split(' ');
    const src = rest.join(' ');
    return { cls: 'loan', html: `외래어 · ${esc(LOAN_LANG[abbr] || abbr)} “${esc(src)}”`, plain: `${LOAN_LANG[abbr] || abbr} “${src}”` };
  }
  const shown = o.replace('+', ' + ');
  return { cls: 'hanja', html: esc(shown), plain: shown, hanja: o.split('+')[0] };
}
const lookup = w => `<p class="look">Look up: <a href="https://en.dict.naver.com/#/search?query=${encodeURIComponent(w)}" target="_blank" rel="noopener">Naver dictionary</a> · <a href="https://en.wiktionary.org/wiki/${encodeURIComponent(w)}" target="_blank" rel="noopener">Wiktionary</a></p>`;

/* ---------- shared view pieces ---------- */
function levelChips(section, level, mode) {
  return `<div class="chips lv" role="group" aria-label="Level">${LEVELS.map(l =>
    `<a class="chip ${l === level ? 'on' : ''}" href="#/${section}/${l}/${mode}">${l}</a>`).join('')}</div>`;
}
function modeChips(section, level, mode, modes) {
  return `<div class="chips" role="group" aria-label="Mode">${modes.map(([m, label]) =>
    `<a class="chip ${m === mode ? 'on' : ''}" href="#/${section}/${level}/${m}">${label}</a>`).join('')}</div>`;
}
const exList = ex => `<ul class="ex">${ex.map(e =>
  `<li><span class="ko" lang="ko">${esc(e.ko)}</span>${sayBtn(e.ko)}<span class="tr">${esc(e.en)}</span></li>`).join('')}</ul>`;
const seg = w => `<div class="seg" role="group" aria-label="Status">${STATUS.map((s, i) =>
  `<button data-act="status" data-w="${esc(w)}" data-s="${i}" class="${vStatus(w) === i ? 'on' : ''}">${s}</button>`).join('')}</div>`;

/* ---------- home ---------- */
function viewHome() {
  const cards = LEVELS.map(l => {
    const v = data.v[l], g = data.g[l];
    const known = v.filter(x => vStatus(x.word) === 2).length;
    const learning = v.filter(x => vStatus(x.word) === 1).length;
    const done = g.filter(x => gDone(x.pattern)).length;
    return `<section class="level">
      <div class="level-head"><span class="level-num">${l}급</span><div><h2>Level ${l}</h2><small>${LEVEL_NAMES[l]}</small></div></div>
      <div><div class="stat"><span>Vocabulary</span><span>${known} known · ${learning} learning · ${v.length} total</span></div>
        <div class="bar"><i style="width:${Math.round(known / v.length * 100)}%"></i></div></div>
      <div><div class="stat"><span>Grammar</span><span>${done} of ${g.length} learned</span></div>
        <div class="bar"><i style="width:${Math.round(done / g.length * 100)}%"></i></div></div>
      <div class="level-actions"><a class="btn primary grow" href="#/vocab/${l}/list">Vocabulary</a><a class="btn grow" href="#/grammar/${l}/list">Grammar</a></div>
    </section>`;
  }).join('');
  const nv = LEVELS.reduce((n, l) => n + data.v[l].length, 0), ng = LEVELS.reduce((n, l) => n + data.g[l].length, 0);
  app.innerHTML = `<h1>Korean for TOPIK, level by level</h1>
    <p class="lede">${nv} core words and ${ng} grammar patterns across levels 1–6. Every word shows its hanja (漢字) or loanword source, with example sentences explained in English. A separate index lists 7,300+ words from the official NIKL and TOPIK lists.</p>
    <div class="levels">${cards}</div>
    <div class="toolbar"><span class="spacer"></span><button class="btn" data-act="reset">Reset my progress</button></div>`;
}

/* ---------- vocabulary ---------- */
function vocabCard(x) {
  const o = originInfo(x.origin);
  return `<article class="card">
    <div class="card-head"><h3 class="word" lang="ko">${esc(x.word)}</h3>${sayBtn(x.word)}
      <span class="origin ${o.cls}" ${o.cls === 'hanja' ? 'lang="ko-Hani" title="Hanja (Chinese-character) form"' : ''}>${o.html}</span>
      <span class="pos">${POS[x.pos]}</span>${seg(x.word)}</div>
    <p class="meaning">${esc(x.meaning)}</p>${exList(x.ex)}${lookup(x.word)}</article>`;
}
function viewVocab(level, mode, state) {
  const items = data.v[level];
  const head = `<h1>Level ${level} vocabulary</h1><p class="lede">${LEVEL_NAMES[level]}. Mark each word as you go; flashcards and quizzes focus on the ones you haven't marked Known.</p>
    <div class="toolbar">${levelChips('vocab', level, mode)}${modeChips('vocab', level, mode, [['list', 'Word list'], ['cards', 'Flashcards'], ['quiz', 'Quiz']])}</div>`;
  if (mode === 'cards') return viewFlash(head, level, items);
  if (mode === 'quiz') return viewQuiz(head, 'vocab', level, () => vocabQuestions(items));
  const f = state.filter, q = state.q.trim().toLowerCase();
  const shown = items.filter(x => (f === 'all' || vStatus(x.word) === +f) &&
    (!q || x.word.includes(q) || x.meaning.toLowerCase().includes(q) || x.origin.toLowerCase().includes(q)));
  app.innerHTML = head + `<div class="toolbar">
      <div class="chips">${[['all', 'All'], ['0', 'New'], ['1', 'Learning'], ['2', 'Known']].map(([k, label]) =>
        `<button class="chip ${f === k ? 'on' : ''}" data-act="filter" data-f="${k}">${label}</button>`).join('')}</div>
      <span class="spacer"></span><input type="search" id="q" placeholder="Search Korean, 漢字 or English" value="${esc(state.q)}" aria-label="Search words"></div>
    <div class="list">${shown.map(vocabCard).join('') || '<p class="empty">No words match.</p>'}</div>`;
}

function viewFlash(head, level, items) {
  if (!session || session.kind !== 'flash' || session.level !== level) {
    const pending = items.filter(x => vStatus(x.word) !== 2);
    session = { kind: 'flash', level, deck: shuffle(pending.length ? pending : items), i: 0, flipped: false, all: !pending.length };
  }
  const s = session;
  if (s.i >= s.deck.length) {
    app.innerHTML = head + `<div class="stage result"><p class="score">끝!</p><p>You went through ${s.deck.length} cards.</p>
      <div class="row" style="justify-content:center"><button class="btn primary" data-act="restart">Go again</button><a class="btn" href="#/vocab/${level}/quiz">Take the quiz</a></div></div>`;
    return;
  }
  const x = s.deck[s.i], o = originInfo(x.origin);
  const back = `<span class="origin ${o.cls}">${o.html}</span><span class="pos">${POS[x.pos]}</span><p class="meaning">${esc(x.meaning)}</p>${exList(x.ex)}`;
  app.innerHTML = head + `<div class="stage">
    <p class="count">Card ${s.i + 1} of ${s.deck.length}${s.all ? ' · reviewing all (everything is marked Known)' : ''}</p>
    <div class="flash"><h2 class="word" lang="ko">${esc(x.word)}</h2>${sayBtn(x.word)}
      ${s.flipped ? back : '<p class="hint">Say the meaning to yourself, then reveal.</p>'}</div>
    <div class="row">${s.flipped
      ? `<button class="btn grow" data-act="grade" data-s="1">Still learning <kbd>1</kbd></button><button class="btn jade grow" data-act="grade" data-s="2">I know it <kbd>2</kbd></button>`
      : `<button class="btn primary grow" data-act="flip">Show answer <kbd>Space</kbd></button>`}</div></div>`;
}

function vocabQuestions(items) {
  const pending = items.filter(x => vStatus(x.word) !== 2);
  const pool = sample(pending.length >= 10 ? pending : items, 10);
  const withHanja = items.filter(x => originInfo(x.origin).cls === 'hanja');
  return pool.map(x => {
    const o = originInfo(x.origin);
    const kinds = ['ko-en', 'en-ko'];
    if (o.cls === 'hanja' && withHanja.length >= 4) kinds.push('hanja');
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    const from = kind === 'hanja' ? withHanja : items;
    const options = shuffle([x, ...sample(from.filter(y => y.word !== x.word && y.meaning !== x.meaning), 3)]);
    const q = { id: x.word, answer: options.indexOf(x), review: `${x.word}${o.cls === 'hanja' ? ' (' + o.plain + ')' : ''} — ${x.meaning}` };
    if (kind === 'ko-en') Object.assign(q, { kindLabel: 'What does this word mean?', prompt: x.word, ko: true, say: x.word, options: options.map(y => y.meaning) });
    else if (kind === 'en-ko') Object.assign(q, { kindLabel: 'Which Korean word matches?', prompt: x.meaning, options: options.map(y => y.word), koOpts: true });
    else Object.assign(q, { kindLabel: 'Which Korean word is written with these characters?', prompt: o.hanja, ko: true, options: options.map(y => y.word), koOpts: true });
    return q;
  });
}

/* ---------- grammar ---------- */
function grammarCard(x) {
  return `<article class="card gram">
    <div class="card-head"><h3 class="pattern" lang="ko">${esc(x.pattern)}</h3>
      <div class="seg"><button data-act="gdone" data-p="${esc(x.pattern)}" data-s="2" class="${gDone(x.pattern) ? 'on' : ''}">${gDone(x.pattern) ? '✓ Learned' : 'Mark learned'}</button></div></div>
    <p class="meaning">${esc(x.meaning)}</p>
    <dl><dt>Form</dt><dd lang="ko">${esc(x.form)}</dd><dt>Usage</dt><dd>${esc(x.note)}</dd></dl>${exList(x.ex)}</article>`;
}
function viewGrammar(level, mode) {
  const items = data.g[level];
  const head = `<h1>Level ${level} grammar</h1><p class="lede">${LEVEL_NAMES[level]}. Each pattern has its meaning, how to attach it, usage notes and two example sentences.</p>
    <div class="toolbar">${levelChips('grammar', level, mode)}${modeChips('grammar', level, mode, [['list', 'Patterns'], ['quiz', 'Quiz']])}</div>`;
  if (mode === 'quiz') return viewQuiz(head, 'grammar', level, () => grammarQuestions(items));
  app.innerHTML = head + `<div class="list">${items.map(grammarCard).join('')}</div>`;
}
function grammarQuestions(items) {
  return sample(items, 10).map(x => {
    const options = shuffle([x, ...sample(items.filter(y => y !== x), 3)]);
    const q = { id: x.pattern, answer: options.indexOf(x), review: `${x.pattern} — ${x.meaning}` };
    const r = Math.random();
    if (r < 0.4) return Object.assign(q, { kindLabel: 'What does this pattern express?', prompt: x.pattern, ko: true, options: options.map(y => y.meaning) });
    if (r < 0.7) return Object.assign(q, { kindLabel: 'Which pattern expresses this?', prompt: x.meaning, options: options.map(y => y.pattern), koOpts: true });
    const e = x.ex[Math.floor(Math.random() * x.ex.length)];
    return Object.assign(q, { kindLabel: 'Which pattern is used in this sentence?', prompt: e.ko, sub: e.en, ko: true, small: true, say: e.ko, options: options.map(y => y.pattern), koOpts: true });
  });
}

/* ---------- quiz engine ---------- */
function viewQuiz(head, section, level, build) {
  if (!session || session.kind !== 'quiz' || session.section !== section || session.level !== level) {
    session = { kind: 'quiz', section, level, qs: build(), i: 0, picked: null, right: 0, missed: [], build };
  }
  const s = session;
  if (s.i >= s.qs.length) {
    app.innerHTML = head + `<div class="stage result"><p class="score">${s.right} / ${s.qs.length}</p>
      <p>${s.right === s.qs.length ? 'Perfect — 잘했어요!' : 'Review what you missed, then try again.'}</p>
      ${s.missed.length ? `<div class="card missed"><h2>To review</h2><ul>${s.missed.map(m => `<li lang="ko">${esc(m)}</li>`).join('')}</ul></div>` : ''}
      <div class="row" style="justify-content:center"><button class="btn primary" data-act="restart">New quiz</button><a class="btn" href="#/${section}/${level}/list">Back to the list</a></div></div>`;
    return;
  }
  const q = s.qs[s.i], done = s.picked !== null;
  app.innerHTML = head + `<div class="stage">
    <p class="count">Question ${s.i + 1} of ${s.qs.length} · ${s.right} correct</p>
    <p class="q-kind">${q.kindLabel}</p>
    <p class="q-prompt ${q.ko && !q.small ? '' : 'en'}" ${q.ko ? 'lang="ko"' : ''}>${esc(q.prompt)}${q.say ? sayBtn(q.say) : ''}</p>
    ${q.sub && done ? `<p class="q-kind">${esc(q.sub)}</p>` : ''}
    <div class="opts">${q.options.map((o, i) => `<button class="opt ${done && i === q.answer ? 'right' : ''} ${done && i === s.picked && i !== q.answer ? 'wrong' : ''}"
      data-act="pick" data-i="${i}" ${done ? 'disabled' : ''} ${q.koOpts ? 'lang="ko"' : ''}><kbd>${i + 1}</kbd> ${esc(o)}</button>`).join('')}</div>
    ${done ? `<p class="q-kind" style="margin-top:14px" lang="ko">${esc(q.review)}</p><div class="row"><button class="btn primary grow" data-act="next">${s.i + 1 === s.qs.length ? 'See result' : 'Next'} <kbd>Enter</kbd></button></div>` : ''}</div>`;
}
function pick(i) {
  const s = session, q = s.qs[s.i];
  if (s.picked !== null) return;
  s.picked = i;
  if (i === q.answer) s.right++;
  else {
    s.missed.push(q.review);
    if (s.section === 'vocab') { progress.v[q.id] = 1; saveProgress(); }
  }
  render();
}

/* ---------- full word index ---------- */
const PAGE = 100;
function indexHint(row) {
  let hint = row[3], origin = row[2];
  const m = hint.match(/^&(.)([^;]*)(?:;\s*)?(.*)$/);
  const en = !m && hint.match(/^([A-Za-z][A-Za-z .'-]*)(?:;\s*(.*))?$/);
  if (m) { origin = `${LOAN_KO[m[1]] || m[1]}: ${m[2]}`; hint = m[3]; }
  else if (en) { origin = (origin ? origin + " + " : "") + `English: ${en[1]}`; hint = en[2] || ''; }
  return { origin, hint: hint ? hint.split('; ').map(h => (/^(을|를|이|가|에|에서|로|으로|와|과|의|은|는|도|만|께|한테|에게)(\s|$)/.test(h) ? '~' + h : h)).join(' · ') : '' };
}
async function viewIndex(state) {
  app.innerHTML = '<p class="loading">Loading the word list…</p>';
  const all = await loadIndex();
  const q = state.q.trim().toLowerCase(), t = state.filter;
  const rows = all.filter(r => (t === 'all' || (t === 'h' ? !!r[2] && !/[A-Za-z]/.test(r[2]) : r[4] === +t)) &&
    (!q || r[0].includes(q) || r[2].toLowerCase().includes(q)));
  const shown = rows.slice(0, state.n);
  app.innerHTML = `<h1>Full word index</h1>
    <p class="lede">${all.length.toLocaleString()} entries from the NIKL learner vocabulary list (2003) and the public TOPIK vocabulary list (2015), with hanja where a word has one.</p>
    <p class="note">This index is a reference list: it has no English definitions or example sentences. The official lists only separate TOPIK I (levels 1–2) from TOPIK II (levels 3–6); NIKL grades are A beginner, B intermediate, C advanced. Tap a word to look it up in Naver's dictionary.</p>
    <div class="toolbar"><div class="chips">${[['all', 'All'], ['1', 'TOPIK I'], ['2', 'TOPIK II'], ['h', 'Has hanja']].map(([k, label]) =>
      `<button class="chip ${t === k ? 'on' : ''}" data-act="filter" data-f="${k}">${label}</button>`).join('')}</div>
      <span class="spacer"></span><input type="search" id="q" placeholder="Search Korean or 漢字" value="${esc(state.q)}" aria-label="Search the index"></div>
    <p class="count">${rows.length.toLocaleString()} matching · showing ${shown.length}</p>
    <div class="table-wrap"><table class="idx"><thead><tr><th>Word</th><th>Origin</th><th class="hide-s">Part of speech</th><th class="hide-s">Typical use</th><th>Level</th></tr></thead><tbody>
    ${shown.map(r => { const h = indexHint(r); return `<tr><td class="w" lang="ko"><a href="https://en.dict.naver.com/#/search?query=${encodeURIComponent(r[0])}" target="_blank" rel="noopener">${esc(r[0])}</a></td>
      <td class="h">${esc(h.origin)}</td><td class="c hide-s">${POS_KO[r[1]] || esc(r[1])}</td><td class="c hide-s" lang="ko">${esc(h.hint)}</td>
      <td>${r[4] ? `<span class="tag t${r[4]}">TOPIK ${r[4] === 1 ? 'I' : 'II'}</span> ` : ''}${r[5] ? `<span class="tag">NIKL ${r[5]}</span>` : ''}</td></tr>`; }).join('')}
    </tbody></table></div>
    ${rows.length > shown.length ? `<div class="row" style="justify-content:center"><button class="btn" data-act="more">Show ${Math.min(PAGE, rows.length - shown.length)} more</button></div>` : ''}`;
}

/* ---------- router ---------- */
const listState = { key: '', filter: 'all', q: '', n: PAGE };
function route() {
  const [section = '', lv, mode] = location.hash.replace(/^#\/?/, '').split('/');
  const level = LEVELS.includes(+lv) ? +lv : 1;
  return { section: ['vocab', 'grammar', 'index'].includes(section) ? section : 'home', level, mode: mode || 'list' };
}
function render(keepFocus) {
  const r = route();
  const key = `${r.section}/${r.level}/${r.mode}`;
  if (listState.key !== key) Object.assign(listState, { key, filter: 'all', q: '', n: PAGE });
  if (r.mode === 'list' || r.section === 'home' || r.section === 'index') session = null;
  nav.innerHTML = [['home', '#/', 'Home'], ['vocab', `#/vocab/${r.level}/list`, 'Vocabulary'], ['grammar', `#/grammar/${r.level}/list`, 'Grammar'], ['index', '#/index', 'Word index']]
    .map(([s, href, label]) => `<a href="${href}" class="${r.section === s ? 'on' : ''}">${label}</a>`).join('');
  const refocus = () => { if (keepFocus) { const q = document.getElementById('q'); if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } } };
  if (r.section === 'vocab') viewVocab(r.level, r.mode, listState);
  else if (r.section === 'grammar') viewGrammar(r.level, r.mode);
  else if (r.section === 'index') return viewIndex(listState).then(refocus);
  else viewHome();
  refocus();
}

/* ---------- events ---------- */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const act = b.dataset.act;
  if (act === 'say') return speak(b.dataset.text);
  if (act === 'status') { progress.v[b.dataset.w] = +b.dataset.s; saveProgress(); return render(); }
  if (act === 'gdone') { if (gDone(b.dataset.p)) delete progress.g[b.dataset.p]; else progress.g[b.dataset.p] = 1; saveProgress(); return render(); }
  if (act === 'filter') { listState.filter = b.dataset.f; listState.n = PAGE; return render(); }
  if (act === 'more') { listState.n += PAGE; return render(); }
  if (act === 'flip') { session.flipped = true; return render(); }
  if (act === 'grade') { progress.v[session.deck[session.i].word] = +b.dataset.s; saveProgress(); session.i++; session.flipped = false; return render(); }
  if (act === 'pick') return pick(+b.dataset.i);
  if (act === 'next') { session.i++; session.picked = null; return render(); }
  if (act === 'restart') { session = null; return render(); }
  if (act === 'reset' && b.dataset.sure) { progress = { v: {}, g: {} }; saveProgress(); return render(); }
  if (act === 'reset') { b.dataset.sure = '1'; b.textContent = 'Click again to erase all progress'; }
});
let typing;
document.addEventListener('input', e => {
  if (e.target.id !== 'q') return;
  listState.q = e.target.value; listState.n = PAGE;
  clearTimeout(typing); typing = setTimeout(() => render(true), 180);
});
document.addEventListener('keydown', e => {
  if (!session || e.target.matches('input, textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
  const click = sel => { const el = app.querySelector(sel); if (el) { e.preventDefault(); el.click(); } };
  if (session.kind === 'flash') {
    if (e.key === ' ' || e.key === 'Enter') click('[data-act="flip"]');
    if (e.key === '1' || e.key === '2') click(`[data-act="grade"][data-s="${e.key}"]`);
  } else {
    if (/^[1-4]$/.test(e.key)) click(`[data-act="pick"][data-i="${e.key - 1}"]:not(:disabled)`);
    if (e.key === 'Enter') click('[data-act="next"]');
  }
});
window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });

loadAll().then(() => render()).catch(err => {
  app.innerHTML = `<p class="empty">Could not load the study data (${esc(err.message)}). If you opened this file directly, run it through a local server instead: <code>npx serve</code>.</p>`;
});
