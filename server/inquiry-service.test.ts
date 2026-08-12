import test from 'node:test';
import assert from 'node:assert/strict';
import type { InquiryProvider, InquiryResult } from './contracts.ts';
import { createInquiryRepository } from './repository.ts';
import { createInquiryService } from './inquiry-service.ts';

const llmResult: InquiryResult = {
  source: 'llm',
  questionAnalysis: { intent: '澄清目标', form: 'open', clarity: 0.7, assumptions: [], missingDimensions: ['时间范围'] },
  turnState: { uncertainty: 0.6, urgency: 0.2, agency: 0.8, emotionalTone: '认真探索', confidence: 0.72, evidenceSpans: ['如何开始'] },
  guidance: {
    responseTone: '支持且具体', difficulty: 'medium', nextMove: 'define_scope',
    reflection: '你已经准备开始，但还需要缩小范围。', mainQuestion: '未来七天最值得验证的一件事是什么？',
    candidateQuestions: [
      { lens: 'WHAT', label: '定义', text: '成功具体是什么？', note: '明确结果' },
      { lens: 'HOW', label: '行动', text: '最小实验是什么？', note: '开始验证' },
    ],
  },
  safety: { clinicalInference: false, humanReviewRequired: false },
};

test('inquiry service persists a validated provider result', async () => {
  const provider: InquiryProvider = { name: 'test-llm', configured: true, analyze: async () => llmResult };
  const repository = createInquiryRepository(':memory:');
  const service = createInquiryService({ provider, repository });

  const result = await service.analyze({ question: '我该如何开始？', sessionId: 'session_ok', history: [] });
  const saved = repository.getLatest('session_ok');

  assert.equal(result.source, 'llm');
  assert.equal(saved?.provider, 'test-llm');
  assert.deepEqual(saved?.result, llmResult);
  assert.equal(JSON.stringify(saved).includes('reasoning_content'), false);
  repository.close();
});

test('inquiry service returns and persists an explicit fallback when provider is unavailable', async () => {
  const provider: InquiryProvider = {
    name: 'deepseek', configured: false,
    analyze: async () => { throw new Error('must not be called'); },
  };
  const repository = createInquiryRepository(':memory:');
  const service = createInquiryService({ provider, repository });

  const result = await service.analyze({ question: 'AI 是否会帮助公司赚钱？', sessionId: 'session_fallback', history: [] });

  assert.equal(result.source, 'fallback');
  assert.equal(result.safety.clinicalInference, false);
  assert.ok(result.guidance.candidateQuestions.length >= 2);
  assert.equal(repository.getLatest('session_fallback')?.provider, 'fallback');
  repository.close();
});
