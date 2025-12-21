import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../src';

describe('ADA backend worker', () => {
	describe('health endpoint', () => {
		it('/api/health responds with ok (unit style)', async () => {
			const request = new Request<unknown, IncomingRequestCfProperties>('http://example.com/api/health');
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);
			expect(response.status).toBe(200);
			const json = await response.json();
			expect(json).toEqual({ status: 'ok' });
		});

		it('/api/health responds with ok (integration style)', async () => {
			const request = new Request('http://example.com/api/health');
			const response = await SELF.fetch(request);
			expect(response.status).toBe(200);
			const json = await response.json();
			expect(json).toEqual({ status: 'ok' });
		});
	});

	describe('unknown route handling', () => {
		it('returns JSON 404 for unknown paths', async () => {
			const request = new Request<unknown, IncomingRequestCfProperties>('http://example.com/does-not-exist');
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);
			expect(response.status).toBe(404);
			const json = await response.json();
			expect(json).toEqual({ error: 'Not Found' });
		});
	});
});
