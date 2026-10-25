import assert from 'node:assert/strict';
import test from 'node:test';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import healthHandler from '../api/health';
import fallbackHandler from '../api/[...path]';

test('health route returns a structured success response', () => {
  const responseState: { status?: number; headers: Record<string, string>; body?: unknown } = { headers: {} };
  const response = {
    status(status: number) {
      responseState.status = status;
      return this;
    },
    setHeader(name: string, value: string) {
      responseState.headers[name] = value;
      return this;
    },
    json(body: unknown) {
      responseState.body = body;
      return this;
    }
  } as unknown as VercelResponse;
  healthHandler({ method: 'GET' } as VercelRequest, response);
  assert.equal(responseState.status, 200);
  assert.deepEqual(responseState.body, { success: true, service: 'ussf-api' });
});

test('unimplemented API routes fail explicitly with JSON 501', () => {
  const responseState: { status?: number; headers: Record<string, string>; body?: unknown } = { headers: {} };
  const response = {
    status(status: number) {
      responseState.status = status;
      return this;
    },
    setHeader(name: string, value: string) {
      responseState.headers[name] = value;
      return this;
    },
    json(body: unknown) {
      responseState.body = body;
      return this;
    }
  } as unknown as VercelResponse;
  fallbackHandler({ method: 'POST', query: { path: ['claims'] } } as unknown as VercelRequest, response);
  assert.equal(responseState.status, 501);
  assert.match((responseState.body as { error: string }).error, /POST \/api\/claims/);
});
