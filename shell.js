/* The six mascots, in their original design. Poses and icons come from the supplied transparent pose files
   (assets/mascots/<id>/): nothing is redrawn here.
   One character per level; this file holds their data, the mascot page, the page accent colour and the study buddy. */
'use strict';

const Mascots = (() => {
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* Central character data. `color` is the brand colour; `accent` is a darker shade of it that stays readable as text and on buttons. */
  const LIST = [
    { id: 'pipi', name: 'PiPi', level: 1, animal: 'frog', kind: 'Mint-green frog', color: '#62CA97', accent: '#1f8a5b', soft: '#e0f5ea',
      desc: 'A quiet little frog from Misty Pond. Soft, calm, and always curious.', birthday: 'April 18', birthplace: 'Misty Pond',
      personality: 'Calm, curious, shy', hobby: 'Napping, collecting pebbles, bubble watching', sig: 'wave' },
    { id: 'momo', name: 'Momo', level: 2, animal: 'cat', kind: 'Orange tabby cat', color: '#FF922F', accent: '#bf5c06', soft: '#ffecd9',
      desc: 'A chubby and curious orange tabby cat. Momo loves to explore the world and find small joys in daily life.', birthday: 'March 8', birthplace: 'Orange Town',
      personality: 'Curious, gentle, optimistic', hobby: 'Exploring, sunbathing, snacking', sig: 'wave' },
    { id: 'bobo', name: 'Bobo', level: 3, animal: 'puppy', kind: 'Cream puppy with blue ears', color: '#59B6FA', accent: '#1c73c4', soft: '#e0f0fe',
      desc: 'A fluffy little puppy full of curiosity and energy. Bobo loves to explore the world and make new friends.', birthday: 'May 20', birthplace: 'Cloud Town',
      personality: 'Curious, friendly, energetic', hobby: 'Exploring, playing with balls, making friends', sig: 'wave' },
    { id: 'nini', name: 'Nini', level: 4, animal: 'rabbit', kind: 'White rabbit with a lavender scarf', color: '#BC9BD9', accent: '#7d55a8', soft: '#f1e8f9',
      desc: 'A fluffy little rabbit who is curious about the world. Gentle, a bit shy, and always full of small surprises.', birthday: 'March 14', birthplace: 'Cloud Village',
      personality: 'Gentle, curious, a bit shy', hobby: 'Exploring new things, eating desserts, collecting cute items', sig: 'wave' },
    { id: 'koko', name: 'Koko', level: 5, animal: 'fox', kind: 'Coral-orange fox', color: '#F58A65', accent: '#c04f2a', soft: '#fde6dd',
      desc: 'A fluffy little fox who is curious about the world and loves small adventures.', birthday: 'May 20', birthplace: 'Forest Town',
      personality: 'Curious, friendly, optimistic', hobby: 'Exploring, collecting leaves, picnicking', sig: 'wave' },
    { id: 'tutu', name: 'Tutu', level: 6, animal: 'hamster', kind: 'Cream hamster', color: '#FFCB28', accent: '#8f6a00', soft: '#fff3cc',
      desc: 'A chubby and curious hamster who loves food and little adventures. Always cheerful, a bit greedy, and full of energy!', birthday: 'March 14', birthplace: 'Cheese Town',
      personality: 'Cheerful, curious, a foodie', hobby: 'Snacking and exploring new places', sig: 'wave' },
  ];
  LIST.forEach(m => { m.poses = ['stand', 'walk', 'running', 'jump', 'sit', m.sig]; });   // every character has the same six poses
  const byLevel = l => LIST[Math.min(LIST.length, Math.max(1, l || 1)) - 1];
  const byId = id => LIST.find(m => m.id === id) || LIST[0];
  const src = (m, pose) => `assets/mascots/${m.id}/${pose}.webp`;
  const img = (m, pose, cls = '', alt = `${m.name} the ${m.animal}`) => `<img class="mascot ${cls}" src="${src(m, pose)}" alt="${alt}" draggable="false">`;
  const media = (level, cls = '') => { const m = byLevel(level); return `<span class="icon-bg ${cls}" style="--c:${m.color}">${img(m, 'icon')}</span>`; };

  /* page accent follows the character on screen; null restores the default blue */
  function theme(m) {
    const st = document.documentElement.style;
    if (!m) { ['--accent', '--accent-soft', '--brand'].forEach(k => st.removeProperty(k)); return; }
    st.setProperty('--accent', m.accent); st.setProperty('--accent-soft', m.soft); st.setProperty('--brand', m.color);
  }

  /* ---------- mascot page ---------- */
  function page(id) {
    const m = byId(id);
    const lineup = LIST.map(x => `<a class="pick ${x === m ? 'on' : ''}" href="#/mascots/${x.id}" style="--c:${x.color}" aria-current="${x === m ? 'true' : 'false'}">
      <span class="icon-bg">${img(x, 'icon')}</span><span>${x.name}</span><small>Level ${x.level}</small></a>`).join('');
    const tile = (pose, label) => `<button class="tile" data-hop title="${label}">${img(m, pose, '', `${m.name}: ${label.toLowerCase()}`)}<span>${label}</span></button>`;
    return `<h1>Meet the mascots</h1><p class="lede">Six study companions, one for each level. Pick one to see its profile.</p>
      <div class="lineup" role="group" aria-label="Characters">${lineup}</div>
      <section class="profile" style="--c:${m.color}">
        <div class="hero-art">${img(m, 'stand', 'float')}</div>
        <div class="about-m"><p class="kind">${m.kind} · Level ${m.level}</p><h2>${m.name}</h2><p class="desc">${m.desc}</p>
          <dl><dt>Birthday</dt><dd>${m.birthday}</dd><dt>Birthplace</dt><dd>${m.birthplace}</dd><dt>Personality</dt><dd>${m.personality}</dd><dt>Interests</dt><dd>${m.hobby}</dd></dl>
          <a class="btn primary" href="#/L/${m.level}">Study level ${m.level} with ${m.name}</a></div>
      </section>
      <h2 class="section">Action poses</h2><div class="tiles six">${m.poses.map(p => tile(p, p[0].toUpperCase() + p.slice(1))).join('')}</div>`;
  }
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-hop]');
    if (t && !RM && t.animate) t.querySelector('img').animate([{ transform: 'none' }, { transform: 'translateY(-14px) rotate(-4deg)' }, { transform: 'translateY(0) rotate(3deg)' }, { transform: 'none' }], { duration: 520, easing: 'ease-out' });
  });

  /* ---------- voices: a short synthesized sound per character (Web Audio, no sound files) ---------- */
  // each note: [start Hz, end Hz, seconds, gap before it, wave shape]
  const VOICE = {
    pipi: [[210, 330, .09, 0, 'triangle'], [300, 190, .13, .03, 'triangle']],                             // frog: a low "rib-bit"
    momo: [[720, 1120, .16, 0, 'sine'], [1120, 820, .2, 0, 'sine']],                                       // cat: a rising-falling "mew"
    bobo: [[480, 760, .08, 0, 'triangle'], [520, 800, .09, .07, 'triangle']],                              // puppy: "yip yip"
    nini: [[1250, 1500, .06, 0, 'sine'], [1450, 1750, .07, .06, 'sine']],                                  // rabbit: two soft pips
    koko: [[900, 1650, .11, 0, 'sine'], [1400, 1000, .12, .02, 'sine']],                                   // fox: a chirpy "kyu"
    tutu: [[1800, 2250, .05, 0, 'sine'], [1900, 2350, .05, .05, 'sine'], [2000, 2450, .06, .05, 'sine']],  // hamster: quick squeaks
  };
  const MUTE_KEY = 'hangeoreum.muted';
  let actx = null, muted = false;
  try { muted = localStorage.getItem(MUTE_KEY) === '1'; } catch (e) { /* ignore */ }
  function voice(m, mood = 'happy') {
    if (muted || !m) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
      const pitch = mood === 'sad' ? 0.72 : 1, notes = mood === 'sad' ? VOICE[m.id].slice(0, 1) : VOICE[m.id];
      let t = actx.currentTime + 0.01;
      for (const [f0, f1, dur, gap, shape] of notes) {
        t += gap;
        const o = actx.createOscillator(), g = actx.createGain();
        o.type = shape; o.frequency.setValueAtTime(f0 * pitch, t); o.frequency.exponentialRampToValueAtTime((mood === 'sad' ? f0 * 0.8 : f1) * pitch, t + dur);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g).connect(actx.destination); o.start(t); o.stop(t + dur + 0.02); t += dur;
      }
    } catch (e) { /* no audio */ }
  }

  /* ---------- the buddy on lesson pages ----------
     Poses: stand = idle · wave = greeting or clicked · jump = right answer · sit = wrong answer or resting ·
            walk = moving to the next question · running = starting a quiz or a streak of right answers */
  const buddy = document.querySelector('.buddy'), face = buddy.querySelector('.buddy-face'), bubble = buddy.querySelector('.bubble'), muteBtn = buddy.querySelector('.mute');
  let cur = null, timer = 0, restTimer = 0, greeted = '', streak = 0;
  const pickOne = a => a[Math.floor(Math.random() * a.length)];
  const RIGHT = [['잘했어요!', 'Well done!'], ['맞아요!', "That's right!"], ['대단해요!', 'Amazing!'], ['정답이에요!', 'Correct!']];
  const WRONG = [['괜찮아요, 다시 해 봐요.', "It's okay, try again."], ['아깝다!', 'So close!'], ['천천히 해도 돼요.', 'Take your time.']];
  const CHEER = [['화이팅!', 'You can do it!'], ['한 걸음씩 가요.', 'One step at a time.'], ['오늘도 열심히 하네요!', 'Working hard again today!'], ['천천히 해도 괜찮아요.', "It's fine to go slowly."], ['같이 공부해요!', "Let's study together!"]];
  const speak = t => { if (muted) return; try { const u = new SpeechSynthesisUtterance(t); u.lang = 'ko-KR'; u.rate = .9; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) { /* no speech */ } };
  const pose = p => { const i = face.querySelector('img'); if (i && cur) i.src = src(cur, p); };
  const MOVES = {
    jump: [{ transform: 'none' }, { transform: 'translateY(-14px) scale(1.06)' }, { transform: 'none' }],
    wave: [{ transform: 'none' }, { transform: 'rotate(-6deg)' }, { transform: 'rotate(5deg)' }, { transform: 'none' }],
    sit: [{ transform: 'none' }, { transform: 'translateY(4px) scale(.97)' }, { transform: 'none' }],
    walk: [{ transform: 'translateX(-10px)' }, { transform: 'translateX(6px)' }, { transform: 'none' }],
    running: [{ transform: 'translateX(-22px)' }, { transform: 'translateX(10px)' }, { transform: 'translateX(-4px)' }, { transform: 'none' }],
  };
  function act(p, ms) {                       // show a pose for a moment, then stand again; rest (sit) after a long pause
    pose(p);
    if (!RM && face.animate && MOVES[p]) face.animate(MOVES[p], { duration: p === 'running' ? 620 : 460, easing: 'ease-out' });
    clearTimeout(timer); timer = setTimeout(() => { bubble.classList.remove('on'); pose('stand'); }, ms);
    clearTimeout(restTimer); restTimer = setTimeout(() => { if (cur && !bubble.classList.contains('on')) pose('sit'); }, 30000);
  }
  function say(ko, en, p = 'jump', ms = 2800) {
    bubble.querySelector('b').textContent = ko; bubble.querySelector('span').textContent = en;
    bubble.classList.add('on'); act(p, ms);
  }
  /* Show the buddy for a level (0 hides it). `greetKey` changes when a new unit opens, which earns a greeting. */
  function setLevel(l, greetKey, greeting) {
    const m = l ? byLevel(l) : null;
    buddy.classList.toggle('on', !!m);
    if (m && m !== cur) {
      face.innerHTML = img(m, 'stand'); face.setAttribute('aria-label', `${m.name} the ${m.animal}: click for a sound and some encouragement`);
      m.poses.forEach(p => { new Image().src = src(m, p); });      // so poses swap instantly
      streak = 0;
    }
    cur = m;
    if (m && greetKey && greetKey !== greeted) { greeted = greetKey; setTimeout(() => { if (cur === m) say(greeting[0], `${m.name}: ${greeting[1]}`, 'wave', 3200); }, 500); }
    if (!m) { clearTimeout(timer); clearTimeout(restTimer); bubble.classList.remove('on'); }
  }
  face.addEventListener('click', () => { const [ko, en] = pickOne(CHEER); say(ko, en, 'wave'); voice(cur); setTimeout(() => speak(ko), 380); });
  const showMute = () => { muteBtn.textContent = muted ? 'Sound off' : 'Sound on'; muteBtn.setAttribute('aria-pressed', String(!muted)); };
  muteBtn.addEventListener('click', () => { muted = !muted; try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch (e) { /* ignore */ } showMute(); if (!muted) voice(cur); });
  showMute();

  return {
    LIST, byLevel, byId, media, page, theme, setLevel,
    react: ok => {
      if (!cur) return;
      streak = ok ? streak + 1 : 0;
      if (ok && streak > 0 && streak % 3 === 0) { say('연속 정답!', `${streak} in a row!`, 'running', 2200); voice(cur); return; }
      const [ko, en] = pickOne(ok ? RIGHT : WRONG); say(ko, en, ok ? 'jump' : 'sit', 2000); voice(cur, ok ? 'happy' : 'sad');
    },
    cheer: (right, total) => {
      if (!cur) return;
      if (right === total) { say('완벽해요!', 'Perfect score!', 'jump', 3600); voice(cur); }
      else if (right >= total * 0.7) say('잘하고 있어요!', "You're doing well!", 'wave', 3200);
      else say('다시 한번 해 봐요.', "Let's try once more.", 'sit', 3200);
    },
    move: kind => { if (cur && !bubble.classList.contains('on')) act(kind === 'start' ? 'running' : 'walk', kind === 'start' ? 900 : 650); },
  };
})();
