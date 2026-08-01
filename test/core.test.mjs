import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeQuestion,
  classifyQuestion,
  buildReframes,
  buildArtifact,
  serializeMarkdown,
  serializeJson,
} from '../src/core.mjs';

test('normalizeQuestion rejects empty input instead of inventing a question', () => {
  assert.deepEqual(normalizeQuestion('   '), {
    ok: false,
    error: '先写下一个你真正想探索的问题。',
  });
});

test('normalizeQuestion preserves long input and reports the 500 character boundary', () => {
  const input = '问'.repeat(501);
  const result = normalizeQuestion(input);
  assert.equal(result.ok, false);
  assert.equal(result.error, '问题暂时超过 500 字，请先聚焦一个核心困惑。');
  assert.equal(result.value, input);
});

test('classifyQuestion recognizes a closed whether question', () => {
  assert.deepEqual(classifyQuestion('AI是否会帮助我的公司赚钱？'), {
    form: 'closed',
    cue: '是否',
    needsScope: false,
  });
});

test('classifyQuestion marks a short vague question as needing scope', () => {
  assert.deepEqual(classifyQuestion('怎么赚钱？'), {
    form: 'open',
    cue: '怎么',
    needsScope: true,
  });
});

test('buildReframes returns four distinct lenses with concrete questions', () => {
  const reframes = buildReframes('AI是否会帮助我的公司赚钱？');
  assert.deepEqual(reframes.map((item) => item.lens), ['WHAT', 'WHY', 'HOW', 'EVIDENCE']);
  assert.equal(reframes.length, 4);
  assert.match(reframes[0].text, /“赚钱”具体指什么/);
  assert.match(reframes[1].text, /为什么/);
  assert.match(reframes[2].text, /如何/);
  assert.match(reframes[3].text, /证据/);
  assert.equal(new Set(reframes.map((item) => item.text)).size, 4);
});

test('buildArtifact includes question lineage in a question brief', () => {
  const session = {
    project: { title: 'AI 与公司增长' },
    selfReport: { state: 'uncertain' },
    activeQuestionId: 'q2',
    questions: [
      { id: 'q1', parentId: null, text: 'AI是否会帮助我的公司赚钱？', lens: 'ORIGIN' },
      { id: 'q2', parentId: 'q1', text: '未来90天，AI如何降低获客成本？', lens: 'HOW' },
    ],
  };
  const artifact = buildArtifact(session, 'brief');
  assert.equal(artifact.type, 'brief');
  assert.equal(artifact.title, '问题简报｜AI 与公司增长');
  assert.match(artifact.markdown, /原始问题：AI是否会帮助我的公司赚钱/);
  assert.match(artifact.markdown, /当前主问题：未来90天，AI如何降低获客成本/);
  assert.match(artifact.markdown, /下一步最小行动/);
});

test('serializeMarkdown emits Obsidian-compatible frontmatter and wiki links', () => {
  const session = {
    project: { id: 'p1', title: '提问测试', createdAt: '2026-08-02T00:00:00.000Z', updatedAt: '2026-08-02T00:01:00.000Z' },
    selfReport: { state: 'calm' },
    activeQuestionId: 'q1',
    questions: [{ id: 'q1', parentId: null, text: '我该如何开始？', lens: 'ORIGIN', createdAt: '2026-08-02T00:00:00.000Z' }],
    artifact: { type: 'brief', title: '问题简报｜提问测试', markdown: '# 正文', updatedAt: '2026-08-02T00:01:00.000Z' },
    events: [],
    settings: { reducedMotion: false, sound: false },
  };
  const markdown = serializeMarkdown(session);
  assert.match(markdown, /^---\nschema_version: 1\n/);
  assert.match(markdown, /tags:\n  - 提问驱动/);
  assert.match(markdown, /\[\[问题简报｜提问测试\]\]/);
});

test('serializeJson returns valid versioned JSON', () => {
  const json = serializeJson({ project: { id: 'p1' }, questions: [] });
  const parsed = JSON.parse(json);
  assert.equal(parsed.schemaVersion, 1);
  assert.equal(parsed.project.id, 'p1');
});
