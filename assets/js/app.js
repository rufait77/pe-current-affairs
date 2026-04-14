// Shared helpers, theme, data loading, storage.

export const LS = {
  theme: 'ca.theme',
  bookmarks: 'ca.bookmarks',
  learnProgress: 'ca.learn.progress',
  practiceCurrent: 'ca.practice.current',
  practiceHistory: 'ca.practice.history',
};

export function initTheme() {
  const stored = localStorage.getItem(LS.theme) || 'dark';
  document.documentElement.setAttribute('data-theme', stored);
  const btn = document.getElementById('theme-toggle');
  if (btn) {
    const render = () => {
      const t = document.documentElement.getAttribute('data-theme');
      btn.innerHTML = t === 'dark' ? sunIcon() : moonIcon();
      btn.setAttribute('aria-label', t === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    };
    render();
    btn.addEventListener('click', () => {
      const t = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', t);
      localStorage.setItem(LS.theme, t);
      render();
    });
  }
}

export async function loadQuestions() {
  const res = await fetch('data/questions.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error('Failed to load questions');
  return res.json();
}

export function getBookmarks() {
  try { return new Set(JSON.parse(localStorage.getItem(LS.bookmarks) || '[]')); }
  catch { return new Set(); }
}
export function setBookmarks(set) {
  localStorage.setItem(LS.bookmarks, JSON.stringify([...set]));
}
export function toggleBookmark(id) {
  const s = getBookmarks();
  if (s.has(id)) s.delete(id); else s.add(id);
  setBookmarks(s);
  return s.has(id);
}

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function formatTime(s) {
  s = Math.max(0, Math.floor(s));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

export function qs(name) {
  return new URLSearchParams(location.search).get(name);
}

export function sunIcon() {
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>`;
}
export function moonIcon() {
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
}

export function sectionLabel(s) { return s === 'A' ? 'Bangladesh' : 'International'; }
