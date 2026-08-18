# 问启星河 0.5-skill-research Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `socratic-business-inquiry` 从"会探寻问题"升级为"会带着证据清晰结束探寻"。0.5 为 Skill 增加确定性的**文献检索计划、概念核验卡、Obsidian 写入**三个能力契约与配套的无依赖脚本，使证据阶段（`evidence`）可复现、可校验、可被人类与未来 Standalone 消费。

**Architecture:** 与 0.4 相同——宿主 Agent 负责语义分析（构造检索词、判断概念共识、决定是否需要写出），新增的确定性子流程由无依赖 Node 脚本承担，保证输出字段稳定、契约可自动验证。不引入联网连接器与第三方运行时依赖；真实检索仍由宿主工具完成，脚本只把结果规整成会话契约。

**Tech Stack:** Markdown Agent Skill、Node.js ESM、built-in `node:test`、JSON/Markdown 制品。

- 新文件：
  - `skills/socratic-business-inquiry/scripts/research-core.mjs` — 确定性纯函数
  - `skills/socratic-business-inquiry/scripts/research-cli.mjs` — `search-brief` / `verify-concept` / `obsidian-note` 命令
  - `test/skill-research.test.mjs` — 领域函数测试
  - `test/skill-research-cli.test.mjs` — CLI 端到端测试
- 修改：`references/research-protocol.md`、`references/output-contract.md`、`scripts/session-core.mjs`、`SKILL.md`、`docs/runtime-modes.md`、`test/skill-package.test.mjs`（可选增断言）。

## Global Constraints

- 宿主 Agent 承担全部语义分析；确定性脚本不含任何联网与"知识"，不冒充检索结果。
- 不新增运行时依赖；脚本只用 Node 内建模块。
- 保留七阶段状态机与既有事件名，0.5 只做增量扩展，不重写 0.4 已冻结路径。
- 每个证据/核验/写出均保留来源、访问深度、访问日期与授权记录。
- 未授权不写入工作区/Obsidian；越界时只打印，不落盘。
- UTF-8 文件处理；所有外部命令显式非零退出并输出人类可读错误。

---

### Task 1: Deterministic research helpers

**Files:**
- Create: `skills/socratic-business-inquiry/scripts/research-core.mjs`
- Create: `test/skill-research.test.mjs`

**Interfaces:**
- Produces: `buildSearchBrief(question, options)`、`buildConceptVerificationCard(concept, options)`、`buildObsidianNote(session, options)`。
- Consumes: 字段含义见 `references/output-contract.md`（增补后）。

- [ ] 写失败测试：`buildSearchBrief` 输出含 baseline constructs、search queries、sources plan、access-depth 标签与 limitations；`buildConceptVerificationCard` 区分 definition consensus / divergence / unresolved；`buildObsidianNote` 输出 YAML frontmatter + 问题谱系 + 证据与未解决项。
- [ ] 运行 `node --test --test-isolation=none test/skill-research.test.mjs`；期望缺模块失败。
- [ ] 实现纯函数，保留输入不可变、UTF-8、无状态。
- [ ] 运行聚焦测试并 commit。

### Task 2: Research CLI (three portable commands)

**Files:**
- Create: `skills/socratic-business-inquiry/scripts/research-cli.mjs`
- Create: `test/skill-research-cli.test.mjs`

**Interfaces:**
- Consumes: Task 1 helpers；提供命令：
  - `search-brief --question <q>`：输出检索计划 Markdown；
  - `verify-concept --concept <c>`：输出概念核验卡（合并标注共识/分歧）；
  - `obsidian-note --session <session.json>`：输出 Obsidian 兼容 Markdown；
  - 全局 `--out <file>`：仅在显式授权目录写入，否则仅打印。
- Produces stdout JSON/Markdown 与非零错误。

- [ ] 写失败测试：对临时文件断言 `search-brief` / `verify-concept` / `obsidian-note` 的正常输出与非法输入非零退出。
- [ ] 运行聚焦测试；期望缺 CLI 失败。
- [ ] 实现无依赖 CLI，不联网；`--out` 仅在路径在授权目录内时写入。
- [ ] 运行聚焦测试并 commit。

### Task 3: Contract & routing upgrade

**Files:**
- Modify: `references/research-protocol.md`、`references/output-contract.md`、`scripts/session-core.mjs`、`SKILL.md`
- Modify: `test/skill-package.test.mjs`

**Interfaces:**
- 在 output-contract 增补 `evidenceSearch`（记录）与 `evidence.item.verification`（概念核验子结构）。
- 在 session-core 新增事件 `RESEARCH_SEARCH_RECORDED` 与 `CONCEPT_VERIFIED`，保持不可变与应用顺序校验。
- 在 research-protocol 增补确定性命令/字段说明。
- 在 SKILL 的 evidence 阶段指路到新命令。

- [ ] 写失败断言：output-contract 含 `evidenceSearch` 与 `verification`；session-core 支持两个新事件且非法转移不改变输入；SKILL 提到 `research-cli.mjs` 三个命令。
- [ ] 运行 `node --test --test-isolation=none test/skill-package.test.mjs test/skill-session.test.mjs`；期望缺字段失败。
- [ ] 实施契约文本与事件。
- [ ] 运行包与会话测试并 commit。

### Task 4: Product docs & acceptance wiring

**Files:**
- Modify: `docs/runtime-modes.md`、`skills/socratic-business-inquiry/references/acceptance-scenarios.md`

**Interfaces:**
- 把 `0.4-skill-foundation` 状态标注为已进入 0.5，并在演进路线中明确 0.5 交付物。
- 为每个验收场景补"证据阶段应产出哪些检索计划/核验卡/可写出制品"的检查点，不预设模型固定答案。

- [ ] 在 runtime-modes 记录 0.5 边界与命令。
- [ ] 为至少"研究就绪问题"场景补充证据阶段的验收行。
- [ ] 运行 acceptance 测试，确认既有契约未被破坏。

### Task 5: Release regression

**Files:**
- Modify: 无（仅验证）。

- [ ] 运行 `npm run verify`（build + 全部测试 + typecheck + 脚本语法检查）全绿。
- [ ] 确认 `git status` 只含预期改动，`dist/index.html` 构建产物可回滚不提交；grep 检查无网络调用、无密钥。

## Self-review

- Spec coverage：检索计划、概念核验、Obsidian 写入、命令、事件、验收、文档、回归各自落点到 Task。
- Placeholder scan：无占位实现。
- Type consistency：新增字段/事件/文件路径与计划一致，命名复用既有 `evidence/accessDepth/provenance` 语义。
