import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { build } from '../scripts/build.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function html() {
  return readFile(await build(), 'utf8');
}

test('all HTML ids are unique and every explicit label target exists', async () => {
  const source = await html();
  const ids = [...source.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  const labels = [...source.matchAll(/\sfor="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length, 'duplicate id found');
  for (const target of labels) assert.ok(ids.includes(target), `missing label target: ${target}`);
});

test('interactive controls declare stable types and accessible status regions', async () => {
  const source = await html();
  assert.doesNotMatch(source, /<button(?![^>]*\btype=)[^>]*>/gi);
  assert.match(source, /role="status" aria-live="polite"/);
  assert.match(source, /role="alert"/);
  assert.match(source, /<a class="skip-link"/);
  assert.equal((source.match(/<h1\b/g) ?? []).length, 1);
});

test('privacy and motion controls remain available on a 390px layout contract', async () => {
  const source = await html();
  assert.match(source, /@media \(max-width: 540px\)/);
  assert.match(source, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(source, /不上传、不跟踪/);
  assert.match(source, /本地规则验证交互闭环/);
  assert.match(source, /min-width: 320px/);
});

test('distribution contains exactly one HTML runtime artifact', async () => {
  const outputPath = await build();
  assert.equal(path.relative(root, outputPath), path.join('dist', 'index.html'));
  const source = await readFile(outputPath, 'utf8');
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /XMLHttpRequest|WebSocket|EventSource/);
});
