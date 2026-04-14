#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'Current_Affairs_300_MCQ_Practice_Set.md');
const OUT = path.join(ROOT, 'data', 'questions.json');

const md = fs.readFileSync(SRC, 'utf8');

const answerKeyIdx = md.indexOf('# ANSWER KEY');
if (answerKeyIdx === -1) throw new Error('Answer key section not found');

const questionsBlock = md.slice(0, answerKeyIdx);
const answersBlock = md.slice(answerKeyIdx);

const lines = questionsBlock.split(/\r?\n/);
let currentSection = null;
let currentCategory = null;
const questions = {};

const qHeader = /^\*\*Q(\d+)\.\*\*\s*(.*)$/;
const optLine = /^-\s*\(([A-D])\)\s*(.+?)\s*$/;
const sectionHeader = /^#\s+SECTION\s+([AB])\b/;
const categoryHeader = /^##\s+[AB]\.\d+\s+(.+?)\s*$/;

let i = 0;
while (i < lines.length) {
  const line = lines[i];
  let m;
  if ((m = sectionHeader.exec(line))) { currentSection = m[1]; i++; continue; }
  if ((m = categoryHeader.exec(line))) { currentCategory = m[1]; i++; continue; }
  if ((m = qHeader.exec(line))) {
    const id = parseInt(m[1], 10);
    let questionText = m[2].trim();
    i++;
    // Question may span multiple lines until a blank line or options start
    while (i < lines.length && !optLine.test(lines[i]) && lines[i].trim() !== '' && !qHeader.test(lines[i])) {
      questionText += ' ' + lines[i].trim();
      i++;
    }
    // Skip blanks
    while (i < lines.length && lines[i].trim() === '') i++;
    const options = {};
    while (i < lines.length && (m = optLine.exec(lines[i]))) {
      options[m[1]] = m[2];
      i++;
    }
    if (Object.keys(options).length !== 4) {
      throw new Error(`Q${id}: expected 4 options, got ${Object.keys(options).length}`);
    }
    questions[id] = {
      id,
      section: currentSection,
      category: currentCategory,
      question: questionText.trim(),
      options,
    };
    continue;
  }
  i++;
}

// Parse answer key entries:  **Q1.** B — explanation.
const ansRe = /\*\*Q(\d+)\.\*\*\s*([A-D])\s*[—\-–]\s*([^\n]+)/g;
let am;
while ((am = ansRe.exec(answersBlock)) !== null) {
  const id = parseInt(am[1], 10);
  if (!questions[id]) continue;
  questions[id].answer = am[2];
  questions[id].explanation = am[3].trim();
}

// Parse Quick-Reference Answer Grid for validation
const grid = {};
const gridRe = /\|\s*(\d{1,3})\s*\|\s*([A-D])\s*\|/g;
let gm;
while ((gm = gridRe.exec(answersBlock)) !== null) {
  grid[parseInt(gm[1], 10)] = gm[2];
}

const list = [];
const issues = [];
for (let id = 1; id <= 300; id++) {
  const q = questions[id];
  if (!q) { issues.push(`Missing Q${id}`); continue; }
  if (!q.answer) { issues.push(`Q${id}: no answer`); continue; }
  if (grid[id] && grid[id] !== q.answer) {
    issues.push(`Q${id}: answer-key says ${q.answer} but grid says ${grid[id]}`);
  }
  list.push(q);
}

if (issues.length) {
  console.error('Validation issues:\n' + issues.join('\n'));
  process.exit(1);
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(list, null, 2));
console.log(`Wrote ${list.length} questions to ${path.relative(ROOT, OUT)}`);
