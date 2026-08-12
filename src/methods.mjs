function method(id, name, reason, minutes, expectedOutputs, questionsCount) {
  return { id, name, reason, minutes, expectedOutputs, questionsCount };
}

export function recommendMethods(analysis, timeBudget = 12) {
  const hasAttribution = analysis.currentExplanation && analysis.currentExplanation !== '尚未确认';
  const primary = method(
    'socratic',
    '苏格拉底式澄清',
    hasAttribution
      ? '当前表达已经包含较强归因或假设，先澄清定义、证据和替代解释，可以避免过早追错原因。'
      : '当前现象和解释还没有分开，先用短问题澄清关注结果和判断依据。',
    timeBudget <= 8 ? 8 : 12,
    ['更准确的问题', '待验证假设', '证据缺口'],
    timeBudget <= 8 ? 4 : 5,
  );
  return {
    primary,
    alternatives: [
      method('five-whys', '多因版 5-Why', '如果你更想追查原因，可从多个候选原因分别向下验证。', 10, ['原因树', '验证点'], 5),
      method('nine-grid', '九宫扩展', '如果问题视角过窄，可先补足相邻维度。', 12, ['维度地图', '遗漏视角'], 8),
    ],
    disclosure: analysis.disclosure,
  };
}

function questionsFor(analysis) {
  const explanation = analysis.currentExplanation === '尚未确认'
    ? '当前解释'
    : analysis.currentExplanation;
  return [
    { id: 'evidence', kind: 'evidence', text: `什么证据会让你相信这是“${explanation}”，而不是其他解释造成的？` },
    { id: 'definition', kind: 'definition', text: `这里的“${explanation}”具体指哪些可以观察的行为或结果？` },
    { id: 'counterexample', kind: 'counterexample', text: '有没有哪个团队表现符合你的期待，但结果依然没有改善？' },
    { id: 'boundary', kind: 'boundary', text: '这个判断在哪些部门、时间或客户情境中可能不成立？' },
    { id: 'action', kind: 'action', text: '如果只能先验证一件事，你最想拿到哪项数据？' },
  ];
}

export function createSocraticRun(analysis, options = {}) {
  const timeBudget = Number(options.timeBudget ?? 12);
  const mode = timeBudget <= 8 ? 'short' : 'standard';
  const questions = questionsFor(analysis).slice(0, mode === 'short' ? 4 : 5);
  return {
    id: `socratic_${Date.now().toString(36)}`,
    methodId: 'socratic',
    mode,
    questions,
    currentTurn: 0,
    answers: [],
    outputs: { observations: [], assumptions: [], evidenceNeeds: [], newQuestions: [] },
    status: 'in_progress',
  };
}

function extractEvidenceNeed(answer) {
  if (/漏斗/u.test(answer)) return '拆分销售漏斗各阶段数据，定位转化下降发生的位置';
  if (/数据|没有|尚未|只是.*感觉/u.test(answer)) return '补充能支持或推翻当前解释的一手数据';
  return '为这项判断补充可核验的事实或反例';
}

export function answerSocraticTurn(run, rawAnswer) {
  const answer = String(rawAnswer ?? '').replace(/\s+/g, ' ').trim();
  if (!answer) throw new Error('请先写下这一问的回答。');
  if (run.status !== 'in_progress') throw new Error('这轮练习已经结束。');
  const question = run.questions[run.currentTurn];
  if (!question) throw new Error('当前没有待回答问题。');
  const nextTurn = run.currentTurn + 1;
  const completed = nextTurn >= run.questions.length;
  const evidenceNeed = extractEvidenceNeed(answer);
  return {
    ...run,
    currentTurn: nextTurn,
    answers: [...run.answers, { questionId: question.id, answer }],
    outputs: {
      ...run.outputs,
      evidenceNeeds: [...run.outputs.evidenceNeeds, evidenceNeed],
    },
    feedback: '我先把这段内容记为当前观察，并把尚未获得的证据单独列出。',
    status: completed ? 'completed' : 'in_progress',
  };
}
