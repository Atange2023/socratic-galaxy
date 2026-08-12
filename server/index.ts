import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { buildServer } from './app.ts';
import { createInquiryRepository } from './repository.ts';
import { createInquiryService } from './inquiry-service.ts';
import { createDeepSeekProvider } from './providers/deepseek.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = await readFile(path.join(root, 'dist', 'index.html'), 'utf8');
const repository = createInquiryRepository(process.env.INQUIRY_DB_PATH || path.join(root, '.data', 'inquiries.sqlite'));
const provider = createDeepSeekProvider({
  apiKey: process.env.DEEPSEEK_API_KEY || '', model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
  baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
});
const service = createInquiryService({ provider, repository });
const app = buildServer({ service, html });
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || '127.0.0.1';
await app.listen({ port, host });
console.log(`问启星河服务已启动：http://${host}:${port}（模型：${provider.configured ? provider.name : '本地降级'}）`);

async function shutdown() { await app.close(); repository.close(); }
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
