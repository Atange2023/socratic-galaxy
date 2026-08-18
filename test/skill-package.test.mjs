import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('skills/socratic-business-inquiry');

async function text(relativePath) {
  return readFile(path.join(root, relativePath), 'utf8');
}

test('Agent Skill package exposes a model-driven business inquiry workflow', async () => {
  await stat(path.join(root, 'SKILL.md'));
  const skill = await text('SKILL.md');

  assert.match(skill, /^---\s*\nname: socratic-business-inquiry/m);
  assert.match(skill, /保留用户的原始问题/);
  assert.match(skill, /状态.*暂定|暂定.*状态/);
  assert.match(skill, /一次只提出一个主问题/);
  assert.match(skill, /研究问题/);
  assert.doesNotMatch(skill, /预置演示|固定答案|确定性示例/);
});

test('Agent Skill defines reusable workflow, method, and artifact contracts', async () => {
  const [workflow, methods, output] = await Promise.all([
    text('references/workflow-contract.md'),
    text('references/method-library.md'),
    text('references/output-contract.md'),
  ]);

  for (const stage of ['capture', 'understand', 'method', 'explore', 'forge', 'evidence', 'artifact']) {
    assert.match(workflow, new RegExp(`\\b${stage}\\b`));
  }
  for (const method of ['苏格拉底', '5-Why', '六顶思考帽', '曼陀罗', 'A4']) {
    assert.match(methods, new RegExp(method));
  }
  for (const field of ['originalQuestion', 'questionCluster', 'researchQuestion', 'evidence', 'unresolvedItems']) {
    assert.match(output, new RegExp(field));
  }
});

test('Agent Skill defines live conversation, correction, pause, and host-tool boundaries', async () => {
  const [skill, conversation, research] = await Promise.all([
    text('SKILL.md'),
    text('references/conversation-protocol.md'),
    text('references/research-protocol.md'),
  ]);

  assert.match(skill, /conversation-protocol\.md/);
  assert.match(skill, /research-protocol\.md/);
  assert.match(conversation, /启动回合/);
  assert.match(conversation, /一次只[^\n]*一个[^\n]*问题/);
  assert.match(conversation, /用户校正/);
  assert.match(conversation, /暂停/);
  assert.match(conversation, /恢复/);
  assert.match(conversation, /决策探寻/);
  assert.match(conversation, /研究探寻/);
  assert.match(research, /metadata/);
  assert.match(research, /abstract/);
  assert.match(research, /full-text/);
  assert.match(research, /授权/);
  assert.match(research, /不得.*伪造|禁止.*伪造/);
  assert.match(conversation, /不要过早|不得过早/);
});

test('Skill session validator accepts a minimal intelligent session and rejects missing provenance', async () => {
  const { validateSession } = await import('../skills/socratic-business-inquiry/scripts/validate-session.mjs');
  const base = {
    schemaVersion: 1,
    stage: 'understand',
    originalQuestion: '为什么我们的战略落地越来越慢？',
    understanding: {
      observations: ['用户明确提到战略落地速度下降'],
      assumptions: ['可能与跨部门协同有关'],
      turnState: { label: '有困惑且希望找到机制', confidence: 0.65, evidenceSpans: ['越来越慢'] },
    },
    questionCluster: [],
    researchQuestion: null,
    evidence: [],
    unresolvedItems: ['尚未确认速度下降的观测口径'],
  };

  assert.equal(validateSession(base).ok, true);
  assert.equal(validateSession({ ...base, originalQuestion: '' }).ok, false);
  assert.equal(validateSession({ ...base, understanding: { ...base.understanding, turnState: { label: '焦虑', confidence: 0.9, evidenceSpans: [] } } }).ok, false);
});

test('Agent Skill defines deterministic research sub-flows (search, verify, obsidian)', async () => {
  const [research, output, skill] = await Promise.all([
    text('references/research-protocol.md'),
    text('references/output-contract.md'),
    text('SKILL.md'),
  ]);

  for (const cmd of ['search-brief', 'verify-concept', 'obsidian-note']) {
    assert.match(research, new RegExp(cmd));
    assert.match(output, new RegExp(cmd));
  }
  assert.match(research, /research-cli\.mjs/);
  assert.match(output, /evidenceSearch/);
  assert.match(output, /verification/);
  assert.match(skill, /research-cli\.mjs/);
  assert.match(research, /RESEARCH_SEARCH_RECORDED|CONCEPT_VERIFIED/);
});
