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

	describe('AI-solo campaign start', () => {
		it('rejects starting a solo run if the character is already linked to another campaign', async () => {
			const username = `test_user_${Math.random().toString(16).slice(2)}`;
			const password = 'testpass123';

			// Register
			{
				const req = new Request('http://example.com/api/register', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ username, password }),
				});
				const ctx = createExecutionContext();
				const res = await worker.fetch(req, env, ctx);
				await waitOnExecutionContext(ctx);
				expect(res.status).toBe(201);
			}

			// Fetch an adventureId
			let adventureId = '';
			{
				const req = new Request('http://example.com/api/adventures');
				const ctx = createExecutionContext();
				const res = await worker.fetch(req, env, ctx);
				await waitOnExecutionContext(ctx);
				expect(res.status).toBe(200);
				const json = (await res.json()) as any;
				const adventures = Array.isArray(json?.adventures) ? json.adventures : [];
				expect(adventures.length).toBeGreaterThan(0);
				adventureId = String(adventures[0].id || '');
				expect(adventureId.length).toBeGreaterThan(0);
			}

			// Forge a character
			let characterId = '';
			{
				const req = new Request('http://example.com/api/characters/forge', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						username,
						name: 'Tester',
						narrativeText: 'A brave level 1 fighter from a small village.',
						dryRun: false,
					}),
				});
				const ctx = createExecutionContext();
				const res = await worker.fetch(req, env, ctx);
				await waitOnExecutionContext(ctx);
				expect(res.status).toBe(201);
				const json = (await res.json()) as any;
				characterId = String(json?.character?.id || '');
				expect(characterId.length).toBeGreaterThan(0);
			}

			// Create a standard campaign
			let campaignId = '';
			{
				const req = new Request('http://example.com/api/campaigns', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						name: 'Test Campaign',
						dm: username,
						participants: [username],
					}),
				});
				const ctx = createExecutionContext();
				const res = await worker.fetch(req, env, ctx);
				await waitOnExecutionContext(ctx);
				expect(res.status).toBe(201);
				const json = (await res.json()) as any;
				campaignId = String(json?.campaign?.id || '');
				expect(campaignId.length).toBeGreaterThan(0);
			}

			// Link the character to that campaign
			{
				const req = new Request('http://example.com/api/campaigns/details', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						campaignId,
						username,
						action: 'linkCharacter',
						characterId,
					}),
				});
				const ctx = createExecutionContext();
				const res = await worker.fetch(req, env, ctx);
				await waitOnExecutionContext(ctx);
				expect(res.status).toBe(200);
				const json = (await res.json()) as any;
				expect(json?.ok).toBe(true);
			}

			// Now starting an AI-solo campaign should be rejected
			{
				const req = new Request('http://example.com/api/ai-campaigns/start', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ username, characterId, adventureId }),
				});
				const ctx = createExecutionContext();
				const res = await worker.fetch(req, env, ctx);
				await waitOnExecutionContext(ctx);
				expect(res.status).toBe(409);
				const json = (await res.json()) as any;
				expect(String(json?.error || '')).toMatch(/already linked/i);
			}
		});
	});
});
