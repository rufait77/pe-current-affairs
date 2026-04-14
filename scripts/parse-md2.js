#!/usr/bin/env node
// Parse the second MD (Professor's Current Affairs images) and append to questions.json.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'CurrentAffairs_MCQs_From_Professor_Images.md');
const EXISTING = path.join(ROOT, 'data', 'questions.json');
const OUT = EXISTING;

const md = fs.readFileSync(SRC, 'utf8');
const lines = md.split(/\r?\n/);

const sectionHead = /^##\s*SECTION\s+([A-Z])\s*[—\-–]\s*(.+?)\s*$/;
const subHead = /^\*\*(Bangladesh|International)\*\*\s*$/;
const qStart = /^\s*(\d{1,3})\.\s+(.+?)\s*\*?\s*$/;
const optLine = /^\s*-\s*\(([A-D])\)\s*(.+?)\s*$/;
const ansLine = /^\s*\*\*Answer:\s*([A-D])\*\*/;

// Default section guess for sections without an explicit BD/Intl subheading
const sectionDefault = {
  F: 'B', // organisational / static GK
  G: 'A', // BD economic indicators
  H: 'A', // BD military code-names
  I: 'B', // ASEAN / BRI / FTA
  J: 'B', // geographic trivia
  K: 'B', // sports (mixed; default international)
  L: 'A', // BD economy & infra
  M: 'A', // BD diplomatic/legal
};

let curSection = null;       // 'A'/'B'
let curCategory = null;      // magazine issue label
let curSubExplicit = false;  // whether subhead was set

const out = [];
let i = 0;
while (i < lines.length) {
  const line = lines[i];
  let m;
  if ((m = sectionHead.exec(line))) {
    curCategory = `Professor · ${toTitle(m[2])}`;
    curSection = sectionDefault[m[1]] || 'B';
    curSubExplicit = false;
    i++; continue;
  }
  if ((m = subHead.exec(line))) {
    curSection = m[1] === 'Bangladesh' ? 'A' : 'B';
    curSubExplicit = true;
    i++; continue;
  }
  if ((m = qStart.exec(line))) {
    let qText = m[2].trim();
    i++;
    while (i < lines.length && !optLine.test(lines[i]) && lines[i].trim() !== '' && !ansLine.test(lines[i])) {
      qText += ' ' + lines[i].trim();
      i++;
    }
    while (i < lines.length && lines[i].trim() === '') i++;
    const options = {};
    while (i < lines.length && (m = optLine.exec(lines[i]))) {
      options[m[1]] = m[2].trim();
      i++;
    }
    while (i < lines.length && lines[i].trim() === '') i++;
    let answer = null;
    if (i < lines.length && (m = ansLine.exec(lines[i]))) {
      answer = m[1];
      i++;
    }
    if (Object.keys(options).length === 4 && answer) {
      out.push({
        section: curSection || 'B',
        category: curCategory || 'Professor',
        question: qText.replace(/\s*\*\s*$/, '').trim(),
        options,
        answer,
        explanation: '',
      });
    }
    continue;
  }
  i++;
}

function toTitle(s) {
  return s.replace(/\(IMG[^)]*\)/gi, '').replace(/\s+/g, ' ').trim()
    .toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
    .replace(/\bIssue\b/i, 'Issue');
}

console.log(`Parsed ${out.length} questions from professor MD.`);

const existing = JSON.parse(fs.readFileSync(EXISTING, 'utf8'));
// Drop any previously-appended professor entries (id > 300) so re-runs are idempotent
const base = existing.filter(q => q.id <= 300);
let nextId = 301;
const merged = base.concat(out.map(q => ({ id: nextId++, ...q })));

fs.writeFileSync(OUT, JSON.stringify(merged, null, 2));
console.log(`Wrote ${merged.length} total questions to ${path.relative(ROOT, OUT)} (added ${out.length}).`);
