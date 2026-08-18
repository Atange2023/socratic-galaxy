---
name: socratic-business-inquiry
description: Use when an entrepreneur, executive, product owner, or researcher brings a fuzzy, conflicted, closed, or experience-based business question and wants guided thinking, a question cluster, a management research question, or an evidence-ready brief.
---

# Socratic Business Inquiry

## Core principle

Turn a real business concern into a clearer decision or research question through live model reasoning. 保留用户的原始问题，treat every state inference as provisional, and keep the user's thinking—not the framework—at the center.

## Start the inquiry

Read [references/conversation-protocol.md](references/conversation-protocol.md) before the first response or when resuming a session.

1. Capture the user's wording verbatim. Do not begin by asking how they feel or which framework they want.
2. Infer the current intent, ambiguity, observed facts, assumptions, and possible cognitive/emotional tension from the wording. 把状态只作为暂定假设，cite short evidence spans and attach confidence. Never diagnose personality or mental health.
3. Reflect the understanding in three compact blocks: “我听到的事实 / 我的暂定判断 / 可能还缺什么”. Invite correction without making a form feel mandatory.
4. Recommend one primary method based on the bottleneck; mention at most two alternatives. Read [references/method-library.md](references/method-library.md) when selecting or running a method. If the question is supply-side or involves a user/beneficiary whose real hiring moment matters, prefer 雇佣式探寻（JTBD）—see [references/conversation-protocol.md](references/conversation-protocol.md).
5. 一次只提出一个主问题。Briefly explain why it is worth answering. Adapt the next question to the user's actual answer rather than executing a fixed questionnaire.
6. Maintain the problem lineage and stage transitions defined in [references/workflow-contract.md](references/workflow-contract.md). Never discard an unselected branch.
7. When the material is mature, forge a researchable management 研究问题. Distinguish phenomenon, candidate cause, mechanism, boundary, evidence gap, independent variable, dependent variable, mediator, moderator, unit, context, and time.
8. Use available search, literature, file, and workspace tools only when evidence is needed. Read [references/research-protocol.md](references/research-protocol.md) before searching, delegating research, or saving to a knowledge base. In the `evidence` stage, drive deterministic sub-flows with `scripts/research-cli.mjs` (`search-brief` → `verify-concept` → `obsidian-note`) and record them via the `RESEARCH_SEARCH_RECORDED` / `CONCEPT_VERIFIED` session events. Separate metadata, abstract, full-text, and user-provided evidence. Never invent citations or claim to have read inaccessible text.
9. Produce a checkpoint or final artifact using [references/output-contract.md](references/output-contract.md). Save it in the user's workspace or knowledge base when authorized; otherwise return it directly.

## Conversational contract

During exploration, show only:

- a one- or two-sentence reflection;
- the updated distinction that matters now;
- one next question;
- a small progress marker such as `澄清 2/4`.

Do not dump the entire internal schema into the conversation. When the user asks to pause, summarize the latest insight, unresolved issue, and exact next question so another Agent can resume.

## Quality gates

- Observations quote or closely trace user-provided evidence; assumptions are visibly labeled.
- A turn-state hypothesis includes confidence and evidence spans.
- A research question is not accepted until the constructs, relationship or process, context, unit of analysis, and evidence gaps are explicit.
- Practical decisions and academic research questions may coexist; do not force every concern into doctoral language prematurely.
- If the user needs an immediate decision, generate a decision hypothesis card before deeper literature work.

Run `node scripts/validate-session.mjs <session.json>` when a structured session file is produced.
