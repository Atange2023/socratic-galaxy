# 问启星河客户演示版黄金路径 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有 POC 升级为可向潜在客户连续演示 UC-01 至 UC-09 核心价值的工作台，并在无 API Key 时使用明确标注的演示引擎、配置 DeepSeek 后使用真实分析。

**Architecture:** 保留现有零前端框架、单 HTML 构建和 Fastify 服务端，先实现一条可运行的纵向切片。前端改为六阶段有限状态工作区；确定性的会话、方法运行、问题簇、研究问题和成果物逻辑放入独立领域模块；LLM 只返回结构化语义建议。演示模式与 DeepSeek 模式共享同一事件和数据契约。

**Tech Stack:** Node.js 22、原生 ES Modules、TypeScript、Fastify 5、Zod 4、Node test runner、Canvas 2D、CSS Grid、SSE、SQLite（服务端日志）。

## Global Constraints

- 核心演示必须覆盖：投问、理解校正、方法推荐、苏格拉底练习、问题簇主线、研究问题锻造、文献核验预览、成果导出。
- 每个页面只保留一个主 CTA；所有 AI 建议可纠正或撤销。
- 原始问题永久保留，事实、用户判断、AI 暂定和文献证据必须视觉区分。
- 无 DeepSeek API Key 时必须可完整演示，并明确显示“演示引擎”，不得伪装成真实联网研究。
- 有 API Key 时密钥只存在服务端环境变量，不进入 HTML、日志、SQLite 或错误响应。
- 所有模型输出通过 Zod Schema；模型失败降级但不丢用户输入。
- 首版文献模块使用可核验的演示文献集合；真实 OpenAlex/Crossref 联网连接器作为下一里程碑，不以虚构结果冒充实时检索。
- 保留银河粒子效果，但动效必须对应 `idle / analyzing / practicing / branching / forging / researching / ready / error` 状态并支持减少动画。
- 桌面 16:9 优先；窄屏降级为单列和抽屉；满足键盘操作、ARIA live 与非颜色状态提示。
- 修改使用测试驱动；每个任务结束运行目标测试，里程碑结束运行 `npm run verify`。

---

## File Structure

### Existing files to preserve and evolve

- `src/index.template.html`：工作台语义结构与全部可见状态容器。
- `src/styles.css`：设计令牌、三栏布局、阶段状态、响应式和可访问性。
- `src/app.mjs`：仅负责 DOM 绑定、事件路由和渲染协调；逐步移出领域逻辑。
- `src/galaxy.mjs`：银河状态映射。
- `src/inquiry-client.mjs`：SSE 客户端。
- `server/app.ts`：HTTP/SSE 路由。
- `server/inquiry-service.ts`：模型调用与降级。
- `server/providers/deepseek.ts`：DeepSeek 适配器。

### New focused files

- `src/workflow.mjs`：六阶段状态机、阶段进入条件、前进/回退。
- `src/demo-engine.mjs`：可重复的客户演示语义数据，不声称联网。
- `src/methods.mjs`：方法推荐与苏格拉底四回合协议。
- `src/research-forge.mjs`：问题簇、主线、构念及研究问题候选。
- `src/evidence.mjs`：演示证据集合、读取深度和核验状态。
- `src/artifacts.mjs`：研究简报和 Markdown 导出。
- `test/workflow.test.mjs`、`test/methods.test.mjs`、`test/research-forge.test.mjs`、`test/evidence.test.mjs`：领域测试。
- `test/golden-path.test.mjs`：UC-01 至 UC-09 状态和产出的端到端领域测试。
- `docs/demo-script.md`：客户演示话术、操作步骤、演示/真实能力边界。

---

### Task 1: 固化当前 v0.3 LLM 后端基线

**Files:**
- Modify: `README.md`
- Existing: `.env.example`, `package.json`, `server/**`, `src/inquiry-client.mjs`, current modified frontend files

**Interfaces:**
- Produces: working `POST /api/v1/inquiry` SSE contract and provider/fallback health status used by later tasks.

