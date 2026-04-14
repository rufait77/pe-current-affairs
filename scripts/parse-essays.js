#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'CurrentAffairs_5_Probable_Essays.md');
const OUT = path.join(ROOT, 'data', 'essays.json');

const md = fs.readFileSync(SRC, 'utf8');
const lines = md.split(/\r?\n/);

const essayHead = /^##\s*Essay\s+(\d+)\s*[—\-–]\s*(.+?)\s*$/;
const recallHead = /^##\s*Quick Recall Box/i;

const essays = [];
let cur = null;
let recall = null;
let mode = null; // 'essay' | 'recall'

function flush() {
  if (cur) essays.push(cur);
  cur = null;
}

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  let m;
  if ((m = essayHead.exec(line))) {
    flush();
    cur = { number: parseInt(m[1], 10), title: m[2].trim(), paragraphs: [] };
    mode = 'essay';
    continue;
  }
  if (recallHead.test(line)) {
    flush();
    recall = { title: line.replace(/^##\s*/, '').trim(), bullets: [] };
    mode = 'recall';
    continue;
  }
  if (mode === 'essay' && cur) {
    if (/^---\s*$/.test(line)) continue;
    if (line.trim() === '') continue;
    // Paragraph: detect optional **Lead.** prefix as heading
    const leadMatch = /^\*\*([^*]+?)\*\*\s*(.*)$/.exec(line);
    if (leadMatch) {
      const lead = leadMatch[1].trim().replace(/[.:]\s*$/, '');
      const rest = leadMatch[2].trim();
      cur.paragraphs.push({ heading: lead, text: rest });
    } else {
      // continuation? for now treat as plain paragraph
      cur.paragraphs.push({ heading: null, text: line.trim() });
    }
  } else if (mode === 'recall' && recall) {
    if (/^---\s*$/.test(line)) continue;
    const b = /^\s*-\s+(.+?)\s*$/.exec(line);
    if (b) recall.bullets.push(b[1]);
  }
}
flush();

// Compute reading time (~200 wpm)
for (const e of essays) {
  const words = e.paragraphs.reduce((n, p) => n + p.text.split(/\s+/).filter(Boolean).length, 0);
  e.words = words;
  e.readMin = Math.max(1, Math.round(words / 200));
  // First paragraph is intro; last is conclusion. We assign roles.
  if (e.paragraphs.length) {
    const map = ['Introduction', null, null, 'Conclusion'];
    // If exactly 4 paragraphs (intro, body1, body2, conclusion):
    if (e.paragraphs.length === 4) {
      e.paragraphs[0].role = 'Introduction';
      e.paragraphs[3].role = 'Conclusion';
    }
  }
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ essays, recall }, null, 2));
console.log(`Wrote ${essays.length} essays + recall (${recall?.bullets.length || 0} bullets) to ${path.relative(ROOT, OUT)}`);
