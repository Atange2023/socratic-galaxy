import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { runCli } from '../skills/socratic-business-inquiry/scripts/session-cli.mjs';

async function fixture() {
  const dir = await mkdtemp(path.join(tmpdir(), 'socratic-skill-'));
  return { dir, file: path.join(dir, 'session.json') };
}

test('create command writes a valid host-agent session without changing question whitespace', async () => {
  const { file } = await fixture();
  const question = '  我们是否应该全面投入 AI？  ';
  const output = [];
  const code = await runCli(['create', '--question', question, '--out', file], { write: (value) => output.push(value) });
  const session = JSON.parse(await readFile(file, 'utf8'));

  assert.equal(code, 0);
  assert.equal(session.originalQuestion, question);
  assert.equal(session.engineMode, 'host-agent');
  assert.match(output.join(''), /session\.json/);
});

test('validate command returns a non-zero code and useful errors for invalid provenance', async () => {
  const { file } = await fixture();
  await writeFile(file, JSON.stringify({ schemaVersion: 1, stage: 'understand', originalQuestion: '' }), 'utf8');
  const errors = [];
  const code = await runCli(['validate', file], { error: (value) => errors.push(value) });

  assert.equal(code, 1);
  assert.match(errors.join('\n'), /originalQuestion/);
});

test('resume command renders the exact saved next question', async () => {
  const { file } = await fixture();
  const session = {
    schemaVersion: 1, sessionId: 'inq-1', engineMode: 'host-agent', stage: 'explore', status: 'paused',
    originalQuestion: '为什么执行越来越慢？', understanding: null, corrections: [], method: null, turns: [],
    questionCluster: [], researchQuestion: null, evidence: [], artifacts: [], unresolvedItems: ['缺少基线'],
    nextQuestion: '你用哪个指标定义“慢”？', latestInsight: '先建立速度基线', createdAt: '2026-08-13T00:00:00.000Z',
    updatedAt: '2026-08-13T01:00:00.000Z', history: [],
  };
  await writeFile(file, JSON.stringify(session), 'utf8');
  const output = [];
  const code = await runCli(['resume', file], { write: (value) => output.push(value) });

  assert.equal(code, 0);
  assert.match(output.join('\n'), /你用哪个指标定义“慢”/);
  assert.match(output.join('\n'), /先建立速度基线/);
});

test('checkpoint command emits Obsidian-compatible Markdown with unresolved work', async () => {
  const { file } = await fixture();
  await runCli(['create', '--question', '如何提高关键岗位留任率？', '--out', file]);
  const output = [];
  const code = await runCli(['checkpoint', file], { write: (value) => output.push(value) });
  const markdown = output.join('\n');

  assert.equal(code, 0);
  assert.match(markdown, /^---\n/m);
  assert.match(markdown, /engine_mode: host-agent/);
  assert.match(markdown, /## 原始问题/);
  assert.match(markdown, /## 未解决事项/);
  assert.match(markdown, /文献检索[\s\S]*未执行/);
});

test('walkthrough command writes a complete artifact-stage session and reports its products', async () => {
  const { file } = await fixture();
  const output = [];
  const code = await runCli(['walkthrough', '--out', file], { write: (value) => output.push(value) });
  const session = JSON.parse(await readFile(file, 'utf8'));

  assert.equal(code, 0);
  assert.equal(session.stage, 'artifact');
  assert.equal(session.originalQuestion, '为什么我们的战略落地越来越慢？');
  assert.ok(session.researchQuestion && session.researchQuestion.businessWording.includes('战略落地'));
  assert.ok(session.evidenceSearch.length >= 1);
  assert.ok(session.evidence.some((e) => e.verification));
  assert.equal(session.artifacts.at(-1).type, 'research-brief');

  const text = output.join('\n');
  assert.match(text, /Walked through a full inquiry session/);
  assert.match(text, /阶段：artifact/);
  assert.match(text, /制品：research-brief/);
  assert.match(text, /研究问题：战略落地/);
});

test('walkthrough rejects a missing --out with a useful error', async () => {
  const output = [];
  const errors = [];
  const code = await runCli(['walkthrough'], { write: (v) => output.push(v), error: (v) => errors.push(v) });
  assert.notEqual(code, 0);
  assert.match(errors.join('\n'), /walkthrough requires --out/);
});
