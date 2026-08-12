function node(id, kind, text, source = 'demo') {
  return { id, kind, text, source, status: 'active', confidence: source === 'user' ? 1 : 0.68 };
}

function edge(from, to, relation, confidence = 0.65) {
  return { from, to, relation, confidence };
}

export function buildProblemCluster(analysis, methodRun) {
  const nodes = [
    node('phenomenon_1', 'phenomenon', analysis.observation, 'user'),
    node('cause_1', 'cause', analysis.currentExplanation),
    ...analysis.alternativeExplanations.map((text, index) => node(`cause_${index + 2}`, 'cause', text)),
    node('mechanism_1', 'mechanism', '跨部门目标一致性可能影响销售机会推进'),
    node('boundary_1', 'boundary', '不同市场环境与业务阶段下关系可能不同'),
    ...methodRun.outputs.evidenceNeeds.map((text, index) => node(`gap_${index + 1}`, 'evidence-gap', text, 'user')),
  ];
  const edges = [
    edge('cause_1', 'phenomenon_1', '可能导致'),
    ...analysis.alternativeExplanations.map((_text, index) => edge(`cause_${index + 2}`, 'phenomenon_1', '替代解释')),
    edge('mechanism_1', 'phenomenon_1', '可能影响'),
    edge('boundary_1', 'mechanism_1', '限制条件'),
    ...methodRun.outputs.evidenceNeeds.map((_text, index) => edge(`gap_${index + 1}`, 'phenomenon_1', '需要证据')),
  ];
  return { id: `cluster_${Date.now().toString(36)}`, nodes, edges, mainlineId: null, selectionReason: '', history: [] };
}

export function mergeQuestionNodes(cluster, ids, text) {
  if (!Array.isArray(ids) || ids.length < 2) throw new Error('至少选择两个节点合并。');
  const selected = cluster.nodes.filter((item) => ids.includes(item.id));
  if (selected.length !== ids.length) throw new Error('合并节点不存在。');
  const mergedId = `merged_${cluster.history.length + 1}`;
  return {
    ...cluster,
    nodes: [
      ...cluster.nodes.map((item) => ids.includes(item.id) ? { ...item, status: 'merged', mergedInto: mergedId } : item),
      node(mergedId, selected[0].kind, text, 'user'),
    ],
    history: [...cluster.history, {
      type: 'nodes_merged', ids, mergedId,
      inverse: { type: 'restore_nodes', ids, removeId: mergedId },
    }],
  };
}

export function selectMainline(cluster, nodeId, reason) {
  const selected = cluster.nodes.find((item) => item.id === nodeId && item.status === 'active');
  if (!selected) throw new Error('请选择仍然有效的问题节点。');
  return {
    ...cluster,
    mainlineId: nodeId,
    selectionReason: String(reason ?? '').trim(),
    history: [...cluster.history, { type: 'mainline_selected', nodeId, reason }],
  };
}

export function proposeConstructs(cluster) {
  if (!cluster.mainlineId) throw new Error('请先选择研究主线。');
  return {
    phenomenon: '成长型企业的销售机会转化率持续下降',
    unitOfAnalysis: '业务单元',
    context: '中国 B2B SaaS 成长型企业',
    constructs: [
      { id: 'strategic_clarity', role: 'antecedent', name: '管理层战略清晰度', businessWording: '战略有没有讲清楚', evidenceStatus: 'unverified' },
      { id: 'goal_alignment', role: 'mechanism', name: '跨部门目标一致性', businessWording: '销售和产品是不是各做各的', evidenceStatus: 'unverified' },
      { id: 'opportunity_conversion', role: 'outcome', name: '销售机会转化率', businessWording: '机会最终有没有签约', evidenceStatus: 'unverified' },
      { id: 'environmental_uncertainty', role: 'boundary', name: '环境不确定性', businessWording: '客户预算和市场变化有多大', evidenceStatus: 'unverified' },
    ],
    sourceClusterId: cluster.id,
  };
}

export function buildResearchQuestionCandidates(model) {
  return [
    {
      id: 'rq_relationship', tradition: 'relationship', label: '关系 / 机制型',
      text: `在${model.context}中，管理层战略清晰度如何通过跨部门目标一致性影响销售机会转化率？环境不确定性发挥什么边界作用？`,
      evidenceStatus: 'unverified',
    },
    {
      id: 'rq_process', tradition: 'process', label: '过程型',
      text: `在${model.context}中，战略意图如何在跨部门协作过程中被转译、偏移或重新对齐，并最终影响销售机会推进？`,
      evidenceStatus: 'unverified',
    },
  ];
}
