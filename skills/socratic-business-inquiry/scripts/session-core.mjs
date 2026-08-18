const STAGES = Object.freeze(['capture', 'understand', 'method', 'explore', 'forge', 'evidence', 'artifact']);

function timestamp(value) {
  return value || new Date().toISOString();
}

function clone(value) {
  return structuredClone(value);
}

function resultError(session, message) {
  return { ok: false, value: session, errors: [message] };
}

function appendHistory(session, event, at) {
  return [...session.history, { type: event.type, at, payload: clone(event.payload ?? null) }];
}

export function createInquirySession(originalQuestion, options = {}) {
  if (typeof originalQuestion !== 'string' || !originalQuestion.trim()) throw new TypeError('originalQuestion is required');
  const now = timestamp(options.now);
  return {
    schemaVersion: 1,
    sessionId: options.sessionId || `inq-${now.replace(/\D/g, '').slice(0, 17)}`,
    engineMode: 'host-agent',
    stage: 'capture',
    status: 'active',
    originalQuestion,
    understanding: null,
    corrections: [],
    method: null,
    turns: [],
    questionCluster: [],
    researchQuestion: null,
    evidence: [],
    evidenceSearch: [],
    artifacts: [],
    unresolvedItems: [],
    nextQuestion: null,
    latestInsight: null,
    createdAt: now,
    updatedAt: now,
    history: [{ type: 'SESSION_CREATED', at: now, payload: null }],
  };
}

export function applySessionEvent(session, event) {
  const validation = validateSession(session);
  if (!validation.ok) return resultError(session, `invalid session: ${validation.errors.join('; ')}`);
  if (!event || typeof event.type !== 'string') return resultError(session, 'event type is required');
  const at = timestamp(event.at);
  const next = clone(session);
  if (!Array.isArray(next.evidenceSearch)) next.evidenceSearch = [];

  switch (event.type) {
    case 'UNDERSTANDING_PROPOSED':
      if (session.stage !== 'capture' && session.stage !== 'understand') return resultError(session, 'understanding can only be proposed from capture or understand');
      next.understanding = clone(event.payload);
      next.stage = 'understand';
      break;
    case 'UNDERSTANDING_CORRECTED': {
      if (session.stage !== 'understand' || !session.understanding) return resultError(session, 'understanding must exist before correction');
      const { field, value, reason = 'user correction' } = event.payload ?? {};
      if (!['observations', 'assumptions', 'missingInformation', 'turnState'].includes(field)) return resultError(session, 'correction field is invalid');
      next.corrections.push({ field, oldValue: clone(session.understanding[field]), newValue: clone(value), reason, at });
      next.understanding[field] = clone(value);
      break;
    }
    case 'UNDERSTANDING_CONFIRMED':
      if (session.stage !== 'understand' || !session.understanding) return resultError(session, 'understanding must exist before confirmation');
      next.understanding.confirmedAt = at;
      next.stage = 'method';
      break;
    case 'METHOD_SELECTED':
      if (session.stage !== 'method') return resultError(session, 'method can only be selected at method stage');
      next.method = clone(event.payload);
      next.stage = 'explore';
      break;
    case 'TURN_RECORDED':
      if (session.stage !== 'explore') return resultError(session, 'turns can only be recorded during explore');
      if (!event.payload?.question || !event.payload?.answer) return resultError(session, 'turn requires question and answer');
      next.turns.push({ ...clone(event.payload), at });
      if (Array.isArray(event.payload.questionNodes)) next.questionCluster.push(...clone(event.payload.questionNodes));
      next.latestInsight = event.payload.latestInsight || next.latestInsight;
      next.nextQuestion = event.payload.nextQuestion || null;
      break;
    case 'RESEARCH_QUESTION_FORGED':
      if (session.stage !== 'explore' && session.stage !== 'forge') return resultError(session, 'research question can only be forged after exploration');
      next.researchQuestion = clone(event.payload);
      next.stage = 'evidence';
      break;
    case 'EVIDENCE_ATTACHED':
      if (session.stage !== 'evidence') return resultError(session, 'evidence can only be attached at evidence stage');
      next.evidence.push(...(Array.isArray(event.payload) ? clone(event.payload) : [clone(event.payload)]));
      break;
    case 'RESEARCH_SEARCH_RECORDED':
      if (session.stage !== 'evidence') return resultError(session, 'search can only be recorded at evidence stage');
      if (!event.payload || typeof event.payload.plan !== 'object') return resultError(session, 'RESEARCH_SEARCH_RECORDED requires a search plan');
      next.evidenceSearch.push(clone(event.payload));
      break;
    case 'CONCEPT_VERIFIED':
      if (session.stage !== 'evidence') return resultError(session, 'concept can only be verified at evidence stage');
      if (!event.payload || typeof event.payload.evidenceIndex !== 'number' || typeof event.payload.verification !== 'object') {
        return resultError(session, 'CONCEPT_VERIFIED requires evidenceIndex and verification');
      }
      if (!Number.isInteger(event.payload.evidenceIndex) || event.payload.evidenceIndex < 0 || event.payload.evidenceIndex >= next.evidence.length) {
        return resultError(session, 'CONCEPT_VERIFIED evidenceIndex is out of range');
      }
      next.evidence[event.payload.evidenceIndex].verification = clone(event.payload.verification);
      break;
    case 'ARTIFACT_RECORDED':
      if (session.stage !== 'evidence' && session.stage !== 'artifact') return resultError(session, 'artifact can only be recorded after evidence stage');
      next.artifacts.push(clone(event.payload));
      next.stage = 'artifact';
      break;
    case 'SESSION_PAUSED':
      if (typeof event.payload?.nextQuestion !== 'string' || !event.payload.nextQuestion.trim()) return resultError(session, 'pause requires exactly one nextQuestion');
      next.status = 'paused';
      next.latestInsight = event.payload.latestInsight || next.latestInsight;
      next.nextQuestion = event.payload.nextQuestion;
      break;
    default:
      return resultError(session, `unsupported event: ${event.type}`);
  }

  next.updatedAt = at;
  next.history = appendHistory(session, event, at);
  const nextValidation = validateSession(next);
  return nextValidation.ok ? { ok: true, value: next, errors: [] } : resultError(session, nextValidation.errors.join('; '));
}

