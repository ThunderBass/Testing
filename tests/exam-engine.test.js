import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createSession, recordAnswer, skipQuestion, finishSession, gradeQuestion, getResults, normalizeResponse, setMode, reviewAnswer } from '../src/exam-engine.js';

const candidates = [new URL('../src/exam-data.json', import.meta.url), new URL('../src/data/exam-plan.json', import.meta.url), new URL('../src/exam-plan.json', import.meta.url), new URL('../public/exam-plan.json', import.meta.url), '/workspace/scratch/ccna-practice/exam-plan.json'];
let plan;
for (const path of candidates) { try { plan = JSON.parse(readFileSync(path, 'utf8')); break; } catch { /* Try supported data location. */ } }
const questions = plan.questions;
const q = id => questions.find(question => question.id === id);
const cli = id => Array.isArray(q(id).correct_answer) ? q(id).correct_answer.join('\n') : q(id).correct_answer;
const check = (id, text, status) => assert.equal(gradeQuestion(q(id), text).status, status, `Question ${id}: ${text}`);

test('resumes prior answer without changing the fixed question plan', () => {
  const session = createSession(questions);
  assert.deepEqual(session.answers, { 1: 'A' });
  assert.equal(session.currentIndex, 1);
  assert.deepEqual(session.viewedIds, [1, 2]);
  assert.equal(session.mode, 'exam');
  const next = recordAnswer(session, q(2), 'c');
  assert.deepEqual(session.answers, { 1: 'A' });
  assert.equal(session.currentIndex, 1);
  assert.equal(next.currentIndex, 2);
  assert.equal(next.answers[2], 'C');
  assert.deepEqual(next.questionIds, session.questionIds);
  assert.deepEqual(setMode(next, 'study').answers, next.answers);
});

test('finish distinguishes skipped, viewed unanswered, and unpresented questions', () => {
  let session = createSession(questions);
  session = skipQuestion(session, q(2));
  session = recordAnswer(session, q(3), 'C');
  const results = getResults(questions, finishSession(session));
  assert.equal(results.correct, 1);
  assert.equal(results.incorrect, 1);
  assert.equal(results.skipped, 1);
  assert.equal(results.unanswered, 1);
  assert.equal(results.unpresented, 26);
  assert.equal(results.attempted, 2);
  assert.equal(results.accuracy, 50);
  assert.equal(results.maxScore, 30);
  assert.equal(results.score, 1);
  assert.equal(results.total, results.correct + results.incorrect + results.skipped + results.unanswered + results.unpresented + results.needsReview);
});

test('finishes after final answer and ignores resubmissions or empty answers', () => {
  let s = createSession([q(1), q(2)], { carryOver: false });
  assert.equal(recordAnswer(s, q(1), ''), s);
  assert.equal(recordAnswer(s, q(2), 'C'), s);
  s = recordAnswer(s, q(1), 'B');
  s = recordAnswer(s, q(2), 'C');
  assert.equal(s.status, 'finished');
  assert.equal(recordAnswer(s, q(2), 'A'), s);
  assert.equal(getResults([q(1), q(2)], s).score, 2);
});

test('every published answer key passes', () => {
  for (const question of questions) check(question.id, Array.isArray(question.correct_answer) && /cli/i.test(question.format) ? question.correct_answer.join('\n') : question.correct_answer, 'correct');
});

test('multiple-answer grading requires exactly the right set', () => {
  check(6, 'c,b', 'correct');
  check(6, ['B', 'C'], 'correct');
  check(6, 'B', 'incorrect');
  check(6, 'A,B,C', 'incorrect');
  check(6, '', 'unanswered');
});

test('matching accepts numbered responses, ordered letters, and equivalent names', () => {
  for (const answer of ['1-B, 2-C, 3-A', '1=B 2=C 3=A', 'B,C,A', ['B', 'C', 'A'], { 1: 'link-local', 2: 'unique local', 3: 'global unicast' }]) check(5, answer, 'correct');
  check(19, { 1: '192.0.2.6', 2: '192.0.2.2', 3: '192.0.2.10' }, 'correct');
  check(19, '1:192.0.2.6, 2:192.0.2.2, 3:192.0.2.10', 'correct');
  check(5, 'B,C', 'incorrect');
  check(5, '1-B,2-C,3-A,4-D', 'incorrect');
});

test('ordering keeps ordering significant and accepts message names', () => {
  for (const answer of ['D A C B', 'D,A,C,B', 'DACB', 'D → A → C → B', 'DHCPDISCOVER, DHCPOFFER, DHCPREQUEST, DHCPACK']) check(21, answer, 'correct');
  check(21, 'ABCD', 'incorrect');
});

test('interface grading accepts common abbreviations, prompts, and either command order', () => {
  check(8, 'R1# conf t\nR1(config)# int gi0/1\nR1(config-if)# no shut\nR1(config-if)# ip add 192.168.72.1 255.255.255.224\nend\nwr mem', 'correct');
  check(8, cli(8).replace('255.255.255.224', '255.255.255.0'), 'incorrect');
  check(8, cli(8).replace('GigabitEthernet0/1', 'GigabitEthernet0/2'), 'incorrect');
  check(8, cli(8).replace('configure terminal\n', ''), 'incorrect');
  check(8, cli(8) + '\nshutdown', 'incorrect');
  check(8, cli(8) + '\nno ip address', 'incorrect');
  check(8, cli(8) + '\nmade-up unknown command', 'needs-review');
});

