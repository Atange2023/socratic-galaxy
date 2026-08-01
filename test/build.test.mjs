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
  assert.doesNotMatch(html, /https?:\/\//i);
});

test('built HTML keeps working copy legible instead of using oversized headings', async () => {
  const outputPath = await build();
  const html = await readFile(outputPath, 'utf8');
  assert.match(html, /--title-max:\s*2rem/);
  assert.match(html, /line-height:\s*1\.65/);
  assert.match(html, /@media\s*\(max-width:\s*860px\)/);
  assert.match(html, /aspect-ratio:\s*16\s*\/\s*9/);
});
