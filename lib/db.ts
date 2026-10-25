import { neon } from '@neondatabase/serverless';

export interface PersistentState {
  version: number;
  lastUpdated: string;
  members: Array<{ cid?: string; accountName?: string }>;
  linkRequests: Array<{
    id: string;
    username: string;
    inGameName: string;
    inGameCid: string;
    ingameRank: string;
    f5ScreenshotUrl: string;
    submissionDate: string;
    status: 'Pending' | 'Approved' | 'Rejected';
    reviewedBy?: string;
    adminNote?: string;
  }>;
  applications: unknown[];
  groupInfo: Record<string, unknown>;
  customAssets: Array<Record<string, unknown> & { id: string }>;
  [key: string]: unknown;
}

export function getSql() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not configured for this Vercel environment.');
  return neon(connectionString);
}

export async function readState() {
  const sql = getSql();
  const rows = await sql`SELECT state FROM ussf_app_state WHERE id = 1`;
  if (!rows[0]?.state) {
    throw new Error('Shared database is not initialized. Run npm run migrate:neon with DATABASE_URL.');
  }
  return rows[0].state as PersistentState;
}

export function sendApiError(res: { status: (code: number) => { json: (body: unknown) => unknown }; json: (body: unknown) => unknown }, error: unknown) {
  const message = error instanceof Error ? error.message : 'Unexpected server error.';
  const status = message.includes('DATABASE_URL is not configured') || message.includes('database is not initialized') ? 503 : 500;
  if (status === 500) console.error('[USSF API]', error);
  return res.status(status).json({ success: false, error: status === 500 ? 'Persistent storage request failed.' : message });
}
