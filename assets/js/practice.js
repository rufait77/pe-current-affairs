import { initTheme, loadQuestions, getBookmarks, shuffle, formatTime, LS, sectionLabel } from './app.js';

initTheme();

const content = document.getElementById('content');
const paletteWrap = document.getElementById('palette-wrap');
const paletteEl = document.getElementById('palette');
const timerEl = document.getElementById('timer');
const progressBar = document.getElementById('progress-bar');
const bottomActions = document.getElementById('bottom-actions');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const markBtn = document.getElementById('mark-btn');
const submitBtn = document.getElementById('submit-btn');
const setupModal = document.getElementById('setup-modal');

let all = [];
let session = null; // { ids, answers, marked, idx, startTs, elapsed, timerMode, duration, negative, running }
let tick = null;

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}

// ---- Setup modal ----
function activate(groupSel, target) {
  document.querySelectorAll(`${groupSel} .chip`).forEach(c => c.classList.toggle('active', c === target));
}
document.querySelectorAll('#len-chips .chip').forEach(c => c.addEventListener('click', () => {
  activate('#len-chips', c);
  document.getElementById('len-custom').classList.toggle('hide', c.dataset.len !== 'custom');
}));
document.querySelectorAll('#pool-chips .chip').forEach(c => c.addEventListener('click', () => activate('#pool-chips', c)));
document.querySelectorAll('#order-chips .chip').forEach(c => c.addEventListener('click', () => activate('#order-chips', c)));
document.querySelectorAll('#timer-chips .chip').forEach(c => c.addEventListener('click', () => activate('#timer-chips', c)));

function readSetup() {
  const lenChip = document.querySelector('#len-chips .chip.active');
  let length = parseInt(lenChip.dataset.len, 10);
  if (lenChip.dataset.len === 'custom') {
    length = parseInt(document.getElementById('len-custom').value, 10);
  }
  const pool = document.querySelector('#pool-chips .chip.active').dataset.pool;
  const order = document.querySelector('#order-chips .chip.active').dataset.order;
  const timer = document.querySelector('#timer-chips .chip.active').dataset.timer;
  const negative = document.getElementById('neg-toggle').checked;
  return { length, pool, order, timer, negative };
}

document.getElementById('start-btn').addEventListener('click', () => {
  const cfg = readSetup();
  if (!cfg.length || cfg.length < 5) { alert('Enter a length of at least 5.'); return; }
  startSession(cfg);
});

function resumeOrSetup() {
  const saved = localStorage.getItem(LS.practiceCurrent);
  if (saved) {
    try {
      const s = JSON.parse(saved);
      if (s && s.ids && s.ids.length && !s.submitted) {
        if (confirm('Resume the previous unfinished session?')) {
          session = s;
          session.elapsed = session.elapsed || 0;
          session.startTs = Date.now();
          beginUI();
          return;
        } else {
          localStorage.removeItem(LS.practiceCurrent);
        }
      }
    } catch {}
  }
  setupModal.classList.remove('hide');
}

function startSession(cfg) {
  let pool;
  if (cfg.pool === 'A') pool = all.filter(q => q.section === 'A');
  else if (cfg.pool === 'B') pool = all.filter(q => q.section === 'B');
  else if (cfg.pool === 'bookmarked') {
    const bm = getBookmarks();
    pool = all.filter(q => bm.has(q.id));
    if (!pool.length) { alert('No bookmarked questions yet — pick another pool.'); return; }
  } else pool = all;

  const arr = cfg.order === 'random' ? shuffle(pool) : pool.slice();
  const ids = arr.slice(0, Math.min(cfg.length, arr.length)).map(q => q.id);

  let duration = 0;
  if (cfg.timer === 'per') duration = ids.length * 45;
  else if (cfg.timer === 'full') duration = ids.length * 45;

  session = {
    ids,
    answers: {},
    marked: {},
    idx: 0,
    startTs: Date.now(),
    elapsed: 0,
    timerMode: cfg.timer,
    duration,
    negative: cfg.negative,
    submitted: false,
  };
  persist();
  setupModal.classList.add('hide');
  beginUI();
}

function persist() {
  if (!session) return;
  // Freeze elapsed into session so resume works
  const now = Date.now();
  const live = session.elapsed + Math.floor((now - session.startTs) / 1000);
  const snap = { ...session, elapsed: live, startTs: now };
  localStorage.setItem(LS.practiceCurrent, JSON.stringify(snap));
}

function currentElapsed() {
  return session.elapsed + Math.floor((Date.now() - session.startTs) / 1000);
}

function beginUI() {
  bottomActions.style.display = 'flex';
  paletteWrap.classList.remove('hide');
  renderPalette();
  render();
  startTicker();
}

function startTicker() {
  if (tick) clearInterval(tick);
  tick = setInterval(() => {
    const e = currentElapsed();
    if (session.timerMode === 'off') {
      timerEl.textContent = formatTime(e);
    } else {
      const left = Math.max(0, session.duration - e);
      timerEl.textContent = formatTime(left);
      if (left <= 0) {
        clearInterval(tick);
        submit(true);
      }
    }
  }, 250);
}

