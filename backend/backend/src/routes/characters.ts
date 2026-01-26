import type { App } from '../appRoutes';
import type { Env } from '../env';
import { verifyAccessToken } from '../security/jwt';
import { dbGetUserByUsername } from '../db/users';
import { dbListForgeCharactersByOwnerUserId, dbUpsertForgeCharacterSheet } from '../db/characters';

type AuthUser = {
	id: string;
	username: string;
};

type KvUserRecord = {
	id?: string;
	username?: string;
};

function bearerTokenFromAuthHeader(auth: string | null | undefined): string | null {
	if (!auth) return null;
	const m = String(auth).match(/^Bearer\s+(.+)$/i);
	return m ? m[1] : null;
}

async function getOptionalAuthUser(env: Env, request: Request): Promise<AuthUser | null> {
	const token = bearerTokenFromAuthHeader(request.headers.get('Authorization'));
	if (!token) return null;
	try {
		const payload = await verifyAccessToken(env.JWT_SECRET, token);
		return { id: payload.sub, username: payload.username };
	} catch {
		// If a token is present but invalid, treat as unauthorized rather than silently falling back.
		return null;
	}
}

async function resolveOwnerUserId(env: Env, args: { username: string | null; authUser: AuthUser | null }): Promise<{ ownerUserId: string; username: string }> {
	if (args.authUser) {
		if (args.username && args.username !== args.authUser.username) {
			throw new Error('FORBIDDEN_USERNAME_MISMATCH');
		}
		return { ownerUserId: args.authUser.id, username: args.authUser.username };
	}

	const username = String(args.username || '').trim();
	if (!username) throw new Error('MISSING_USERNAME');

	const d1User = await dbGetUserByUsername(env, username);
	if (d1User?.id) return { ownerUserId: d1User.id, username: d1User.username };

	// Migration fallback: resolve user id from KV record.
	try {
		const raw = await env.ADA_DATA.get(`user:${username}`);
		if (raw) {
			const parsed = JSON.parse(raw) as KvUserRecord;
			const id = typeof parsed?.id === 'string' ? parsed.id.trim() : '';
			if (id) return { ownerUserId: id, username };
		}
	} catch {
		// ignore
	}

	throw new Error('USER_NOT_FOUND');
}

function safeParseJson<T>(raw: string): T | null {
	try {
		return JSON.parse(raw) as T;
	} catch {
		return null;
	}
}

async function kvListLegacyCharactersByUsername(env: Env, username: string): Promise<any[]> {
	const u = String(username || '').trim();
	if (!u) return [];
	try {
		const indexRaw = await env.ADA_DATA.get(`charactersByUser:${u}`);
		if (!indexRaw) return [];
		let ids: string[] = [];
		try {
			ids = JSON.parse(indexRaw) as string[];
			if (!Array.isArray(ids)) ids = [];
		} catch {
			ids = [];
		}

		const out: any[] = [];
		for (const id of ids) {
			const cid = String(id || '').trim();
			if (!cid) continue;
			const raw = await env.ADA_DATA.get(`character:${cid}`);
			if (!raw) continue;
			const parsed = safeParseJson<any>(raw);
			if (parsed && typeof parsed === 'object') out.push(parsed);
		}
		return out;
	} catch {
		return [];
	}
}

