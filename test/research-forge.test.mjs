import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildProblemCluster,
  buildResearchQuestionCandidates,
  mergeQuestionNodes,
  proposeConstructs,
  selectMainline,
} from '../src/research-forge.mjs';

const analysis = {
  originalQuestion: '公司最近增长慢，是不是团队执行力不行？',
  observation: '销售机会转化率连续两个季度下降',
  currentExplanation: '团队执行力可能不足',
  alternativeExplanations: ['线索质量下降', '客户预算收缩', '战略重点变化', '销售与产品交接变慢'],
};

const methodRun = {
  outputs: { evidenceNeeds: ['拆分销售漏斗各阶段数据', '核对战略调整和部门目标变化'] },
  answers: [{ answer: '销售和产品的目标没有完全对齐。' }],
};

test('problem cluster preserves the phenomenon and creates typed research branches', () => {
  const cluster = buildProblemCluster(analysis, methodRun);

  assert.ok(cluster.nodes.some((node) => node.kind === 'phenomenon'));
  assert.ok(cluster.nodes.some((node) => node.kind === 'cause'));
  assert.ok(cluster.nodes.some((node) => node.kind === 'mechanism'));
  assert.ok(cluster.nodes.some((node) => node.kind === 'boundary'));
  assert.ok(cluster.nodes.some((node) => node.kind === 'evidence-gap'));
  assert.ok(cluster.edges.every((edge) => edge.from && edge.to && edge.relation));
});

test('merge suggestion keeps source nodes and can be reversed', () => {
  const cluster = buildProblemCluster(analysis, methodRun);
  const causes = cluster.nodes.filter((node) => node.kind === 'cause').slice(0, 2);
  const merged = mergeQuestionNodes(cluster, causes.map((node) => node.id), '外部获客环境变化');

  assert.equal(merged.nodes.find((node) => node.id === causes[0].id).status, 'merged');
  assert.equal(merged.nodes.find((node) => node.id === causes[1].id).status, 'merged');
  assert.ok(merged.history.at(-1).inverse);
  assert.ok(merged.nodes.some((node) => node.text === '外部获客环境变化'));
});

test('selecting a mainline retains all other branches', () => {
  const cluster = buildProblemCluster(analysis, methodRun);
  const mechanism = cluster.nodes.find((node) => node.kind === 'mechanism');
  const selected = selectMainline(cluster, mechanism.id, '最接近当前可控的跨部门问题');

  assert.equal(selected.mainlineId, mechanism.id);
  assert.equal(selected.nodes.length, cluster.nodes.length);
  assert.equal(selected.selectionReason, '最接近当前可控的跨部门问题');
});

test('construct proposals remain unverified and map back to business wording', () => {
  const cluster = buildProblemCluster(analysis, methodRun);
  const mechanism = cluster.nodes.find((node) => node.kind === 'mechanism');
  const selected = selectMainline(cluster, mechanism.id, '研究组织机制');
  const model = proposeConstructs(selected);

  assert.ok(model.constructs.every((item) => item.evidenceStatus === 'unverified'));
  assert.ok(model.constructs.every((item) => item.businessWording));
  assert.equal(model.unitOfAnalysis, '业务单元');
});

test('research forge offers relationship and process formulations', () => {
  const cluster = buildProblemCluster(analysis, methodRun);
  const selected = selectMainline(cluster, cluster.nodes.find((node) => node.kind === 'mechanism').id, '研究组织机制');
  const candidates = buildResearchQuestionCandidates(proposeConstructs(selected));

  assert.ok(candidates.some((item) => item.tradition === 'relationship'));
  assert.ok(candidates.some((item) => item.tradition === 'process'));
  assert.ok(candidates.every((item) => item.evidenceStatus === 'unverified'));
});
