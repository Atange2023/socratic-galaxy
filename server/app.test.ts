import test from 'node:test';
import assert from 'node:assert/strict';
import { buildServer } from './app.ts';
import type { InquiryInput, InquiryResult } from './contracts.ts';

const result: InquiryResult = {
  source: 'fallback',
  questionAnalysis: { intent: '测试', form: 'open', clarity: 0.5, assumptions: [], missingDimensions: [] },
  turnState: { uncertainty: 0.5, urgency: 0.2, agency: 0.5, emotionalTone: '尚待模型分析', confidence: 0.2, evidenceSpans: [] },
  guidance: {
    responseTone: '中性', difficulty: 'easy', nextMove: 'clarify', reflection: '先澄清。', mainQuestion: '成功标准是什么？',
    candidateQuestions: [
      { lens: 'WHAT', label: '定义', text: '是什么？', note: '定义' },
      { lens: 'HOW', label: '行动', text: '怎么做？', note: '行动' },
    ],
  },
  safety: { clinicalInference: false, humanReviewRequired: false },
};

function service() {
  return {
    providerName: 'deepseek', configured: false,
    async analyze(_input: InquiryInput) { return result; },
  };
}

test('health reports provider mode without exposing secrets', async () => {
  const app = buildServer({ service: service(), html: '<!doctype html><title>问启星河</title>' });
  const response = await app.inject({ method: 'GET', url: '/api/v1/health' });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { ok: true, provider: 'deepseek', configured: false });
  assert.equal(response.body.includes('apiKey'), false);
  await app.close();
});

test('root serves the self-contained application', async () => {
  const app = buildServer({ service: service(), html: '<!doctype html><title>问启星河</title>' });
  const response = await app.inject({ method: 'GET', url: '/' });
  assert.equal(response.statusCode, 200);
  const contentType = response.headers['content-type'];
  if (typeof contentType !== 'string') assert.fail('expected a string content-type header');
  assert.match(contentType, /text\/html/);
  assert.match(response.body, /问启星河/);
  await app.close();
});

test('inquiry validates input before starting an event stream', async () => {
  const app = buildServer({ service: service(), html: 'ok' });
  const response = await app.inject({ method: 'POST', url: '/api/v1/inquiry', payload: { question: '' } });
  assert.equal(response.statusCode, 400);
  assert.equal(response.json().error, 'invalid_inquiry');
  await app.close();
});

test('inquiry returns ordered SSE status, result, and completion events', async () => {
  const app = buildServer({ service: service(), html: 'ok' });
  const response = await app.inject({
    method: 'POST', url: '/api/v1/inquiry',
    payload: { question: '我该如何开始？', sessionId: 'session_sse', history: [] },
  });
  assert.equal(response.statusCode, 200);
  const contentType = response.headers['content-type'];
  if (typeof contentType !== 'string') assert.fail('expected a string content-type header');
  assert.match(contentType, /text\/event-stream/);
  const names = [...response.body.matchAll(/^event: (.+)$/gm)].map((match) => match[1].trim());
  assert.deepEqual(names, ['status', 'status', 'status', 'result', 'done']);
  assert.match(response.body, /"state":"analyzing"/);
  assert.match(response.body, /"mainQuestion":"成功标准是什么？"/);
  await app.close();
});
