(() => {
  'use strict';

  const STORAGE_KEY = 'socratic-galaxy-workbench-v2';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const dom = {
    shell: $('.galaxy-shell'), canvas: $('#galaxy-canvas'), statusText: $('#stage-status-text'),
    form: $('#question-form'), input: $('#question-input'), inputError: $('#input-error'), charCount: $('#char-count'),
    stageTrack: $('#stage-track'), original: $('#original-question'), originalText: $('#original-question-text'),
    trail: $('#question-trail'), questionCount: $('#question-count'), guideEmpty: $('#guide-empty'),
    understanding: $('#understanding-panel'), understandingList: $('#understanding-list'),
    inferenceTone: $('#inference-tone'), inferenceConfidence: $('#inference-confidence'), clarify: $('#clarifying-answer'),
    method: $('#method-panel'), primaryMethod: $('#primary-method'), alternatives: $('#alternative-method-list'),
    exercise: $('#exercise-panel'), exerciseProgress: $('#exercise-progress'), exerciseQuestion: $('#exercise-question-text'),
    exerciseAnswer: $('#exercise-answer'), exerciseFeedback: $('#exercise-feedback'), exerciseSummary: $('#exercise-summary'),
    future: $('#future-stage'), footer: $('#task-footer'), primary: $('#primary-action'), back: $('#back-action'),
    cluster: $('#cluster-view'), constructs: $('#construct-view'), rqCandidates: $('#rq-candidates'),
    evidencePanel: $('#evidence-panel'), artifactStage: $('#artifact-stage'),
    mode: $('#inquiry-mode'), engineBadge: $('#engine-badge'), readiness: $('#readiness-label'),
    observations: $('#observations-list'), assumptions: $('#assumptions-list'), evidenceNeeds: $('#evidence-needs-list'),
    saveStatus: $('#save-status'), reducedMotion: $('#reduced-motion'), help: $('#help-panel'),
    helpButton: $('#help-button'), scrim: $('#scrim'), reset: $('#reset-session'),
  };

  const galaxy = createGalaxy(dom.canvas, dom.shell, dom.statusText);
  const systemPrefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  let session = null;
  let workflow = null;
  let analysis = null;
  let recommendations = null;
  let methodRun = null;
  let problemCluster = null;
  let researchModel = null;
  let researchCandidates = null;
  let timeBudget = 8;
  let resetArmed = false;

  function modeLabel(source = 'demo') {
    if (source === 'llm') return 'DeepSeek · 结构化分析';
    if (source === 'fallback') return '模型不可用 · 降级引导';
    return '演示引擎 · 非实时研究';
  }

  function persist() {
    if (!session) return;
    session = { ...session, workflow, workbench: { analysis, recommendations, methodRun, problemCluster, researchModel, researchCandidates, timeBudget } };
    const result = saveSession(localStorage, STORAGE_KEY, session);
    dom.saveStatus.textContent = result.ok ? '已自动保存在本机' : result.error;
  }

  function setGalaxyState(state, message) {
    const supported = { analyzing: 'reflecting', practicing: 'branching', forging: 'branching', error: 'idle' };
    galaxy.setState(supported[state] ?? state);
    if (message) dom.statusText.textContent = message;
  }

  function setList(element, items, emptyText) {
    element.replaceChildren();
    if (!items?.length) {
      const li = document.createElement('li'); li.className = 'muted-item'; li.textContent = emptyText; element.append(li); return;
    }
    items.forEach((text) => { const li = document.createElement('li'); li.textContent = text; element.append(li); });
  }

  function renderStageTrack() {
    const activeIndex = WORKFLOW_STAGES.indexOf(workflow?.stage ?? 'capture');
    $$('#stage-track li').forEach((item, index) => {
      const current = index === Math.min(activeIndex, 5);
      item.toggleAttribute('aria-current', current);
      if (current) item.setAttribute('aria-current', 'step');
      item.classList.toggle('done', index < activeIndex);
      item.classList.toggle('locked', index > activeIndex);
    });
  }

  function renderMap() {
    dom.trail.replaceChildren();
    if (!workflow) {
      dom.original.hidden = true; dom.questionCount.textContent = '0 节点';
      dom.trail.innerHTML = '<li class="empty-state"><span>✦</span><p>问题提交后，这里会保留原话、<br>分支和证据缺口。</p></li>';
      return;
    }
    dom.original.hidden = false;
    dom.originalText.textContent = workflow.originalQuestion;
    const nodes = [
      ...(analysis?.alternativeExplanations ?? []).map((text) => ({ kind: '替代解释', text })),
      ...(methodRun?.outputs?.evidenceNeeds ?? []).map((text) => ({ kind: '证据缺口', text })),
    ];
    nodes.forEach((node) => {
      const li = document.createElement('li'); li.className = 'trail-node';
      li.innerHTML = '<span class="node-dot" aria-hidden="true"></span>';
      const small = document.createElement('small'); small.textContent = node.kind;
      const p = document.createElement('p'); p.textContent = node.text;
      li.append(small, p); dom.trail.append(li);
    });
    if (!nodes.length) dom.trail.innerHTML = '<li class="empty-state compact"><span>·</span><p>校正理解和完成练习后，分支会在这里出现。</p></li>';
    dom.questionCount.textContent = `${nodes.length + 1} 节点`;
  }

  function renderYield() {
    setList(dom.observations, analysis ? [analysis.observation] : [], '等待用户确认');
    setList(dom.assumptions, analysis ? [analysis.currentExplanation] : [], '尚未记录');
    setList(dom.evidenceNeeds, methodRun?.outputs?.evidenceNeeds ?? [], '练习后生成');
    const stage = workflow?.stage ?? 'capture';
    dom.readiness.textContent = {
      capture: '尚未启动', understand: '正在校正', method: '可选练习', explore: '正在展开', forge: '练习完成',
    }[stage] ?? '继续研究';
    dom.readiness.classList.toggle('ready', ['method', 'explore', 'forge'].includes(stage));
  }

  function fieldRow(label, field, value, tag = 'AI 暂定') {
    const row = document.createElement('article'); row.className = 'understanding-row'; row.dataset.field = field;
    const header = document.createElement('div');
    const labelEl = document.createElement('span'); labelEl.className = 'row-label'; labelEl.textContent = label;
    const tagEl = document.createElement('span'); tagEl.className = 'object-label ai'; tagEl.textContent = tag;
    header.append(labelEl, tagEl);
    const p = document.createElement('p'); p.textContent = value;
    const actions = document.createElement('div'); actions.className = 'row-actions';
    const accept = document.createElement('button'); accept.type = 'button'; accept.textContent = '对'; accept.dataset.accept = field;
    const edit = document.createElement('button'); edit.type = 'button'; edit.textContent = '不准确，修改'; edit.dataset.edit = field;
    actions.append(accept, edit); row.append(header, p, actions); return row;
  }

  function renderUnderstanding() {
    dom.understandingList.replaceChildren(
      fieldRow('你看到的现象', 'observation', analysis.observation),
      fieldRow('你目前的解释', 'currentExplanation', analysis.currentExplanation),
      fieldRow('还不清楚', 'unknowns', analysis.unknowns.join('；')),
      fieldRow('表达中的暂定状态', 'toneHypothesis', analysis.toneHypothesis),
    );
    dom.inferenceTone.textContent = analysis.toneHypothesis;
    dom.inferenceConfidence.textContent = `置信度 ${Math.round(analysis.confidence * 100)}% · 可修正`;
  }

  function renderMethods() {
    recommendations = recommendMethods(analysis, timeBudget);
    const item = recommendations.primary;
    dom.primaryMethod.innerHTML = `<div class="method-meta"><span class="object-label ai">主推荐</span><b>预计 ${item.minutes} 分钟 · ${item.questionsCount} 个短问题</b></div><h3>${item.name}</h3><p>${item.reason}</p><div class="method-output"><span>你将得到</span>${item.expectedOutputs.map((value) => `<b>${value}</b>`).join('')}</div>`;
    dom.alternatives.replaceChildren();
    recommendations.alternatives.forEach((alternative) => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'alternative-card';
      button.innerHTML = `<strong>${alternative.name}</strong><span>${alternative.reason}</span><small>约 ${alternative.minutes} 分钟</small>`;
      dom.alternatives.append(button);
    });
  }

  function renderExercise() {
    const total = methodRun.questions.length;
    const completed = methodRun.status === 'completed';
    dom.exerciseProgress.textContent = completed ? '展开问题 · 本轮小结' : `展开问题 · 第 ${methodRun.currentTurn + 1}/${total} 问`;
    dom.exerciseQuestion.parentElement.hidden = completed;
    $('.answer-box').hidden = completed;
    $('.exercise-tools').hidden = completed;
    dom.exerciseSummary.hidden = !completed;
    if (completed) {
      dom.exerciseSummary.innerHTML = `<h3>这轮你改变了什么</h3><dl><div><dt>原判断</dt><dd>${analysis.currentExplanation}</dd></div><div><dt>现在看到</dt><dd>现有依据仍包含主观感觉，需要把替代解释分开验证。</dd></div><div><dt>仍不知道</dt><dd>${methodRun.outputs.evidenceNeeds.at(-1) ?? '尚需补充数据'}</dd></div><div><dt>下一问</dt><dd>哪些组织机制真正影响销售机会推进？</dd></div></dl>`;
      dom.primary.textContent = '加入问题地图';
    } else {
      dom.exerciseQuestion.textContent = methodRun.questions[methodRun.currentTurn].text;
      dom.exerciseAnswer.value = '';
      dom.primary.textContent = '记录回答，继续';
    }
  }

  function showOnly(panel) {
    dom.guideEmpty.hidden = panel !== 'empty';
    dom.understanding.hidden = panel !== 'understand';
    dom.method.hidden = panel !== 'method';
    dom.exercise.hidden = panel !== 'explore';
    dom.future.hidden = panel !== 'forge';
    dom.evidencePanel.hidden = panel !== 'evidence';
    dom.artifactStage.hidden = panel !== 'artifact';
    dom.footer.hidden = panel === 'empty';
  }

  function renderForge() {
    if (!problemCluster) problemCluster = buildProblemCluster(analysis, methodRun);
    dom.cluster.replaceChildren();
    problemCluster.nodes.filter((item) => ['phenomenon', 'cause', 'mechanism', 'boundary'].includes(item.kind) && item.status === 'active').forEach((item) => {
      const card = document.createElement('article'); card.className = `cluster-card${problemCluster.mainlineId === item.id ? ' selected' : ''}`;
      const tag = document.createElement('span'); tag.className = 'object-label ai'; tag.textContent = ({ phenomenon: '现象', cause: '原因候选', mechanism: '机制候选', boundary: '边界' })[item.kind];
      const p = document.createElement('p'); p.textContent = item.text;
      const button = document.createElement('button'); button.type = 'button'; button.dataset.mainline = item.id; button.textContent = problemCluster.mainlineId === item.id ? '已选主线' : '设为主线';
      card.append(tag, p, button); dom.cluster.append(card);
    });
    if (!problemCluster.mainlineId) { dom.constructs.hidden = true; dom.rqCandidates.hidden = true; dom.primary.textContent = '请先选择一条主线'; dom.primary.disabled = true; return; }
    researchModel = proposeConstructs(problemCluster);
    researchCandidates = buildResearchQuestionCandidates(researchModel);
    dom.constructs.hidden = false; dom.rqCandidates.hidden = false;
    dom.constructs.innerHTML = `<div class="task-intro"><span>经营语言 → 研究语言</span><h3>概念候选</h3><p>所有概念目前均待文献核验。</p></div>${researchModel.constructs.map((item) => `<article class="construct-card"><header><span class="object-label user">${item.businessWording}</span><small>待核验</small></header><p>${item.name}</p><small>${item.role}</small></article>`).join('')}`;
    dom.rqCandidates.innerHTML = `<div class="task-intro"><span>候选表述</span><h3>请选择一种研究传统</h3></div>${researchCandidates.map((item) => `<article class="rq-card${workflow.data.research?.acceptedQuestionId === item.id ? ' selected' : ''}"><span class="object-label ai">${item.label}</span><p>${item.text}</p><small>概念与关系尚未核验</small><button type="button" data-rq="${item.id}">${workflow.data.research?.acceptedQuestionId === item.id ? '已选择' : '选择此版本'}</button></article>`).join('')}`;
    dom.primary.disabled = !workflow.data.research?.acceptedQuestionId;
    dom.primary.textContent = workflow.data.research?.acceptedQuestionId ? '去核验证据' : '选择一个研究问题';
  }

  function render() {
    renderStageTrack(); renderMap(); renderYield();
    const stage = workflow?.stage ?? 'capture';
    if (stage === 'capture') showOnly('empty');
    if (stage === 'understand') { showOnly('understand'); renderUnderstanding(); dom.primary.textContent = '形成问题底稿'; }
    if (stage === 'method') { showOnly('method'); renderMethods(); dom.primary.textContent = '开始这项练习'; }
    if (stage === 'explore') { showOnly('explore'); renderExercise(); }
    if (stage === 'forge') { showOnly('forge'); renderForge(); }
    if (stage === 'evidence') { showOnly('evidence'); dom.primary.textContent = '生成阶段成果'; dom.primary.disabled = false; }
    if (stage === 'artifact') { showOnly('artifact'); dom.footer.hidden = true; }
    dom.back.hidden = ['capture', 'understand'].includes(stage);
  }

  async function startQuestion(raw) {
    const normalized = normalizeQuestion(raw);
    if (!normalized.ok) { dom.inputError.textContent = normalized.error; dom.input.focus(); return; }
    dom.inputError.textContent = '';
    galaxy.launchImpact(1);
    galaxy.setState('reflecting');
    setGalaxyState('analyzing', '正在区分现象、判断与隐含假设…');
    dom.form.setAttribute('aria-busy', 'true');
    session = createSession(normalized.value, 'none');
    workflow = createWorkflow(normalized.value);
    analysis = analyzeDemoQuestion(normalized.value);
    let source = 'demo';
    if (canUseInquiryApi()) {
      try {
        await requestInquiry({ question: normalized.value, sessionId: session.project.id, history: [] }, {
          status(data) { if (data.state === 'analyzing') setGalaxyState('analyzing'); },
          result(data) {
            source = data.source;
            if (data.interaction) analysis = { ...analysis, ...data.interaction, source: data.source };
            analysis.toneHypothesis = data.turnState.emotionalTone;
            analysis.confidence = data.turnState.confidence;
          },
        });
      } catch { source = 'fallback'; }
    }
    const transitioned = transitionWorkflow(workflow, { type: 'ANALYSIS_RECEIVED', payload: analysis });
    workflow = transitioned.value;
    dom.mode.textContent = modeLabel(source); dom.engineBadge.lastChild.textContent = ` ${modeLabel(source).split(' · ')[0]}`;
    dom.form.removeAttribute('aria-busy');
    setGalaxyState('ready', '理解草稿已生成 · 请先校正 AI 是否听懂');
    persist(); render();
    $('#understanding-title').focus?.();
  }

  function confirmUnderstanding() {
    const clarification = dom.clarify.value.trim();
    if (clarification) analysis = correctUnderstanding(analysis, 'observation', clarification);
    workflow = transitionWorkflow(workflow, { type: 'UNDERSTANDING_CONFIRMED', payload: { confirmed: true, analysis } }).value;
    persist(); render(); setGalaxyState('ready', '问题底稿已确认 · 请选择一项思考练习');
  }

  function startMethod() {
    recommendations = recommendMethods(analysis, timeBudget);
    methodRun = createSocraticRun(analysis, { timeBudget });
    workflow = transitionWorkflow(workflow, { type: 'METHOD_SELECTED', payload: { methodId: recommendations.primary.id, recommendation: recommendations.primary } }).value;
    persist(); render(); setGalaxyState('practicing', '苏格拉底式澄清进行中 · 每次只回答一问');
  }

  function continueExercise() {
    if (methodRun.status === 'completed') {
      workflow = transitionWorkflow(workflow, { type: 'METHOD_COMPLETED', payload: { completed: true, run: methodRun } }).value;
      persist(); render(); setGalaxyState('branching', '练习结果已进入问题地图 · 下一步选择研究主线'); return;
    }
    const answer = dom.exerciseAnswer.value.trim();
    if (!answer) { dom.exerciseFeedback.textContent = '先写下你此刻知道的内容；不确定也可以直接写“不确定”。'; dom.exerciseAnswer.focus(); return; }
    methodRun = answerSocraticTurn(methodRun, answer);
    dom.exerciseFeedback.textContent = methodRun.feedback;
    persist(); render();
  }

  function chooseForgeItem(event) {
    const mainline = event.target.closest('[data-mainline]');
    if (mainline) {
      problemCluster = selectMainline(problemCluster, mainline.dataset.mainline, '用户从问题簇中选择的研究主线');
      persist(); render(); return;
    }
    const rq = event.target.closest('[data-rq]');
    if (rq) {
      const chosen = researchCandidates.find((item) => item.id === rq.dataset.rq);
      workflow = { ...workflow, data: { ...workflow.data, research: { acceptedQuestionId: chosen.id, candidate: chosen, model: researchModel } } };
      persist(); render();
    }
  }

  function goBack() {
    const target = { method: 'understand', explore: 'method', forge: 'explore' }[workflow.stage];
    if (!target) return;
    const result = transitionWorkflow(workflow, { type: 'GO_BACK', payload: { stage: target } });
    if (result.ok) { workflow = result.value; persist(); render(); }
  }

  function editUnderstanding(event) {
    const button = event.target.closest('[data-edit]');
    if (!button) return;
    const field = button.dataset.edit;
    if (field === 'unknowns') return;
    const current = analysis[field];
    const value = window.prompt('请按你的真实意思修改：', current);
    if (value?.trim()) { analysis = correctUnderstanding(analysis, field, value); persist(); render(); }
  }

  function setReducedMotion(value) {
    const reduced = Boolean(value); dom.reducedMotion.checked = reduced;
    document.body.classList.toggle('reduce-motion', reduced); galaxy.setReducedMotion(reduced);
  }

  function resetSession() {
    if (!resetArmed) {
      resetArmed = true; dom.reset.textContent = '再次点击确认清除';
      window.setTimeout(() => { resetArmed = false; dom.reset.textContent = '清除本机记录'; }, 3500); return;
    }
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* temporary mode */ }
    session = workflow = analysis = recommendations = methodRun = null;
    dom.input.value = ''; dom.charCount.textContent = '0 / 800'; dom.saveStatus.textContent = '本机记录已清除';
    resetArmed = false; dom.reset.textContent = '清除本机记录'; render(); setGalaxyState('idle', '星河待命 · 数据只保存在这台设备');
  }

  function restore() {
    const loaded = loadSession(localStorage, STORAGE_KEY);
    if (!loaded.ok) { dom.saveStatus.textContent = loaded.error; return; }
    if (!loaded.value?.workflow) return;
    session = loaded.value; workflow = session.workflow;
    ({ analysis, recommendations, methodRun, problemCluster, researchModel, researchCandidates, timeBudget = 8 } = session.workbench ?? {});
    dom.input.value = workflow.originalQuestion; dom.charCount.textContent = `${[...dom.input.value].length} / 800`;
    dom.saveStatus.textContent = '已恢复上次进度'; render(); setGalaxyState('ready', `已恢复 · 上次停在“${workflow.stage}”阶段`);
  }

  function openHelp(open) {
    dom.help.hidden = !open; dom.scrim.hidden = !open; dom.helpButton.setAttribute('aria-expanded', String(open));
    if (open) $('#close-help').focus(); else dom.helpButton.focus();
  }

  dom.form.addEventListener('submit', (event) => { event.preventDefault(); startQuestion(dom.input.value); });
  dom.input.addEventListener('input', () => { dom.charCount.textContent = `${[...dom.input.value].length} / 800`; dom.inputError.textContent = ''; });
  dom.input.addEventListener('keydown', (event) => { if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); dom.form.requestSubmit(); } });
  dom.primary.addEventListener('click', () => {
    if (workflow.stage === 'understand') confirmUnderstanding();
    else if (workflow.stage === 'method') startMethod();
    else if (workflow.stage === 'explore') continueExercise();
    else if (workflow.stage === 'forge' && workflow.data.research?.acceptedQuestionId) {
      workflow = transitionWorkflow(workflow, { type: 'RESEARCH_QUESTION_CONFIRMED', payload: workflow.data.research }).value;
      persist(); render(); setGalaxyState('ready', '研究问题 v1 已形成 · 开始核验概念与关系');
    }
  });
  dom.back.addEventListener('click', goBack);
  dom.understandingList.addEventListener('click', editUnderstanding);
  dom.future.addEventListener('click', chooseForgeItem);
  $$('.time-choice button').forEach((button) => button.addEventListener('click', () => {
    timeBudget = Number(button.dataset.time); $$('.time-choice button').forEach((item) => item.setAttribute('aria-pressed', String(item === button))); renderMethods();
  }));
  $('#rephrase-question').addEventListener('click', () => { dom.exerciseFeedback.textContent = `换一种说法：如果“${analysis.currentExplanation}”不是主要原因，你会先检查什么？`; });
  $('#skip-question').addEventListener('click', () => { dom.exerciseAnswer.value = '这一项暂时不确定，需要后续验证。'; continueExercise(); });
  $('#pause-exercise').addEventListener('click', () => { persist(); dom.exerciseFeedback.textContent = '已保存。你可以放心离开，下次从这里继续。'; });
  dom.reducedMotion.addEventListener('change', () => setReducedMotion(dom.reducedMotion.checked));
  dom.reset.addEventListener('click', resetSession);
  dom.helpButton.addEventListener('click', () => openHelp(dom.help.hidden));
  $('#close-help').addEventListener('click', () => openHelp(false)); dom.scrim.addEventListener('click', () => openHelp(false));

  setReducedMotion(systemPrefersReduced); render(); restore();
  window.__QUESTION_TERMINAL_READY__ = true;
})();
