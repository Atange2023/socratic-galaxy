# Product acceptance scenarios

These are behavioral contracts for forward-testing the Skill. They define observable quality without prescribing exact model wording. 不得规定模型的固定答案；all exploration remains adaptive and 一次只问一个 main question.

## 模糊战略执行

- **用户原话：** “为什么我们的战略落地越来越慢？”
- **首回合应做到：** Preserve the phrase “越来越慢”, separate the observed slowdown from any causal attribution, infer uncertainty provisionally, and recommend 苏格拉底式探寻 before causal drilling.
- **禁止行为：** Do not assume cross-functional collaboration is the cause, ask for emotion first, or present a full questionnaire.
- **推进信号：** The user defines an observable speed measure, comparison period, affected unit, and at least one rival explanation.
- **目标成果：** A 研究简报 containing a question cluster, mechanism candidates, evidence gaps, and a business-language research question.

## 纠结关键岗位招聘

- **用户原话：** “候选人能力很强但价值观让我不放心，到底要不要招？”
- **首回合应做到：** Reflect the decision conflict, distinguish observed behavior from inferred “values”, and recommend 六顶思考帽 to separate facts, intuition, downside, upside, alternatives, and decision rules.
- **禁止行为：** Do not label the candidate's personality, decide on behalf of the user, or treat intuition as either proof or noise.
- **推进信号：** The user names role-critical behaviors, irreversible risks, available reference evidence, and a reversible validation step.
- **目标成果：** A 决策假设卡 with decision criteria, signals, risks, reversible experiment, owner, and review date.

## 封闭式 AI 投资

- **用户原话：** “我们是否应该全面投入 AI？”
- **首回合应做到：** Open the closed question into WHAT counts as “全面投入”, WHY now, HOW value would be created, and what EVIDENCE would change the decision. Ask only the highest-value first question.
- **禁止行为：** Do not answer yes/no, give generic AI trends, or equate technology adoption with business value.
- **推进信号：** The user defines target workflow, expected outcome, constraints, counterfactual, and evidence threshold.
- **目标成果：** A staged investment decision hypothesis plus a researchable mechanism question when deeper study is warranted.

## 紧急经营决策

- **用户原话：** “现金只够三个月，我今天必须决定砍产品还是砍销售。”
- **首回合应做到：** Acknowledge urgency, identify the decision deadline and minimum critical facts, and switch to 决策探寻 rather than forcing a long research journey.
- **禁止行为：** Do not delay with a full method menu, promise certainty, or hide missing data.
- **推进信号：** The user identifies survival constraint, leading indicators, downside asymmetry, and the smallest 可逆实验 or staged action possible.
- **目标成果：** A 决策假设卡 with immediate action, assumptions, guardrails, monitoring signals, and review time.

## 研究就绪问题

- **用户原话：** “在快速成长的专业服务企业中，创始人授权如何通过中层心理所有权影响跨部门协同？”
- **首回合应做到：** Recognize that constructs and a mechanism are already present, check definitions, unit, context, time boundary, rival explanations, and evidence status rather than restarting basic clarification.
- **禁止行为：** Do not praise it as doctoral-level without critique, invent mature scales, or treat construct names as validated definitions.
- **推进信号：** Candidate constructs map to business wording; the relationship, mediator, boundary, unit, and unresolved validity issues are explicit.
- **目标成果：** A 研究简报 supported by 权威文献 search, access-depth labels, rival theory, candidate measures, and unresolved items.

**证据阶段检查点（0.5）：** 在产出研究简报前，宿主应先经 `search-brief` 生成检索计划，对核心构念（如“心理所有权”）执行 `verify-concept` 并写入 `CONCEPT_VERIFIED`，最终用 `obsidian-note` 产出可写回知识库的 Obsidian 文件。检索计划须标注 `accessDepth` 与实际是否执行（`planned`/`executed`），未读全文不得标 `full-text`；概念涉及分歧时设置 `provisional` 并保留 `unresolved`。不得把“检索过”写成“读到全文”，也不得以单来源冒充共识。
