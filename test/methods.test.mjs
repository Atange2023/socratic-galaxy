import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeDemoQuestion, correctUnderstanding } from '../src/demo-engine.mjs';
import {
  answerSocraticTurn,
  createSocraticRun,
  recommendMethods,
} from '../src/methods.mjs';

const QUESTION = '公司最近增长慢，是不是团队执行力不行？';

test('demo analysis separates observed slowdown from the execution attribution', () => {
  const analysis = analyzeDemoQuestion(QUESTION);

  assert.equal(analysis.source, 'demo');
  assert.match(analysis.observation, /增长|放缓/);
  assert.match(analysis.currentExplanation, /执行力/);
  assert.ok(analysis.unknowns.some((item) => /指标|时间/.test(item)));
  assert.ok(analysis.alternativeExplanations.length >= 3);
  assert.equal(analysis.claimStatus, 'hypothesis');
});

test('user correction replaces a field while preserving its prior value in history', () => {
  const analysis = analyzeDemoQuestion(QUESTION);
  const corrected = correctUnderstanding(
    analysis,
    'observation',
    '销售机会转化率连续两个季度下降',
    '2026-08-12T08:02:00.000Z',
  );

  assert.equal(corrected.observation, '销售机会转化率连续两个季度下降');
  assert.equal(corrected.corrections[0].field, 'observation');
  assert.equal(corrected.corrections[0].previousValue, analysis.observation);
});

test('method recommendation explains why Socratic clarification comes first', () => {
  const analysis = analyzeDemoQuestion(QUESTION);
  const recommendations = recommendMethods(analysis, 12);

  assert.equal(recommendations.primary.id, 'socratic');
  assert.match(recommendations.primary.reason, /归因|假设|澄清/);
  assert.ok(recommendations.primary.expectedOutputs.includes('待验证假设'));
  assert.ok(recommendations.alternatives.some((item) => item.id === 'five-whys'));
});

test('eight-minute budget creates a four-question Socratic run', () => {
  const analysis = analyzeDemoQuestion(QUESTION);
  const run = createSocraticRun(analysis, { timeBudget: 8 });

  assert.equal(run.mode, 'short');
  assert.equal(run.questions.length, 4);
  assert.match(run.questions[0].text, /证据|不是/);
  assert.equal(run.currentTurn, 0);
});

test('answering a Socratic turn creates evidence needs without judging the user', () => {
  const analysis = analyzeDemoQuestion(QUESTION);
  const run = createSocraticRun(analysis, { timeBudget: 8 });
  const result = answerSocraticTurn(run, '目前只是销售总监的感觉，还没有拆漏斗数据。');

  assert.equal(result.currentTurn, 1);
  assert.equal(result.answers.length, 1);
  assert.ok(result.outputs.evidenceNeeds.some((item) => /漏斗|数据/.test(item)));
  assert.doesNotMatch(result.feedback, /错误|你应该|显然/);
});

test('non-golden questions receive an honest generic demo structure', () => {
  const analysis = analyzeDemoQuestion('为什么我们招来的高级人才总是留不住？');

  assert.equal(analysis.source, 'demo');
  assert.match(analysis.disclosure, /演示|非联网/);
  assert.ok(analysis.observation.length > 0);
  assert.equal(analysis.currentExplanation, '尚未确认');
});
