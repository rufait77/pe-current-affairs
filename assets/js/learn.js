import { initTheme, loadQuestions, getBookmarks, toggleBookmark, LS, sectionLabel } from './app.js';

initTheme();

const content = document.getElementById('content');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const bookmarkBtn = document.getElementById('bookmark-btn');
const jumpBtn = document.getElementById('jump-btn');
const progressBar = document.getElementById('progress-bar');

let questions = [];
let pool = [];          // filtered list
let idx = 0;
let picked = {};        // id -> letter chosen (for reveal state)

function getPool(all) {
  const choice = localStorage.getItem('ca.pool') || 'all';
  if (choice === 'A') return all.filter(q => q.section === 'A');
  if (choice === 'B') return all.filter(q => q.section === 'B');
  if (choice === 'bookmarked') {
    const bm = getBookmarks();
    const f = all.filter(q => bm.has(q.id));
    return f.length ? f : all;
  }
  return all;
}

function saveProgress() {
  localStorage.setItem(LS.learnProgress, JSON.stringify({
    pool: localStorage.getItem('ca.pool') || 'all',
    idx,
    picked,
  }));
}
function loadProgress() {
  try {
    const s = JSON.parse(localStorage.getItem(LS.learnProgress) || 'null');
    if (!s) return;
    if ((s.pool || 'all') !== (localStorage.getItem('ca.pool') || 'all')) return;
    idx = Math.min(s.idx || 0, pool.length - 1);
    picked = s.picked || {};
  } catch {}
}

function render() {
  if (!pool.length) {
    content.innerHTML = `<div class="empty">No questions in this pool.</div>`;
    return;
  }
  const q = pool[idx];
  const chosen = picked[q.id];
  const revealed = !!chosen;
  const bm = getBookmarks().has(q.id);
  bookmarkBtn.textContent = bm ? '★ Saved' : '☆ Save';
  bookmarkBtn.classList.toggle('primary', bm);

  const optionsHtml = ['A','B','C','D'].map(letter => {
    const isCorrect = q.answer === letter;
    let cls = 'option';
    let mark = '';
    if (revealed) {
      if (isCorrect) { cls += ' correct'; mark = '✓'; }
      else if (chosen === letter) { cls += ' wrong'; mark = '✕'; }
    } else if (chosen === letter) cls += ' selected';
    return `
      <button class="${cls}" data-letter="${letter}" ${revealed ? 'disabled' : ''}>
        <span class="letter">${letter}</span>
        <span class="text">${escapeHtml(q.options[letter])}</span>
        ${mark ? `<span class="mark">${mark}</span>` : ''}
      </button>`;
  }).join('');

  const explHtml = revealed ? `
    <div class="explanation ${chosen === q.answer ? '' : 'for-wrong'}">
      <b>${chosen === q.answer ? 'Correct.' : `Answer: ${q.answer}.`}</b> ${escapeHtml(q.explanation || '')}
    </div>` : '';

  content.innerHTML = `
    <div class="card">
      <div class="qmeta">
        <span class="qnum">Q${q.id}</span>
        <span class="badge section-${q.section.toLowerCase()}">${sectionLabel(q.section)}</span>
        <span class="badge">${escapeHtml(q.category || '')}</span>
        <div class="spacer" style="flex:1"></div>
        <span style="color:var(--text-mute)">${idx + 1} / ${pool.length}</span>
      </div>
      <div class="qtext">${escapeHtml(q.question)}</div>
      <div class="options" id="options">${optionsHtml}</div>
      ${explHtml}
    </div>
  `;

  document.querySelectorAll('#options .option').forEach(btn => {
    btn.addEventListener('click', () => {
      if (picked[q.id]) return;
      picked[q.id] = btn.dataset.letter;
      saveProgress();
      render();
    });
  });

  prevBtn.disabled = idx === 0;
  nextBtn.disabled = idx === pool.length - 1;
  progressBar.style.width = `${((idx + 1) / pool.length) * 100}%`;
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}

prevBtn.addEventListener('click', () => { if (idx > 0) { idx--; saveProgress(); render(); window.scrollTo({top:0, behavior:'smooth'}); } });
nextBtn.addEventListener('click', () => { if (idx < pool.length - 1) { idx++; saveProgress(); render(); window.scrollTo({top:0, behavior:'smooth'}); } });
bookmarkBtn.addEventListener('click', () => { toggleBookmark(pool[idx].id); render(); });
jumpBtn.addEventListener('click', () => {
  const v = prompt(`Jump to question (1–${pool.length}):`);
  const n = parseInt(v, 10);
  if (!isNaN(n) && n >= 1 && n <= pool.length) { idx = n - 1; saveProgress(); render(); }
});

document.addEventListener('keydown', (e) => {
  if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
  const q = pool[idx]; if (!q) return;
  const k = e.key.toUpperCase();
  if (['A','B','C','D'].includes(k) && !picked[q.id]) {
    picked[q.id] = k; saveProgress(); render();
  } else if (['1','2','3','4'].includes(k) && !picked[q.id]) {
    picked[q.id] = ['A','B','C','D'][parseInt(k,10)-1]; saveProgress(); render();
  } else if (e.key === 'ArrowRight') { nextBtn.click(); }
    else if (e.key === 'ArrowLeft') { prevBtn.click(); }
    else if (k === 'B') { bookmarkBtn.click(); }
});

(async () => {
  try {
    questions = await loadQuestions();
    pool = getPool(questions);
    loadProgress();
    render();
  } catch (e) {
    content.innerHTML = `<div class="empty">Failed to load questions: ${e.message}</div>`;
  }
})();
