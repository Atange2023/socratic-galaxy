// research-cli: deterministic research commands for the host Agent.
// Commands: search-brief, verify-concept, obsidian-note.
// No network access, no model calls. --out writes only inside an explicitly allowed directory.
import { readFile } from 'node:fs/promises';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { buildSearchBrief, buildConceptVerificationCard, buildObsidianNote } from './research-core.mjs';

const USAGE = `Usage:
  node scripts/research-cli.mjs search-brief --question <question> [--constructs <a;b>] [--out <file>] [--allow-dir <dir>]
  node scripts/research-cli.mjs verify-concept --concept <concept> [--consensus <a;b>] [--out <file>] [--allow-dir <dir>]
  node scripts/research-cli.mjs obsidian-note --session <session.json> [--out <file>] [--allow-dir <dir>]
`;

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith('--')) continue;
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith('--')) {
      args[key.replace(/^--/, '')] = next;
      i += 1;
    } else {
      args[key.replace(/^--/, '')] = true;
    }
  }
  return args;
}

function splitList(text) {
  return String(text || '').split(';').map((s) => s.trim()).filter(Boolean);
}

function isInside(parent, child) {
  const p = resolve(parent).toLowerCase();
  const c = resolve(child).toLowerCase();
  return c === p || c.startsWith(p + '\\') || c.startsWith(p + '/');
}

function assertAllowedWrite(file, allowDir) {
  if (!file) return null; // print mode
  if (!allowDir) throw new Error('--out requires --allow-dir to guard the target directory');
  const outPath = resolve(file);
  if (!isInside(allowDir, outPath)) throw new Error('refusing to write outside the allowed directory');
  return outPath;
}

async function writeOrPrint(content, out) {
  if (out) {
    await writeFile(out, content, 'utf8');
    console.log(content);
  } else {
    process.stdout.write(content + '\n');
  }
}

async function toMarkdown(value) {
  return JSON.stringify(value, null, 2);
}

async function run(argv) {
  const [command, ...rest] = argv;
  const a = parseArgs(rest);

  switch (command) {
    case 'search-brief': {
      if (!a.question) throw new Error('--question is required');
      const plan = buildSearchBrief(a.question, { constructs: splitList(a.constructs) });
      const out = assertAllowedWrite(a.out, a['allow-dir']);
      await writeOrPrint(await toMarkdown(plan), out);
      break;
    }
    case 'verify-concept': {
      if (!a.concept) throw new Error('--concept is required');
      const card = buildConceptVerificationCard(a.concept, { consensus: splitList(a.consensus) });
      const out = assertAllowedWrite(a.out, a['allow-dir']);
      await writeOrPrint(await toMarkdown(card), out);
      break;
    }
    case 'obsidian-note': {
      if (!a.session) throw new Error('--session <session.json> is required');
      const raw = await readFile(a.session, 'utf8');
      const session = JSON.parse(raw);
      const note = buildObsidianNote(session, {});
      const out = assertAllowedWrite(a.out, a['allow-dir']);
      await writeOrPrint(note, out);
      break;
    }
    default:
      throw new Error(`unknown command: ${command}\n\n${USAGE}`);
  }
}

if (process.argv[1] && (process.argv[1].endsWith('research-cli.mjs'))) {
  run(process.argv.slice(2)).catch((err) => {
    console.error(err.message || String(err));
    process.exitCode = 1;
  });
}
