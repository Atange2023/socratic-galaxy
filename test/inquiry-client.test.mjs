import test from 'node:test';
import assert from 'node:assert/strict';
import { canUseInquiryApi, requestInquiry } from '../src/inquiry-client.mjs';

test('file mode stays offline while HTTP mode can use the inquiry API', () => {
  assert.equal(canUseInquiryApi('file:'), false);
  assert.equal(canUseInquiryApi('http:'), true);
  assert.equal(canUseInquiryApi('https:'), true);
});

test('requestInquiry parses chunked SSE events in order', async () => {
  const observed = [];
  const stream = [
    'event: status\ndata: {"state":"analyzing"}\n',
    '\nevent: result\ndata: {"source":"llm","guidance":{"mainQuestion":"先验证什么？"}}\n\n',
    'event: done\ndata: {"ok":true}\n\n',
  ];
  const fetchImpl = async () => new Response(new ReadableStream({
    pull(controller) {
      const chunk = stream.shift();
      if (chunk == null) return controller.close();
      controller.enqueue(new TextEncoder().encode(chunk));
    },
  }), { status: 200, headers: { 'content-type': 'text/event-stream' } });

  const result = await requestInquiry(
    { question: 'AI 如何创造利润？', sessionId: 'session_client', history: [] },
    { status: (data) => observed.push(data.state), result: (data) => observed.push(data.source), done: () => observed.push('done') },
    fetchImpl,
  );

  assert.deepEqual(observed, ['analyzing', 'llm', 'done']);
  assert.equal(result.guidance.mainQuestion, '先验证什么？');
});

test('requestInquiry rejects non-success HTTP responses', async () => {
  const fetchImpl = async () => new Response('{"error":"invalid_inquiry"}', { status: 400 });
  await assert.rejects(
    requestInquiry({ question: 'x', sessionId: 'session_error', history: [] }, {}, fetchImpl),
    /Inquiry API returned HTTP 400/,
  );
});
