import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSession,
  selectBranch,
  recordArtifact,
  saveSession,
  loadSession,
} from '../src/core.mjs';

test('createSession records the original question without inferring emotion', () => {
  const session = createSession('我是否该开始写作？', 'none', '2026-08-02T01:00:00.000Z');
  assert.equal(session.schemaVersion, 1);
  assert.equal(session.selfReport.state, 'none');
  assert.equal(session.questions[0].parentId, null);
  assert.equal(session.questions[0].lens, 'ORIGIN');
  assert.equal(session.events[0].type, 'question_submitted');
});

test('selectBranch preserves its parent and does not mutate the previous session', () => {
  const session = createSession('我是否该开始写作？', 'calm', '2026-08-02T01:00:00.000Z');
  const next = selectBranch(session, { lens: 'HOW', text: '如何用七天验证写作方向？' }, '2026-08-02T01:01:00.000Z');
  assert.equal(session.questions.length, 1);
  assert.equal(next.questions.length, 2);
  assert.equal(next.questions[1].parentId, session.activeQuestionId);
  assert.equal(next.activeQuestionId, next.questions[1].id);
  assert.equal(next.events.at(-1).type, 'branch_selected');
});

test('recordArtifact returns a new session and logs the generated type', () => {
  const session = createSession('如何开始？', 'stuck', '2026-08-02T01:00:00.000Z');
  const artifact = { type: 'brief', title: '问题简报｜如何开始', markdown: '# 内容', updatedAt: '2026-08-02T01:02:00.000Z' };
  const next = recordArtifact(session, artifact, '2026-08-02T01:02:00.000Z');
  assert.equal(session.artifact, null);
  assert.deepEqual(next.artifact, artifact);
  assert.deepEqual(next.events.at(-1).meta, { artifactType: 'brief' });
});

test('saveSession reports quota errors without throwing', () => {
  const storage = { setItem() { throw new Error('QuotaExceededError'); } };
  const result = saveSession(storage, 'poc', { project: { id: 'p1' } });
  assert.deepEqual(result, { ok: false, error: '浏览器未能保存；当前会话仍可继续并导出。' });
});

test('loadSession rejects malformed JSON as a recoverable state', () => {
  const storage = { getItem() { return '{broken'; } };
  const result = loadSession(storage, 'poc');
  assert.deepEqual(result, { ok: false, error: '本地记录已损坏，已切换为新的临时会话。' });
});

test('loadSession returns null when there is no saved session', () => {
  const storage = { getItem() { return null; } };
  assert.deepEqual(loadSession(storage, 'poc'), { ok: true, value: null });
});
