import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const {questions}=JSON.parse(await readFile('src/exam-data.json','utf8'));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const errors=[]; const url=process.env.SITE_URL||'http://127.0.0.1:5173';
const reports=[];
async function create(width=1440,height=1000){const context=await browser.newContext({viewport:{width,height}});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(url);await page.waitForSelector('.question-card');await page.evaluate(()=>document.fonts.ready);return {context,page};}
async function answer(page,q){
 const a=q.correct_answer;
 if(/cli/i.test(q.format))await page.locator('#cli-answer').fill(Array.isArray(a)?a.join('\n'):a);
 else if(/matching/i.test(q.format))for(const [n,v] of Object.entries(a))await page.locator('#match-'+n).selectOption(v);
 else if(/ordering/i.test(q.format))for(const [i,v] of a.entries())await page.locator('#order-'+i).selectOption(v);
 else if(Array.isArray(a))for(const v of a)await page.locator(`.answer-option:has(input[value="${v}"])`).click();
 else await page.locator(`.answer-option:has(input[value="${a}"])`).click();
 await page.locator('[data-action="submit"]').click();
}
try{
 const {context,page}=await create();
 assert.match(await page.locator('.question-kicker').innerText(),/01.*30/);
 assert.equal(await page.locator('.question-dot.answered').count(),0);
 await page.locator('.answer-option:has(input[value="A"])').click();await page.locator('[data-action="submit"]').click();
 await page.screenshot({path:'artifacts/desktop.png',fullPage:false});
 await page.locator('[data-action="submit"]').click();assert.match(await page.locator('#answer-error').innerText(),/Choose an answer/);
 await page.locator('[data-action="flag"]').click();assert.equal(await page.locator('.question-dot.flagged').count(),1);
 await answer(page,questions[1]);assert.match(await page.locator('.question-kicker').innerText(),/03/);
 assert.equal(await page.locator('.review-explanation').count(),0);
 await page.reload();await page.waitForSelector('.question-card');assert.match(await page.locator('.question-kicker').innerText(),/03/);
 for(const q of questions.slice(2)){
  if(q.id===8)await page.screenshot({path:'artifacts/cli.png',fullPage:false});
  await answer(page,q);
 }
 await page.waitForSelector('.checkpoint');assert.equal(await page.locator('.results-hero').count(),0);
 await page.locator('[data-action="finish"]').first().click();await page.locator('[data-action="confirm-finish"]').click();
 await page.waitForSelector('.results-hero');
 assert.match(await page.locator('.big-score').innerText(),/29\s*\/\s*30/);
 assert.equal(await page.locator('.review-item').count(),30);
 await page.screenshot({path:'artifacts/results.png',fullPage:false});
 const resultsAxe=await new AxeBuilder({page}).analyze();reports.push({page:'results',violations:resultsAxe.violations.map(({id,impact,nodes})=>({id,impact,targets:nodes.map(n=>n.target)}))});
 await page.locator('#review-filter').selectOption('practice');assert.equal(await page.locator('.review-item').count(),1);
 await page.locator('.review-item summary').click();assert.match(await page.locator('.review-item-body').innerText(),/Copying it to the startup/);
 const downloadPromise=page.waitForEvent('download');await page.locator('[data-action="download"]').click();const download=await downloadPromise;assert.match(download.suggestedFilename(),/review.md$/);
 await page.locator('[data-action="retest"]').click();await page.locator('[data-action="confirm-retest"]').click();await page.waitForSelector('.question-card');assert.match(await page.locator('.question-kicker').innerText(),/01.*10/);assert.equal(await page.locator('.question-dot').count(),10);
 await context.close();
 reports.push({flow:'all question formats, 29/30 result, source review, export, focused retest',passed:true});
 const study=await create(390,844);await study.page.locator('.answer-option:has(input[value="A"])').click();await study.page.locator('[data-action="submit"]').click();await study.page.screenshot({path:'artifacts/mobile.png',fullPage:true});
 const noOverflow=await study.page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth);assert.ok(noOverflow,'Mobile page overflows horizontally');
 await study.page.locator('[data-action="mode-study"]').click();await answer(study.page,questions[1]);await study.page.waitForSelector('[role="dialog"]');assert.match(await study.page.locator('.modal-title,#modal-title').innerText(),/correct/);await study.page.locator('[data-action="continue-study"]').last().click();assert.match(await study.page.locator('.question-kicker').innerText(),/03/);
 await study.page.locator('[data-action="skip"]').click();assert.match(await study.page.locator('.question-kicker').innerText(),/04/);
 await study.page.locator('[data-action="finish"]').click();await study.page.locator('[data-action="confirm-finish"]').click();
 const mobileState=await study.page.evaluate(()=>JSON.parse(localStorage.getItem('packetwise.session.v1')));
 assert.equal(mobileState.session.skippedIds.length,1);assert.equal(mobileState.session.viewedIds.length,4);
 assert.match(await study.page.locator('.big-score').innerText(),/1\s*\/\s*30/);
 const mobileCounts=await study.page.locator('.stat-card').allInnerTexts();assert.ok(mobileCounts.some(x=>/26\s*Not presented/.test(x)));assert.ok(mobileCounts.some(x=>/1\s*Unanswered/.test(x)));
 await study.context.close();reports.push({flow:'mobile, study feedback, skip and early-finish counts',passed:true});
 const a11y=await create();
 const examAxe=await new AxeBuilder({page:a11y.page}).analyze();reports.push({page:'exam',violations:examAxe.violations.map(({id,impact,nodes})=>({id,impact,targets:nodes.map(n=>n.target)}))});
 await a11y.page.locator('[data-action="sources"]').first().click();await a11y.page.waitForSelector('.modal');assert.match(await a11y.page.locator('.modal').innerText(),/verify/);
 const sourceAxe=await new AxeBuilder({page:a11y.page}).analyze();reports.push({page:'source dialog',violations:sourceAxe.violations.map(({id,impact,nodes})=>({id,impact,targets:nodes.map(n=>n.target)}))});
 await a11y.page.keyboard.press('Escape');assert.equal(await a11y.page.locator('.modal').count(),0);
 await a11y.context.close();
 const manual=await create();
 const reviewQ=questions.find(q=>q.id===28);
 await manual.page.evaluate(({answer})=>{const d=JSON.parse(localStorage.getItem('packetwise.session.v1'));d.session.status='finished';d.session.answers[28]=answer;d.session.viewedIds.push(28);localStorage.setItem('packetwise.session.v1',JSON.stringify(d));},{answer:reviewQ.correct_answer.replace('eq 22','eq 22 established')});
 await manual.page.reload();await manual.page.waitForSelector('.results-hero');
 assert.match(await manual.page.locator('.results-hero').innerText(),/PROVISIONAL/);
 await manual.page.locator('.review-item[data-status="needs-review"] > summary').click();
 await manual.page.locator('[data-action="assess-cli"][data-correct="false"]').click();
 assert.equal(await manual.page.locator('.review-item[data-status="needs-review"]').count(),0);
 assert.match(await manual.page.locator('.results-hero-note').innerText(),/1 self-assessed/);
 await manual.context.close();reports.push({flow:'unrecognized CLI outcome is manually reviewable and labeled',passed:true});
 assert.deepEqual(errors,[],'Browser console errors');
 await writeFile('artifacts/browser-results.json',JSON.stringify({reports,errors},null,2));
 console.log(JSON.stringify({reports:reports.map(r=>r.violations?{page:r.page,violations:r.violations.length,issues:r.violations.map(v=>({id:v.id,count:v.targets.length}))}:r),errors},null,2));
 assert.equal(reports.flatMap(r=>r.violations||[]).filter(v=>['serious','critical'].includes(v.impact)).length,0,'Serious accessibility issues require resolution; see artifacts/browser-results.json');
}finally{await browser.close();}
