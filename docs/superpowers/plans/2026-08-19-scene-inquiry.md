# 问启星河 0.6-scene-inquiry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `socratic-business-inquiry` 中补上"场景换位引导"（JTBD 三问）路径，帮助用户从供给方/自我视角走进真实使用场景。项目初衷是"提问驱动工作"，但当用户初始提问水平有限、定位不清时，系统必须先打开**他方动机与使用时刻**的视角，而不是只做认知澄清。JTBD 三问是这套引导的核心方法：

1. **他们会在什么时刻想起我？**（雇佣时刻 / 场景）
2. **那一刻，他们想完成什么？**（被雇佣的任务 / 动机）
3. **如果没有我，他们会怎么办？**（真实替代 / 对手）

**Architecture:** 三问是**语义引导**——完全由宿主 Agent 依据用户真实回答动态生成，脚本不写死任何案例答案。本增量只新增一个深度化方法与对应的契约文本、节点映射、开启条件，并映射进既有七阶段状态机。**不新增状态事件、不新增运行时依赖、不破坏 0.4/0.5 已冻结契约。**

**Tech Stack:** 纯 Markdown 契约 + 包级测试。无新脚本、无新依赖。

- 新文件：`docs/superpowers/plans/2026-08-19-scene-inquiry.md`（本文件）、`test/skill-jtbd.test.mjs`。
- 修改：`references/method-library.md`、`references/conversation-protocol.md`、`references/workflow-contract.md`、`SKILL.md`、`references/acceptance-scenarios.md`、`docs/runtime-modes.md`（演进路线标注 0.6-scene-inquiry）。

## Global Constraints

- 三问由宿主 Agent 动态执行，方法库只定义"何时用、产出什么、映射到哪些问题簇节点"；不预设固定问答脚本。
- 保留"一次只问一个主问题"；JTBD 探寻同样逐问，不倾倒问卷。
- 保留"不把普通经营困惑过早译成博士术语"；三问服务于决策/行动澄清，可先于研究探寻。
- 节点映射复用完型：雇佣时刻→`boundary`（when/where）、任务→`cause`/`mechanism`、替代→`rival`、未完成任务→`evidence-gap`/`decision`；不新增节点类型。
- 不新增 stdout 命令与 runtime 依赖；仅文档与测试。

---

### Task 1: Method — 雇佣式探寻（Jobs-to-be-Done）

**Files:** `references/method-library.md`

**Interfaces:** 在方法表中加入一行 `雇佣式探寻（JTBD）`：`Use when` 的问题涉及他方动机/使用者/顾客/团队/利益相关者、或当前问题停留在供给方功能/竞品视角；`Avoid when` 用户已明确表达的是纯内部流程因果；`Expected output` 雇佣时刻、被雇佣任务、真实替代、决策/研究接口。

- [ ] 写失败断言：`test/skill-package.test.mjs` 对 method-library 只认 `苏格拉底|5-Why|六顶思考帽|曼陀罗|A4`（先用 package 断言占位，Task 4 加独立 jtbd 测试）。
- [ ] 在表格加 `雇佣式探寻（JTBD）` 行，并加一节 `JTBD 三问` 说明 `时刻→任务→替代` 逐问顺序与"只问信息价值最高的一问"。
- [ ] 运行 package 测试并 commit。

### Task 2: Routing — 何时启用三问

**Files:** `references/conversation-protocol.md`、`SKILL.md`

**Interfaces:** 在 conversation-protocol 增补"开启条件"：首回合理解暴露供给方视角、用户自述被雇方/用户/顾客、问题含"卖点/功能/竞品/转化"等词时，本轮主问改用雇佣者视角；否则维持既有拟真澄清。SKILL.md 第 4 条方法推荐处引 `雇佣式探寻`。

- [ ] 失败断言：conversation-protocol 需含 `他们会` 与 `我们` 视角切换条件与"一次只问一个"。
- [ ] 在 conversation-protocol 加 `雇佣/场景探寻` 小节；SKILL.md 方法轮循到 method-library 的 JTBD。
- [ ] 运行 package 测试并 commit。

### Task 3: Mapping — JTBD 产出 → 问题簇

**Files:** `references/workflow-contract.md`

**Interfaces:** 在 question-cluster 小节以"三问→节点"映射给 Agent 指引，让"时刻/任务/替代"落到既有节点类型，不新增类型。

- [ ] 失败断言：workflow-contract 需含 `雇佣时刻` 与 `boundary`、`替代` 与 `rival` 的映射。
- [ ] 补三行映射表。
- [ ] 运行 package 测试并 commit。

### Task 4: Acceptance — 场景验收

**Files:** `references/acceptance-scenarios.md`、`test/skill-jtbd.test.mjs`

**Interfaces:** 为"封闭式 AI 投资"与"纠结招聘"补 JTBD 验收行（先找雇佣时刻/任务/替代，再谈功能）；新增独立的 jtbd 包测试断言三问、开启条件、映射、验收行存在。

- [ ] 写 `test/skill-jtbd.test.mjs` 断言：method-library 含 `雇佣式探寻`；conversation-protocol 含三问句式与"一次只问一个"；workflow-contract 含 `雇佣时刻→boundary`、`替代→rival` 映射；acceptance-scenarios 含 JTBD 验收行。先跑：期望缺内容失败。
- [ ] 补验收场景验收行。
- [ ] 运行 jtbd 测试与全量 package 测试并 commit。

### Task 5: Release regression

**Files:** `docs/runtime-modes.md`

- [ ] 在 runtime-modes 演进路线中以一行标注 `0.6-scene-inquiry`（场景换位引导，三问方法，0.6 契约冻结前的能力增量）。
- [ ] 运行 `npm test` 与 `npm run typecheck`；确认前端 90+服务端 8 未回归（新增 jtbd 测试计入后总测试数上调）。
- [ ] 可选运行 `npm run verify`；确认 `dist/index.html` 是否因 build 变化，否则回滚不提交。
- [ ] git 提交本分支。

## Self-review

- Spec coverage：方法、路由、映射、验收、文档、回归各落到 Task。
- Placeholder scan：无占位实现；三问执行主体是宿主 Agent，文档只定义契约。
- Contract stability：不新增事件/节点类型/命令/依赖，仅深化方法；旧会话与既有测试不受影响。