- [ ] **Step 1: Run the complete existing verification**

Run: `npm run verify`

Expected: build, 30 frontend tests, 8 server tests, typecheck, and syntax checks pass.

- [ ] **Step 2: Repair visible UTF-8 metadata if necessary**

Inspect source with explicit UTF-8 decoding. Correct only genuinely corrupted `package.json` description or README text; do not rewrite valid Chinese based on terminal mojibake.

- [ ] **Step 3: Document the two runtime modes**

Add exact commands to `README.md`:

```text
npm install
npm run dev
# optional: copy .env.example to .env and set DEEPSEEK_API_KEY
```

Explain that no-key mode uses fallback guidance and that `file://dist/index.html` is offline-only.

- [ ] **Step 4: Re-run verification**

Run: `npm run verify`

Expected: PASS with no secret in generated HTML.

- [ ] **Step 5: Commit the baseline**

```text
git add .gitignore .env.example package.json package-lock.json tsconfig.json README.md scripts/build.mjs server src/inquiry-client.mjs src/app.mjs src/index.template.html src/styles.css test/build.test.mjs test/inquiry-client.test.mjs dist/index.html
git commit -m "feat: add DeepSeek inquiry backend baseline"
```

### Task 2: 建立六阶段工作流状态机

**Files:**
- Create: `src/workflow.mjs`
- Create: `test/workflow.test.mjs`
- Modify: `scripts/build.mjs`

**Interfaces:**
- Produces: `WORKFLOW_STAGES`, `createWorkflow(question, now)`, `transitionWorkflow(workflow, event)`, `canEnterStage(workflow, stage)`.
- Events: `ANALYSIS_RECEIVED`, `UNDERSTANDING_CONFIRMED`, `METHOD_SELECTED`, `METHOD_COMPLETED`, `MAINLINE_SELECTED`, `RESEARCH_QUESTION_CONFIRMED`, `EVIDENCE_REVIEWED`, `ARTIFACT_GENERATED`, `GO_BACK`.

- [ ] **Step 1: Write failing state-machine tests**

Tests assert initial stage is `capture`, stage skipping is rejected, confirmed understanding enters `method`, `GO_BACK` preserves data, and artifact generation enters `complete`.

- [ ] **Step 2: Run the target test and confirm failure**

Run: `node --test test/workflow.test.mjs`

Expected: FAIL because `src/workflow.mjs` does not exist.

- [ ] **Step 3: Implement immutable workflow transitions**

Use this stage order:

```js
['capture', 'understand', 'method', 'explore', 'forge', 'evidence', 'artifact']
```

Each transition returns `{ ok, value, error }`; invalid transitions never mutate the prior object.

- [ ] **Step 4: Include the module in the single-file build**

Update `scripts/build.mjs` module ordering so browser code can import the workflow module before `app.mjs` is bundled.

- [ ] **Step 5: Run tests and build**

Run: `node --test test/workflow.test.mjs && npm run build`

Expected: PASS and `dist/index.html` contains no external JS reference.

- [ ] **Step 6: Commit**

```text
git add src/workflow.mjs test/workflow.test.mjs scripts/build.mjs dist/index.html
git commit -m "feat: add inquiry workflow state machine"
```

### Task 3: 实现演示引擎、理解校正和方法推荐

**Files:**
- Create: `src/demo-engine.mjs`
- Create: `src/methods.mjs`
- Create: `test/methods.test.mjs`
- Modify: `server/contracts.ts`
- Modify: `server/fallback.ts`

**Interfaces:**
- Produces: `analyzeDemoQuestion(text)`, `correctUnderstanding(analysis, field, value)`, `recommendMethods(analysis, timeBudget)`, `createSocraticRun(analysis, mode)`, `answerSocraticTurn(run, answer)`.
- Analysis fields: `observation`, `currentExplanation`, `unknowns[]`, `toneHypothesis`, `confidence`, `alternativeExplanations[]`.
- Method recommendation fields: `id`, `name`, `reason`, `minutes`, `expectedOutputs[]`, `questionsCount`, `mode`.

