import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { validateSession } from './session-core.mjs';

export { validateSession } from './session-core.mjs';

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
