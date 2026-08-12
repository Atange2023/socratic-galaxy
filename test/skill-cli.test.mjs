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