- [ ] **Step 1: Write failing tests for the golden demo question**

Assert the question “公司最近增长慢，是不是团队执行力不行？” separates observation from attribution, recommends Socratic clarification first, and offers a short four-question mode for an 8-minute budget.

- [ ] **Step 2: Run test and confirm failure**

Run: `node --test test/methods.test.mjs`

Expected: FAIL due to missing modules.

- [ ] **Step 3: Implement deterministic demo analysis and method protocol**

The engine must mark all generated claims `source: 'demo'` and never use wording such as “文献证明”. For non-golden questions, use generic but honest structures derived from the submitted text.

- [ ] **Step 4: Align the server contract**

Extend Zod output without breaking existing inquiry fields. New fields remain optional for DeepSeek until its prompt is upgraded.

- [ ] **Step 5: Run frontend and server tests**

Run: `node --test test/methods.test.mjs && npm run test:server`

Expected: PASS.

- [ ] **Step 6: Commit**

```text
git add src/demo-engine.mjs src/methods.mjs test/methods.test.mjs server/contracts.ts server/fallback.ts
git commit -m "feat: add guided thinking demo engine"
```

### Task 4: 重建主工作台 UI 并接入 UC-01 至 UC-05

**Files:**
- Modify: `src/index.template.html`
- Modify: `src/styles.css`
- Modify: `src/app.mjs`
- Modify: `src/galaxy.mjs`
- Modify: `test/build.test.mjs`
- Modify: `test/quality.test.mjs`

**Interfaces:**
- Consumes: workflow, demo analysis, method recommendation, Socratic run, inquiry SSE.
- Produces visible states: `capture`, `understand`, `method`, `explore` and their loading/error/paused sub-states.

- [ ] **Step 1: Write failing semantic UI contract tests**

Assert the HTML includes stage tracker, original-question card, understanding corrections, one primary CTA container, method recommendation, turn progress, right-side outputs, save status, and mode badge.

- [ ] **Step 2: Run target tests and confirm failure**

Run: `node --test test/build.test.mjs test/quality.test.mjs`

Expected: FAIL for new required IDs and stage semantics.

- [ ] **Step 3: Replace the POC three-step copy with six-stage shell**

Implement stable regions `problem-map`, `active-task`, `session-yield`, `stage-track`, and `workspace-status`. Keep original question visible at every later stage.

- [ ] **Step 4: Implement capture and understanding correction**

Show four compact understanding rows. Each row supports accept/edit. After two rejected inferences, replace automatic inference with the open prompt required by UC-02.

- [ ] **Step 5: Implement method selection and Socratic turns**

Show one primary recommendation, a collapsed alternative, time-budget switch, one question per turn, pause/skip/rephrase, and a four-block exercise summary.

- [ ] **Step 6: Map real runtime status to galaxy motion**

Use `analyzing`, `practicing`, `branching`, `ready`, and `error`; do not animate fake percentage progress.

- [ ] **Step 7: Implement responsive and accessible states**

At 390px use one column and drawers; ensure focus moves to the new stage heading, ARIA live announces service status, and reduced motion disables transforms.

- [ ] **Step 8: Run frontend tests and build**

Run: `npm run test:frontend && npm run build`

Expected: PASS; distribution remains exactly one HTML artifact.

- [ ] **Step 9: Commit**

```text
git add src/index.template.html src/styles.css src/app.mjs src/galaxy.mjs test/build.test.mjs test/quality.test.mjs dist/index.html
git commit -m "feat: build guided inquiry workspace"
```

### Task 5: 实现问题簇、主线选择和研究问题锻造

**Files:**
- Create: `src/research-forge.mjs`
- Create: `test/research-forge.test.mjs`
- Modify: `src/app.mjs`
- Modify: `src/index.template.html`
- Modify: `src/styles.css`

