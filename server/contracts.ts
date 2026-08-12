import { z } from 'zod';

export const InquiryInputSchema = z.object({
  question: z.string().trim().min(1).max(500),
  sessionId: z.string().regex(/^[a-zA-Z0-9_-]+$/).max(128),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().trim().min(1).max(4000),
  })).max(12).default([]),
});

const CandidateQuestionSchema = z.object({
  lens: z.enum(['WHAT', 'WHY', 'HOW', 'EVIDENCE']),
  label: z.string().trim().min(1).max(24),
  text: z.string().trim().min(1).max(280),
  note: z.string().trim().min(1).max(120),
});

export const InquiryResultSchema = z.object({
  source: z.enum(['llm', 'fallback']),
  questionAnalysis: z.object({
    intent: z.string().trim().min(1).max(160),
    form: z.enum(['closed', 'open', 'mixed', 'unclear']),
    clarity: z.number().min(0).max(1),
    assumptions: z.array(z.string().trim().min(1).max(160)).max(6),
    missingDimensions: z.array(z.string().trim().min(1).max(80)).max(8),
  }),
  turnState: z.object({
    uncertainty: z.number().min(0).max(1),
    urgency: z.number().min(0).max(1),
    agency: z.number().min(0).max(1),
    emotionalTone: z.string().trim().min(1).max(40),
    confidence: z.number().min(0).max(1),
    evidenceSpans: z.array(z.string().trim().min(1).max(120)).max(4),
  }),
  guidance: z.object({
    responseTone: z.string().trim().min(1).max(60),
    difficulty: z.enum(['easy', 'medium', 'deep']),
    nextMove: z.string().trim().min(1).max(80),
    reflection: z.string().trim().min(1).max(500),
    mainQuestion: z.string().trim().min(1).max(300),
    candidateQuestions: z.array(CandidateQuestionSchema).min(2).max(4),
  }),
  safety: z.object({
    clinicalInference: z.literal(false),
    humanReviewRequired: z.boolean(),
  }),
});

export type InquiryInput = z.infer<typeof InquiryInputSchema>;
export type InquiryResult = z.infer<typeof InquiryResultSchema>;

export interface InquiryProvider {
  readonly name: string;
  readonly configured: boolean;
  analyze(input: InquiryInput): Promise<InquiryResult>;
}
