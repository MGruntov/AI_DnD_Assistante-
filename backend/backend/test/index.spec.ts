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

	describe('Grand Library of Fate templates', () => {
		it('supports template create -> list -> update -> delete, and decrements the 3-template limit on delete', async () => {
			const username = `architect_${Math.random().toString(16).slice(2)}`;
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

			// Create a template
			let templateId = '';
			{
				const req = new Request('http://example.com/api/templates/create', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						username,
						name: 'The Test Template',
						templateSummary: 'A template used for automated tests.',
						templateTags: ['test', 'library'],
						canonTimeline: [
							{ title: 'Canon Event One', description: 'The first inevitable thing happens.', nudgeIdeas: ['A messenger arrives.'] },
						],
					}),
				});
				const ctx = createExecutionContext();
				const res = await worker.fetch(req, env, ctx);
				await waitOnExecutionContext(ctx);
				expect(res.status).toBe(201);
				const json = (await res.json()) as any;
				expect(json?.ok).toBe(true);
				templateId = String(json?.template?.id || '');
				expect(templateId.length).toBeGreaterThan(0);
			}

			// List public templates and ensure it appears
			{
				const req = new Request('http://example.com/api/templates/public');
				const ctx = createExecutionContext();
				const res = await worker.fetch(req, env, ctx);
				await waitOnExecutionContext(ctx);
				expect(res.status).toBe(200);
				const json = (await res.json()) as any;
				const templates = Array.isArray(json?.templates) ? json.templates : [];
				expect(templates.some((t: any) => String(t?.id || '') === templateId)).toBe(true);
			}

			// Update template name + canon timeline
			{
				const req = new Request('http://example.com/api/templates/update', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						username,
						templateId,
						name: 'The Updated Test Template',
						canonTimeline: [
							{ title: 'Canon Event One', description: 'The first inevitable thing happens.' },
							{ title: 'Canon Event Two', description: 'A second inevitability follows.' },
						],
					}),
				});
				const ctx = createExecutionContext();
				const res = await worker.fetch(req, env, ctx);
				await waitOnExecutionContext(ctx);
				expect(res.status).toBe(200);
				const json = (await res.json()) as any;
				expect(json?.ok).toBe(true);
				expect(String(json?.template?.name || '')).toMatch(/updated/i);
				const canon = Array.isArray(json?.template?.canonTimeline) ? json.template.canonTimeline : [];
				expect(canon.length).toBe(2);
			}

			// Verify 3-template limit: create two more, then a 4th should fail
			let template2 = '';
			let template3 = '';
			{
				const mk = async (name: string) => {
					const req = new Request('http://example.com/api/templates/create', {
						method: 'POST',
						headers: { 'content-type': 'application/json' },
						body: JSON.stringify({
							username,
							name,
							canonTimeline: [{ title: 'Only Event', description: 'Just one.' }],
						}),
					});
					const ctx = createExecutionContext();
					const res = await worker.fetch(req, env, ctx);
					await waitOnExecutionContext(ctx);
					return res;
				};

				// We already have 1 template (templateId). Add 2 more.
				{
					const res = await mk('Template Two');
					expect(res.status).toBe(201);
					const json = (await res.json()) as any;
					template2 = String(json?.template?.id || '');
					expect(template2.length).toBeGreaterThan(0);
				}
				{
					const res = await mk('Template Three');
					expect(res.status).toBe(201);
					const json = (await res.json()) as any;
					template3 = String(json?.template?.id || '');
					expect(template3.length).toBeGreaterThan(0);
				}

				// 4th should fail
				{
					const res = await mk('Template Four (Should Fail)');
					expect(res.status).toBe(403);
					const json = (await res.json()) as any;
					expect(String(json?.error || '')).toMatch(/limit/i);
				}
			}

			// Delete one template and then creating another should succeed
			{
				const req = new Request('http://example.com/api/templates/delete', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ username, templateId: template2 }),
				});
				const ctx = createExecutionContext();
				const res = await worker.fetch(req, env, ctx);
				await waitOnExecutionContext(ctx);
				expect(res.status).toBe(200);
				const json = (await res.json()) as any;
				expect(json?.ok).toBe(true);
			}
			{
				const req = new Request('http://example.com/api/templates/create', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						username,
						name: 'Template Four (Now Allowed)',
						canonTimeline: [{ title: 'Only Event', description: 'Just one.' }],
					}),
				});
				const ctx = createExecutionContext();
				const res = await worker.fetch(req, env, ctx);
				await waitOnExecutionContext(ctx);
				expect(res.status).toBe(201);
			}

			// Delete the original template and ensure it disappears from public listing
			{
				const req = new Request('http://example.com/api/templates/delete', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ username, templateId }),
				});
				const ctx = createExecutionContext();
				const res = await worker.fetch(req, env, ctx);
				await waitOnExecutionContext(ctx);
				expect(res.status).toBe(200);
			}
			{
				const req = new Request('http://example.com/api/templates/public');
				const ctx = createExecutionContext();
				const res = await worker.fetch(req, env, ctx);
				await waitOnExecutionContext(ctx);
				expect(res.status).toBe(200);
				const json = (await res.json()) as any;
				const templates = Array.isArray(json?.templates) ? json.templates : [];
				expect(templates.some((t: any) => String(t?.id || '') === templateId)).toBe(false);
			}

			// Cleanup: delete remaining templates (best-effort)
			for (const tid of [template3]) {
				const req = new Request('http://example.com/api/templates/delete', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ username, templateId: tid }),
				});
				const ctx = createExecutionContext();
				await worker.fetch(req, env, ctx);
				await waitOnExecutionContext(ctx);
			}
		});

		it('enforces canon progression server-side for Hidden Hand turns', async () => {
			const username = `player_${Math.random().toString(16).slice(2)}`;
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

			// Forge a character (must be unlinked)
			let characterId = '';
			{
				const req = new Request('http://example.com/api/characters/forge', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						username,
						name: 'Hidden Hand Tester',
						narrativeText: 'A curious wanderer who keeps finding the same door.',
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

			// Create a template with 2 canon events
			let templateId = '';
			{
				const req = new Request('http://example.com/api/templates/create', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						username,
						name: 'Canon Enforcement Template',
						canonTimeline: [
							{ title: 'First Door', description: 'The first door must be found.' },
							{ title: 'Second Door', description: 'The second door must be opened.' },
						],
					}),
				});
				const ctx = createExecutionContext();
				const res = await worker.fetch(req, env, ctx);
				await waitOnExecutionContext(ctx);
				expect(res.status).toBe(201);
				const json = (await res.json()) as any;
				templateId = String(json?.template?.id || '');
				expect(templateId.length).toBeGreaterThan(0);
			}

			// Instantiate a private run
			let campaignId = '';
			let firstCanonId = '';
			{
				const req = new Request('http://example.com/api/templates/instantiate', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ username, templateId, characterId }),
				});
				const ctx = createExecutionContext();
				const res = await worker.fetch(req, env, ctx);
				await waitOnExecutionContext(ctx);
				expect(res.status).toBe(201);
				const json = (await res.json()) as any;
				const campaign = json?.campaign;
				campaignId = String(campaign?.id || '');
				expect(campaignId.length).toBeGreaterThan(0);
				const canon = Array.isArray(campaign?.canonTimeline) ? campaign.canonTimeline : [];
				expect(canon.length).toBe(2);
				firstCanonId = String(canon?.[0]?.id || '').trim();
				expect(firstCanonId.length).toBeGreaterThan(0);
			}

			// Perform a Hidden Hand turn.
			// Even if the AI call fails (e.g., no GEMINI_API_KEY), server must compute canon.nextEventId.
			{
				const req = new Request('http://example.com/api/hidden-hand/turn', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ username, campaignId, text: 'I wander the halls looking for any door.' }),
				});
				const ctx = createExecutionContext();
				const res = await worker.fetch(req, env, ctx);
				await waitOnExecutionContext(ctx);
				expect(res.status).toBe(200);
				const json = (await res.json()) as any;
				expect(json?.ok).toBe(true);
				expect(Number(json?.currentTurnCount || 0)).toBe(1);
				const resolved = Array.isArray(json?.canon?.resolvedEventIds) ? json.canon.resolvedEventIds : [];
				expect(resolved.length).toBe(0);
				expect(String(json?.canon?.nextEventId || '')).toBe(firstCanonId);
			}

			// Cleanup (best-effort): delete template so global index stays clean
			{
				const req = new Request('http://example.com/api/templates/delete', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ username, templateId }),
				});
				const ctx = createExecutionContext();
				await worker.fetch(req, env, ctx);
				await waitOnExecutionContext(ctx);
			}
		});
	});
});
