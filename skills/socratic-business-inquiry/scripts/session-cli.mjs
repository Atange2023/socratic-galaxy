import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { buildResumeView, createInquirySession, executeWalkthrough, validateSession } from './session-core.mjs';

function option(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

async function readSession(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

function yaml(value) {
  return JSON.stringify(String(value ?? ''));
}

export function serializeCheckpoint(session) {
  const validation = validateSession(session);
  if (!validation.ok) throw new TypeError(validation.errors.join('; '));
  const unresolved = session.unresolvedItems.length ? session.unresolvedItems.map((item) => `- [ ] ${item}`).join('\n') : '- [ ] 尚未记录';
  const insight = session.latestInsight || '尚未形成阶段洞察';
  const next = session.nextQuestion || '由宿主 Agent 根据当前阶段生成下一问';
  const literature = session.evidence.length ? `已记录 ${session.evidence.length} 条证据，详见会话 JSON。` : '未执行；不得把模型常识表述为已核验文献。';
  return `---\nschema_version: 1\nsession_id: ${yaml(session.sessionId)}\nengine_mode: host-agent\nstage: ${session.stage}\nupdated: ${yaml(session.updatedAt)}\ntags:\n  - 问启星河\n  - 经营问题探寻\n---\n\n# 问启星河检查点\n\n## 原始问题\n\n${session.originalQuestion}\n\n## 当前洞察\n\n${insight}\n\n## 下一问\n\n${next}\n\n## 未解决事项\n\n${unresolved}\n\n## 文献检索\n\n${literature}\n`;
}

export async function runCli(args, io = {}) {
  const write = io.write || (() => {});
  const error = io.error || (() => {});
  try {
    const [command, fileArg] = args;
    if (command === 'create') {
      const question = option(args, '--question');
      const out = option(args, '--out');
      if (!question || !out) throw new Error('create requires --question and --out');
      const session = createInquirySession(question);
      await writeFile(out, `${JSON.stringify(session, null, 2)}\n`, 'utf8');
      write(`Created ${out}`);
      return 0;
    }
    if (command === 'validate') {
      const result = validateSession(await readSession(fileArg));
      if (!result.ok) {
        error(result.errors.join('\n'));
        return 1;
      }
      write('Session contract is valid.');
      return 0;
    }
    if (command === 'walkthrough') {
      const out = option(args, '--out');
      if (!out) throw new Error('walkthrough requires --out');
      const session = executeWalkthrough();
      await writeFile(out, `${JSON.stringify(session, null, 2)}\n`, 'utf8');
      write(
        [
          `Walked through a full inquiry session -> ${out}`,
          `原始问题：${session.originalQuestion}`,
          `阶段：${session.stage}`,
          `问题簇节点：${session.questionCluster.length}`,
          `研究问题：${session.researchQuestion ? session.researchQuestion.businessWording : '(未锻造)'}`,
          `检索计划：${session.evidenceSearch.length} 条（状态 ${session.evidenceSearch[0]?.status || '-'}）`,
          `证据：${session.evidence.length} 条（含概念核验 ${session.evidence.filter((e) => e.verification).length} 条）`,
          `制品：${session.artifacts.map((a) => a.type).join(', ') || '(无)'}`,
          `未解决项：${session.unresolvedItems.length} 条`,
        ].join('\n'),
      );
      return 0;
    }
    if (command === 'resume') {
      const view = buildResumeView(await readSession(fileArg));
      write(`阶段：${view.stage}\n最新洞察：${view.latestInsight || '尚未形成'}\n下一问：${view.nextQuestion || '需要宿主 Agent 生成'}`);
      return 0;
    }
    if (command === 'checkpoint') {
      write(serializeCheckpoint(await readSession(fileArg)));
      return 0;
    }
    throw new Error('Usage: session-cli.mjs create|validate|resume|checkpoint|walkthrough');
  } catch (cause) {
    error(cause instanceof Error ? cause.message : String(cause));
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const code = await runCli(process.argv.slice(2), { write: console.log, error: console.error });
  process.exitCode = code;
}
