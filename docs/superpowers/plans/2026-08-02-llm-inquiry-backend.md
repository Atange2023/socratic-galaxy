# LLM Inquiry Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a secure DeepSeek-backed inquiry API that infers turn state, generates structured Socratic guidance, persists local development sessions, and drives the existing galaxy UI.

**Architecture:** A Fastify TypeScript server serves the self-contained HTML and a same-origin SSE endpoint. A provider-neutral inquiry service validates DeepSeek JSON with Zod, retries once, persists only structured outputs in SQLite, and returns an explicit deterministic fallback when no model is configured.

**Tech Stack:** Node.js 22+, TypeScript, Fastify, Zod, Node `fetch`, Node built-in `node:sqlite`, Node test runner via `tsx`.

## Global Constraints

- Never expose `DEEPSEEK_API_KEY` to browser code or logs.
- Do not store model reasoning content or infer clinical diagnoses or permanent traits.
- Keep `file://` offline behavior functional.
- DeepSeek is an adapter, not a dependency of domain logic.
- Every production behavior starts with a failing test.

---

### Task 1: Contracts and DeepSeek adapter

**Files:**
- Create: `server/contracts.ts`
- Create: `server/providers/deepseek.ts`
- Test: `server/providers/deepseek.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `InquiryInput`, `InquiryResult`, `InquiryResultSchema`, `InquiryProvider`, `createDeepSeekProvider(config)`.

- [ ] Write tests proving valid model JSON is accepted, invalid/empty JSON is retried once, authorization stays in the outbound header, and no reasoning field enters the result.
- [ ] Run the focused test and confirm it fails because the modules are absent.
- [ ] Implement the Zod contract and provider using injected `fetch`.
- [ ] Run the focused test and confirm it passes.

### Task 2: Fallback, service, and SQLite repository

**Files:**
- Create: `server/fallback.ts`
- Create: `server/repository.ts`
- Create: `server/inquiry-service.ts`
- Test: `server/inquiry-service.test.ts`

**Interfaces:**
- Consumes: `InquiryProvider`, `InquiryInput`, `InquiryResult`.
- Produces: `createInquiryService({ provider, repository })`, `createInquiryRepository(path)`, `buildFallbackInquiry(input)`.

- [ ] Write tests proving a successful analysis is persisted, an unavailable provider returns `source: fallback`, and only structured result data is stored.
- [ ] Run focused tests and confirm the missing-module failure.
- [ ] Implement the minimal repository, fallback, and service.
- [ ] Run focused tests and confirm they pass.

### Task 3: Fastify HTTP and SSE boundary

**Files:**
- Create: `server/app.ts`
- Create: `server/index.ts`
- Test: `server/app.test.ts`
- Create: `.env.example`
- Modify: `.gitignore`
- Modify: `package.json`

**Interfaces:**
- Consumes: `createInquiryService`.
- Produces: `buildServer(options)` with `GET /`, `GET /api/v1/health`, and `POST /api/v1/inquiry`.

- [ ] Write inject-based tests for health, static HTML, validation, and ordered SSE events.
- [ ] Run focused tests and confirm they fail because the server does not exist.
- [ ] Implement the app factory and executable entry point; validate inputs and escape SSE JSON through `JSON.stringify`.
- [ ] Run focused tests and confirm they pass.

### Task 4: Frontend LLM integration

**Files:**
- Create: `src/inquiry-client.mjs`
- Test: `test/inquiry-client.test.mjs`
- Modify: `scripts/build.mjs`
- Modify: `src/app.mjs`
- Modify: `src/index.template.html`
- Modify: `src/styles.css`

**Interfaces:**
- Produces: `requestInquiry(input, handlers, fetchImpl)`; handlers receive `status`, `result`, `done`, and `error` events.

- [ ] Write tests for SSE parsing, HTTP errors, and file-mode fallback detection.
- [ ] Run focused tests and confirm the client is absent.
- [ ] Implement the client, remove the pre-question state chooser, render inferred state and LLM reframes, and preserve local fallback.
- [ ] Run focused tests and the original frontend suite.

### Task 5: Verification and handoff

**Files:**
- Modify: `README.md`
- Modify: `docs/poc-conclusion.md`

- [ ] Document server configuration, privacy boundary, fallback behavior, and local launch commands.
- [ ] Run `npm run verify` and confirm all frontend and server tests pass.
- [ ] Launch the service without a key and verify health plus fallback inquiry.
- [ ] Rebuild `dist/index.html` and copy the versioned deliverable to `outputs`.
