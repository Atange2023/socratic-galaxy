const GOLDEN_PATTERN = /公司.*增长.*(执行力|团队)|增长慢.*执行力/u;

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

export function analyzeDemoQuestion(question) {
  const text = clean(question);
  if (!text) throw new Error('演示分析需要一个原始问题。');
  const golden = GOLDEN_PATTERN.test(text);

  if (golden) {
    return {
      source: 'demo',
      disclosure: '由预置演示引擎生成，非本轮实时联网研究。',
      originalQuestion: text,
      observation: '公司增长正在放缓，但具体指标与起始时间尚未明确',
      currentExplanation: '团队执行力可能不足',
      unknowns: [
        '“增长慢”具体对应哪个指标、从何时开始',
        '执行力具体指目标、能力、协作、资源还是激励',
        '外部需求、线索质量或产品竞争力是否同时变化',
      ],
      toneHypothesis: '这件事可能较紧迫，而且你对团队已有一些失望',
      confidence: 0.78,
      claimStatus: 'hypothesis',
      alternativeExplanations: ['线索质量下降', '客户预算收缩', '战略重点变化', '销售与产品交接变慢'],
      corrections: [],
    };
  }

  return {
    source: 'demo',
    disclosure: '由非联网演示引擎生成，仅用于展示梳理流程，不代表事实判断。',
    originalQuestion: text,
    observation: text.replace(/[？?]+$/u, ''),
    currentExplanation: '尚未确认',
    unknowns: ['需要明确可观察现象', '需要定义关注的结果', '需要区分事实与当前解释'],
    toneHypothesis: '暂不推断',
    confidence: 0.35,
    claimStatus: 'hypothesis',
    alternativeExplanations: ['尚待用户补充情境后生成'],
    corrections: [],
  };
}

export function correctUnderstanding(analysis, field, value, at = new Date().toISOString()) {
  const allowed = ['observation', 'currentExplanation', 'toneHypothesis'];
  if (!allowed.includes(field)) throw new Error(`不可校正的理解字段：${field}`);
  const nextValue = clean(value);
  if (!nextValue) throw new Error('校正内容不能为空。');
  return {
    ...analysis,
    [field]: nextValue,
    corrections: [...(analysis.corrections ?? []), {
      field,
      previousValue: analysis[field],
      value: nextValue,
      at,
    }],
  };
}
