import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const STAGES = new Set(['capture', 'understand', 'method', 'explore', 'forge', 'evidence', 'artifact']);

export function validateSession(value) {
  const errors = [];
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ok: false, errors: ['session must be an object'] };
  if (value.schemaVersion !== 1) errors.push('schemaVersion must be 1');
  if (!STAGES.has(value.stage)) errors.push('stage is invalid');
  if (typeof value.originalQuestion !== 'string' || !value.originalQuestion.trim()) errors.push('originalQuestion is required');
  if (!Array.isArray(value.questionCluster)) errors.push('questionCluster must be an array');
  if (!Array.isArray(value.evidence)) errors.push('evidence must be an array');
  if (!Array.isArray(value.unresolvedItems)) errors.push('unresolvedItems must be an array');

  const turnState = value.understanding?.turnState;
  if (turnState) {
    if (typeof turnState.confidence !== 'number' || turnState.confidence < 0 || turnState.confidence > 1) errors.push('turnState.confidence must be between 0 and 1');
    if (!Array.isArray(turnState.evidenceSpans) || turnState.evidenceSpans.length === 0) errors.push('turnState requires evidenceSpans');
  }
  return { ok: errors.length === 0, errors };
}

async function main(file) {
  if (!file) throw new Error('Usage: node scripts/validate-session.mjs <session.json>');
  const result = validateSession(JSON.parse(await readFile(file, 'utf8')));
  if (!result.ok) {
    console.error(result.errors.join('\n'));
    process.exitCode = 1;
  } else {
    console.log('Session contract is valid.');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main(process.argv[2]);
}
