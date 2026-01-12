import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../src';

describe('character sheet persistence', () => {
	it('creates, updates, and lists characters saved via /api/characters/save-sheet', async () => {
		const username = `sheet_user_${Math.random().toString(16).slice(2)}`;
		const password = 'testpass123';

		// Register user (ensures KV user record exists).
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

		const baseSheet = {
			is_valid_sheet: true,
			speed: 30,
			languages: ['Common'],
			proficiencies: ['Athletics'],
			feature_entries: ['Second Wind'],
			saving_throws_proficient: ['str', 'con'],
		};

		const baseCharacter: any = {
			name: 'Sheety McSheetface',
			race: 'Human',
			background: 'Acolyte',
			classes: [{ name: 'Fighter', level: 1 }],
			abilityScores: {
				strength: 15,
				dexterity: 12,
				constitution: 14,
				intelligence: 10,
				wisdom: 11,
				charisma: 8,
			},
			maxHp: 12,
			armorClass: 16,
			rawSheet: baseSheet,
		};

		// Create (no characterId).
		let characterId = '';
		{
			const req = new Request('http://example.com/api/characters/save-sheet', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ username, character: baseCharacter }),
			});
			const ctx = createExecutionContext();
			const res = await worker.fetch(req, env, ctx);
			await waitOnExecutionContext(ctx);
			expect(res.status).toBe(200);
			const json = (await res.json()) as any;
			expect(json?.ok).toBe(true);
			expect(typeof json?.character?.id).toBe('string');
			characterId = String(json.character.id);
			expect(characterId.length).toBeGreaterThan(10);
			expect(json?.character?.rawSheet?.is_valid_sheet).toBe(true);
			expect(Array.isArray(json?.character?.rawSheet?.languages)).toBe(true);
		}

		// List includes it.
		{
			const req = new Request(`http://example.com/api/characters?user=${encodeURIComponent(username)}`);
			const ctx = createExecutionContext();
			const res = await worker.fetch(req, env, ctx);
			await waitOnExecutionContext(ctx);
			expect(res.status).toBe(200);
			const json = (await res.json()) as any;
			expect(json?.ok).toBe(true);
			const characters = Array.isArray(json?.characters) ? json.characters : [];
			const match = characters.find((c: any) => String(c?.id) === characterId);
			expect(match).toBeTruthy();
			expect(match?.rawSheet?.is_valid_sheet).toBe(true);
		}

		// Update (with characterId) should overwrite fields but preserve id.
		{
			const updatedCharacter = {
				...baseCharacter,
				name: 'Updated Sheety',
				rawSheet: {
					...baseSheet,
					languages: ['Common', 'Elvish'],
				},
			};

			const req = new Request('http://example.com/api/characters/save-sheet', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ username, character: updatedCharacter, characterId }),
			});
			const ctx = createExecutionContext();
			const res = await worker.fetch(req, env, ctx);
			await waitOnExecutionContext(ctx);
			expect(res.status).toBe(200);
			const json = (await res.json()) as any;
			expect(json?.ok).toBe(true);
			expect(String(json?.character?.id)).toBe(characterId);
			expect(json?.character?.name).toBe('Updated Sheety');
			expect(json?.character?.rawSheet?.languages).toEqual(['Common', 'Elvish']);
		}
	});
});
