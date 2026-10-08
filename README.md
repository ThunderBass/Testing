# PacketWise — CCNA practice

A responsive, browser-based practice exam built from selected materials in [Packt's CCNA resource repository](https://github.com/PacktPublishing/Cisco-CCNA-200-301-The-Complete-Guide-to-Getting-Certified/tree/6603a64e014dc7fa9fa0cb28a0ca383490e4b844).

## Run locally

Requires Node.js 20.19+ or 22.12+ (validated here with Node 24).

```sh
npm ci
npm run dev
```

Use the URL printed by Vite in your local terminal. This repository needs no API keys, backend, or external services.

## Build and open without a server

```sh
npm run build
```

Open `dist/packetwise.html` directly in a browser. This standalone file includes the exam, fonts, styles, and scripts. Source links require internet access, but the exam itself works offline. The `dist` directory is also deployable to any static host. Pushes to `main` deploy automatically through the included GitHub Pages workflow.

## Features

- A fixed 30-question exam with six easy, eighteen medium, and six challenging questions.
- One question at a time; exact-count multiple choice, matching, ordering, and five CLI simulations.
- Exam mode conceals correctness; study mode gives immediate feedback.
- Optional countdown, skips, flags, early finishing, and browser-local persistence.
- Revisit skipped, flagged, or answered questions without losing your place; submit changes before returning.
- Review checkpoint before grading, and a fresh-start control with a restorable previous attempt.
- Full-exam score and attempted accuracy; skipped, unanswered, and unpresented counts remain distinct.
- Source-linked explanations, topic results, three study priorities, lab recommendations, and Markdown export.
- A ten-question retest selected from eighteen additional original questions; it starts only on request.

New visitors start at Question 1. Existing saved attempts keep their answers, drafts, flags, timer, and position across updates. **Start fresh** begins a clean 30-question attempt and keeps one previous attempt, available through **Restore previous attempt** in the sidebar. Local storage is specific to the browser and origin; it is not a cloud account. Clearing browser data removes both attempts.

## CLI assessment

These are text exercises, not actual IOS execution. A conservative interpreter checks common IOS equivalents and required final outcomes. Unsupported command forms are marked for rubric review instead of automatically marked wrong. Manual rubric assessments are labeled. Scores containing unresolved CLI responses remain provisional.

All grading happens in the browser. This is a personal learning tool, not a secure examination system; the bundled source contains the answer keys.

## Source scope

The inventory covers 62 selected study-note/lab PDFs and eleven complete text notes from the Anki v1.4 deck. The complete course, textbook, videos, deck, and Packet Tracer projects were not read or executed. Official Cisco pages were blocked during research, so the app does not claim verified current exam-version alignment, complete blueprint coverage, an official passing score, or guaranteed readiness. More detail is available in **Study library**.

## Validation

```sh
npm test
npm run build
npm run dev -- --port 5173
# In another terminal:
npm run test:browser
node tests/qol-browser.mjs
```

Browser tests use the system Chromium at `/usr/bin/chromium`. Set `CHROMIUM_PATH` to your local Chromium executable, and `SITE_URL` if using another port. They exercise all question formats, scoring, persistence, early completion, study feedback, review export, retest, mobile layout, and accessibility. The QoL suite also checks legacy saved progress, revisit navigation, the review checkpoint, and fresh-start restoration. Screenshots and reports are saved in the ignored `artifacts/` directory.

The application uses DM Sans under the SIL Open Font License, Marked under MIT, and DOMPurify under Apache-2.0 or MPL-2.0. Build output includes third-party license notices.

## Public hosting with GitHub Pages

The included `.github/workflows/deploy-pages.yml` builds, tests, and publishes only `dist/` when `main` changes. This is the sole Pages deployment workflow: the static and Jekyll starter templates are incompatible with this Vite build. It uses GitHub's built-in workflow token; no hosting API key is stored in this repository.

For the first deployment, open the repository's **Settings → Pages** and choose **GitHub Actions** as the build-and-deployment source. Then run **Deploy PacketWise to GitHub Pages** from the **Actions** tab (or push a change to `main`). GitHub reports the live URL in the deployment result; for this repository the expected project-site URL is `https://thunderbass.github.io/Testing/` after deployment succeeds.

A private repository may require a GitHub plan that supports Pages. Do not make the repository public merely to enable hosting without the owner's explicit approval.

The published link is accessible across devices. Progress remains local to each browser and does not sync between devices. All answer keys are client-side because this is a personal practice tool.
