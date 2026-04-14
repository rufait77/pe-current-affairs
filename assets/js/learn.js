import { initTheme, loadQuestions, getBookmarks, toggleBookmark, LS, sectionLabel } from './app.js';

initTheme();

const content = document.getElementById('content');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const bookmarkBtn = document.getElementById('bookmark-btn');
const jumpBtn = document.getElementById('jump-btn');
const viewToggle = document.getElementById('view-toggle');
const bottombar = document.getElementById('bottombar');
const progressBar = document.getElementById('progress-bar');

let questions = [];
let pool = [];          // filtered list
let idx = 0;
let picked = {};        // id -> letter chosen (for reveal state)
let view = localStorage.getItem('ca.learn.view') || 'single'; // 'single' | 'list'

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
  if (view === 'list') { renderList(); return; }
  renderSingle();
}

function renderList() {
  bottombar.classList.add('hide');
  prevBtn.disabled = nextBtn.disabled = true;
  progressBar.style.width = '100%';
  const bm = getBookmarks();
  const html = pool.map((q, i) => {
    const optsHtml = ['A','B','C','D'].map(letter => {
      const isCorrect = q.answer === letter;
      const cls = 'option' + (isCorrect ? ' correct' : '');
      const mark = isCorrect ? '✓' : '';
      return `<div class="${cls}" style="cursor:default">
        <span class="letter">${letter}</span>
        <span class="text">${escapeHtml(q.options[letter])}</span>
        ${mark ? `<span class="mark">${mark}</span>` : ''}
      </div>`;
    }).join('');
    return `
      <div class="card" style="margin-bottom:14px" id="list-q-${q.id}">
        <div class="qmeta">
          <span class="qnum">Q${q.id}</span>
          <span class="badge section-${q.section.toLowerCase()}">${sectionLabel(q.section)}</span>
          <span class="badge">${escapeHtml(q.category || '')}</span>
          <div class="spacer" style="flex:1"></div>
          <button class="icon-btn" data-bm="${q.id}" aria-label="Bookmark" title="Bookmark" style="width:32px;height:32px">${bm.has(q.id) ? '★' : '☆'}</button>
          <span style="color:var(--text-mute);font-size:12.5px">${i + 1}/${pool.length}</span>
        </div>
        <div class="qtext">${escapeHtml(q.question)}</div>
        <div class="options">${optsHtml}</div>
        <div class="explanation"><b>Answer: ${q.answer}.</b> ${escapeHtml(q.explanation || '')}</div>
      </div>`;
  }).join('');
  content.innerHTML = html;
  content.querySelectorAll('[data-bm]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.bm, 10);
      const now = toggleBookmark(id);
      btn.textContent = now ? '★' : '☆';
    });
  });
}

function renderSingle() {
  bottombar.classList.remove('hide');
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

viewToggle.addEventListener('click', () => {
  view = view === 'single' ? 'list' : 'single';
  localStorage.setItem('ca.learn.view', view);
  render();
  window.scrollTo({top: 0, behavior: 'instant'});
});

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
