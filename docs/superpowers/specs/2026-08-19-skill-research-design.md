# 问启星河 Skill 检索 · 概念核验 · Obsidian 写出设计

状态：已在 `skill/0.5-skill-research` 分支设计，随本规格与其配套计划实现。
日期：2026-08-19

## 目标

0.4 已证明 Skill 能把真实经营问题带着用户一路推进到 `forge`/`evidence` 阶段。0.5 解决"证据阶段如何确定性地结束"：当用户要结论、要研究简报、要把成果写进知识库时，Agent 走一条可复现的**检索计划 → 概念核验 → 制品写出**子流程，而不是随手贴链接。

本规格不引入联网连接器（真实检索与写出仍由宿主 Agent 工具完成），只把子流程的字段、事件与命令固定下来，使人类与未来 Standalone 都能校验"检索是否发生、读到多深、哪些未解决"。

## 三个确定性子流程

### A. 检索计划（search brief）

输入：研究问题或待查概念；输出一份**计划**（含基线构念、候选检索式、来源类型期望、访问深度标注、边界）。宿主按其执行真实检索后，再把命中回填为 `evidenceSearch` 记录。

确定性函数 `buildSearchBrief(question, options)` 产出：

```js
{
  searchPlan: {
    question,
    baselineConstructs: ["战略落地速度", "跨部门协同"],
    queries: [{ text: '...', purpose: 'definition|rival|measure', suggestedAccessDepth: 'full-text|abstract|metadata' }],
    expectedSources: ["学术数据库", "权威机构报告", "同业案例"],
    accessDepthPolicy: ['metadata', 'abstract', 'full-text', 'user-provided'],
    boundaries: ["不检索人格/心理诊断", "近 5 年优先"],
    createdAt: '<ISO>',
  }
}
```

### B. 概念核验卡（concept verification card）

用于"某某概念到底指什么/学术界有没有共识"。宿主把多来源的吃透结论交给 `buildConceptVerificationCard(concept, options)` 规整为一份卡，并在会话中通过 `CONCEPT_VERIFIED` 事件挂到 `evidence` 的某条目的 `verification` 子结构：

```js
verification: {
  concept: "心理所有权",
  definitionConsensus: ["员工对目标对象产生的'像拥有一样'的心理感知"],
  definitionDivergences: [{ view: "...（不同流派）", sourceIds: ["ev-1"], note: "..." }],
  verifiedConstructRelations: ["与跨部门协同呈正相关的既往证据"],
  rivalExplanations: [...],
  unresolved: ["本土情境量表信效度未审"],
  verifiedAt: '<ISO>'
}
```

### C. Obsidian 写出（obsidian note）

`buildObsidianNote(session, options)` 把会话压缩为 Obsidian 兼容单文件：YAML frontmatter、问题谱系（wiki 链接）、证据表、未解决项、下一步。仅当用户/调用方显式授权目录才写入；否则仅打印到 stdout。

## 会话契约增量

### 新字段

- `evidenceSearch`: 数组。元素 `{ plan: <searchPlan>, executedQueries?: [...],  status: 'planned|executed|deferred', createdAt }`。
- `evidence[*].verification`: 可选对象，见上 B。

### 新事件（在 `session-core.mjs` 追加，沿用不可变/顺序校验）

- `RESEARCH_SEARCH_RECORDED`：仅 `evidence` 阶段可触发；payload 追加一条 `evidenceSearch`。
- `CONCEPT_VERIFIED`：仅 `evidence` 阶段可触发；payload 需含 `evidenceIndex`（整数）与 `verification`（对象），据此回填对应 evidence 条目。

非法状态转移一律返回错误且**不改变传入对象**，与既有事件同语义。

## 命令（无依赖 CLI）

```powershell
node scripts/research-cli.mjs search-brief --question "为什么战略落地越来越慢？"
node scripts/research-cli.mjs verify-concept --concept "心理所有权"
node scripts/research-cli.mjs obsidian-note --session inquiry-session.json
```

- 默认只打印；`--out <file>` 仅在 `<file>` 位于已授权目录（由调用方显式传入的 `--allow-dir`）内时写入，否则报错退出。
- 全程无网络调用；非零退出携带人类可读错误。

## 越界与安全

- 脚本不联网、不含密钥、不读 `.env`。
- 未经授权不写工作区/Obsidian。
- 未读全文不得标 `full-text`；未验证共识须进 `unresolved`。
- 概念核验不给人格/心理/能力评分。

## 验收

- 三个命令对合法输入输出稳定契约，对非法输入非零退出。
- `REsearchSearchRecorded`/`CONCEPT_VERIFIED` 仅 `evidence` 阶段生效且不可变。
- `evidenceSearch` 与 `evidence[*].verification` 可通过 `validate-session.mjs` 的正常路径（作为新增可选结构不影响 schemaVersion=1 校验）。
- 既有 79 项测试保持全绿，`npm run verify` 通过。
