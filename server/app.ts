import Fastify from 'fastify';
import { InquiryInputSchema, type InquiryInput, type InquiryResult } from './contracts.ts';

export interface InquiryServiceBoundary {
  providerName: string;
  configured: boolean;
  analyze(input: InquiryInput): Promise<InquiryResult>;
}

function sse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export function buildServer(options: { service: InquiryServiceBoundary; html: string }) {
  const app = Fastify({ logger: false, bodyLimit: 32 * 1024 });
  app.get('/', async (_request, reply) => reply.type('text/html; charset=utf-8').send(options.html));
  app.get('/api/v1/health', async () => ({ ok: true, provider: options.service.providerName, configured: options.service.configured }));
  app.post('/api/v1/inquiry', async (request, reply) => {
    const parsed = InquiryInputSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_inquiry', message: '问题、会话标识或历史记录不符合要求。' });
    reply.hijack();
    reply.raw.writeHead(200, {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform', connection: 'keep-alive', 'x-content-type-options': 'nosniff',
    });
    reply.raw.write(sse('status', { state: 'queued' }));
    reply.raw.write(sse('status', { state: 'analyzing' }));
    try {
      const result = await options.service.analyze(parsed.data);
      reply.raw.write(sse('status', { state: 'guiding', source: result.source }));
      reply.raw.write(sse('result', result));
      reply.raw.write(sse('done', { ok: true }));
    } catch {
      reply.raw.write(sse('error', { code: 'inquiry_failed', message: '本轮分析暂时不可用，请稍后重试。' }));
    } finally {
      reply.raw.end();
    }
  });
  return app;
}