test('subinterfaces accept arbitrary distinct IDs and check final enabled tagged state', () => {
  check(10, cli(10).replace('0/0.40', '0/0.104').replace('0/0.50', '0/0.105'), 'correct');
  check(10, cli(10).replace('dot1q 50', 'dot1q 50 native'), 'incorrect');
  check(10, cli(10).replace('0/0.50', '0/0.40'), 'incorrect');
  check(10, cli(10) + '\nshutdown', 'incorrect');
  check(10, cli(10) + '\ninterface gi0/0\nshutdown', 'incorrect');
  check(10, cli(10) + '\nno ip routing', 'incorrect');
  check(10, cli(10).replace('0/0.50', '0/1.50'), 'incorrect');
});

test('floating static route accepts fully specified form and rejects incorrect AD or next hop', () => {
  check(17, 'R1(config)# ip ro 10.90.40.0 255.255.255.0 gi0/2 192.0.2.2 130', 'correct');
  check(17, cli(17).replace('130', '110'), 'incorrect');
  check(17, cli(17).replace('192.0.2.2', '192.0.2.1'), 'incorrect');
  check(17, 'ip route 10.90.40.0 255.255.255.0 gi0/2 130', 'incorrect');
  check(17, cli(17) + '\nno ' + cli(17), 'incorrect');
});

test('PAT supports standard numbered ACL configuration context and explicit deny', () => {
  const alternative = cli(24).replace('access-list 17 permit 10.42.8.0 0.0.0.255', 'ip access-list standard 17\n10 permit 10.42.8.0 0.0.0.255\n20 deny any\nexit');
  check(24, alternative, 'correct');
  check(24, cli(24).replace('overload', ''), 'incorrect');
  check(24, cli(24).replace('0.0.0.255', '0.0.255.255'), 'incorrect');
  check(24, cli(24) + '\naccess-list 17 permit any', 'incorrect');
  check(24, cli(24) + '\ninterface gi0/0\nip access-group 17 in', 'incorrect');
  check(24, cli(24) + '\ninterface gi0/1\nip address 203.0.113.1 255.255.255.0', 'incorrect');
  check(24, cli(24).replace('ip nat outside', 'ip nat inside'), 'incorrect');
  check(24, cli(24).replace('access-list 17 permit 10.42.8.0 0.0.0.255', 'access-list 17 deny any\naccess-list 17 permit 10.42.8.0 0.0.0.255'), 'incorrect');
});

test('extended ACL validates policy across all sources, destinations, protocols, and ports', () => {
  check(28, cli(28).replaceAll('host 10.12.30.10', '10.12.30.10 0.0.0.0').replaceAll('host 10.50.0.20', '10.50.0.20 0.0.0.0').replaceAll('eq 22', 'eq ssh'), 'correct');
  check(28, cli(28).replace('deny tcp any', 'deny tcp 10.12.30.0 0.0.0.255'), 'incorrect');
  check(28, cli(28).replace('permit ip any any', ''), 'incorrect');
  check(28, cli(28).replace('STAFF_FILTER in', 'STAFF_FILTER out'), 'incorrect');
  check(28, cli(28).replace('permit tcp host 10.12.30.10', 'permit tcp 10.12.30.0 0.0.0.255'), 'incorrect');
  check(28, cli(28).replace('deny tcp any', 'deny ip any').replace('host 10.50.0.20 eq 22\n permit ip', 'host 10.50.0.20\n permit ip'), 'incorrect');
  const reverse = cli(28).replace(' permit tcp host 10.12.30.10 host 10.50.0.20 eq 22\n deny tcp any host 10.50.0.20 eq 22', ' deny tcp any host 10.50.0.20 eq 22\n permit tcp host 10.12.30.10 host 10.50.0.20 eq 22');
  check(28, reverse, 'incorrect');
});

test('ACL sequence numbers determine rule order independent of entry order', () => {
  const ordered = 'ip access-list extended STAFF_FILTER\n30 permit ip any any\n20 deny tcp any host 10.50.0.20 eq 22\n10 permit tcp host 10.12.30.10 host 10.50.0.20 eq 22\ninterface gi0/0\nip access-group STAFF_FILTER in';
  check(28, ordered, 'correct');
  check(28, ordered.replace('30 permit ip', '5 permit ip'), 'incorrect');
});

test('equivalent but unsupported syntax is reviewable rather than confidently misgraded', () => {
  const answer = cli(28).replace('eq 22', 'eq 22 established');
  check(28, answer, 'needs-review');
  let session = createSession([q(28)], { carryOver: false });
  session = recordAnswer(session, q(28), answer);
  const results = getResults([q(28)], session);
  assert.equal(results.needsReview, 1);
  assert.equal(results.provisional, true);
  assert.equal(results.incorrect, 0);
  const reviewed = reviewAnswer(session, q(28), false);
  assert.equal(getResults([q(28)], reviewed).incorrect, 1);
  assert.equal(getResults([q(28)], reviewed).selfAssessed, 1);
  assert.equal(getResults([q(28)], reviewed).provisional, false);
});