**Interfaces:**
- Produces: `buildProblemCluster(methodRun)`, `mergeQuestionNodes(cluster, ids)`, `selectMainline(cluster, id, reason)`, `proposeConstructs(cluster)`, `buildResearchQuestionCandidates(model)`.
- Candidate traditions: `relationship`, `mechanism`, `process`.

- [ ] **Step 1: Write failing domain tests**

Assert the golden path produces observation, cause, mechanism, boundary and evidence-gap nodes; merging is reversible; unselected branches remain; candidates include relationship and process formulations.

- [ ] **Step 2: Run test and confirm failure**

Run: `node --test test/research-forge.test.mjs`

Expected: FAIL due to missing module.

- [ ] **Step 3: Implement immutable cluster and forge functions**

Every node includes `id`, `kind`, `text`, `source`, `status`; every edge includes `from`, `to`, `relation`, `confidence`. Construct proposals start as `evidenceStatus: 'unverified'`.

- [ ] **Step 4: Build list-first problem map UI**

Implement accessible grouped lists as the functional base, enhanced with visual node positioning on wider screens. Auto-merge suggestions require explicit confirmation.

- [ ] **Step 5: Build research forge UI**

Keep business wording above construct candidates; expose analysis unit, context, relation type and research tradition. If process is selected, hide IV/DV slots and show stages/mechanisms/turning points.

- [ ] **Step 6: Run tests and build**

Run: `node --test test/research-forge.test.mjs && npm run test:frontend && npm run build`

Expected: PASS.

- [ ] **Step 7: Commit**

```text
git add src/research-forge.mjs test/research-forge.test.mjs src/app.mjs src/index.template.html src/styles.css dist/index.html
git commit -m "feat: add problem cluster and research forge"
```

### Task 6: 实现可诚实演示的证据室

**Files:**
- Create: `src/evidence.mjs`
- Create: `test/evidence.test.mjs`
- Modify: `src/app.mjs`
- Modify: `src/index.template.html`
- Modify: `src/styles.css`

**Interfaces:**
- Produces: `buildDemoSearchPlan(model)`, `searchDemoEvidence(plan)`, `attachEvidence(model, claimId, sourceId)`, `reviseConstruct(model, proposal)`.
- Evidence fields: `title`, `authors`, `year`, `doiOrUrl`, `sourceType`, `accessDepth`, `relation`, `verificationStatus`, `demoDisclosure`.

- [ ] **Step 1: Write failing evidence integrity tests**

Assert every source has a URL/DOI, every verified claim points to a source, metadata-only sources cannot produce a verified quotation, and no-result copy says “未检索到” rather than “没有研究”.

- [ ] **Step 2: Run test and confirm failure**

Run: `node --test test/evidence.test.mjs`

Expected: FAIL due to missing module.

- [ ] **Step 3: Implement a small curated demo source set**

Use only sources already cited in PRD v3.1 and label the panel “预置演示证据，不是本轮实时联网结果”.

- [ ] **Step 4: Build evidence-room states**

Implement query preview, source cards, access-depth badges, support/conflict/background buckets, missing-fulltext state, and a revision diff before applying a terminology change.

- [ ] **Step 5: Run tests and build**

Run: `node --test test/evidence.test.mjs && npm run test:frontend && npm run build`

Expected: PASS.

- [ ] **Step 6: Commit**

```text
git add src/evidence.mjs test/evidence.test.mjs src/app.mjs src/index.template.html src/styles.css dist/index.html
git commit -m "feat: add transparent evidence room demo"
```

### Task 7: 成果包、会话恢复与黄金路径测试

**Files:**
- Create: `src/artifacts.mjs`
- Create: `test/golden-path.test.mjs`
- Modify: `src/core.mjs`
- Modify: `src/app.mjs`
- Modify: `src/index.template.html`
- Modify: `src/styles.css`
- Modify: `test/session.test.mjs`

**Interfaces:**
- Produces: `buildResearchBrief(workflow)`, `buildDecisionHypothesisCard(workflow)`, `serializeObsidianBundle(workflow)`, `buildResumeSummary(workflow)`.

