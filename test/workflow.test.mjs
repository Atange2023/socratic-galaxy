import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WORKFLOW_STAGES,
  canEnterStage,
  createWorkflow,
  transitionWorkflow,
} from '../src/workflow.mjs';

const NOW = '2026-08-12T08:00:00.000Z';

test('new inquiry starts at capture and preserves the original wording', () => {
  const workflow = createWorkflow('公司最近增长慢，是不是团队执行力不行？', NOW);

  assert.deepEqual(WORKFLOW_STAGES, [
    'capture', 'understand', 'method', 'explore', 'forge', 'evidence', 'artifact',
  ]);
  assert.equal(workflow.stage, 'capture');
  assert.equal(workflow.originalQuestion, '公司最近增长慢，是不是团队执行力不行？');
  assert.equal(workflow.history[0].event, 'INQUIRY_CAPTURED');
});

test('workflow rejects stage skipping without mutating the previous value', () => {
  const workflow = createWorkflow('为什么转化率下降？', NOW);

  const result = transitionWorkflow(workflow, {
    type: 'METHOD_SELECTED',
    payload: { methodId: 'socratic' },
    at: NOW,
  });

  assert.equal(result.ok, false);
  assert.match(result.error, /understanding/i);
  assert.equal(result.value, workflow);
  assert.equal(workflow.stage, 'capture');
  assert.equal(workflow.history.length, 1);
});

test('confirmed understanding unlocks method selection', () => {
  const workflow = createWorkflow('为什么转化率下降？', NOW);
  const analyzed = transitionWorkflow(workflow, {
    type: 'ANALYSIS_RECEIVED',
    payload: { observation: '转化率下降', currentExplanation: '原因未知' },
    at: NOW,
  });
  const confirmed = transitionWorkflow(analyzed.value, {
    type: 'UNDERSTANDING_CONFIRMED',
    payload: { confirmed: true },
    at: NOW,
  });

  assert.equal(analyzed.ok, true);
  assert.equal(analyzed.value.stage, 'understand');
  assert.equal(confirmed.ok, true);
  assert.equal(confirmed.value.stage, 'method');
  assert.equal(canEnterStage(confirmed.value, 'method'), true);
});

test('going back changes the active stage but preserves completed data and history', () => {
  let workflow = createWorkflow('为什么转化率下降？', NOW);
  workflow = transitionWorkflow(workflow, {
    type: 'ANALYSIS_RECEIVED', payload: { observation: '转化率下降' }, at: NOW,
  }).value;
  workflow = transitionWorkflow(workflow, {
    type: 'UNDERSTANDING_CONFIRMED', payload: { confirmed: true }, at: NOW,
  }).value;
  workflow = transitionWorkflow(workflow, {
    type: 'METHOD_SELECTED', payload: { methodId: 'socratic' }, at: NOW,
  }).value;

  const result = transitionWorkflow(workflow, {
    type: 'GO_BACK', payload: { stage: 'understand' }, at: NOW,
  });

  assert.equal(result.ok, true);
  assert.equal(result.value.stage, 'understand');
  assert.equal(result.value.data.method.methodId, 'socratic');
  assert.equal(result.value.history.at(-1).event, 'GO_BACK');
});

test('artifact generation completes the final workflow stage', () => {
  const workflow = {
    ...createWorkflow('为什么转化率下降？', NOW),
    stage: 'evidence',
    data: {
      understanding: { confirmed: true },
      method: { methodId: 'socratic', completed: true },
      cluster: { mainlineId: 'q_main' },
      research: { acceptedQuestionId: 'rq_1' },
      evidence: { reviewed: true },
    },
  };

  const result = transitionWorkflow(workflow, {
    type: 'ARTIFACT_GENERATED', payload: { artifactId: 'artifact_1' }, at: NOW,
  });

  assert.equal(result.ok, true);
  assert.equal(result.value.stage, 'artifact');
  assert.equal(result.value.data.artifact.artifactId, 'artifact_1');
});
