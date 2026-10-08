import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createSession } from '../src/exam-engine.js';

const { questions } = JSON.parse(await readFile('src/exam-data.json', 'utf8'));
const key = 'packetwise.session.v1';
const url = process.env.SITE_URL || 'http://127.0.0.1:5173';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
const reports = [], errors = [];
await mkdir('artifacts', { recursive: true });
const base = () => ({ session: createSession(questions), kind: 'main', retestIds: [], drafts: {}, flags: [], timer: { remaining: 3480, running: false, deadline: null }, feedbackId: null });
async function state(page) { return page.evaluate(key => JSON.parse(localStorage.getItem(key)), key); }
async function seed(page, data) {
  await page.evaluate(({ key, data }) => localStorage.setItem(key, JSON.stringify(data)), { key, data });
  await page.reload();
  await page.locator('#question-title').waitFor();
}
async function question(page, number) { assert.match(await page.locator('.question-kicker').innerText(), new RegExp(`QUESTION ${String(number).padStart(2, '0')}\\s+OF 30`)); }
async function noFeedback(page) {
  assert.equal(await page.locator('.results-hero, .review-explanation, .feedback-status, .answer-comparison, .rubric-details').count(), 0, 'Exam mode must not show correctness or answer keys');
  assert.equal((await state(page)).session.status, 'active');
}
async function noOverflow(page) {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'Page must fit the viewport');
  if (await page.locator('.modal').count()) assert.ok(await page.locator('.modal').evaluate(el => el.scrollWidth <= el.clientWidth), 'Dialog must not overflow horizontally');
}
async function audit(page, name) {
  const { violations } = await new AxeBuilder({ page }).analyze();
  reports.push({ page: name, violations: violations.map(({ id, impact, nodes }) => ({ id, impact, targets: nodes.map(n => n.target) })) });
}
async function chooseFromList(page, action, id) {
  await page.locator(`[data-action="${action}"]`).first().click();
  await page.locator(`.modal [data-action="view-question"][data-id="${id}"]`).click();
}

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(url);
  await page.locator('.question-card').waitFor();
  await question(page, 1);
  assert.deepEqual((await state(page)).session.answers, {});

  const legacy = base();
  legacy.session.currentIndex = 4;
  legacy.session.answers = { 1: 'A', 2: 'C', 3: 'C', 4: 'B' };
  legacy.session.viewedIds = [1, 2, 3, 4, 5];
  delete legacy.session.selfAssessments;
  legacy.drafts = { 5: { 1: 'B' } };
  legacy.flags = [2, 5];
  await seed(page, legacy);
  await question(page, 5);
  assert.deepEqual(await state(page), legacy, 'A legacy saved attempt must not be migrated destructively');
  await page.reload();
  await question(page, 5);
  assert.deepEqual(await state(page), legacy);
  assert.equal(await page.locator('#timer-clock').innerText(), '58:00');
  assert.equal(await page.locator('#match-1').inputValue(), 'B');
  assert.deepEqual(await page.locator('.question-prompt > ul > li').allTextContents(), ['A. Global unicast', 'B. Link-local', 'C. Unique local']);
  const choicePositions = await page.locator('.question-prompt > ul > li').evaluateAll(items => items.map(item => item.getBoundingClientRect().top));
  assert.ok(choicePositions.every((top, i) => i === 0 || top > choicePositions[i - 1]), 'Matching descriptions must occupy separate lines');
  assert.deepEqual(await page.locator('#match-1 option').allTextContents(), ['Choose a match', 'A. Global unicast', 'B. Link-local', 'C. Unique local']);
  await page.screenshot({ path: 'artifacts/qol-matching-desktop.png', fullPage: false });
  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow(page);
  await page.screenshot({ path: 'artifacts/qol-matching-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  reports.push({ flow: 'Legacy Question 5, saved responses, partial draft, flags and timer survive reload; matching choices have separate rows and full labels', passed: true });

  await page.locator('[data-action="skip"]').click();
  await question(page, 6);
  assert.deepEqual((await state(page)).session.skippedIds, [5]);
  assert.deepEqual((await state(page)).drafts[5], { 1: 'B' });
  await page.locator('[data-action="review-skipped"]').click();
  await audit(page, 'Skipped-question dialog');
  await page.locator('.modal [data-action="view-question"][data-id="5"]').click();
  await question(page, 5);
  assert.equal((await state(page)).session.resumeIndex, 5);
  assert.equal(await page.locator('#match-1').inputValue(), 'B');
  await page.locator('#match-2').selectOption('C');
  await page.locator('#match-3').selectOption('A');
  await page.locator('[data-action="submit"]').click();
  await question(page, 6);
  assert.deepEqual((await state(page)).session.skippedIds, []);
  assert.deepEqual((await state(page)).session.answers[5], { 1: 'B', 2: 'C', 3: 'A' });
  assert.equal(Object.hasOwn((await state(page)).session, 'resumeIndex'), false);
  await noFeedback(page);

  await page.locator('.answer-option:has(input[value="B"])').click();
  await chooseFromList(page, 'review-flags', 2);
  await question(page, 2);
  assert.equal(await page.locator('input[value="C"]').isChecked(), true, 'Recorded response must be prefilled');
  await page.locator('.answer-option:has(input[value="A"])').click();
  await page.locator('[data-action="submit"]').click();
  await question(page, 6);
  assert.equal((await state(page)).session.answers[2], 'A');
  assert.equal(Object.keys((await state(page)).session.answers).length, 5, 'Editing must not inflate the answered count');
  assert.equal(await page.locator('input[value="B"]').isChecked(), true, 'The forward question draft must survive a revisit');
  await noFeedback(page);
  await page.locator('.question-grid [data-action="view-question"][data-id="5"]').click();
  await page.locator('#match-1').selectOption('A');
  await page.locator('[data-action="return-to-exam"]').click();
  await question(page, 6);
  await page.reload();
  await question(page, 6);
  assert.equal((await state(page)).session.answers[5][1], 'B', 'An unsubmitted draft must not replace the recorded response');
  await page.locator('.question-grid [data-action="view-question"][data-id="5"]').click();
  assert.equal(await page.locator('#match-1').inputValue(), 'A');
  await page.reload();
  await question(page, 5);
  assert.equal((await state(page)).session.resumeIndex, 5, 'Reload must retain the forward position during a revisit');
  await page.locator('.question-grid [data-action="view-question"][data-id="6"]').click();
  await question(page, 6);
  assert.equal(Object.hasOwn((await state(page)).session, 'resumeIndex'), false, 'Selecting the forward question must end the revisit');
  await noFeedback(page);
  reports.push({ flow: 'Skipped draft can be completed, flagged answers edited, navigation and reload preserve drafts and the forward position, and no exam feedback leaks', passed: true });

  await page.locator('[data-action="timer"]').click();
  const beforeRestart = await state(page);
  assert.equal(beforeRestart.timer.running, true);
  await page.locator('[data-action="restart"]').click();
  await audit(page, 'Start-fresh confirmation');
  await page.locator('.modal-footer [data-action="close-modal"]').click();
  assert.deepEqual(await state(page), beforeRestart, 'Cancel must retain the complete current attempt');
  await page.locator('[data-action="restart"]').click();
  await page.locator('[data-action="confirm-restart"]').click();
  await question(page, 1);
  let restarted = await state(page);
  assert.deepEqual(restarted.session.answers, {});
  assert.deepEqual(restarted.previousAttempt.session, beforeRestart.session);
  assert.deepEqual(restarted.previousAttempt.drafts, beforeRestart.drafts);
  assert.deepEqual(restarted.previousAttempt.flags, beforeRestart.flags);
  assert.equal(restarted.previousAttempt.timer.running, false);
  assert.equal(restarted.previousAttempt.timer.deadline, null);
  assert.ok(restarted.previousAttempt.timer.remaining <= 3480 && restarted.previousAttempt.timer.remaining > 3400);
  await page.reload();
  restarted = await state(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.mobile-menu[data-action="menu"]').click();
  await page.locator('[data-action="restore"]').click();
  await noOverflow(page);
  await audit(page, 'Mobile restore-attempt confirmation');
  await page.locator('[data-action="confirm-restore"]').click();
  assert.equal(await page.locator('.sidebar-overlay').count(), 0, 'Restoring an attempt must close the mobile navigation');
  await question(page, 6);
  const restored = await state(page);
  assert.deepEqual(restored.session, beforeRestart.session);
  assert.deepEqual(restored.drafts, beforeRestart.drafts);
  assert.deepEqual(restored.flags, beforeRestart.flags);
  assert.deepEqual(restored.timer, restarted.previousAttempt.timer);
  assert.deepEqual(restored.previousAttempt.session.answers, {});
  await noFeedback(page);
  await noOverflow(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  reports.push({ flow: 'Fresh-start cancellation preserves the attempt; confirmed reset stores a reload-safe backup and restore recovers answers, drafts, flags and paused time', passed: true });

  const finalQuestion = base();
  finalQuestion.session.currentIndex = 29;
  finalQuestion.session.answers = Object.fromEntries(questions.slice(0, 27).map(q => [q.id, q.correct_answer]));
  finalQuestion.session.viewedIds = questions.map(q => q.id);
  finalQuestion.session.skippedIds = [28, 29];
  finalQuestion.flags = [2, 28];
  await seed(page, finalQuestion);
  await question(page, 30);
  await page.locator('.answer-option:has(input[value="A"])').click();
  await page.locator('.answer-option:has(input[value="D"])').click();
  await page.locator('[data-action="submit"]').click();
  await page.locator('.checkpoint').waitFor();
  assert.equal((await state(page)).session.currentIndex, 30);
  assert.equal((await state(page)).session.finishedAt, null);
  await noFeedback(page);
  await page.reload();
  await page.locator('.checkpoint').waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow(page);
  await audit(page, 'Mobile review checkpoint');
  await page.screenshot({ path: 'artifacts/qol-checkpoint-mobile.png', fullPage: true });
  await page.locator('[data-action="review-skipped"]').first().click();
  await noOverflow(page);
  await audit(page, 'Mobile skipped-question dialog');
  await page.locator('.modal [data-action="view-question"][data-id="29"]').click();
  await question(page, 29);
  assert.equal((await state(page)).session.resumeIndex, 30);
  await page.locator('.answer-option:has(input[value="A"])').click();
  await page.locator('[data-action="submit"]').click();
  await page.locator('.checkpoint').waitFor();
  assert.deepEqual((await state(page)).session.skippedIds, [28]);
  await noFeedback(page);
  await page.locator('[data-action="finish"]').first().click();
  await noOverflow(page);
  await audit(page, 'Mobile finish confirmation');
  await noFeedback(page);
  await page.locator('[data-action="confirm-finish"]').click();
  await page.locator('.results-hero').waitFor();
  assert.equal((await state(page)).session.status, 'finished');
  assert.equal(await page.locator('.review-item').count(), 30);
  assert.equal(await page.locator('.review-item[data-status="skipped"]').count(), 1);
  reports.push({ flow: 'Final submission and reload retain an ungraded checkpoint; mobile revisits return there; only explicit Finish reveals results', passed: true });
  await context.close();
  assert.deepEqual(errors, [], 'Browser runtime errors');
  await writeFile('artifacts/qol-browser-results.json', JSON.stringify({ reports, errors }, null, 2));
  console.log(JSON.stringify({ reports: reports.map(r => r.violations ? { page: r.page, violations: r.violations.length, issues: r.violations.map(v => ({ id: v.id, impact: v.impact })) } : r), errors }, null, 2));
  assert.equal(reports.flatMap(r => r.violations || []).length, 0, 'Accessibility violations require review; see artifacts/qol-browser-results.json');
} finally {
  await browser.close();
}
