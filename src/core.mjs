const CLOSED_CUES = ['是否', '会不会', '能不能', '要不要', '是不是', '可不可以'];
const OPEN_CUES = ['什么', '为什么', '如何', '怎么', '谁', '何时', '哪里', '哪些'];

function cleanText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function stripTerminalPunctuation(value) {
  return cleanText(value).replace(/[？?。！!]+$/u, '');
}

function yamlString(value) {
  return `"${String(value ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ')}"`;
}

function activeQuestion(session) {
  return session.questions?.find((item) => item.id === session.activeQuestionId)
    ?? session.questions?.at(-1)
    ?? null;
}

function rootQuestion(session) {
  return session.questions?.find((item) => item.parentId == null)
    ?? session.questions?.[0]
    ?? null;
}

export function normalizeQuestion(text) {
  const value = cleanText(text);
  if (!value) {
    return { ok: false, error: '先写下一个你真正想探索的问题。' };
  }
  if ([...value].length > 500) {
    return {
      ok: false,
      error: '问题暂时超过 500 字，请先聚焦一个核心困惑。',
      value,
    };
  }
  const normalized = /[？?]$/u.test(value) ? value : `${value}？`;
  return { ok: true, value: normalized };
}

export function classifyQuestion(text) {
  const value = cleanText(text);
  const closedCue = CLOSED_CUES.find((cue) => value.includes(cue));
  const openCue = OPEN_CUES.find((cue) => value.includes(cue));
  return {
    form: closedCue ? 'closed' : 'open',
    cue: closedCue ?? openCue ?? '未识别',
    needsScope: [...stripTerminalPunctuation(value)].length <= 6,
  };
}

export function buildReframes(text) {
  const original = stripTerminalPunctuation(text);
  const classification = classifyQuestion(original);
  const subject = original
    .replace(new RegExp(CLOSED_CUES.join('|'), 'gu'), '')
    .replace(/^(我|我们)该/u, '')
    .trim();
  const scopeHint = classification.needsScope ? '在你最关心的一个具体场景里，' : '';

  return [
    {
      lens: 'WHAT',
      label: '先定义',
      text: original.includes('赚钱')
        ? `${scopeHint}“赚钱”具体指什么：收入增长、成本下降，还是风险降低？`
        : `${scopeHint}这里最需要先界定的核心概念和成功标准是什么？`,
      note: '把抽象词变成可以观察的标准。',
    },
    {
      lens: 'WHY',
      label: '找机制',
      text: `${scopeHint}为什么${subject || '这件事'}可能发生，又为什么可能不发生？`,
      note: '同时寻找推动因素与阻碍条件。',
    },
    {
      lens: 'HOW',
      label: '变路径',
      text: `${scopeHint}如何用一个低成本、可逆的小实验验证${subject || '这个想法'}？`,
      note: '把判断题转成可以开始的行动。',
    },
    {
      lens: 'EVIDENCE',
      label: '看证据',
      text: `${scopeHint}什么证据会支持或推翻“${original}”这一判断？`,
      note: '提前定义证据，减少只找支持材料。',
    },
  ];
}

function artifactBody(session, type) {
  const root = rootQuestion(session)?.text ?? '尚未记录';
  const current = activeQuestion(session)?.text ?? root;
  const state = session.selfReport?.state ?? 'none';
  const stateLabel = {
    calm: '平静', uncertain: '不确定', energized: '有动力', stuck: '卡住', none: '未选择',
  }[state] ?? '未选择';

  if (type === 'research') {
    return `## 研究目标\n\n围绕“${current}”形成一个可证伪的阶段性判断。\n\n## 待验证假设\n\n- 支持路径：哪些条件会让判断成立？\n- 反方路径：哪些条件会让判断不成立？\n- 边界条件：对谁、在什么时间与场景下成立？\n\n## 证据清单\n\n- [ ] 一手资料或原始数据\n- [ ] 一个支持案例\n- [ ] 一个反例或替代解释\n\n## 下一步最小行动\n\n在 25 分钟内找到一项可追溯来源，并记录它改变了什么判断。`;
  }

  if (type === 'outline') {
    return `## 文章承诺\n\n帮助读者看清“${current}”背后的定义、机制与可行动路径。\n\n## 建议结构\n\n1. 用一个真实困境引出原始问题\n2. 澄清最容易混淆的核心概念\n3. 展开支持与反对的关键机制\n4. 给出证据、反例与适用边界\n5. 提供一个今天即可开始的小实验\n\n## 仍需补齐\n\n- 目标读者最具体的情境\n- 至少两项可核查来源\n- 作者自己的差异化判断`;
  }

  return `## 本轮意图\n\n你正在把一个判断转成可以研究和行动的问题；当前自报状态：${stateLabel}。\n\n## 问题谱系\n\n- 原始问题：${root}\n- 当前主问题：${current}\n\n## 暂定边界\n\n- 对象：需要进一步明确\n- 时间范围：建议先限定在未来 30–90 天\n- 成功标准：需要用一个可观察指标表达\n\n## 下一步最小行动\n\n用一句话补全：“如果只能验证一件事，我最想先知道 ______。”`;
}

