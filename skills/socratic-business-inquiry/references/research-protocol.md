# Research and tool-use protocol

Use host Agent tools to increase evidence quality, not to decorate an answer with links.

## Trigger research only when needed

Research when the inquiry needs a construct definition, an established relationship, rival explanations, measurement choices, boundary conditions, current facts, or source-backed recommendations. Do not browse merely because the user mentioned a familiar management concept.

## Source depth

Record one access depth for every source:

- `metadata`: title, authors, venue, year, DOI or catalog record only;
- `abstract`: abstract or official summary read;
- `full-text`: full article, chapter, report, or dataset documentation read;
- `user-provided`: content supplied by the user and inspected directly.

Metadata cannot verify a quotation, method, result, or nuanced causal claim. An abstract cannot verify details that only appear in the full text.

## Search sequence

1. Translate the business wording into candidate constructs without declaring them final.
2. Search authoritative primary sources for definitions and established models.
3. Search for rival explanations and boundary conditions, not only supporting evidence.
4. Record query, source, access depth, supporting relationship, and limitations.
5. Revise the research question when evidence contradicts the initial model.

不得伪造 citations, DOI, quotations, reading depth, search coverage, or consensus. If no suitable source is found, describe the search boundary and keep the claim unresolved.

## Deterministic research sub-flows

语义分析（检索词、概念共识、是否写出）由宿主 Agent 承担；下面的三个子流程把结果规整成稳定契约，不把"知识"写死在脚本里。命令见 `scripts/research-cli.mjs`，均在 `evidence` 阶段使用，无网络调用。

```powershell
# 检索计划：先在 forge 之后、检索之前生成
node scripts/research-cli.mjs search-brief --question "为什么战略落地越来越慢？" --constructs "战略落地;跨部门协同"
# 概念核验卡：宿主读到多来源后，把吃透结论规整为一张卡
node scripts/research-cli.mjs verify-concept --concept "心理所有权" --consensus "员工对目标对象的拥有感"
# Obsidian 写出：把会话压缩为 Obsidian 兼容单文件；仅打印（除非显式 --allow-dir + --out）
node scripts/research-cli.mjs obsidian-note --session inquiry-session.json
```

三个子流程都只打印到 stdout；脚本不写入工作区，除非调用方显式传入 `--allow-dir` 与 `--out`，且目标文件必须位于 `--allow-dir` 之内，否则脚本报错退出。宿主 Agent 决定是否调用、把哪个目录视为已授权。

### A. 检索计划（search brief）

生成 `searchPlan`（基线构念、候选检索式、来源期望、访问深度、边界），宿主按其执行真实检索，再把命中通过 `RESEARCH_SEARCH_RECORDED` 事件写入会话 `evidenceSearch`。`accessDepth` 只允许 `metadata / abstract / full-text / user-provided`；未读全文不得标 `full-text`。

### B. 概念核验卡（concept verification card）

当检索要解答"某概念指什么/有无共识"时，宿主结合多来源用 `verification` 子结构把结论固定到对应 `evidence` 条目（见 `output-contract.md`）。区分 `definitionConsensus`（共识）、`definitionDivergences`（分歧）与 `unresolved`（未解决）；无共识时必须标 `provisional: true` 并把分歧送进 `unresolved`，不得把单来源当共识。

### C. Obsidian 写出

`obsidian-note` 输出含 YAML frontmatter、问题谱系（wiki 链接）、证据表、未解决项、下一步的 Markdown。仅在用户明确授权的工作区/Obsidian 库里使用 `--allow-dir` 写入；未授权一律只打印。

## Files, knowledge bases, and Obsidian

Read user-provided files when relevant and permitted. Before writing a checkpoint, note, or research brief outside the current response, confirm that the user has明确授权 that workspace or destination. Never copy private business material to an external service merely to improve analysis. Within `evidence`, use the search-brief → concept verification → obsidian-note sub-flows above instead of ad-hoc linking.

## Multi-agent use

Delegate only bounded research tasks such as construct definitions, rival-theory search, or measurement scales. Give each worker the same source-depth and provenance rules. The coordinating Agent must reconcile contradictions and remains responsible for the final evidence table.

## Privacy and safety

Minimize the business data sent to tools. Do not transmit credentials, personal records, customer lists, confidential documents, or sensitive operational data without specific authorization. Treat emotional/cognitive inferences as provisional interaction guidance, never diagnosis.
