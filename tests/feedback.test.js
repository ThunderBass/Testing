import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createSession, getResults, getProgressCounts, reviewAnswer } from '../src/exam-engine.js';
import { formatAnswer } from '../src/answer-format.js';
const { questions } = JSON.parse(readFileSync(new URL('../src/exam-data.json', import.meta.url)));
const q = id => questions.find(q => q.id === id);

test('three submitted CLI questions are counted separately from pending reviews', () => {
  const session = createSession(questions);
  session.answers = Object.fromEntries([8, 10, 17].map(id => [id, q(id).correct_answer]));
  let result = getResults(questions, session);
  assert.equal(result.cliAttempted, 3);
  assert.equal(result.needsReview, 0);
  session.answers[28] = q(28).correct_answer.replace('eq 22', 'eq 22 established');
  result = getResults(questions, session);
  assert.equal(result.cliAttempted, 4);
  assert.equal(result.needsReview, 1);
  result = getResults(questions, reviewAnswer(session, q(28), true));
  assert.equal(result.cliAttempted, 4);
  assert.equal(result.needsReview, 0);
});

test('finish counts partition all questions, excluding flags and unsent drafts', () => {
  const session = createSession(questions);
  session.answers = { 1: 'B', 2: 'C', 99: 'A' };
  session.viewedIds = [1, 2, 3, 4, 5];
  session.skippedIds = [3];
  session.currentIndex = 3;
  const counts = getProgressCounts(session);
  assert.deepEqual(counts, { answered: 2, skipped: 1, unanswered: 2, unpresented: 25 });
  assert.equal(Object.values(counts).reduce((a, b) => a + b, 0), 30);
  const result = getResults(questions, session);
  assert.equal(counts.answered, result.attempted);
  for (const field of ['skipped', 'unanswered', 'unpresented']) assert.equal(counts[field], result[field]);
});

test('feedback and export answers include labels for each response format', () => {
  assert.equal(formatAnswer(q(1), 'B'), `B — ${q(1).options.B}`);
  assert.equal(formatAnswer(q(6), ['B', 'C']), `B — ${q(6).options.B}\nC — ${q(6).options.C}`);
  assert.equal(formatAnswer(q(5), { 1: 'B', 2: 'C', 3: 'A' }), '1 → B — Link-local\n2 → C — Unique local\n3 → A — Global unicast');
  assert.match(formatAnswer(q(19), { 1: 'A' }), /1 → A — 192\.0\.2\.2/);
  assert.match(formatAnswer(q(21), ['D', 'A', 'C', 'B']), /1\. D — DHCPDISCOVER\n2\. A — DHCPOFFER/);
  const commands = 'configure terminal\ninterface gi0/1\nno shutdown';
  assert.equal(formatAnswer(q(8), commands), commands);
  assert.equal(formatAnswer(q(8), commands.split('\n')), commands);
  assert.equal(formatAnswer(q(1), null), 'No answer submitted');
});
