import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function inlineModule(source) {
  return source
    .replace(/^\s*import\s+[^;]+;\s*$/gm, '')
    .replace(/\bexport\s+(?=(?:async\s+)?function|class|const|let|var)/g, '');
}

export async function build() {
  const sourceRoot = path.join(projectRoot, 'src');
  const outputRoot = path.join(projectRoot, 'dist');
  const [template, styles, core, workflow, demoEngine, methods, researchForge, evidence, galaxy, inquiryClient, app] = await Promise.all([
    readFile(path.join(sourceRoot, 'index.template.html'), 'utf8'),
    readFile(path.join(sourceRoot, 'styles.css'), 'utf8'),
    readFile(path.join(sourceRoot, 'core.mjs'), 'utf8'),
    readFile(path.join(sourceRoot, 'workflow.mjs'), 'utf8'),
    readFile(path.join(sourceRoot, 'demo-engine.mjs'), 'utf8'),
    readFile(path.join(sourceRoot, 'methods.mjs'), 'utf8'),
    readFile(path.join(sourceRoot, 'research-forge.mjs'), 'utf8'),
    readFile(path.join(sourceRoot, 'evidence.mjs'), 'utf8'),
    readFile(path.join(sourceRoot, 'galaxy.mjs'), 'utf8'),
    readFile(path.join(sourceRoot, 'inquiry-client.mjs'), 'utf8'),
    readFile(path.join(sourceRoot, 'app.mjs'), 'utf8'),
  ]);
  const script = [core, workflow, demoEngine, methods, researchForge, evidence, galaxy, inquiryClient, app].map(inlineModule).join('\n\n');
  const html = template
    .replace('/*__STYLES__*/', () => styles)
    .replace('/*__SCRIPT__*/', () => script.replace(/<\/script/gi, '<\\/script'));
  const outputPath = path.join(outputRoot, 'index.html');
  await mkdir(outputRoot, { recursive: true });
  await writeFile(outputPath, html, 'utf8');
  return outputPath;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const outputPath = await build();
  console.log(outputPath);
}
