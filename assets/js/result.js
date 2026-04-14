import { initTheme, loadQuestions, formatTime, sectionLabel, LS, shuffle } from './app.js';

initTheme();
const content = document.getElementById('content');

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}

(async () => {
  const raw = sessionStorage.getItem('ca.lastResult');
  if (!raw) {
    content.innerHTML = `<div class="empty">No result to show. <a href="practice.html" style="color:var(--accent)">Start a new session</a>.</div>`;
    return;
  }
  const result = JSON.parse(raw);
  const all = await loadQuestions();
  const byId = Object.fromEntries(all.map(q => [q.id, q]));

  const pct = Math.max(0, Math.min(100, result.percent));
  const circumference = 2 * Math.PI * 70;
  const dash = (pct / 100) * circumference;

  const perCat = Object.entries(result.perCat)
    .sort((a,b) => b[1].t - a[1].t)
    .map(([cat, v]) => {
      const p = v.t ? (v.c / v.t) * 100 : 0;
      return `<div style="margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
          <span>${escapeHtml(cat)}</span>
          <span style="color:var(--text-dim)">${v.c}/${v.t} · ${p.toFixed(0)}%</span>
        </div>
        <div class="bar"><div style="width:${p}%"></div></div>
      </div>`;
    }).join('');

  content.innerHTML = `
    <div class="card">
      <div class="ring-wrap">
        <div class="ring" style="--p:${pct}">
          <svg viewBox="0 0 160 160">
            <defs>
              <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#6366f1"/>
                <stop offset="100%" stop-color="#8b5cf6"/>
              </linearGradient>
            </defs>
            <circle class="bg" cx="80" cy="80" r="70" fill="none" stroke-width="14"/>
            <circle class="fg" cx="80" cy="80" r="70" fill="none" stroke-width="14"
              stroke-dasharray="${circumference}" stroke-dashoffset="${circumference - dash}"/>
          </svg>
          <div class="label">
            <div class="pct">${pct.toFixed(0)}%</div>
            <div class="cap">${result.raw.toFixed(result.negative ? 2 : 0)} / ${result.total}</div>
          </div>
        </div>
        <div style="flex:1;min-width:200px">
          <div class="stats">
            <div class="stat"><div class="k">Correct</div><div class="v" style="color:var(--correct)">${result.correct}</div></div>
            <div class="stat"><div class="k">Wrong</div><div class="v" style="color:var(--wrong)">${result.wrong}</div></div>
            <div class="stat"><div class="k">Skipped</div><div class="v" style="color:var(--warn)">${result.skipped}</div></div>
            <div class="stat"><div class="k">Time</div><div class="v">${formatTime(result.elapsed)}</div></div>
          </div>
        </div>
      </div>

      <h3 class="section-title" style="margin-top:22px">Section breakdown</h3>
      <div class="stats">
        <div class="stat">
          <div class="k">🇧🇩 Bangladesh</div>
          <div class="v">${result.perSection.A.c}/${result.perSection.A.t}</div>
          <div class="bar" style="margin-top:8px"><div style="width:${result.perSection.A.t ? (result.perSection.A.c/result.perSection.A.t*100) : 0}%"></div></div>
        </div>
        <div class="stat">
          <div class="k">🌐 International</div>
          <div class="v">${result.perSection.B.c}/${result.perSection.B.t}</div>
          <div class="bar" style="margin-top:8px"><div style="width:${result.perSection.B.t ? (result.perSection.B.c/result.perSection.B.t*100) : 0}%"></div></div>
        </div>
      </div>

      <h3 class="section-title">By category</h3>
      ${perCat || '<div class="empty">No categories.</div>'}

      <div class="row" style="margin-top:18px">
        <button class="btn" id="retry-same">Retry same</button>
        <button class="btn" id="retry-wrong">Retry wrong only</button>
        <a class="btn primary" href="practice.html">New session</a>
      </div>
    </div>

    <h2 class="section-title">Review</h2>
    <div class="chips" id="review-filter">
      <button class="chip active" data-f="all">All</button>
      <button class="chip" data-f="wrong">Wrong</button>
      <button class="chip" data-f="skipped">Skipped</button>
      <button class="chip" data-f="correct">Correct</button>
    </div>
    <div id="review" class="review-list" style="margin-top:14px"></div>
  `;

  const reviewEl = document.getElementById('review');
  function renderReview(filter) {
    const items = result.ids.map(id => {
      const q = byId[id];
      const picked = result.answers[id];
      const status = !picked ? 'skipped' : (picked === q.answer ? 'correct' : 'wrong');
      return { q, picked, status };
    }).filter(it => filter === 'all' || it.status === filter);

    if (!items.length) { reviewEl.innerHTML = `<div class="empty">Nothing here.</div>`; return; }
    reviewEl.innerHTML = items.map(({ q, picked, status }) => `
      <div class="review-item">
        <div class="pills" style="margin-bottom:6px">
          <span class="pill">Q${q.id}</span>
          <span class="pill">${sectionLabel(q.section)}</span>
          <span class="pill ${status === 'correct' ? 'ok' : status === 'wrong' ? 'no' : 'skip'}">${status.toUpperCase()}</span>
        </div>
        <div class="q">${escapeHtml(q.question)}</div>
        <div style="font-size:13.5px;color:var(--text-dim);margin-bottom:6px">
          Your answer: <b style="color:var(--text)">${picked ? picked + ' · ' + escapeHtml(q.options[picked]) : '—'}</b><br/>
          Correct: <b style="color:var(--correct)">${q.answer} · ${escapeHtml(q.options[q.answer])}</b>
        </div>
        <div style="font-size:13px;color:var(--text-dim)">${escapeHtml(q.explanation || '')}</div>
      </div>
    `).join('');
  }
  renderReview('all');
  document.querySelectorAll('#review-filter .chip').forEach(c => c.addEventListener('click', () => {
    document.querySelectorAll('#review-filter .chip').forEach(x => x.classList.remove('active'));
    c.classList.add('active');
    renderReview(c.dataset.f);
  }));

  document.getElementById('retry-same').addEventListener('click', () => {
    const s = { ids: result.ids.slice(), answers: {}, marked: {}, idx: 0,
      startTs: Date.now(), elapsed: 0, timerMode: 'off', duration: 0, negative: result.negative, submitted: false };
    localStorage.setItem(LS.practiceCurrent, JSON.stringify(s));
    location.href = 'practice.html';
  });
  document.getElementById('retry-wrong').addEventListener('click', () => {
    const ids = result.ids.filter(id => {
      const p = result.answers[id]; return !p || p !== byId[id].answer;
    });
    if (!ids.length) { alert('No wrong or skipped questions — nothing to retry.'); return; }
    const s = { ids: shuffle(ids), answers: {}, marked: {}, idx: 0,
      startTs: Date.now(), elapsed: 0, timerMode: 'off', duration: 0, negative: result.negative, submitted: false };
    localStorage.setItem(LS.practiceCurrent, JSON.stringify(s));
    location.href = 'practice.html';
  });
})();
