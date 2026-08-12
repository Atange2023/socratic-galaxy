import {
  InquiryInputSchema,
  InquiryResultSchema,
  type InquiryInput,
  type InquiryProvider,
  type InquiryResult,
} from '../contracts.ts';

const DEFAULT_BASE_URL = 'https://api.deepseek.com';
const DEFAULT_MODEL = 'deepseek-v4-flash';

const SYSTEM_PROMPT = `你是“问启星河”的苏格拉底式探寻编排器。分析用户这一轮问题，而不是诊断人格、疾病或永久心理特征。
只输出 json 对象，不要 Markdown，不要解释推理过程。所有概率均为 0 到 1。turnState 是带置信度的本轮工作假设；evidenceSpans 只能摘录用户原文。候选问题应覆盖 WHAT、WHY、HOW、EVIDENCE 中至少两个方向。
输出字段必须严格符合：
{"source":"llm","questionAnalysis":{"intent":"string","form":"closed|open|mixed|unclear","clarity":0.5,"assumptions":[],"missingDimensions":[]},"turnState":{"uncertainty":0.5,"urgency":0.5,"agency":0.5,"emotionalTone":"string","confidence":0.5,"evidenceSpans":[]},"guidance":{"responseTone":"string","difficulty":"easy|medium|deep","nextMove":"string","reflection":"string","mainQuestion":"string","candidateQuestions":[{"lens":"WHAT","label":"string","text":"string","note":"string"}]},"safety":{"clinicalInference":false,"humanReviewRequired":false}}`;

type FetchLike = typeof fetch;

export interface DeepSeekProviderConfig {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
}

function messageContent(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const choices = (payload as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || !choices[0] || typeof choices[0] !== 'object') return null;
  const message = (choices[0] as { message?: unknown }).message;
  if (!message || typeof message !== 'object') return null;
  const content = (message as { content?: unknown }).content;
  return typeof content === 'string' && content.trim() ? content : null;
}

export function createDeepSeekProvider(config: DeepSeekProviderConfig): InquiryProvider {
  const apiKey = String(config.apiKey ?? '').trim();
  const fetchImpl = config.fetchImpl ?? fetch;
  const baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '');
  const model = config.model ?? DEFAULT_MODEL;
  const timeoutMs = config.timeoutMs ?? 30_000;

  return {
    name: 'deepseek',
    configured: Boolean(apiKey),
    async analyze(rawInput: InquiryInput): Promise<InquiryResult> {
      const input = InquiryInputSchema.parse(rawInput);
      if (!apiKey) throw new Error('DeepSeek provider is not configured');

      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const response = await fetchImpl(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
              authorization: `Bearer ${apiKey}`,
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              model,
              messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                ...input.history,
                { role: 'user', content: input.question },
              ],
              response_format: { type: 'json_object' },
              thinking: { type: 'disabled' },
              max_tokens: 1800,
              user_id: input.sessionId,
            }),
            signal: AbortSignal.timeout(timeoutMs),
          });
          if (!response.ok) continue;
          const content = messageContent(await response.json());
          if (!content) continue;
          const result = InquiryResultSchema.safeParse(JSON.parse(content));
          if (result.success) return { ...result.data, source: 'llm' };
        } catch {
          // Retry once; expose only a provider-neutral error below.
        }
      }
      throw new Error('DeepSeek returned an invalid response after 2 attempts');
    },
  };
}
