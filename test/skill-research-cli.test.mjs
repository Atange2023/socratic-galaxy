import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const run = promisify(execFile);
const cli = 'skills/socratic-business-inquiry/scripts/research-cli.mjs';

async function call(args, cwd) {
  try {
    const { stdout } = await run(process.execPath, [cli, ...args], { cwd });
    return { code: 0, stdout };
  } catch (err) {
    return { code: err.code || 1, stdout: err.stdout || '', stderr: err.stderr || '' };
  }
}

test('search-brief prints a structured plan to stdout', async () => {
  const { code, stdout } = await call(['search-brief', '--question', '为什么战略落地越来越慢？', '--constructs', '战略落地;跨部门协同'], process.cwd());
  assert.equal(code, 0);
  assert.match(stdout, /question/);
  assert.match(stdout, /baselineConstructs/);
  assert.match(stdout, /战略落地/);
});

test('search-brief rejects a missing question with non-zero exit', async () => {
  const { code, stderr } = await call(['search-brief', '--out', join(tmpdir(), 'x.json'), '--allow-dir', tmpdir()], process.cwd());
  assert.notEqual(code, 0);
  assert.match(stderr, /--question/);
});

test('verify-concept writes a card only inside the allowed directory', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'sg-cli-'));
  try {
    const out = join(dir, 'card.json');
    const inside = await call(['verify-concept', '--concept', '心理所有权', '--consensus', '员工对目标的拥有感', '--out', out, '--allow-dir', dir], process.cwd());
    assert.equal(inside.code, 0);
    const card = JSON.parse(await readFile(out, 'utf8'));
    assert.equal(card.concept, '心理所有权');
    assert.deepEqual(card.definitionConsensus, ['员工对目标的拥有感']);

    const escapeDir = await mkdtemp(join(tmpdir(), 'sg-other-'));
    const escaped = await call(['verify-concept', '--concept', 'x', '--out', join(escapeDir, 'leak.json'), '--allow-dir', dir], process.cwd());
    assert.notEqual(escaped.code, 0);
    assert.match(escaped.stderr, /outside the allowed directory/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('obsidian-note renders an Obsidian-compatible checkpoint from a session file', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'sg-note-'));
  try {
    const sessionPath = join(dir, 'session.json');
    await writeFile(sessionPath, JSON.stringify({
      sessionId: 'inq-test',
      originalQuestion: '为什么战略落地越来越慢？',
      latestInsight: '先定义口径',
      questionCluster: [{ id: 'q1', text: '如何度量', type: 'phenomenon' }],
      evidence: [{ claim: 'A', sourceTitle: 'B', accessDepth: 'abstract' }],
      unresolvedItems: ['口径未定'],
      nextQuestion: '用哪个指标？',
    }), 'utf8');
    const { code, stdout } = await call(['obsidian-note', '--session', sessionPath], process.cwd());
    assert.equal(code, 0);
    assert.match(stdout, /^---/);
    assert.match(stdout, /originalQuestion:/);
    assert.match(stdout, /\[\[q1\]\]/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('obsidian-note rejects a malformed session file', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'sg-bad-'));
  try {
    const bad = join(dir, 'bad.json');
    await writeFile(bad, 'not json', 'utf8');
    const { code, stderr } = await call(['obsidian-note', '--session', bad], process.cwd());
    assert.notEqual(code, 0);
    assert.match(String(stderr), /Unexpected token|invalid|JSON/i);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
