(() => {
  'use strict';

  const STORAGE_KEY = 'socratic-galaxy-poc-v1';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const dom = {
    shell: $('.galaxy-shell'),
    canvas: $('#galaxy-canvas'),
    statusText: $('#stage-status-text'),
    form: $('#question-form'),
    input: $('#question-input'),
    inputError: $('#input-error'),
    charCount: $('#char-count'),
    selfReport: $('#self-report'),
    guideEmpty: $('#guide-empty'),
    guideResult: $('#guide-result'),
    reflection: $('#reflection-text'),
    reframes: $('#reframe-grid'),
    nextQuestion: $('#next-question'),
    nextQuestionText: $('#next-question-text'),
    trail: $('#question-trail'),
    questionCount: $('#question-count'),
    artifactActions: $('#artifact-actions'),
    artifactPanel: $('#artifact-panel'),
    artifactName: $('#artifact-name'),
    artifactPreview: $('#artifact-preview'),
    readiness: $('#readiness-label'),
    progressLabel: $('#progress-label'),
    progressBar: $('#progress-bar'),
    saveStatus: $('#save-status'),
    reducedMotion: $('#reduced-motion'),
    help: $('#help-panel'),
    helpButton: $('#help-button'),
    scrim: $('#scrim'),
    reset: $('#reset-session'),
  };

  const systemPrefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  let selfReportState = 'none';
  let session = null;
  let currentReframes = [];
  let resetArmed = false;
  const galaxy = createGalaxy(dom.canvas, dom.shell, dom.statusText);

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"]/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;',
    }[character]));
  }

  function renderMarkdown(markdown) {
    const safe = escapeHtml(markdown);
    return safe
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h2>$1</h2>')
      .replace(/^(- \[[ x]\] .+)$/gm, '<p>$1</p>')
      .replace(/^(- .+)$/gm, '<p>• $1</p>')
      .replace(/^(\d+\. .+)$/gm, '<p>$1</p>')
      .split(/\n{2,}/)
      .map((block) => /^<(h2|p)>/.test(block) ? block : `<p>${block.replace(/\n/g, '<br>')}</p>`)
      .join('');
  }

  function activeQuestionText() {
    return session?.questions.find((item) => item.id === session.activeQuestionId)?.text ?? '';
  }

  function persist() {
    if (!session) return;
    const result = saveSession(localStorage, STORAGE_KEY, session);
    dom.saveStatus.textContent = result.ok ? '已保存在本机' : result.error;
    dom.saveStatus.dataset.error = result.ok ? 'false' : 'true';
  }

  function progressState() {
    const types = new Set(session?.events.map((event) => event.type) ?? []);
    const completed = [
      types.has('question_submitted'),
      types.has('branch_selected'),
      types.has('artifact_generated'),
      types.has('artifact_exported'),
    ];
    const count = completed.filter(Boolean).length;
    dom.progressLabel.textContent = `${count} / 4`;
    dom.progressBar.style.width = `${count * 25}%`;
    $$('#loop-steps li').forEach((item, index) => item.classList.toggle('done', completed[index]));
    dom.readiness.textContent = count === 0 ? '尚未启动' : count < 2 ? '正在展开' : count < 4 ? '可以产出' : '闭环完成';
    dom.readiness.classList.toggle('ready', count >= 2);
  }

  function renderTrail() {
    dom.trail.replaceChildren();
    if (!session?.questions.length) {
      const empty = document.createElement('li');
      empty.className = 'empty-state';
      empty.innerHTML = '<span>✦</span><p>第一个问题投出后，<br>这里会留下思考的轨迹。</p>';
      dom.trail.append(empty);
      dom.questionCount.textContent = '0 节点';
      return;
    }
    session.questions.forEach((question, index) => {
      const item = document.createElement('li');
      item.className = `trail-node${question.id === session.activeQuestionId ? ' active' : ''}`;
      const dot = document.createElement('span');
      dot.className = 'node-dot';
      dot.setAttribute('aria-hidden', 'true');
      const meta = document.createElement('small');
      meta.textContent = index === 0 ? '原始问题' : `${question.lens} · 第 ${index + 1} 个节点`;
      const text = document.createElement('p');
      text.textContent = question.text;
      item.append(dot, meta, text);
      dom.trail.append(item);
    });
    dom.questionCount.textContent = `${session.questions.length} 节点`;
  }

  function reflectionFor(question) {
    const classification = classifyQuestion(question);
    const statePrefix = {
      uncertain: '你允许“不确定”被看见，这会让探索更诚实。',
      stuck: '你似乎需要的不是更多压力，而是一个更小的入口。',
      energized: '你已经带着行动能量来到这里，可以尽快落到一次验证。',
      calm: '你愿意从容地把这个问题看清，而不是急着站队。',
      none: '你正在认真对待一个还没有定论的问题。',
    }[selfReportState];
    const form = classification.form === 'closed'
      ? `它现在更像一道“${classification.cue}”判断题，我们可以保留你的关切，同时把它打开。`
      : '它已经包含探索方向，我们可以继续补上边界、机制与证据。';
    return `${statePrefix}${form}`;
  }

  function renderReframes(question) {
    currentReframes = buildReframes(question);
    dom.reframes.replaceChildren();
    currentReframes.forEach((reframe) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'reframe-card';
      button.dataset.lens = reframe.lens;
      const heading = document.createElement('strong');
      heading.append(document.createTextNode(reframe.label));
      const code = document.createElement('b');
      code.textContent = reframe.lens;
      heading.append(code);
      const text = document.createElement('p');
      text.textContent = reframe.text;
      const note = document.createElement('small');
      note.textContent = reframe.note;
      button.append(heading, text, note);
      button.addEventListener('click', () => chooseReframe(reframe, button));
      dom.reframes.append(button);
    });
  }

  function showGuidance(question, resumed = false) {
    dom.guideEmpty.hidden = true;
    dom.guideResult.hidden = false;
    dom.reflection.textContent = resumed
      ? '这条问题路径保存在本机。你可以继续选择新的角度，或把当前思考做成阶段性成果。'
      : reflectionFor(question);
    renderReframes(question);
  }

  function enableArtifacts() {
    dom.artifactActions.setAttribute('aria-disabled', 'false');
    $$('.artifact-types button').forEach((button) => { button.disabled = false; });
  }

  function chooseReframe(reframe, button) {
    if (!session) return;
    $$('.reframe-card').forEach((card) => card.classList.remove('selected'));
    button.classList.add('selected');
    galaxy.launchImpact(0.58);
    galaxy.setState('branching');
    session = selectBranch(session, reframe);
    renderTrail();
    dom.nextQuestion.hidden = false;
    dom.nextQuestionText.textContent = reframe.text;
    enableArtifacts();
    progressState();
    persist();
    window.setTimeout(() => galaxy.setState('ready'), session.settings.reducedMotion ? 0 : 520);
  }

  function startQuestion(raw) {
    const normalized = normalizeQuestion(raw);
    if (!normalized.ok) {
      dom.inputError.textContent = normalized.error;
      dom.input.focus();
      return;
    }
    dom.inputError.textContent = '';
    galaxy.launchImpact(1);
    galaxy.setState('reflecting');
    dom.form.setAttribute('aria-busy', 'true');
    session = createSession(normalized.value, selfReportState);
    session.settings.reducedMotion = dom.reducedMotion.checked;
    renderTrail();
    progressState();
    persist();
    window.setTimeout(() => {
      showGuidance(normalized.value);
      dom.form.removeAttribute('aria-busy');
      galaxy.setState('branching');
      dom.guideResult.scrollIntoView({ behavior: session.settings.reducedMotion ? 'auto' : 'smooth', block: 'nearest' });
    }, session.settings.reducedMotion ? 0 : 460);
  }

  function generateArtifact(type) {
    if (!session) return;
    const artifact = buildArtifact(session, type);
    session = recordArtifact(session, artifact);
    renderArtifact();
    progressState();
    persist();
    galaxy.setState('ready');
  }

  function renderArtifact() {
    if (!session?.artifact) return;
    dom.artifactPanel.hidden = false;
    dom.artifactName.textContent = session.artifact.title;
    dom.artifactPreview.innerHTML = renderMarkdown(session.artifact.markdown);
  }

  function safeFilename(value, extension) {
    const base = String(value || '问启星河').replace(/[\\/:*?"<>|]/g, '-').slice(0, 60);
    return `${base}.${extension}`;
  }

  function download(content, filename, type) {
    try {
      const blob = new Blob([content], { type });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 500);
      return true;
    } catch {
      dom.saveStatus.textContent = '浏览器未能下载，请先复制成果内容。';
      return false;
    }
  }

  function recordExport(kind) {
    if (!session) return;
    session = {
      ...session,
      events: [...session.events, { type: 'artifact_exported', at: new Date().toISOString(), meta: { kind } }],
    };
    progressState();
    persist();
  }

  function exportMarkdown() {
    if (!session) return;
    if (download(serializeMarkdown(session), safeFilename(session.project.title, 'md'), 'text/markdown;charset=utf-8')) recordExport('markdown');
  }

  function exportJson() {
    if (!session) return;
    if (download(serializeJson(session), safeFilename(`${session.project.title}-backup`, 'json'), 'application/json;charset=utf-8')) recordExport('json');
  }

  async function copyArtifact() {
    if (!session?.artifact) return;
    try {
      await navigator.clipboard.writeText(session.artifact.markdown);
      $('#copy-artifact').textContent = '已复制';
    } catch {
      const area = document.createElement('textarea');
      area.value = session.artifact.markdown;
      document.body.append(area);
      area.select();
      document.execCommand('copy');
      area.remove();
      $('#copy-artifact').textContent = '已复制';
    }
    window.setTimeout(() => { $('#copy-artifact').textContent = '复制'; }, 1200);
  }

  function setReducedMotion(value) {
    const reduced = Boolean(value);
    dom.reducedMotion.checked = reduced;
    document.body.classList.toggle('reduce-motion', reduced);
    galaxy.setReducedMotion(reduced);
    if (session) {
      session = { ...session, settings: { ...session.settings, reducedMotion: reduced } };
      persist();
    }
  }

  function resetSession() {
    if (!resetArmed) {
      resetArmed = true;
      dom.reset.textContent = '再次点击确认清除';
      window.setTimeout(() => {
        resetArmed = false;
        dom.reset.textContent = '清除本机记录';
      }, 3500);
      return;
    }
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* temporary mode */ }
    session = null;
    currentReframes = [];
    dom.input.value = '';
    dom.guideEmpty.hidden = false;
    dom.guideResult.hidden = true;
    dom.nextQuestion.hidden = true;
    dom.artifactPanel.hidden = true;
    dom.artifactActions.setAttribute('aria-disabled', 'true');
    $$('.artifact-types button').forEach((button) => { button.disabled = true; });
    dom.saveStatus.textContent = '本机记录已清除';
    renderTrail();
    progressState();
    galaxy.setState('idle');
    resetArmed = false;
    dom.reset.textContent = '清除本机记录';
  }

  function openHelp(open) {
    dom.help.hidden = !open;
    dom.scrim.hidden = !open;
    dom.helpButton.setAttribute('aria-expanded', String(open));
    if (open) $('#close-help').focus(); else dom.helpButton.focus();
  }

  function restore() {
    const loaded = loadSession(localStorage, STORAGE_KEY);
    if (!loaded.ok) {
      dom.saveStatus.textContent = loaded.error;
      return;
    }
    if (!loaded.value) return;
    session = loaded.value;
    selfReportState = session.selfReport?.state ?? 'none';
    $$('.state-options button').forEach((button) => button.setAttribute('aria-checked', String(button.dataset.state === selfReportState)));
    setReducedMotion(Boolean(session.settings?.reducedMotion || systemPrefersReduced));
    dom.input.value = session.questions[0]?.text ?? '';
    dom.charCount.textContent = `${[...dom.input.value].length} / 500`;
    renderTrail();
    showGuidance(activeQuestionText(), true);
    if (session.questions.length > 1) {
      enableArtifacts();
      dom.nextQuestion.hidden = false;
      dom.nextQuestionText.textContent = activeQuestionText();
      galaxy.setState('ready');
    }
    renderArtifact();
    progressState();
    dom.saveStatus.textContent = '已恢复本机记录';
  }

  dom.form.addEventListener('submit', (event) => {
    event.preventDefault();
    startQuestion(dom.input.value);
  });
  dom.input.addEventListener('input', () => {
    dom.charCount.textContent = `${[...dom.input.value].length} / 500`;
    dom.inputError.textContent = '';
  });
  dom.input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      dom.form.requestSubmit();
    }
  });
  $$('#starter-strip [data-example]').forEach((button) => button.addEventListener('click', () => {
    dom.input.value = button.dataset.example;
    dom.input.dispatchEvent(new Event('input'));
    dom.input.focus();
  }));
  $$('.state-options button').forEach((button) => button.addEventListener('click', () => {
    selfReportState = button.dataset.state;
    $$('.state-options button').forEach((item) => item.setAttribute('aria-checked', String(item === button)));
    if (session) {
      session = { ...session, selfReport: { state: selfReportState } };
      persist();
    }
  }));
  $$('.artifact-types button').forEach((button) => button.addEventListener('click', () => generateArtifact(button.dataset.artifact)));
  $('#copy-artifact').addEventListener('click', copyArtifact);
  $('#export-markdown').addEventListener('click', exportMarkdown);
  $('#export-json').addEventListener('click', exportJson);
  dom.reducedMotion.addEventListener('change', () => setReducedMotion(dom.reducedMotion.checked));
  dom.reset.addEventListener('click', resetSession);
  dom.helpButton.addEventListener('click', () => openHelp(dom.help.hidden));
  $('#close-help').addEventListener('click', () => openHelp(false));
  dom.scrim.addEventListener('click', () => openHelp(false));
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !dom.help.hidden) openHelp(false); });

  setReducedMotion(systemPrefersReduced);
  restore();
  progressState();
  window.__QUESTION_TERMINAL_READY__ = true;
})();
