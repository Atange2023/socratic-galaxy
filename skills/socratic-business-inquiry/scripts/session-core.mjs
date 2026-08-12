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

export function validateSession(value) {
  const errors = [];
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ok: false, errors: ['session must be an object'] };
  if (value.schemaVersion !== 1) errors.push('schemaVersion must be 1');
  if (!STAGES.includes(value.stage)) errors.push('stage is invalid');
  if (typeof value.originalQuestion !== 'string' || !value.originalQuestion.trim()) errors.push('originalQuestion is required');
  for (const field of ['questionCluster', 'evidence', 'unresolvedItems']) if (!Array.isArray(value[field])) errors.push(`${field} must be an array`);
  const turnState = value.understanding?.turnState;
  if (turnState) {
    if (typeof turnState.confidence !== 'number' || turnState.confidence < 0 || turnState.confidence > 1) errors.push('turnState.confidence must be between 0 and 1');
    if (!Array.isArray(turnState.evidenceSpans) || turnState.evidenceSpans.length === 0) errors.push('turnState requires evidenceSpans');
  }
  return { ok: errors.length === 0, errors };
}
