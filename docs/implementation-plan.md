# Question-Driven Terminal POC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and archive a responsive, offline-first, single-HTML POC that turns one user question into a guided question branch and an exportable artifact.

**Architecture:** Develop testable domain logic as an ES module, then bundle the verified logic, UI, styles, and Canvas renderer into one distributable HTML file. Runtime state stays in memory with best-effort `localStorage`; exports are generated locally and no network calls occur.

**Tech Stack:** Semantic HTML5, CSS, vanilla JavaScript ES2022, Canvas 2D, Node.js built-in `node:test`, Playwright/Chromium when available, Git.

## Global Constraints

- Final user-facing application is exactly one HTML file with no external runtime dependency.
- Primary presentation is 16:9 responsive; mobile width 390px must remain usable.
- Heading sizes stay below 2rem in the working area; body line-height is at least 1.6.
- No browser-side LLM API key, remote telemetry, clinical inference, or fabricated research result.
- Motion must reflect real UI state and provide reduced-motion and text-only fallbacks.
- User data remains local and can be exported or cleared.

---

### Task 1: Domain guidance engine

**Files:**
- Create: `work/question-terminal/src/core.mjs`
- Test: `work/question-terminal/test/core.test.mjs`

**Interfaces:**
- Produces: `normalizeQuestion(text)`, `classifyQuestion(text)`, `buildReframes(text)`, `buildArtifact(session, type)`, `serializeMarkdown(session)`, `serializeJson(session)`.

- [ ] **Step 1: Write failing tests** for empty input, closed-question detection, four distinct lenses, artifact lineage, Markdown frontmatter, and valid JSON.
- [ ] **Step 2: Run `node --test work/question-terminal/test/core.test.mjs`** and confirm failure because `core.mjs` does not exist.
- [ ] **Step 3: Implement the smallest pure functions** that satisfy the literal expectations, with a 500-character validation boundary.
- [ ] **Step 4: Run the same test command** and confirm all cases pass with zero warnings.
- [ ] **Step 5: Commit only the source and test files** after repository initialization.

### Task 2: Session state and persistence

**Files:**
- Modify: `work/question-terminal/src/core.mjs`
- Modify: `work/question-terminal/test/core.test.mjs`

**Interfaces:**
- Produces: `createSession(question, selfReport)`, `selectBranch(session, reframe)`, `recordArtifact(session, artifact)`, `saveSession(storage, key, session)`, `loadSession(storage, key)`.

- [ ] **Step 1: Add failing tests** proving immutable branch lineage, event logging, recovery from malformed stored JSON, and graceful quota errors.
- [ ] **Step 2: Run the focused tests** and confirm failures name missing exports or wrong outcomes.
- [ ] **Step 3: Implement immutable state transitions and `{ok, value|error}` storage results.**
- [ ] **Step 4: Re-run the full Node test suite** and confirm green.
- [ ] **Step 5: Commit this independently testable state layer.**

### Task 3: Single-file interface and galaxy renderer

**Files:**
- Create: `work/question-terminal/src/index.template.html`
- Create: `work/question-terminal/src/app.mjs`
- Create: `work/question-terminal/src/styles.css`
- Create: `work/question-terminal/src/galaxy.mjs`
- Create: `work/question-terminal/scripts/build.mjs`
- Test: `work/question-terminal/test/build.test.mjs`
- Output: `outputs/问启星河_提问驱动工作终端_POC_v0.1.html`

**Interfaces:**
- Consumes: all exports from `core.mjs`.
- Produces: one self-contained HTML file with `window.__QUESTION_TERMINAL_READY__ === true` after initialization.

- [ ] **Step 1: Add a failing build test** that expects one HTML output, no external `src`/`href`, required landmarks, privacy copy, reduced-motion control, and inline scripts/styles.
- [ ] **Step 2: Run the build test** and confirm failure because the builder and output do not exist.
- [ ] **Step 3: Implement semantic layout, responsive styles, accessible controls, real state-driven Canvas renderer, and bundler.**
- [ ] **Step 4: Run build and all Node tests**; confirm output meets the single-file contract.
- [ ] **Step 5: Commit source, test, and distributable HTML.**

### Task 4: Browser behavior and visual QA

**Files:**
- Create: `work/question-terminal/test/browser-smoke.mjs`
- Create: `work/question-terminal/test/accessibility-smoke.mjs`
- Create: `work/question-terminal/qa/` screenshots
- Modify: source files only when a failing regression test exists.

**Interfaces:**
- Consumes: built POC HTML.
- Produces: automated smoke-test evidence and 1440×810 / 390×844 screenshots.

- [ ] **Step 1: Write browser tests first** for no horizontal overflow, submission, branch selection, artifact creation, local save, export trigger, reset, and reduced motion.
- [ ] **Step 2: Run them and confirm expected failures** before wiring any missing browser behavior.
- [ ] **Step 3: Implement only the missing browser behaviors and add visible error/status handling.**
- [ ] **Step 4: Run browser tests, inspect both screenshots, and run a console-error check.**
- [ ] **Step 5: Commit verified fixes and QA scripts; do not commit temporary screenshots unless they aid review.**

### Task 5: Documentation, POC conclusion, and GitHub archive

**Files:**
- Create: `work/question-terminal/README.md`
- Create: `outputs/问启星河_POC验证结论_v0.1.md`
- Create: `work/question-terminal/.gitignore`

**Interfaces:**
- Produces: usage instructions, evidence-based POC report, and a versioned GitHub repository.

- [ ] **Step 1: Re-read the design and PRD acceptance requirements** and map each to evidence or a documented limitation.
- [ ] **Step 2: Run the full verification command** covering unit, build, browser, overflow, console, and artifact checks.
- [ ] **Step 3: Write the report** separating technical conclusions from hypotheses requiring 5–8 real users.
- [ ] **Step 4: Inspect `git status`, staged paths, and staged diff; stage only confirmed project files and commit on a feature branch.**
- [ ] **Step 5: Create or reuse `atange2023/socratic-galaxy-poc`, push the feature branch, and verify the remote commit and downloadable HTML.**

## Self-review

- Spec coverage: the plan covers guidance, local state, artifact generation, galaxy state feedback, local ownership, responsive UI, reduced motion, errors, tests, report, and archive.
- Deliberate exclusions: network research, real multi-agent orchestration, Obsidian filesystem synchronization, authentication, publishing, and psychological inference are documented POC boundaries.
- Placeholder scan: no implementation step depends on undefined product behavior; test expectations are derived from the approved design.
- Type consistency: session, question, artifact, event, and settings names match the design schema across tasks.
