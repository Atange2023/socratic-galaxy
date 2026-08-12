import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeDemoQuestion, correctUnderstanding } from '../src/demo-engine.mjs';
import { answerSocraticTurn, createSocraticRun } from '../src/methods.mjs';
import { buildProblemCluster, buildResearchQuestionCandidates, proposeConstructs, selectMainline } from '../src/research-forge.mjs';
import { buildDemoSearchPlan, searchDemoEvidence } from '../src/evidence.mjs';
import { buildResearchBrief, buildResumeSummary, serializeObsidianBundle } from '../src/artifacts.mjs';
import { createWorkflow, transitionWorkflow } from '../src/workflow.mjs';

test('golden path retains provenance from the original question to the research brief', () => {
  const originalQuestion = '公司最近增长慢，是不是团队执行力不行？';
  let workflow = createWorkflow(originalQuestion, '2026-08-12T08:00:00.000Z');
  let analysis = analyzeDemoQuestion(originalQuestion);
  analysis = correctUnderstanding(analysis, 'observation', '销售机会转化率连续两个季度下降');
  workflow = transitionWorkflow(workflow, { type: 'ANALYSIS_RECEIVED', payload: analysis }).value;
  workflow = transitionWorkflow(workflow, { type: 'UNDERSTANDING_CONFIRMED', payload: { confirmed: true } }).value;
  workflow = transitionWorkflow(workflow, { type: 'METHOD_SELECTED', payload: { methodId: 'socratic' } }).value;

  let run = createSocraticRun(analysis, { timeBudget: 8 });
  for (const answer of ['目前只是管理层感觉，没有漏斗数据。', '执行力主要指跨部门协作。', '有的团队执行快但转化也没提升。', '客户预算收缩时可能不成立。']) {
    run = answerSocraticTurn(run, answer);
  }
  workflow = transitionWorkflow(workflow, { type: 'METHOD_COMPLETED', payload: { completed: true } }).value;
  let cluster = buildProblemCluster(analysis, run);
  cluster = selectMainline(cluster, cluster.nodes.find((item) => item.kind === 'mechanism').id, '研究组织机制');
  const model = proposeConstructs(cluster);
  const candidate = buildResearchQuestionCandidates(model)[0];
  workflow = { ...workflow, data: { ...workflow.data, cluster, research: { acceptedQuestionId: candidate.id, candidate, model } } };
  workflow = transitionWorkflow(workflow, { type: 'RESEARCH_QUESTION_CONFIRMED', payload: workflow.data.research }).value;
  const evidence = searchDemoEvidence(buildDemoSearchPlan(model));
  workflow = transitionWorkflow(workflow, { type: 'EVIDENCE_REVIEWED', payload: { reviewed: true, mode: evidence.mode } }).value;

  const brief = buildResearchBrief({ workflow, analysis, run, cluster, model, candidate, evidence });
  assert.match(brief.markdown, /公司最近增长慢/);
  assert.match(brief.markdown, /销售机会转化率连续两个季度下降/);
  assert.match(brief.markdown, /待核验/);
  assert.match(brief.markdown, /预置演示/);
  assert.ok(brief.provenance.sourceIds.length >= 3);
  assert.match(serializeObsidianBundle(brief), /schema_version: 2/);
});

test('resume summary explains the latest insight and unfinished task', () => {
  const summary = buildResumeSummary({
    originalQuestion: '公司最近增长慢，是不是团队执行力不行？',
    originalBelief: '团队执行力可能不足',
    latestInsight: '需要先拆分销售漏斗和跨部门协作数据',
    mainQuestion: '目标一致性是否影响销售机会推进？',
    unfinishedTask: '核验目标一致性的成熟定义',
  });
  assert.match(summary, /最初认为/);
  assert.match(summary, /上次发现/);
  assert.match(summary, /尚未完成/);
});
