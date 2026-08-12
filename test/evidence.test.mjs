import test from 'node:test';
import assert from 'node:assert/strict';
import {
  attachEvidence,
  buildDemoSearchPlan,
  noResultsMessage,
  searchDemoEvidence,
} from '../src/evidence.mjs';

const model = {
  constructs: [
    { id: 'strategic_clarity', name: '管理层战略清晰度', evidenceStatus: 'unverified' },
    { id: 'goal_alignment', name: '跨部门目标一致性', evidenceStatus: 'unverified' },
  ],
};

test('demo search plan discloses that results are curated rather than live', () => {
  const plan = buildDemoSearchPlan(model);
  assert.match(plan.disclosure, /预置|非实时/);
  assert.ok(plan.queries.zh.length > 0);
  assert.ok(plan.queries.en.length > 0);
});

test('every demo source has a verifiable URL and explicit access depth', () => {
  const results = searchDemoEvidence(buildDemoSearchPlan(model));
  assert.ok(results.sources.length >= 3);
  for (const source of results.sources) {
    assert.match(source.doiOrUrl, /^https:\/\//);
    assert.ok(['metadata', 'abstract', 'fulltext'].includes(source.accessDepth));
    assert.equal(source.demoDisclosure, true);
  }
});

test('metadata-only source cannot verify a quotation claim', () => {
  const results = searchDemoEvidence(buildDemoSearchPlan(model));
  const metadata = results.sources.find((source) => source.accessDepth === 'metadata');
  assert.throws(() => attachEvidence({ claims: [] }, {
    id: 'claim_1', text: '这是原文定义', kind: 'quotation',
  }, metadata), /全文|摘要|元数据/);
});

test('verified claim retains source provenance', () => {
  const results = searchDemoEvidence(buildDemoSearchPlan(model));
  const fulltext = results.sources.find((source) => source.accessDepth === 'fulltext');
  const state = attachEvidence({ claims: [] }, {
    id: 'claim_2', text: '管理研究需要明确构念、关系和机制', kind: 'synthesis',
  }, fulltext);
  assert.equal(state.claims[0].verificationStatus, 'verified');
  assert.equal(state.claims[0].sourceId, fulltext.id);
});

test('empty search copy does not claim that research does not exist', () => {
  const message = noResultsMessage('goal alignment AND opportunity conversion');
  assert.match(message, /未检索到/);
  assert.doesNotMatch(message, /没有研究|不存在研究/);
});
