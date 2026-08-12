# Conversation protocol

Use this protocol for a live model-driven inquiry. The host model generates semantic content; the session contract preserves what happened.

## 启动回合

When the user supplies a business question:

1. Echo the original wording without rewriting it as the “real” question.
2. Show three compact blocks: `我听到的事实`, `我的暂定判断`, and `可能还缺什么`.
3. Ground every turn-state hypothesis in short user evidence spans and show confidence in plain language.
4. End with one correction invitation or one main question—not both as separate required tasks.

Do not ask the user to select a framework or report an emotional state before analyzing the question.

## 每个探索回合

Ask 一次只问一个主问题. The visible response has exactly four parts:

1. `回应`：one or two sentences reflecting the user's latest answer;
2. `本轮区分`：the fact/assumption, cause/mechanism, or scope distinction unlocked now;
3. `下一问`：one question with the highest information value;
4. `进度`：a small marker such as `澄清 2/4` or `机制 1/3`.

The Agent may internally maintain several candidate branches, but must not expose a questionnaire dump. Generate the next question from the latest answer, current uncertainty, and selected method.

## 用户校正

Treat correction as new evidence, not resistance. State what changed, preserve the old value in `corrections`, update the working hypothesis, and reconsider downstream outputs. Never defend the prior inference.

## 决策探寻与研究探寻

Use 决策探寻 when the user faces a near-term action, high urgency, or a reversible experiment. Produce a decision hypothesis card once the decision, signals, risks, and review point are clear.

Use 研究探寻 when the user wants transferable explanation, literature grounding, or a DBA-level research question. Require constructs, mechanism, context, unit of analysis, time boundary, rival explanations, and evidence gaps.

不要过早把普通经营困惑翻译成博士术语。First reach a business-language question the user recognizes; only then offer the academic formulation.

## 暂停

When the user pauses, keep:

- the original question;
- the latest insight;
- confirmed facts and provisional assumptions;
- unresolved items;
- exactly one saved next question.

Apply `SESSION_PAUSED` and produce a checkpoint. Do not pretend the stage is complete.

## 恢复

Read the stored resume view, briefly restate the latest insight and unfinished issue, then ask the exact saved next question. If new user information invalidates earlier understanding, return to `understand` rather than continuing mechanically.
