import { initTheme } from './app.js';

initTheme();

const wrap = document.getElementById('essays-wrap');
const tocList = document.getElementById('toc-list');
const heroMeta = document.getElementById('hero-meta');
const recallEl = document.getElementById('recall');
const toTop = document.getElementById('to-top');

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}

function slug(n) { return `essay-${n}`; }

function paragraphHtml(p, idx, total) {
  const role = idx === 0 ? 'Introduction' : (idx === total - 1 ? 'Conclusion' : null);
  const heading = p.heading || role || '';
  const rClass = role ? ('role-' + role.toLowerCase()) : '';
  const body = p.text ? escapeHtml(p.text) : '';
  const head = heading
    ? `<span class="para-heading ${rClass}">${role && p.heading && p.heading !== role ? `<span class="para-role-tag">${role.toUpperCase()}</span>` : ''}${escapeHtml(p.heading || role)}</span>`
    : '';
  return `${head}<p>${body}</p>`;
}

function essayHtml(e) {
  const body = e.paragraphs.map((p, i) => paragraphHtml(p, i, e.paragraphs.length)).join('');
  return `
    <article class="essay" id="${slug(e.number)}">
      <div class="essay-num">Essay ${String(e.number).padStart(2, '0')}</div>
      <h2 class="essay-title">${escapeHtml(e.title)}</h2>
      <div class="essay-meta">
        <span>${e.words} words</span>
        <span class="dot"></span>
        <span>~${e.readMin} min read</span>
        <span class="dot"></span>
        <span>${e.paragraphs.length} paragraphs</span>
        <button class="chip-btn" data-copy="${e.number}" title="Copy essay text">Copy</button>
      </div>
      ${body}
    </article>
  `;
}

function recallHtml(r) {
  if (!r || !r.bullets.length) return '';
  const items = r.bullets.map(b => {
    // Replace leading **Label:** with styled strong
    const m = /^\*\*([^*]+?)\*\*\s*(.*)$/.exec(b);
    const html = m ? `<strong>${escapeHtml(m[1])}</strong> ${escapeHtml(m[2])}` : escapeHtml(b);
    return `<li>${html}</li>`;
  }).join('');
  return `<h2>${escapeHtml(r.title)}</h2><ul>${items}</ul>`;
}

function plainEssayText(e) {
  const lines = [`Essay ${e.number} — ${e.title}`, ''];
  e.paragraphs.forEach(p => {
    if (p.heading) lines.push(p.heading.toUpperCase());
    lines.push(p.text, '');
  });
  return lines.join('\n');
}

(async () => {
  try {
    const res = await fetch('data/essays.json', { cache: 'no-cache' });
    const data = await res.json();
    const { essays, recall } = data;

    const totalWords = essays.reduce((n, e) => n + e.words, 0);
    const totalMin = essays.reduce((n, e) => n + e.readMin, 0);
    heroMeta.innerHTML = `
      <span class="badge">📚 ${essays.length} essays</span>
      <span class="badge">✍️ ${totalWords.toLocaleString()} words</span>
      <span class="badge">⏱ ~${totalMin} min total</span>
    `;

    tocList.innerHTML = essays.map(e => `
      <li>
        <a href="#${slug(e.number)}">${escapeHtml(e.title)}</a>
        <span class="t-meta">${e.readMin}m</span>
      </li>
    `).join('');

    wrap.className = '';
    wrap.innerHTML = essays.map((e, i) =>
      essayHtml(e) + (i < essays.length - 1 ? '<div class="essay-divider"></div>' : '')
    ).join('');

    recallEl.innerHTML = recallHtml(recall);

    // Copy handlers
    wrap.querySelectorAll('[data-copy]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const n = parseInt(btn.dataset.copy, 10);
        const e = essays.find(x => x.number === n);
        try {
          await navigator.clipboard.writeText(plainEssayText(e));
          const orig = btn.textContent;
          btn.textContent = 'Copied ✓';
          setTimeout(() => { btn.textContent = orig; }, 1500);
        } catch { alert('Copy failed — select manually.'); }
      });
    });

    // Font scale
    const applyScale = (s) => document.documentElement.style.setProperty('--essay-font-scale', s);
    let scale = parseFloat(localStorage.getItem('ca.essay.scale') || '1');
    applyScale(scale);
    document.getElementById('font-smaller').addEventListener('click', () => {
      scale = Math.max(0.85, +(scale - 0.08).toFixed(2));
      localStorage.setItem('ca.essay.scale', scale);
      applyScale(scale);
    });
    document.getElementById('font-larger').addEventListener('click', () => {
      scale = Math.min(1.35, +(scale + 0.08).toFixed(2));
      localStorage.setItem('ca.essay.scale', scale);
      applyScale(scale);
    });

    // Back to top
    window.addEventListener('scroll', () => {
      toTop.classList.toggle('show', window.scrollY > 500);
    });
    toTop.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Smooth scroll with offset for sticky header
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', (ev) => {
        const id = a.getAttribute('href').slice(1);
        if (!id) return;
        const el = document.getElementById(id);
        if (el) { ev.preventDefault(); el.scrollIntoView({ behavior: 'smooth', block: 'start' }); history.replaceState(null, '', '#' + id); }
      });
    });
  } catch (e) {
    wrap.innerHTML = `<div class="empty">Failed to load essays: ${e.message}</div>`;
  }
})();