export function buildArtifact(session, type = 'brief') {
  const safeType = ['brief', 'research', 'outline'].includes(type) ? type : 'brief';
  const names = { brief: '问题简报', research: '研究计划', outline: '文章提纲' };
  const projectTitle = cleanText(session.project?.title) || stripTerminalPunctuation(rootQuestion(session)?.text) || '未命名问题';
  return {
    type: safeType,
    title: `${names[safeType]}｜${projectTitle}`,
    markdown: artifactBody(session, safeType),
    updatedAt: new Date().toISOString(),
  };
}

export function serializeMarkdown(session) {
  const project = session.project ?? {};
  const artifact = session.artifact;
  const questions = session.questions ?? [];
  const questionLines = questions.map((item, index) => `${'  '.repeat(index)}- ${item.text} _(${item.lens})_`).join('\n');
  const artifactLink = artifact ? `\n\n## 成果物\n\n[[${artifact.title}]]\n\n${artifact.markdown}` : '';
  return `---\nschema_version: 1\nproject_id: ${yamlString(project.id ?? '')}\ntitle: ${yamlString(project.title ?? '')}\ncreated: ${yamlString(project.createdAt ?? '')}\nupdated: ${yamlString(project.updatedAt ?? '')}\ntags:\n  - 提问驱动\n  - 问启星河\n---\n\n# ${project.title || '未命名问题'}\n\n## 问题谱系\n\n${questionLines || '- 尚未记录'}${artifactLink}\n`;
}

export function serializeJson(session) {
  return JSON.stringify({ schemaVersion: 1, ...session }, null, 2);
}

function idFor(prefix, iso, ordinal = 0) {
  const stamp = Number.isNaN(Date.parse(iso)) ? Date.now() : Date.parse(iso);
  return `${prefix}_${stamp.toString(36)}_${ordinal}`;
}

export function createSession(question, selfReport = 'none', now = new Date().toISOString()) {
  const normalized = normalizeQuestion(question);
  if (!normalized.ok) throw new Error(normalized.error);
  const questionId = idFor('q', now);
  const projectId = idFor('p', now);
  const title = stripTerminalPunctuation(normalized.value).slice(0, 32);
  return {
    schemaVersion: 1,
    project: { id: projectId, title, createdAt: now, updatedAt: now },
    selfReport: { state: selfReport },
    questions: [{
      id: questionId,
      parentId: null,
      text: normalized.value,
      lens: 'ORIGIN',
      createdAt: now,
    }],
    activeQuestionId: questionId,
    artifact: null,
    events: [{ type: 'question_submitted', at: now, meta: { questionId } }],
    settings: { reducedMotion: false, sound: false },
  };
}

export function selectBranch(session, reframe, now = new Date().toISOString()) {
  const questionId = idFor('q', now, session.questions.length);
  const question = {
    id: questionId,
    parentId: session.activeQuestionId,
    text: normalizeQuestion(reframe.text).value,
    lens: reframe.lens,
    createdAt: now,
  };
  return {
    ...session,
    project: { ...session.project, updatedAt: now },
    questions: [...session.questions, question],
    activeQuestionId: questionId,
    events: [...session.events, {
      type: 'branch_selected',
      at: now,
      meta: { questionId, lens: reframe.lens },
    }],
  };
}

export function recordArtifact(session, artifact, now = new Date().toISOString()) {
  return {
    ...session,
    project: { ...session.project, updatedAt: now },
    artifact: { ...artifact },
    events: [...session.events, {
      type: 'artifact_generated',
      at: now,
      meta: { artifactType: artifact.type },
    }],
  };
}

export function saveSession(storage, key, session) {
  try {
    storage.setItem(key, serializeJson(session));
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: '\u6d4f\u89c8\u5668\u672a\u80fd\u4fdd\u5b58\uff1b\u5f53\u524d\u4f1a\u8bdd\u4ecd\u53ef\u7ee7\u7eed\u5e76\u5bfc\u51fa\u3002',
    };
  }
}

export function loadSession(storage, key) {
  try {
    const raw = storage.getItem(key);
    if (raw == null) return { ok: true, value: null };
    const value = JSON.parse(raw);
    if (!value || value.schemaVersion !== 1 || !Array.isArray(value.questions)) throw new Error('invalid');
    return { ok: true, value };
  } catch {
    return {
      ok: false,
      error: '\u672c\u5730\u8bb0\u5f55\u5df2\u635f\u574f\uff0c\u5df2\u5207\u6362\u4e3a\u65b0\u7684\u4e34\u65f6\u4f1a\u8bdd\u3002',
    };
  }
}