export function registerCharacterRoutes(app: App): void {
	// Save (create or update) a character sheet.
	// Canonical payload is the Forge output (formatCharacter()).
	app.post('/api/characters/save-sheet', async (c) => {
		let body: any = null;
		try {
			body = await c.req.json();
		} catch {
			return c.json({ ok: false, error: 'Invalid JSON body' }, 400);
		}

		const username = typeof body?.username === 'string' ? body.username.trim() : null;
		const character = body?.character;
		const characterId = typeof body?.characterId === 'string' ? body.characterId.trim() : null;

		// If an Authorization header is present, enforce that it matches (do not allow spoofed usernames).
		const authHeader = c.req.header('Authorization') || null;
		const token = bearerTokenFromAuthHeader(authHeader);
		const authUser = token ? await getOptionalAuthUser(c.env, c.req.raw) : null;
		if (token && !authUser) {
			return c.json({ ok: false, error: 'Unauthorized' }, 401);
		}

		if (!character || typeof character !== 'object') {
			return c.json({ ok: false, error: 'Missing character payload' }, 400);
		}

		let ownerUserId: string;
		let resolvedUsername: string;
		try {
			const resolved = await resolveOwnerUserId(c.env, { username, authUser });
			ownerUserId = resolved.ownerUserId;
			resolvedUsername = resolved.username;
		} catch (e) {
			const msg = (e as Error)?.message || 'Unauthorized';
			if (msg === 'FORBIDDEN_USERNAME_MISMATCH') return c.json({ ok: false, error: 'Forbidden' }, 403);
			if (msg === 'MISSING_USERNAME') return c.json({ ok: false, error: 'username is required' }, 400);
			if (msg === 'USER_NOT_FOUND') return c.json({ ok: false, error: 'User not found' }, 404);
			return c.json({ ok: false, error: 'Unauthorized' }, 401);
		}

		try {
			const row = await dbUpsertForgeCharacterSheet(c.env, {
				characterId: characterId || null,
				ownerUserId,
				character,
			});

			const stored = safeParseJson<any>(row.data_json) || {};
			// Ensure response id matches the database id, regardless of what the client sent.
			stored.id = row.id;
			// Preserve username field for older clients (Forge already sends `username`, but it may be blank).
			if (!stored.username) stored.username = resolvedUsername;

			return c.json({ ok: true, character: stored }, 200);
		} catch (e) {
			const msg = (e as Error)?.message || 'Save failed';
			if (msg === 'FORBIDDEN_CHARACTER_OWNER') return c.json({ ok: false, error: 'Forbidden' }, 403);
			console.error('[characters/save-sheet] failed', e);
			return c.json({ ok: false, error: 'Failed to save character' }, 500);
		}
	});

	// List characters owned by a user.
	app.get('/api/characters', async (c) => {
		const userQuery = String(c.req.query('user') || '').trim();

		const authHeader = c.req.header('Authorization') || null;
		const token = bearerTokenFromAuthHeader(authHeader);
		const authUser = token ? await getOptionalAuthUser(c.env, c.req.raw) : null;
		if (token && !authUser) {
			return c.json({ ok: false, error: 'Unauthorized' }, 401);
		}

		let ownerUserId: string;
		let resolvedUsername: string;
		try {
			const resolved = await resolveOwnerUserId(c.env, {
				username: userQuery || null,
				authUser,
			});
			ownerUserId = resolved.ownerUserId;
			resolvedUsername = resolved.username;
		} catch (e) {
			const msg = (e as Error)?.message || 'Unauthorized';
			if (msg === 'FORBIDDEN_USERNAME_MISMATCH') return c.json({ ok: false, error: 'Forbidden' }, 403);
			if (msg === 'MISSING_USERNAME') return c.json({ ok: false, error: 'user query parameter is required' }, 400);
			if (msg === 'USER_NOT_FOUND') return c.json({ ok: false, error: 'User not found' }, 404);
			return c.json({ ok: false, error: 'Unauthorized' }, 401);
		}

		try {
			const rows = await dbListForgeCharactersByOwnerUserId(c.env, ownerUserId);
			const d1Chars = rows
				.map((r) => {
					const stored = safeParseJson<any>(r.data_json);
					if (!stored || typeof stored !== 'object') return null;
					stored.id = r.id;
					return stored;
				})
				.filter(Boolean);

			// Backwards compatibility: include legacy KV characters (older endpoints still write there).
			const legacyChars = await kvListLegacyCharactersByUsername(c.env, resolvedUsername);
			const seenIds = new Set<string>(d1Chars.map((x: any) => String(x?.id || '')));
			const merged = [...d1Chars];
			for (const ch of legacyChars) {
				const id = String(ch?.id || '').trim();
				if (!id || seenIds.has(id)) continue;
				merged.push(ch);
				seenIds.add(id);
			}

			return c.json({ ok: true, characters: merged }, 200);
		} catch (e) {
			console.error('[characters] list failed', e);
			return c.json({ ok: false, error: 'Failed to load characters' }, 500);
		}
	});
}
