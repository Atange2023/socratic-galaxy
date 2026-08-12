import { InquiryInputSchema, type InquiryInput, type InquiryProvider, type InquiryResult } from './contracts.ts';
import { buildFallbackInquiry } from './fallback.ts';
import type { InquiryRepository } from './repository.ts';

export function createInquiryService(options: { provider: InquiryProvider; repository: InquiryRepository }) {
  return {
    providerName: options.provider.name,
    configured: options.provider.configured,
    async analyze(rawInput: InquiryInput): Promise<InquiryResult> {
      const input = InquiryInputSchema.parse(rawInput);
      let result: InquiryResult;
      let providerName = options.provider.name;
      if (options.provider.configured) {
        try {
          result = await options.provider.analyze(input);
        } catch {
          result = buildFallbackInquiry(input);
          providerName = 'fallback';
        }
      } else {
        result = buildFallbackInquiry(input);
        providerName = 'fallback';
      }
      options.repository.save(input, result, providerName);
      return result;
    },
  };
}
