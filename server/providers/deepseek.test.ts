import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeepSeekProvider } from './deepseek.ts';

const validResult = {
  source: 'llm',
  questionAnalysis: {
    intent: '验证商业回报',
    form: 'closed',
    clarity: 0.62,
    assumptions: ['AI 会直接带来利润'],
    missingDimensions: ['利润定义', '时间范围'],
  },
  turnState: {
    uncertainty: 0.7,
    urgency: 0.4,
    agency: 0.66,
    emotionalTone: '谨慎期待',
    confidence: 0.63,
    evidenceSpans: ['真的能帮助公司赚钱吗'],
  },
  guidance: {
    responseTone: '支持但不迎合',
    difficulty: 'medium',
    nextMove: 'clarify_success_criteria',
    reflection: '你真正关心的是可验证的商业回报。',
    mainQuestion: '你希望先验证收入增长、成本下降还是风险降低？',
    candidateQuestions: [
      { lens: 'WHAT', label: '定义结果', text: '赚钱具体指什么？', note: '明确成功标准' },
      { lens: 'WHY', label: '检验机制', text: '为什么 AI 可能带来利润？', note: '寻找因果机制' },
      { lens: 'HOW', label: '设计实验', text: '如何低成本验证？', note: '形成行动' },
      { lens: 'EVIDENCE', label: '寻找证据', text: '什么证据会推翻判断？', note: '避免确认偏误' },
    ],
  },
  safety: { clinicalInference: false, humanReviewRequired: false },
};

test('DeepSeek adapter retries invalid JSON once and returns validated guidance', async () => {
  const requests: Array<{ url: string; init: RequestInit }> = [];
  const replies = [
    { choices: [{ message: { content: '' } }] },
    { choices: [{ message: { content: JSON.stringify(validResult), reasoning_content: 'hidden chain' } }] },
  ];
  const fetchImpl: typeof fetch = async (url, init) => {
    requests.push({ url: String(url), init: init ?? {} });
    return new Response(JSON.stringify(replies.shift()), { status: 200 });
  };
  const provider = createDeepSeekProvider({ apiKey: 'secret-key', fetchImpl });

  const result = await provider.analyze({ question: 'AI 是否真的能帮助公司赚钱？', sessionId: 'session_1', history: [] });

  assert.equal(requests.length, 2);
  assert.equal(result.guidance.mainQuestion, validResult.guidance.mainQuestion);
  assert.equal('reasoning_content' in result, false);
  assert.equal(new Headers(requests[0].init.headers).get('authorization'), 'Bearer secret-key');
  const body = JSON.parse(String(requests[0].init.body));
  assert.equal(body.model, 'deepseek-v4-flash');
  assert.deepEqual(body.response_format, { type: 'json_object' });
  assert.equal(body.user_id, 'session_1');
});

test('DeepSeek adapter fails without leaking the API key after two invalid responses', async () => {
  const fetchImpl: typeof fetch = async () => new Response(JSON.stringify({ choices: [{ message: { content: '{}' } }] }), { status: 200 });
  const provider = createDeepSeekProvider({ apiKey: 'never-print-this', fetchImpl });

  await assert.rejects(
    provider.analyze({ question: '为什么？', sessionId: 'session_2', history: [] }),
    (error: Error) => !error.message.includes('never-print-this') && /invalid response/i.test(error.message),
  );
});
