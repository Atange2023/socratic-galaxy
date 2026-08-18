import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applySessionEvent,
  buildResumeView,
  createInquirySession,
  validateSession,
} from '../skills/socratic-business-inquiry/scripts/session-core.mjs';

const originalQuestion = '  为什么我们的战略落地越来越慢？  ';
const understanding = {
  observations: ['用户观察到战略落地速度下降'],
  assumptions: ['跨部门协同可能是原因'],
  missingInformation: ['“越来越慢”的时间口径'],
  turnState: { label: '希望识别机制', confidence: 0.66, evidenceSpans: ['越来越慢'] },
};

test('createInquirySession preserves original wording and starts at capture', () => {
  const session = createInquirySession(originalQuestion, { now: '2026-08-13T00:00:00.000Z' });
  assert.equal(session.originalQuestion, originalQuestion);
  assert.equal(session.stage, 'capture');
  assert.equal(session.history[0].type, 'SESSION_CREATED');
  assert.equal(validateSession(session).ok, true);
});

test('understanding proposal and confirmation advance without mutating prior sessions', () => {
  const initial = createInquirySession(originalQuestion);
  const proposed = applySessionEvent(initial, { type: 'UNDERSTANDING_PROPOSED', payload: understanding });
  const confirmed = applySessionEvent(proposed.value, { type: 'UNDERSTANDING_CONFIRMED' });

  assert.equal(proposed.ok, true);
  assert.equal(proposed.value.stage, 'understand');
  assert.equal(confirmed.value.stage, 'method');
  assert.equal(initial.stage, 'capture');
  assert.equal(initial.understanding, null);
});

test('correction records old and new values with provenance', () => {
  const initial = createInquirySession(originalQuestion);
  const proposed = applySessionEvent(initial, { type: 'UNDERSTANDING_PROPOSED', payload: understanding }).value;
  const corrected = applySessionEvent(proposed, {
    type: 'UNDERSTANDING_CORRECTED',
    payload: { field: 'assumptions', value: ['主要是优先级频繁变化'], reason: '用户补充' },
    at: '2026-08-13T01:00:00.000Z',
  });

  assert.deepEqual(corrected.value.understanding.assumptions, ['主要是优先级频繁变化']);
  assert.deepEqual(corrected.value.corrections[0].oldValue, ['跨部门协同可能是原因']);
  assert.deepEqual(corrected.value.corrections[0].newValue, ['主要是优先级频繁变化']);
  assert.equal(corrected.value.corrections[0].reason, '用户补充');
});

test('pause requires and preserves exactly one next question for resume', () => {
  const initial = createInquirySession(originalQuestion);
  const paused = applySessionEvent(initial, {
    type: 'SESSION_PAUSED',
    payload: { latestInsight: '需要先定义落地速度', nextQuestion: '你用什么可观察指标判断战略落地变慢？' },
  });
  const view = buildResumeView(paused.value);

  assert.equal(paused.ok, true);
  assert.equal(view.nextQuestion, '你用什么可观察指标判断战略落地变慢？');
  assert.equal(view.latestInsight, '需要先定义落地速度');
  assert.equal(view.stage, 'capture');
});

test('invalid transitions return errors and preserve the input object', () => {
  const initial = createInquirySession(originalQuestion);
  const snapshot = structuredClone(initial);
  const result = applySessionEvent(initial, { type: 'METHOD_SELECTED', payload: { id: 'socratic', name: '苏格拉底式探寻' } });

  assert.equal(result.ok, false);
  assert.deepEqual(initial, snapshot);
  assert.equal(result.value, initial);
});

test('RESEARCH_SEARCH_RECORDED appends a search plan only at the evidence stage', () => {
  const initial = createInquirySession(originalQuestion);
  const proposed = applySessionEvent(initial, { type: 'UNDERSTANDING_PROPOSED', payload: understanding }).value;
  const confirmed = applySessionEvent(proposed, { type: 'UNDERSTANDING_CONFIRMED' }).value;
  const method = applySessionEvent(confirmed, { type: 'METHOD_SELECTED', payload: { id: 'socratic', name: '苏格拉底式探寻' } }).value;
  const forged = applySessionEvent(method, { type: 'RESEARCH_QUESTION_FORGED', payload: { businessWording: '战略落地速度' } }).value;

  const plan = { plan: { question: '战略落地速度如何度量', baselineConstructs: ['战略落地'] } };
  const recorded = applySessionEvent(forged, { type: 'RESEARCH_SEARCH_RECORDED', payload: plan });
  assert.equal(recorded.ok, true);
  assert.equal(recorded.value.evidenceSearch.length, 1);
  assert.equal(recorded.value.evidenceSearch[0].plan.baselineConstructs[0], '战略落地');
  assert.equal(recorded.value.stage, 'evidence');

  // search not allowed before the evidence stage
  const early = applySessionEvent(confirmed, { type: 'RESEARCH_SEARCH_RECORDED', payload: plan });
  assert.equal(early.ok, false);
});

test('CONCEPT_VERIFIED attaches verification to an existing evidence item', () => {
  const initial = createInquirySession(originalQuestion);
  const proposed = applySessionEvent(initial, { type: 'UNDERSTANDING_PROPOSED', payload: understanding }).value;
  const confirmed = applySessionEvent(proposed, { type: 'UNDERSTANDING_CONFIRMED' }).value;
  const method = applySessionEvent(confirmed, { type: 'METHOD_SELECTED', payload: { id: 'socratic', name: '苏格拉底式探寻' } }).value;
  const forged = applySessionEvent(method, { type: 'RESEARCH_QUESTION_FORGED', payload: { businessWording: '心理所有权与协同' } }).value;

  const attached = applySessionEvent(forged, { type: 'EVIDENCE_ATTACHED', payload: { claim: '心理所有权提升协同', sourceTitle: '某期刊', accessDepth: 'abstract' } });
  const idx = attached.value.evidence.length - 1;
  const verified = applySessionEvent(attached.value, {
    type: 'CONCEPT_VERIFIED',
    payload: { evidenceIndex: idx, verification: { concept: '心理所有权', definitionConsensus: ['员工对目标对象的拥有感'], provisional: false } },
  });

  assert.equal(verified.ok, true);
  assert.equal(verified.value.evidence[idx].verification.definitionConsensus[0], '员工对目标对象的拥有感');

  // out-of-range index rejected and input preserved
  const before = structuredClone(attached.value);
  const bad = applySessionEvent(attached.value, { type: 'CONCEPT_VERIFIED', payload: { evidenceIndex: 99, verification: { concept: 'x' } } });
  assert.equal(bad.ok, false);
  assert.deepEqual(attached.value, before);
});
