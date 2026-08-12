export const WORKFLOW_STAGES = Object.freeze([
  'capture',
  'understand',
  'method',
  'explore',
  'forge',
  'evidence',
  'artifact',
]);

const EVENT_RULES = Object.freeze({
  ANALYSIS_RECEIVED: { from: ['capture', 'understand'], to: 'understand', key: 'understanding' },
  UNDERSTANDING_CONFIRMED: { from: ['understand'], to: 'method', key: 'understanding' },
  METHOD_SELECTED: { from: ['method'], to: 'explore', key: 'method' },
  METHOD_COMPLETED: { from: ['explore'], to: 'forge', key: 'method' },
  MAINLINE_SELECTED: { from: ['forge'], to: 'forge', key: 'cluster' },
  RESEARCH_QUESTION_CONFIRMED: { from: ['forge'], to: 'evidence', key: 'research' },
  EVIDENCE_REVIEWED: { from: ['evidence'], to: 'evidence', key: 'evidence' },
  ARTIFACT_GENERATED: { from: ['evidence', 'artifact'], to: 'artifact', key: 'artifact' },
});

function cleanQuestion(question) {
  return String(question ?? '').replace(/\s+/g, ' ').trim();
}

function workflowId(now) {
  const stamp = Number.isNaN(Date.parse(now)) ? Date.now() : Date.parse(now);
  return `workflow_${stamp.toString(36)}`;
}

export function createWorkflow(question, now = new Date().toISOString()) {
  const originalQuestion = cleanQuestion(question);
  if (!originalQuestion) throw new Error('A workflow requires an original question.');
  return {
    schemaVersion: 1,
    id: workflowId(now),
    stage: 'capture',
    originalQuestion,
    data: {},
    history: [{ event: 'INQUIRY_CAPTURED', at: now, stage: 'capture' }],
    createdAt: now,
    updatedAt: now,
  };
}

export function canEnterStage(workflow, stage) {
  if (!WORKFLOW_STAGES.includes(stage)) return false;
  const data = workflow?.data ?? {};
  const requirements = {
    capture: true,
    understand: Boolean(data.understanding),
    method: Boolean(data.understanding?.confirmed),
    explore: Boolean(data.method?.methodId),
    forge: Boolean(data.method?.completed),
    evidence: Boolean(data.research?.acceptedQuestionId),
    artifact: Boolean(data.evidence?.reviewed || data.artifact?.artifactId),
  };
  return requirements[stage];
}

function invalid(workflow, message) {
  return { ok: false, value: workflow, error: message };
}

export function transitionWorkflow(workflow, event) {
  if (!workflow || !WORKFLOW_STAGES.includes(workflow.stage)) {
    return invalid(workflow, 'The workflow state is invalid.');
  }
  if (!event?.type) return invalid(workflow, 'A workflow event is required.');

  if (event.type === 'GO_BACK') {
    const target = event.payload?.stage;
    const currentIndex = WORKFLOW_STAGES.indexOf(workflow.stage);
    const targetIndex = WORKFLOW_STAGES.indexOf(target);
    if (targetIndex < 0 || targetIndex >= currentIndex) {
      return invalid(workflow, 'The requested earlier stage is unavailable.');
    }
    return {
      ok: true,
      value: {
        ...workflow,
        stage: target,
        updatedAt: event.at ?? new Date().toISOString(),
        history: [...workflow.history, {
          event: event.type,
          at: event.at ?? new Date().toISOString(),
          stage: target,
          payload: event.payload ?? {},
        }],
      },
    };
  }

  const rule = EVENT_RULES[event.type];
  if (!rule) return invalid(workflow, `Unsupported workflow event: ${event.type}`);
  if (!rule.from.includes(workflow.stage)) {
    const message = event.type === 'METHOD_SELECTED'
      ? 'Confirm the understanding before selecting a method.'
      : `${event.type} cannot run from the ${workflow.stage} stage.`;
    return invalid(workflow, message);
  }

  const at = event.at ?? new Date().toISOString();
  let nextValue = { ...(workflow.data?.[rule.key] ?? {}), ...(event.payload ?? {}) };
  if (event.type === 'UNDERSTANDING_CONFIRMED') nextValue.confirmed = true;
  if (event.type === 'METHOD_COMPLETED') nextValue.completed = true;
  if (event.type === 'EVIDENCE_REVIEWED') nextValue.reviewed = true;

  const value = {
    ...workflow,
    stage: rule.to,
    data: { ...workflow.data, [rule.key]: nextValue },
    history: [...workflow.history, {
      event: event.type,
      at,
      stage: rule.to,
      payload: event.payload ?? {},
    }],
    updatedAt: at,
  };
  return { ok: true, value };
}