- [ ] **Step 1: Write the failing full golden-path test**

The test executes UC-01 through UC-09 via domain functions and asserts: original wording retained, correction recorded, method completed, mainline selected, RQ candidate accepted, evidence status visible, artifact contains unresolved items and provenance.

- [ ] **Step 2: Run test and confirm failure**

Run: `node --test test/golden-path.test.mjs`

Expected: FAIL because artifacts and resume contracts are incomplete.

- [ ] **Step 3: Implement versioned artifacts**

Artifact bundle includes original question, evolution, mainline, constructs, research question, evidence table, unresolved items, next data actions, generated time, engine mode and schema version.

- [ ] **Step 4: Migrate local session schema safely**

Read schema v1 and upgrade to v2 without deleting the user record. Corrupt data shows a recoverable error and allows JSON download before reset.

- [ ] **Step 5: Build purpose-first artifact UI and resume card**

Support “继续研究 / 管理团队讨论 / 导师评审” presets. Allow export with visible incomplete markers. On resume, show original belief, latest insight, main question and one unfinished task.

- [ ] **Step 6: Run all tests**

Run: `npm test`

Expected: all frontend and server tests PASS.

- [ ] **Step 7: Commit**

```text
git add src/artifacts.mjs test/golden-path.test.mjs src/core.mjs src/app.mjs src/index.template.html src/styles.css test/session.test.mjs dist/index.html
git commit -m "feat: complete demo golden path and artifacts"
```

### Task 8: 客户演示验收、文档与发布候选

**Files:**
- Create: `docs/demo-script.md`
- Modify: `README.md`
- Modify: `package.json`
- Modify: `dist/index.html`

**Interfaces:**
- Produces: repeatable 15-minute demo, demo disclosure, startup instructions, release candidate version.

- [ ] **Step 1: Write the exact demo script**

Include the golden question, screen-by-screen clicks, expected visible outputs, recovery lines if API is unavailable, and an explicit list of “currently real / currently demonstrated / next integration”.

- [ ] **Step 2: Add a demo startup command**

Add `npm run demo` as an alias for the local server and document the displayed URL. Do not require a DeepSeek key.

- [ ] **Step 3: Run full verification**

Run: `npm run verify`

Expected: build, tests, typecheck and syntax checks PASS.

- [ ] **Step 4: Perform desktop and mobile visual checks**

Open the local server at 1440×900 and 390×844. Verify the 14 required PRD states that can be reached in the golden flow, with special attention to overflow, button hierarchy, focus, labels, loading and error copy.

- [ ] **Step 5: Correct only observed defects and re-run verification**

Run: `npm run verify`

Expected: PASS after final corrections.

- [ ] **Step 6: Version and commit the release candidate**

Set package version to the chosen demo RC, rebuild, then:

```text
git add README.md docs/demo-script.md package.json package-lock.json dist/index.html src test server
git commit -m "release: prepare entrepreneur research workbench demo"
```

- [ ] **Step 7: Archive/publish only with authorization**

Before pushing to GitHub or deploying a public URL, inspect the configured remote and repository separation. Push only after the target repository and authorization are confirmed; never mix `fitdice-codex-starter` assets or history into this repository.

---

## Milestone Exit Criteria

The product is ready for a potential-customer demonstration only when all are true:

- A new user can complete the golden path without terminal access or manual data editing.
- The flow visibly answers “看见什么、操作什么、得到什么” at every stage.
- No-key mode works end to end and is visibly disclosed as demo/fallback.
- DeepSeek mode can be enabled server-side without changing frontend code.
- Original question, user corrections, AI hypotheses, construct candidates and evidence are visually distinct.
- One complete research brief and one decision hypothesis card can be exported.
- Session refresh and return preserve progress.
- Failure of model or evidence lookup never destroys user input.
- Desktop and mobile layouts have been visually inspected.
- `npm run verify` passes immediately before the demo release claim.

