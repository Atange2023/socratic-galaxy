import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSearchBrief,
  buildConceptVerificationCard,
  buildObsidianNote,
} from '../skills/socratic-business-inquiry/scripts/research-core.mjs';

test('buildSearchBrief returns a structured search plan with constructs, queries and boundaries', () => {
  const plan = buildSearchBrief('为什么我们的战略落地越来越慢？', {
    constructs: ['战略落地', '跨部门协同'],
    boundaryNote: '不检索人格/心理诊断',
  });
  assert.equal(plan.question, '为什么我们的战略落地越来越慢？');
  assert.deepEqual(plan.baselineConstructs, ['战略落地', '跨部门协同']);
  assert.ok(Array.isArray(plan.queries) && plan.queries.length >= 1);
  const query = plan.queries[0];
  assert.equal(typeof query.text, 'string');
  assert.ok(['definition', 'rival', 'measure'].includes(query.purpose));
  assert.ok(['metadata', 'abstract', 'full-text'].includes(query.suggestedAccessDepth));
  assert.ok(plan.accessDepthPolicy.includes('user-provided'));
  assert.ok(plan.boundaries.some((b) => b.includes('人格')));
  assert.match(String(plan.createdAt), /^\d{4}-\d{2}-\d{2}T/);
});

test('buildSearchBrief keeps input array unchanged', () => {
  const constructs = ['战略落地'];
  const input = { constructs, boundaryNote: '近5年' };
  buildSearchBrief('问题', input);
  assert.deepEqual(constructs, ['战略落地']);
});

test('buildConceptVerificationCard separates consensus, divergence and unresolved', () => {
  const card = buildConceptVerificationCard('心理所有权', {
    consensus: ['员工对目标对象产生的“像拥有一样”的心理感知'],
    divergences: [{ view: '部分流派强调产权而非情感', sourceIds: ['ev-1'] }],
    verifiedRelations: ['与跨部门协同呈正相关的既往证据'],
    rivalExplanations: ['可能实为组织信任的中介作用'],
    unresolved: ['本土情境量表信效度未审'],
  });
  assert.equal(card.concept, '心理所有权');
  assert.ok((card.definitionConsensus || []).length >= 1);
  assert.ok((card.definitionDivergences || []).length >= 1);
  assert.equal(card.definitionDivergences[0].view, '部分流派强调产权而非情感');
  assert.equal(card.definitionDivergences[0].sourceIds[0], 'ev-1');
  assert.ok((card.unresolved || []).includes('本土情境量表信效度未审'));
  assert.match(String(card.verifiedAt), /^\d{4}-\d{2}-\d{2}T/);
});

test('buildConceptVerificationCard is safe when face data is missing', () => {
  const card = buildConceptVerificationCard('战略控制', {});
  assert.equal(card.definitionConsensus, null);
  assert.equal(card.definitionDivergences, null);
  assert.equal(card.unresolved, null);
  assert.ok(card.provisional); // 未给共识时显式标为暂定
});

test('buildObsidianNote yields YAML frontmatter, question lineage, evidence and unresolved items', () => {
  const session = {
    sessionId: 'inq-20260819000000000',
    originalQuestion: '为什么我们的战略落地越来越慢？',
    latestInsight: '需要先定义落地速度的观测口径',
    questionCluster: [{ id: 'q1', text: '落地速度如何度量', type: 'phenomenon' }],
    evidence: [{ claim: 'A', sourceTitle: 'B', accessDepth: 'abstract' }],
    unresolvedItems: ['尚未确认时间口径'],
    nextQuestion: '你用哪个可观察指标判断落地点？',
  };
  const note = buildObsidianNote(session, { engineMode: 'host-agent', createdAt: '2026-08-19T00:00:00.000Z' });
  assert.match(note, /^---\n/);
  assert.match(note, /originalQuestion:/);
  assert.match(note, /\[\[q1\]\]/);
  assert.match(note, /深度：abstract/); // accessDepth 保留英文访问深度标签
  assert.match(note, /尚未确认时间口径/);
  assert.match(note, /你用哪个可观察指标判断落地点/);
});
