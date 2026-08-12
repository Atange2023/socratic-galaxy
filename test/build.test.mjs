import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { build } from '../scripts/build.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('build produces one self-contained semantic HTML application', async () => {
  const outputPath = await build();
  assert.equal(path.relative(projectRoot, outputPath), path.join('dist', 'index.html'));
  const html = await readFile(outputPath, 'utf8');
  assert.match(html, /<!doctype html>/i);
  assert.match(html, /<main\b/);
  assert.match(html, /id="question-input"/);
  assert.match(html, /id="reduced-motion"/);
  assert.match(html, /id="artifact-panel"/);
  assert.match(html, /数据只保存在这台设备/);
  assert.match(html, /window\.__QUESTION_TERMINAL_READY__/);
  assert.doesNotMatch(html, /<script[^>]+src=/i);
  assert.doesNotMatch(html, /<link[^>]+rel=["']stylesheet/i);
  assert.doesNotMatch(html, /<(?:script|img)[^>]+src=["']https?:\/\//i);
  assert.doesNotMatch(html, /<link[^>]+href=["']https?:\/\//i);
  assert.match(html, /打开可核验来源/);
});

test('built HTML keeps working copy legible instead of using oversized headings', async () => {
  const outputPath = await build();
  const html = await readFile(outputPath, 'utf8');
  assert.match(html, /--title-max:\s*2rem/);
  assert.match(html, /line-height:\s*1\.65/);
  assert.match(html, /@media\s*\(max-width:\s*860px\)/);
  assert.match(html, /aspect-ratio:\s*16\s*\/\s*9/);
});


test('build preserves dollar-prefixed identifiers and emits parseable JavaScript', async () => {
  const outputPath = await build();
  const html = await readFile(outputPath, 'utf8');
  const script = html.match(/<script>([\s\S]*?)<\/script>/i)?.[1] ?? '';
  assert.match(script, /const \$\$ =/);
  assert.doesNotThrow(() => new Function(script));
});

test('LLM build infers turn state instead of requiring a pre-question self report', async () => {
  const outputPath = await build();
  const html = await readFile(outputPath, 'utf8');
  assert.doesNotMatch(html, /id="self-report"/);
  assert.doesNotMatch(html, /开始前，你愿意描述此刻的状态吗/);
  assert.match(html, /id="inference-summary"/);
  assert.match(html, /requestInquiry\(/);
  assert.match(html, /canUseInquiryApi\(/);
});

test('workbench exposes the six-stage UX shell and guided inquiry controls', async () => {
  const outputPath = await build();
  const html = await readFile(outputPath, 'utf8');
  for (const id of [
    'stage-track', 'problem-map', 'active-task', 'session-yield',
    'understanding-panel', 'method-panel', 'exercise-panel', 'primary-action',
  ]) assert.match(html, new RegExp(`id="${id}"`), `missing ${id}`);
  assert.match(html, /放下问题/);
  assert.match(html, /看清问题/);
  assert.match(html, /选择练习/);
  assert.match(html, /展开问题/);
  assert.match(html, /锻造问题/);
  assert.match(html, /核验证据/);
  assert.match(html, /我的原话/);
  assert.match(html, /AI 暂定/);
  assert.match(html, /预计.*分钟/);
});
