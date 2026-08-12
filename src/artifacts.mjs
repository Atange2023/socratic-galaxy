function lines(items, fallback = '尚未形成') {
  return items?.length ? items.map((item) => `- ${item}`).join('\n') : `- ${fallback}`;
}

export function buildResearchBrief(context) {
  const { workflow, analysis, run, cluster, model, candidate, evidence } = context;
  const sourceIds = evidence.sources.map((item) => item.id);
  const markdown = `# 问启星河｜阶段研究简报

> 当前状态：阶段性成果；构念、关系与研究空白仍待真实文献核验。

## 我的原话

${workflow.originalQuestion}

## 问题怎样发生了变化

- 最初解释：${analysis.currentExplanation}
- 已确认现象：${analysis.observation}
- 当前主线：${cluster.nodes.find((item) => item.id === cluster.mainlineId)?.text ?? '尚未选择'}

## 研究问题候选

${candidate.text}

研究传统：${candidate.label}

证据状态：待核验

## 概念候选

${model.constructs.map((item) => `- ${item.name}（${item.role}）：来自“${item.businessWording}”；待核验`).join('\n')}

## 本轮证据缺口

${lines(run.outputs.evidenceNeeds)}

## 预置演示证据

${evidence.sources.map((source) => `- [${source.title}](${source.doiOrUrl})｜${source.accessDepth}｜${source.relation}`).join('\n')}

> 上述为预置演示来源，不是本轮实时全网检索；仅元数据来源不支持原文或因果结论。

## 下一步最小行动

- 拆分销售漏斗各阶段数据并确认下降位置。
- 核对战略变化、跨部门目标和交接时长。
- 使用实时学术检索核验构念定义、量表与既有关系。
`;
  return {
    schemaVersion: 2,
    id: `brief_${Date.now().toString(36)}`,
    title: `阶段研究简报｜${workflow.originalQuestion.replace(/[？?]+$/u, '').slice(0, 28)}`,
    markdown,
    unresolvedItems: ['核心构念定义待核验', '关系方向与因果性待核验', '数据层级与可得性待确认'],
    provenance: { workflowId: workflow.id, sourceIds, engineMode: evidence.mode },
    generatedAt: new Date().toISOString(),
  };
}

export function buildDecisionHypothesisCard(context) {
  return {
    title: '经营决策假设卡',
    hypothesis: context.analysis.currentExplanation,
    observation: context.analysis.observation,
    disconfirmingEvidence: context.run.outputs.evidenceNeeds,
    nextAction: '先用漏斗与跨部门协作数据验证，而不是直接把结果归因于团队。',
  };
}

export function serializeObsidianBundle(brief) {
  return `---\nschema_version: 2\nartifact_id: "${brief.id}"\ngenerated: "${brief.generatedAt}"\nengine_mode: "${brief.provenance.engineMode}"\ntags:\n  - 问启星河\n  - 经营研究\n  - 待核验\n---\n\n${brief.markdown}`;
}

export function buildResumeSummary(context) {
  return `你最初认为：${context.originalBelief}。\n上次发现：${context.latestInsight}。\n当前主问题：${context.mainQuestion}\n尚未完成：${context.unfinishedTask}。`;
}
