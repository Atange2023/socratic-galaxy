import { InquiryInputSchema, InquiryResultSchema, type InquiryInput, type InquiryResult } from './contracts.ts';

export function buildFallbackInquiry(rawInput: InquiryInput): InquiryResult {
  const input = InquiryInputSchema.parse(rawInput);
  const question = input.question.replace(/[？?。！!]+$/u, '');
  const closed = /是否|会不会|能不能|要不要|是不是|可不可以/u.test(question);
  return InquiryResultSchema.parse({
    source: 'fallback',
    questionAnalysis: {
      intent: `继续澄清“${question.slice(0, 72)}”`,
      form: closed ? 'closed' : 'unclear',
      clarity: Math.min(0.68, 0.34 + [...question].length / 180),
      assumptions: closed ? ['当前问题把复杂探索压缩成了是或否'] : [],
      missingDimensions: ['成功标准', '适用场景', '验证证据'],
    },
    turnState: {
      uncertainty: 0.58,
      urgency: 0.3,
      agency: 0.55,
      emotionalTone: '尚待模型分析',
      confidence: 0.2,
      evidenceSpans: [],
    },
    guidance: {
      responseTone: '中性、支持且不作心理判断',
      difficulty: 'easy',
      nextMove: 'clarify_success_criteria',
      reflection: '模型服务当前不可用；先用基础结构帮助你把问题打开，不对你的状态作推断。',
      mainQuestion: '如果这次探索只能先明确一个成功标准，它应该是什么？',
      candidateQuestions: [
        { lens: 'WHAT', label: '先定义', text: '这里最需要先界定的核心概念与成功标准是什么？', note: '把抽象词变成可观察标准' },
        { lens: 'WHY', label: '找机制', text: `为什么“${question}”可能成立，又为什么可能不成立？`, note: '同时寻找推动与阻碍因素' },
        { lens: 'HOW', label: '变路径', text: '如何用一个低成本、可逆的小实验验证这个判断？', note: '把判断转成行动' },
        { lens: 'EVIDENCE', label: '看证据', text: '什么证据会支持或推翻当前判断？', note: '提前定义证据' },
      ],
    },
    safety: { clinicalInference: false, humanReviewRequired: false },
    interaction: {
      observation: question,
      currentExplanation: '尚未确认',
      unknowns: ['需要明确可观察现象', '需要定义关注的结果', '需要区分事实与当前解释'],
      alternativeExplanations: ['尚待用户补充情境后生成'],
      claimStatus: 'hypothesis',
    },
  });
}