export function buildResumeView(session) {
  const validation = validateSession(session);
  if (!validation.ok) throw new TypeError(validation.errors.join('; '));
  return {
    sessionId: session.sessionId,
    stage: session.stage,
    originalQuestion: session.originalQuestion,
    latestInsight: session.latestInsight,
    unresolvedItems: clone(session.unresolvedItems),
    nextQuestion: session.nextQuestion,
    updatedAt: session.updatedAt,
  };
}

/**
 * Replay a full model-driven inquiry case for a real business concern,
 * walking capture → understand → method → explore → forge → evidence → artifact
 * through the same event state machine a host Agent would drive.
 * Deterministic and offline; all semantic content is an explicit demo case
 * (not a fact claim, not live research).
 * Throws if the case ever violates the session contract.
 */
export function executeWalkthrough(options = {}) {
  const now = options.now || '2026-08-19T00:00:00.000Z';
  const at = (t) => (t ? `${now.slice(0, 11)}${t}Z` : now);
  let s = createInquirySession('为什么我们的战略落地越来越慢？', { now });

  const step = (event) => {
    const r = applySessionEvent(s, { ...event, at: at(event.at || '00:00:01') });
    if (!r.ok) throw new Error(`walkthrough failed at ${event.type}: ${r.errors.join('; ')}`);
    s = r.value;
  };

  step({ type: 'UNDERSTANDING_PROPOSED', at: '00:00:01', payload: {
    observations: ['用户观察到战略执行在近两个季度明显变慢', '管理层已把问题归因到跨部门协同'],
    assumptions: ['“越来越慢”的对象与时间口径尚不统一'],
    missingInformation: ['落点的可观察度量', '对比周期', '受影响的单元', '备择解释'],
    turnState: { label: '希望先定义现象再找原因', confidence: 0.66, evidenceSpans: ['越来越慢', '跨部门协同'] },
  } });
  step({ type: 'UNDERSTANDING_CONFIRMED', at: '00:00:05' });

  step({ type: 'METHOD_SELECTED', at: '00:00:06', payload: { id: 'socratic', name: '苏格拉底式探寻' } });
  step({ type: 'TURN_RECORDED', at: '00:00:07', payload: {
    question: '你用什么可观察指标判断战略落地在变慢？',
    answer: '关键里程碑的按期达成率连续两个季度下降',
    latestInsight: '落点可用“里程碑按期达成率”度量',
    nextQuestion: '影响达成率的最主要环节是哪个？',
    questionNodes: [
      { id: 'p1', type: 'phenomenon', text: '里程碑按期达成率下降', source: 'user', confidence: 0.9 },
      { id: 'b1', type: 'boundary', text: '关键里程碑，近两个季度', source: 'user', confidence: 0.85 },
    ],
  } });
  step({ type: 'TURN_RECORDED', at: '00:00:08', payload: {
    question: '影响达成率的最主要环节是哪个？',
    answer: '跨部门交付节点频繁延期，反馈是优先级反复变化',
    latestInsight: '候选机制：优先级频繁变化冲击跨部门交付',
    nextQuestion: '这些延期里，哪些是可控制的条件？',
    questionNodes: [
      { id: 'c1', type: 'cause', text: '优先级频繁变化', source: 'user', confidence: 0.7 },
      { id: 'm1', type: 'mechanism', text: '优先级变化→跨部门交付延误→里程碑延期', source: 'agent-hypothesis', confidence: 0.6 },
      { id: 'r1', type: 'rival', text: '资源不足或目标本身不现实', source: 'agent-hypothesis', confidence: 0.55 },
    ],
  } });
  step({ type: 'TURN_RECORDED', at: '00:00:09', payload: {
    question: '这些延期里，哪些是你可控制的条件？',
    answer: '至少可对照试点团队在固定需求集下的表现',
    latestInsight: '可设计小规模对照来区分“机制”与“资源/目标”解释',
    nextQuestion: '对照的试点团队要具备什么前提？',
    questionNodes: [
      { id: 'e1', type: 'evidence-gap', text: '试点团队在固定需求集下的达成率对照', source: 'agent-hypothesis', confidence: 0.6 },
    ],
  } });
  step({ type: 'RESEARCH_QUESTION_FORGED', at: '00:00:10', payload: {
    businessWording: '战略落地过程中，优先级频繁变化是否以及如何拖累关键里程碑的按期达成率？',
    academicWording: '优先级频繁变化（自变量）如何通过跨部门交付延误（中介）影响里程碑按期达成率（因变量）？',
    independentVariable: '优先级频繁变化程度',
    dependentVariable: '关键里程碑按期达成率',
    mediators: ['跨部门交付延误'],
    moderators: ['团队资源冗余度'],
    unitOfAnalysis: '项目/团队-季度',
    context: '多项目并行推进的专业服务型企业',
    timeBoundary: '近两个季度，前瞻一个季度验证',
    mechanismStatement: '优先级频繁变化 → 跨部门交付节点延误 → 关键里程碑延期',
    rivalExplanations: ['资源不足', '目标本身不现实'],
    evidenceGaps: ['达成率的口径定义', '试点对照数据'],
    evidenceStatus: 'unverified',
    provenanceNodeIds: ['p1', 'c1', 'm1', 'r1', 'e1'],
  } });

  const planPayload = {
    plan: {
      question: '为什么我们的战略落地越来越慢？ — 检索计划',
      baselineConstructs: ['战略落地', '跨部门协同', '优先级管理'],
      queries: [
        { text: '战略执行 优先级 变化 绩效', purpose: 'definition', suggestedAccessDepth: 'abstract' },
        { text: '需求变动 交付延误 项目绩效', purpose: 'rival', suggestedAccessDepth: 'abstract' },
      ],
      expectedSources: ['学术数据库', '权威机构报告'],
      accessDepthPolicy: ['metadata', 'abstract', 'full-text', 'user-provided'],
      boundaries: ['不检索人格/心理诊断', '近 5 年优先'],
      createdAt: now,
    },
    status: 'planned',
    createdAt: at('00:00:11'),
  };
  step({ type: 'RESEARCH_SEARCH_RECORDED', at: '00:00:11', payload: planPayload });

  // 一条含概念核验的证据 + 一条纯引用证据
  step({ type: 'EVIDENCE_ATTACHED', at: '00:00:12', payload: {
    claim: '需求/范围频繁变化与项目交付绩效负相关的证据存在，但机制细节仍需全文核验',
    sourceTitle: '需求变动与项目绩效关系的研究（全文未读）',
    sourceUrl: null,
    sourceType: 'academic',
    accessDepth: 'abstract',
    supports: ['范围变化与交付延误'],
    limitations: ['仅看到摘要，机制方向未作最终确认'],
    retrievedAt: at('00:00:12'),
  } });
  step({ type: 'EVIDENCE_ATTACHED', at: '00:00:13', payload: {
    claim: '“战略落地”在本案例中定义为关键里程碑按期达成率',
    sourceTitle: '用户口径澄清',
    sourceUrl: null,
    sourceType: 'user-provided',
    accessDepth: 'user-provided',
    supports: ['达成率口径'],
    limitations: [],
    retrievedAt: at('00:00:13'),
  } });
  step({ type: 'CONCEPT_VERIFIED', at: '00:00:14', payload: {
    evidenceIndex: s.evidence.length - 1,
    verification: {
      concept: '战略落地速度',
      definitionConsensus: ['以关键里程碑按期达成率度量当前阶段'],
      definitionDivergences: [{ view: '另一主流口径是预算完成率', sourceIds: ['ev-1'] }],
      verifiedConstructRelations: ['与优先级稳定性相关的既往证据'],
      rivalExplanations: ['资源不足', '目标不现实'],
      unresolved: ['达成率口径未与团队确认'],
      provisional: false,
      verifiedAt: at('00:00:14'),
    },
  } });

  step({ type: 'ARTIFACT_RECORDED', at: '00:00:15', payload: {
    type: 'research-brief',
    title: '战略落地变慢：研究简报',
    markdown: [
      '# 研究简报 — 战略落地变慢',
      '',
      '> 提醒：检索计划为 planned 状态，尚未执行真实联网检索；本简报是探寻推演成果，不是已核验文献结论。',
      '',
      '## 研究问题',
      '',
      '战略落地过程中，优先级频繁变化是否以及如何拖累关键里程碑的按期达成率？',
      '',
      '## 未解决项',
      '',
      '- [ ] 达成率口径未与团队确认',
      '- [ ] 试点对照数据待采集',
    ].join('\n'),
    updatedAt: at('00:00:15'),
  } });

  return s;
}

export function validateSession(value) {
  const errors = [];
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ok: false, errors: ['session must be an object'] };
  if (value.schemaVersion !== 1) errors.push('schemaVersion must be 1');
  if (!STAGES.includes(value.stage)) errors.push('stage is invalid');
  if (typeof value.originalQuestion !== 'string' || !value.originalQuestion.trim()) errors.push('originalQuestion is required');
  for (const field of ['questionCluster', 'evidence', 'unresolvedItems']) if (!Array.isArray(value[field])) errors.push(`${field} must be an array`);
  if (value.evidenceSearch !== undefined && !Array.isArray(value.evidenceSearch)) errors.push('evidenceSearch must be an array when present');
  const turnState = value.understanding?.turnState;
  if (turnState) {
    if (typeof turnState.confidence !== 'number' || turnState.confidence < 0 || turnState.confidence > 1) errors.push('turnState.confidence must be between 0 and 1');
    if (!Array.isArray(turnState.evidenceSpans) || turnState.evidenceSpans.length === 0) errors.push('turnState requires evidenceSpans');
  }
  return { ok: errors.length === 0, errors };
}
