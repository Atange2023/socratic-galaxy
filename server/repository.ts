import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { InquiryResultSchema, type InquiryInput, type InquiryResult } from './contracts.ts';

export interface SavedInquiry {
  id: string;
  sessionId: string;
  question: string;
  provider: string;
  result: InquiryResult;
  createdAt: string;
}

export interface InquiryRepository {
  save(input: InquiryInput, result: InquiryResult, provider: string): SavedInquiry;
  getLatest(sessionId: string): SavedInquiry | null;
  close(): void;
}

export function createInquiryRepository(filename: string): InquiryRepository {
  if (filename !== ':memory:') mkdirSync(path.dirname(path.resolve(filename)), { recursive: true });
  const database = new DatabaseSync(filename);
  database.exec(`CREATE TABLE IF NOT EXISTS inquiries (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    question TEXT NOT NULL,
    provider TEXT NOT NULL,
    result_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  ); CREATE INDEX IF NOT EXISTS inquiries_session_created ON inquiries(session_id, created_at DESC);`);
  const insert = database.prepare('INSERT INTO inquiries (id, session_id, question, provider, result_json, created_at) VALUES (?, ?, ?, ?, ?, ?)');
  const latest = database.prepare('SELECT id, session_id, question, provider, result_json, created_at FROM inquiries WHERE session_id = ? ORDER BY created_at DESC LIMIT 1');

  return {
    save(input, result, provider) {
      const saved: SavedInquiry = {
        id: randomUUID(), sessionId: input.sessionId, question: input.question,
        provider, result: InquiryResultSchema.parse(result), createdAt: new Date().toISOString(),
      };
      insert.run(saved.id, saved.sessionId, saved.question, saved.provider, JSON.stringify(saved.result), saved.createdAt);
      return saved;
    },
    getLatest(sessionId) {
      const row = latest.get(sessionId) as Record<string, unknown> | undefined;
      if (!row) return null;
      return {
        id: String(row.id), sessionId: String(row.session_id), question: String(row.question),
        provider: String(row.provider), result: InquiryResultSchema.parse(JSON.parse(String(row.result_json))),
        createdAt: String(row.created_at),
      };
    },
    close() { database.close(); },
  };
}
