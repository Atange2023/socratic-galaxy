# Agent Skill Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade `socratic-business-inquiry` from a method specification into a repeatable Agent Skill product that can create, advance, pause, resume, validate, and export real business-inquiry sessions.

**Architecture:** Keep live reasoning in the host Agent while moving fragile state operations into a dependency-free Node.js session library and CLI. The Skill directs the Agent through one-question-at-a-time interaction; JSON session files preserve provenance and enable the future Standalone application to consume the same contract.

**Tech Stack:** Markdown Agent Skill, Node.js ESM, built-in `node:test`, JSON and Markdown artifacts.

## Global Constraints

- The host Agent model performs all semantic analysis; no fixed-answer demo logic is part of the customer workflow.
- Preserve `originalQuestion` verbatim and never silently overwrite user corrections.
- Treat emotional or cognitive state as a provisional turn hypothesis with confidence and evidence spans, never as diagnosis.
- Ask one main question at a time during exploration.
- Add no runtime dependencies.
- Maintain compatibility with the seven stages: `capture`, `understand`, `method`, `explore`, `forge`, `evidence`, `artifact`.
- Keep API keys and provider configuration outside the Skill.

---

### Task 1: Deterministic Session Lifecycle

**Files:**
- Create: `skills/socratic-business-inquiry/scripts/session-core.mjs`
- Create: `test/skill-session.test.mjs`
- Modify: `skills/socratic-business-inquiry/scripts/validate-session.mjs`

**Interfaces:**
- Produces: `createInquirySession(originalQuestion, options)`, `applySessionEvent(session, event)`, `buildResumeView(session)`, and shared `validateSession(session)`.
- Consumes: the field meanings in `references/output-contract.md`.

- [ ] Write failing tests proving creation preserves original wording, confirmation advances the stage, correction records old/new values, pause preserves one exact next question, and invalid transitions do not mutate input.
- [ ] Run `node --test --test-isolation=none test/skill-session.test.mjs`; expect missing-module failure.
- [ ] Implement immutable lifecycle functions with event types `UNDERSTANDING_PROPOSED`, `UNDERSTANDING_CORRECTED`, `UNDERSTANDING_CONFIRMED`, `METHOD_SELECTED`, `TURN_RECORDED`, `RESEARCH_QUESTION_FORGED`, `EVIDENCE_ATTACHED`, `ARTIFACT_RECORDED`, and `SESSION_PAUSED`.
- [ ] Re-export validation from `validate-session.mjs` without duplicating schema rules.
- [ ] Run the focused test and commit.

### Task 2: Session CLI and Portable Checkpoints

**Files:**
- Create: `skills/socratic-business-inquiry/scripts/session-cli.mjs`
- Create: `test/skill-cli.test.mjs`
- Modify: `skills/socratic-business-inquiry/references/output-contract.md`

**Interfaces:**
- Consumes: Task 1 lifecycle functions.
- Produces CLI commands `create`, `validate`, `resume`, and `checkpoint` with stdout JSON/Markdown and explicit non-zero errors.

- [ ] Write failing tests that invoke the CLI against temporary files and assert creation, validation failure, resume summary, and Obsidian-compatible checkpoint output.
- [ ] Run the focused test; expect missing CLI failure.
- [ ] Implement a dependency-free CLI with UTF-8 file handling and no network access.
- [ ] Document exact command examples in the output contract.
- [ ] Run the focused test and commit.

### Task 3: Live Conversation and Tool-Use Protocol

**Files:**
- Create: `skills/socratic-business-inquiry/references/conversation-protocol.md`
- Create: `skills/socratic-business-inquiry/references/research-protocol.md`
- Modify: `skills/socratic-business-inquiry/SKILL.md`
- Modify: `test/skill-package.test.mjs`

**Interfaces:**
- Produces an observable turn recipe: reflection, distinction, one question, progress marker, hidden session update.
- Defines host-tool boundaries for literature search, user files, Obsidian/workspace writes, and multi-agent work.

- [ ] Add failing package assertions for startup behavior, one-question output, correction, pause/resume, evidence access depth, and no premature doctoral framing.
- [ ] Run the focused package test; expect missing guidance failures.
- [ ] Add concise routing in `SKILL.md`; place detailed procedures in the two references.
- [ ] Ensure the protocol distinguishes a decision inquiry from a research inquiry and requires user authorization before external or workspace writes.
- [ ] Run package and session tests and commit.

### Task 4: Product-Level Acceptance Scenarios

**Files:**
- Create: `skills/socratic-business-inquiry/references/acceptance-scenarios.md`
- Create: `test/skill-acceptance.test.mjs`
- Modify: `skills/socratic-business-inquiry/agents/openai.yaml`

**Interfaces:**
- Produces five scenario contracts: vague strategy execution, conflicted hiring, closed AI investment question, urgent decision, and research-ready question.
- Each scenario defines expected first-turn shape, prohibited behavior, advancement signal, and artifact target.

- [ ] Write failing tests verifying all five scenarios and required acceptance fields exist.
- [ ] Run the focused test; expect missing reference failure.
- [ ] Write realistic scenario contracts without fixed model answers or exact wording constraints.
- [ ] Update the default prompt to invite a real question and explicitly request one-question-at-a-time guidance.
- [ ] Run acceptance tests and Skill structural validation; commit.

### Task 5: Installation, Regression Verification, and Handoff

**Files:**
- Modify: `README.md`
- Modify: `docs/runtime-modes.md`
- Copy validated package to: `C:\Users\anson\.codex\skills\socratic-business-inquiry`

**Interfaces:**
- Consumes the completed Skill package.
- Produces an installed, discoverable Skill and a clear first real-user trial procedure.

- [ ] Update product documentation to describe actual Skill commands, session files, and the boundary between Agent Skill and Standalone.
- [ ] Run `npm run verify` and `quick_validate.py` on the repository package.
- [ ] Copy the package to the local Codex Skill directory with approval if required.
- [ ] Compare hashes between repository and installed files.
- [ ] Commit the release candidate and preserve the current feature branch without pushing or merging.

## Self-review

- Spec coverage: session continuity, adaptive one-question dialogue, correction, pause/resume, artifacts, host research tools, provenance, safety, and Standalone compatibility are each assigned to a task.
- Placeholder scan: no implementation placeholders are used.
- Type consistency: all tasks use the same seven stages, session fields, event names, and script paths.
