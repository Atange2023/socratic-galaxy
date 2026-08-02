import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  createParticleField,
  getGalaxyStateProfile,
  sampleParticle,
} from '../src/galaxy.mjs';

test('particle field uses compact typed arrays suitable for per-frame projection', () => {
  const field = createParticleField(32, () => 0.5);
  assert.equal(field.count, 32);
  for (const key of ['radius', 'angle', 'height', 'depth', 'size', 'speed', 'hue', 'phase']) {
    assert.ok(field[key] instanceof Float32Array, `${key} must be a Float32Array`);
    assert.equal(field[key].length, 32);
  }
});

test('four galaxy states expose visibly distinct motion and spatial profiles', () => {
  const idle = getGalaxyStateProfile('idle');
  const reflecting = getGalaxyStateProfile('reflecting');
  const branching = getGalaxyStateProfile('branching');
  const ready = getGalaxyStateProfile('ready');
  assert.ok(reflecting.tilt > idle.tilt);
  assert.ok(branching.turbulence > reflecting.turbulence);
  assert.ok(branching.speed > idle.speed * 4);
  assert.ok(ready.speed < branching.speed);
  assert.notDeepEqual(idle, ready);
});

test('projected branching particle diverges from its idle position', () => {
  let cursor = 0;
  const values = [0.12, 0.83, 0.31, 0.68, 0.44, 0.91, 0.27, 0.56];
  const field = createParticleField(8, () => values[cursor++ % values.length]);
  const viewport = { width: 1200, height: 600 };
  const idle = sampleParticle(field, 3, 'idle', 1.25, viewport);
  const branching = sampleParticle(field, 3, 'branching', 1.25, viewport);
  assert.ok(Number.isFinite(branching.x) && Number.isFinite(branching.y));
  assert.ok(Math.hypot(branching.x - idle.x, branching.y - idle.y) > 8);
  assert.ok(branching.alpha > 0);
  assert.ok(branching.scale > 0);
});

test('question submission triggers a visible galaxy impact before reflection', async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const app = await readFile(path.join(root, 'src', 'app.mjs'), 'utf8');
  assert.match(app, /galaxy\.launchImpact\(1\)[\s\S]*galaxy\.setState\('reflecting'\)/);
});


test('the live canvas is explicitly stacked above the static fallback', async () => {
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
  assert.match(styles, /#galaxy-canvas\s*\{[^}]*z-index:\s*1/s);
  assert.match(styles, /\.galaxy-fallback\s*\{[^}]*z-index:\s*0/s);
  assert.match(styles, /#galaxy-canvas\s*\{[^}]*filter:\s*saturate/s);
});