function render() {
  content.className = '';
  const q = all.find(x => x.id === session.ids[session.idx]);
  const picked = session.answers[q.id];
  const marked = !!session.marked[q.id];

  markBtn.textContent = marked ? '⚑ Marked' : '⚑ Mark';
  markBtn.classList.toggle('primary', marked);

  const optionsHtml = ['A','B','C','D'].map(letter => {
    const cls = 'option' + (picked === letter ? ' selected' : '');
    return `<button class="${cls}" data-letter="${letter}">
      <span class="letter">${letter}</span>
      <span class="text">${escapeHtml(q.options[letter])}</span>
    </button>`;
  }).join('');

  content.innerHTML = `
    <div class="card">
      <div class="qmeta">
        <span class="qnum">Q${q.id}</span>
        <span class="badge section-${q.section.toLowerCase()}">${sectionLabel(q.section)}</span>
        <span class="badge">${escapeHtml(q.category || '')}</span>
        <div class="spacer" style="flex:1"></div>
        <span style="color:var(--text-mute)">${session.idx + 1} / ${session.ids.length}</span>
      </div>
      <div class="qtext">${escapeHtml(q.question)}</div>
      <div class="options" id="options">${optionsHtml}</div>
    </div>
  `;
  content.querySelectorAll('.option').forEach(btn => {
    btn.addEventListener('click', () => {
      session.answers[q.id] = btn.dataset.letter;
      persist();
      render();
      renderPalette();
    });
  });

  progressBar.style.width = `${((session.idx + 1) / session.ids.length) * 100}%`;
  prevBtn.disabled = session.idx === 0;
  nextBtn.disabled = session.idx === session.ids.length - 1;
}

function renderPalette() {
  paletteEl.innerHTML = session.ids.map((id, i) => {
    let cls = '';
    if (session.answers[id]) cls += ' answered';
    if (session.marked[id]) cls += ' marked';
    if (i === session.idx) cls += ' current';
    return `<button class="${cls}" data-i="${i}">${i + 1}</button>`;
  }).join('');
  paletteEl.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      session.idx = parseInt(btn.dataset.i, 10);
      persist(); render(); renderPalette();
      window.scrollTo({top:0, behavior:'smooth'});
    });
  });
}

prevBtn.addEventListener('click', () => { if (session.idx > 0) { session.idx--; persist(); render(); renderPalette(); window.scrollTo({top:0, behavior:'smooth'}); } });
nextBtn.addEventListener('click', () => { if (session.idx < session.ids.length - 1) { session.idx++; persist(); render(); renderPalette(); window.scrollTo({top:0, behavior:'smooth'}); } });
markBtn.addEventListener('click', () => {
  const id = session.ids[session.idx];
  session.marked[id] = !session.marked[id];
  persist(); render(); renderPalette();
});
submitBtn.addEventListener('click', () => {
  const unanswered = session.ids.filter(id => !session.answers[id]).length;
  const msg = unanswered
    ? `Submit now? ${unanswered} question${unanswered>1?'s':''} unanswered.`
    : 'Submit session?';
  if (confirm(msg)) submit(false);
});

function submit(auto) {
  if (!session || session.submitted) return;
  session.submitted = true;
  session.elapsed = currentElapsed();
  if (tick) clearInterval(tick);

  let correct = 0, wrong = 0, skipped = 0;
  const perSection = { A: { c: 0, t: 0 }, B: { c: 0, t: 0 } };
  const perCat = {};
  for (const id of session.ids) {
    const q = all.find(x => x.id === id);
    perSection[q.section].t++;
    perCat[q.category] = perCat[q.category] || { c: 0, t: 0 };
    perCat[q.category].t++;
    const picked = session.answers[id];
    if (!picked) skipped++;
    else if (picked === q.answer) { correct++; perSection[q.section].c++; perCat[q.category].c++; }
    else wrong++;
  }
  const raw = correct - (session.negative ? wrong * 0.25 : 0);
  const percent = (raw / session.ids.length) * 100;

  const result = {
    ts: Date.now(),
    ids: session.ids,
    answers: session.answers,
    marked: session.marked,
    correct, wrong, skipped,
    total: session.ids.length,
    percent,
    raw,
    negative: session.negative,
    elapsed: session.elapsed,
    perSection,
    perCat,
    auto,
  };
  // history
  try {
    const hist = JSON.parse(localStorage.getItem(LS.practiceHistory) || '[]');
    hist.unshift({ ts: result.ts, percent, correct, total: result.total, elapsed: result.elapsed });
    localStorage.setItem(LS.practiceHistory, JSON.stringify(hist.slice(0, 20)));
  } catch {}
  // Hand off to result page via sessionStorage
  sessionStorage.setItem('ca.lastResult', JSON.stringify(result));
  localStorage.removeItem(LS.practiceCurrent);
  location.href = 'result.html';
}

document.addEventListener('keydown', (e) => {
  if (!session || session.submitted) return;
  if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
  const q = all.find(x => x.id === session.ids[session.idx]);
  const k = e.key.toUpperCase();
  if (['A','B','C','D'].includes(k)) { session.answers[q.id] = k; persist(); render(); renderPalette(); }
  else if (['1','2','3','4'].includes(k)) { session.answers[q.id] = ['A','B','C','D'][parseInt(k,10)-1]; persist(); render(); renderPalette(); }
  else if (e.key === 'ArrowRight') nextBtn.click();
  else if (e.key === 'ArrowLeft') prevBtn.click();
  else if (k === 'M') markBtn.click();
});

window.addEventListener('beforeunload', () => { if (session && !session.submitted) persist(); });

(async () => {
  try {
    all = await loadQuestions();
    resumeOrSetup();
  } catch (e) {
    content.innerHTML = `<div class="empty">Failed to load questions: ${e.message}</div>`;
  }
})();
