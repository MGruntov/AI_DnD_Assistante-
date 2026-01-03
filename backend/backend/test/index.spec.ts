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

		it('allows a participant to finalize an AI-solo saga after the finish line (and unlinks the character)', async () => {
			const username = `solo_user_${Math.random().toString(16).slice(2)}`;
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

			// Pick an adventureId
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
						name: 'Finisher',
						narrativeText: 'A brave level 1 fighter.',
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

			// Start AI-solo campaign
			let campaignId = '';
			{
				const req = new Request('http://example.com/api/ai-campaigns/start', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ username, characterId, adventureId }),
				});
				const ctx = createExecutionContext();
				const res = await worker.fetch(req, env, ctx);
				await waitOnExecutionContext(ctx);
				expect(res.status).toBe(201);
				const json = (await res.json()) as any;
				campaignId = String(json?.campaign?.id || '');
				expect(campaignId.length).toBeGreaterThan(0);
			}

			// Force the session to the finish line (simulate reaching final checkpoint)
			// We do this directly in KV to avoid relying on external AI calls.
			{
				const storedCampaign = await env.ADA_DATA.get(`campaign:${campaignId}`);
				expect(storedCampaign).toBeTruthy();
				const campaign = JSON.parse(String(storedCampaign)) as any;

				const storedSession = await env.ADA_DATA.get(`aiSession:${campaignId}`);
				expect(storedSession).toBeTruthy();
				const session = JSON.parse(String(storedSession)) as any;

				// Use a plausible 3-checkpoint saga (matches built-in Red Cloak), but the exact
				// count doesn't matter as long as checkpointIndex >= checkpointTotal-1.
				campaign.checkpointTotal = 3;
				campaign.checkpointIndex = 2;
				session.checkpointIndex = 2;
				session.status = 'completed';
				await env.ADA_DATA.put(`campaign:${campaignId}`, JSON.stringify(campaign));
				await env.ADA_DATA.put(`aiSession:${campaignId}`, JSON.stringify(session));
			}

			// Finalize completion via campaigns/details action=completeCampaign as the participant
			{
				const req = new Request('http://example.com/api/campaigns/details', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ action: 'completeCampaign', campaignId, username }),
				});
				const ctx = createExecutionContext();
				const res = await worker.fetch(req, env, ctx);
				await waitOnExecutionContext(ctx);
				expect(res.status).toBe(200);
				const json = (await res.json()) as any;
				expect(json?.ok).toBe(true);
				expect(String(json?.campaign?.status || '')).toBe('completed');
			}

			// Character should now be unlinked from the campaign, allowing a new saga to start.
			{
				const req = new Request(`http://example.com/api/characters?user=${encodeURIComponent(username)}`);
				const ctx = createExecutionContext();
				const res = await worker.fetch(req, env, ctx);
				await waitOnExecutionContext(ctx);
				expect(res.status).toBe(200);
				const json = (await res.json()) as any;
				const chars = Array.isArray(json?.characters) ? json.characters : [];
				const ch = chars.find((c: any) => String(c?.id || '') === characterId);
				expect(ch).toBeTruthy();
				const campaignIds = Array.isArray(ch?.campaignIds) ? ch.campaignIds.map((x: any) => String(x)) : [];
				expect(campaignIds.includes(String(campaignId))).toBe(false);
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

		it('supports cloning a Hall template into a private campaign', async () => {
			const username = 'architect_clone';
			await env.ADA_DATA.put(`user:${username}`, JSON.stringify({ username, passwordHash: 'x' }));

			// Create a template
			const createReq = new Request('https://example.com/api/templates/create', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					username,
					name: 'Cloneable Template',
					canonTimeline: [
						{ title: 'Canon One', description: 'First canon beat' },
					],
					templateTags: ['test'],
				}),
			});
			const createRes = await worker.fetch(createReq, env);
			expect(createRes.status).toBe(201);
			const created = (await createRes.json()) as any;
			const templateId = created?.template?.id;
			expect(typeof templateId).toBe('string');

			// Clone it
			const cloneReq = new Request('https://example.com/api/scenarios/clone', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ username, templateId }),
			});
			const cloneRes = await worker.fetch(cloneReq, env);
			expect(cloneRes.status).toBe(201);
			const cloned = (await cloneRes.json()) as any;
			expect(cloned?.ok).toBe(true);
			expect(cloned?.campaign?.id).toBeTruthy();
			expect(cloned?.campaign?.isTemplate).not.toBe(true);
			expect(cloned?.campaign?.dm).toBe(username);
			expect(Array.isArray(cloned?.campaign?.participants)).toBe(true);
			expect(cloned?.campaign?.participants).toContain(username);
			expect(cloned?.campaign?.templateId).toBe(templateId);
		});
	});

	describe('Human Lobbies', () => {
		it('supports public lobby listing, join requests, GM approval, and OOC chat for pending users', async () => {
			const gm = `gm_${Math.random().toString(16).slice(2)}`;
			const player = `player_${Math.random().toString(16).slice(2)}`;
			const password = 'testpass123';

			// Register GM and player
			for (const username of [gm, player]) {
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

			// GM creates a public lobby campaign
			let campaignId = '';
			{
				const req = new Request('http://example.com/api/campaigns', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						name: 'The Test Tavern',
						dm: gm,
						participants: [gm],
						isPublicLobby: true,
						discordLink: 'https://discord.gg/example',
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

			// Public lobbies listing should include it
			{
				const req = new Request('http://example.com/api/lobbies/public');
				const ctx = createExecutionContext();
				const res = await worker.fetch(req, env, ctx);
				await waitOnExecutionContext(ctx);
				expect(res.status).toBe(200);
				const json = (await res.json()) as any;
				const lobbies = Array.isArray(json?.lobbies) ? json.lobbies : [];
				expect(lobbies.some((l: any) => String(l?.id || '') === campaignId)).toBe(true);
			}

			// Player sees lobby details, but no discord link before requesting
			{
				const req = new Request(`http://example.com/api/lobbies/details?campaignId=${encodeURIComponent(campaignId)}&user=${encodeURIComponent(player)}`);
				const ctx = createExecutionContext();
				const res = await worker.fetch(req, env, ctx);
				await waitOnExecutionContext(ctx);
				expect(res.status).toBe(200);
				const json = (await res.json()) as any;
				expect(json?.ok).toBe(true);
				expect(String(json?.access?.status || '')).toBe('none');
				expect(json?.discordLink).toBe(null);
			}

			// Player requests to join (pending)
			{
				const req = new Request('http://example.com/api/lobbies/join', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ username: player, campaignId }),
				});
				const ctx = createExecutionContext();
				const res = await worker.fetch(req, env, ctx);
				await waitOnExecutionContext(ctx);
				expect(res.status).toBe(200);
				const json = (await res.json()) as any;
				expect(json?.ok).toBe(true);
				expect(String(json?.status || '')).toBe('pending');
			}

			// Pending player can see discord link and send chat
			{
				const sendReq = new Request('http://example.com/api/lobbies/chat/send', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ campaignId, username: player, text: 'OOC: What time works for session 0?' }),
				});
				const ctx = createExecutionContext();
				const sendRes = await worker.fetch(sendReq, env, ctx);
				await waitOnExecutionContext(ctx);
				expect(sendRes.status).toBe(200);
				const sendJson = (await sendRes.json()) as any;
				expect(sendJson?.ok).toBe(true);
				const msg = sendJson?.message;
				expect(String(msg?.author || '')).toBe(player);
			}
			{
				const req = new Request(`http://example.com/api/lobbies/details?campaignId=${encodeURIComponent(campaignId)}&user=${encodeURIComponent(player)}`);
				const ctx = createExecutionContext();
				const res = await worker.fetch(req, env, ctx);
				await waitOnExecutionContext(ctx);
				expect(res.status).toBe(200);
				const json = (await res.json()) as any;
				expect(String(json?.access?.status || '')).toBe('pending');
				expect(String(json?.discordLink || '')).toMatch(/discord\.gg/);
				const chat = Array.isArray(json?.lobbyChat) ? json.lobbyChat : [];
				expect(chat.length).toBeGreaterThan(0);
				expect(String(chat[chat.length - 1]?.author || '')).toBe(player);
			}

			// GM sees pending queue and approves player
			{
				const req = new Request(`http://example.com/api/lobbies/details?campaignId=${encodeURIComponent(campaignId)}&user=${encodeURIComponent(gm)}`);
				const ctx = createExecutionContext();
				const res = await worker.fetch(req, env, ctx);
				await waitOnExecutionContext(ctx);
				expect(res.status).toBe(200);
				const json = (await res.json()) as any;
				expect(json?.access?.canManage).toBe(true);
				const pending = Array.isArray(json?.pendingParticipants) ? json.pendingParticipants : [];
				expect(pending).toContain(player);
			}
			{
				const req = new Request('http://example.com/api/lobbies/approve', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ gmUsername: gm, campaignId, username: player }),
				});
				const ctx = createExecutionContext();
				const res = await worker.fetch(req, env, ctx);
				await waitOnExecutionContext(ctx);
				expect(res.status).toBe(200);
				const json = (await res.json()) as any;
				expect(json?.ok).toBe(true);
			}

			// Player should now appear in /api/campaigns listing
			{
				const req = new Request(`http://example.com/api/campaigns?user=${encodeURIComponent(player)}`);
				const ctx = createExecutionContext();
				const res = await worker.fetch(req, env, ctx);
				await waitOnExecutionContext(ctx);
				expect(res.status).toBe(200);
				const json = (await res.json()) as any;
				const campaigns = Array.isArray(json?.campaigns) ? json.campaigns : [];
				expect(campaigns.some((c: any) => String(c?.id || '') === campaignId)).toBe(true);
			}
		});
	});
});
