import test from 'node:test';
import assert from 'node:assert/strict';
import { executeWalkthrough } from '../skills/socratic-business-inquiry/scripts/session-core.mjs';

test('executeWalkthrough runs one full case from capture to artifact in one go', () => {
  const session = executeWalkthrough();
  assert.equal(session.stage, 'artifact');
  assert.equal(session.originalQuestion, '为什么我们的战略落地越来越慢？');

  // 事件链完整覆盖七个阶段
  const types = session.history.map((h) => h.type);
  for (const t of ['UNDERSTANDING_PROPOSED', 'UNDERSTANDING_CONFIRMED', 'METHOD_SELECTED', 'RESEARCH_QUESTION_FORGED', 'ARTIFACT_RECORDED']) {
    assert.ok(types.includes(t));
  }
  assert.ok(types.includes('TURN_RECORDED'), '探索阶段须有 TURN_RECORDED');
  assert.ok(types.includes('RESEARCH_SEARCH_RECORDED'), '证据阶段须有 RESEARCH_SEARCH_RECORDED');
  assert.ok(types.includes('CONCEPT_VERIFIED'), '证据阶段须有 CONCEPT_VERIFIED');
});

test('walkthrough yields a researchable management question with variables and bounds', () => {
  const session = executeWalkthrough();
  const rq = session.researchQuestion;
  assert.ok(rq && rq.businessWording.includes('战略落地'));
  assert.ok(rq.academicWording && rq.independentVariable && rq.dependentVariable);
  assert.ok(rq.context && rq.unitOfAnalysis && rq.timeBoundary);
  assert.ok(rq.rivalExplanations && rq.rivalExplanations.length >= 1);
  assert.ok(rq.evidenceGaps && rq.evidenceGaps.length >= 1);
});

test('walkthrough records a planned search and a verified evidence item', () => {
  const session = executeWalkthrough();
  assert.ok(session.evidenceSearch.length >= 1);
  assert.equal(session.evidenceSearch[0].status, 'planned');

  const verified = session.evidence.find((e) => e.verification);
  assert.ok(verified, '至少一条证据带 verification 概念核验');
  assert.ok(verified.verification.definitionConsensus.length >= 1);
  // 未读全文不得标 full-text
  assert.notEqual(verified.accessDepth, 'full-text');
});

test('walkthrough produces the classic research brief artifact', () => {
  const session = executeWalkthrough();
  assert.ok(session.artifacts.length >= 1);
  assert.equal(session.artifacts.at(-1).type, 'research-brief');
  assert.ok(session.artifacts.at(-1).markdown.includes('战略落地'));
});
