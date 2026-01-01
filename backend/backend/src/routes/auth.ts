import type { Hono } from 'hono';
import type { Env } from '../env';
import { registerBodySchema, loginBodySchema } from '../contracts/auth';
import { hashPasswordPBKDF2, verifyPasswordPBKDF2 } from '../security/password';
import { signAccessToken } from '../security/jwt';
import { dbGetUserByUsername, dbInsertUser } from '../db/users';

type AuthUserKvRecord = {
	id: string;
	username: string;
	createdAt: string;
	updatedAt?: string;
	// New scheme
	password?: {
		algo: 'pbkdf2-sha256';
		saltB64: string;
		hashB64: string;
		iterations: number;
	};
	// Legacy scheme (pre-migration)
	passwordHash?: string;
};

async function legacySha256(password: string): Promise<string> {
	const enc = new TextEncoder();
	const digest = await crypto.subtle.digest('SHA-256', enc.encode(password));
	return Array.from(new Uint8Array(digest))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

async function kvGetUser(env: Env, username: string): Promise<AuthUserKvRecord | null> {
	const raw = await env.ADA_DATA.get(`user:${username}`);
	if (!raw) return null;
	try {
		return JSON.parse(raw) as AuthUserKvRecord;
	} catch {
		return null;
	}
}

async function kvPutUser(env: Env, record: AuthUserKvRecord): Promise<void> {
	await env.ADA_DATA.put(`user:${record.username}`, JSON.stringify(record));
}

export function registerAuthRoutes(app: Hono<{ Bindings: Env }>): void {
	app.post('/api/register', async (c) => {
		const origin = c.req.header('Origin') ?? null;
		let body: unknown;
		try {
			body = await c.req.json();
		} catch {
			return c.json({ error: 'Invalid JSON body' }, 400);
		}

		const parsed = registerBodySchema.safeParse(body);
		if (!parsed.success) {
			return c.json({ error: parsed.error.issues[0]?.message || 'Invalid request body' }, 400);
		}
		const { username, password } = parsed.data;

		// Prefer D1, but fall back to KV during migration.
		const existingD1 = await dbGetUserByUsername(c.env, username);
		if (existingD1) return c.json({ error: 'Username already exists' }, 409);
		const existingKv = await c.env.ADA_DATA.get(`user:${username}`);
		if (existingKv) return c.json({ error: 'Username already exists' }, 409);

		const now = new Date().toISOString();
		const id = crypto.randomUUID();
		const pw = await hashPasswordPBKDF2(password);

		// Attempt D1 insert if configured.
		try {
			if (c.env.ADA_DB) {
				await dbInsertUser(c.env, {
					id,
					username,
					password_hash: pw.hashB64,
					password_salt: pw.saltB64,
					password_iterations: pw.iterations,
					created_at: now,
					updated_at: now,
				});
			}
		} catch {
			// If D1 is partially configured or migration not applied yet, KV still works.
		}

		// Always write KV during migration so legacy endpoints remain functional.
		await kvPutUser(c.env, {
			id,
			username,
			createdAt: now,
			updatedAt: now,
			password: pw,
		});

		// Preserve existing API behavior (tests rely on 201)
		return c.json({ ok: true }, 201, {
			// keep CORS behavior consistent with legacy
			'Access-Control-Allow-Origin': origin || '*',
		});
	});

	app.post('/api/login', async (c) => {
		let body: unknown;
		try {
			body = await c.req.json();
		} catch {
			return c.json({ error: 'Invalid JSON body' }, 400);
		}
		const parsed = loginBodySchema.safeParse(body);
		if (!parsed.success) {
			return c.json({ error: 'Username and password are required' }, 400);
		}
		const { username, password } = parsed.data;

		// Try D1 first.
		const d1User = await dbGetUserByUsername(c.env, username);
		if (d1User) {
			const ok = await verifyPasswordPBKDF2(password, {
				algo: 'pbkdf2-sha256',
				saltB64: d1User.password_salt,
				hashB64: d1User.password_hash,
				iterations: d1User.password_iterations,
			});
			if (!ok) return c.json({ error: 'Invalid username or password' }, 401);
			let token: string | null = null;
			try {
				token = await signAccessToken(c.env.JWT_SECRET, { sub: d1User.id, username: d1User.username });
			} catch {
				token = null;
			}
			return c.json({ ok: true, username: d1User.username, token }, 200);
		}

		// KV fallback (supports legacy hash migration)
		const kvUser = await kvGetUser(c.env, username);
		if (!kvUser) return c.json({ error: 'Invalid username or password' }, 401);

		let verified = false;
		if (kvUser.password && kvUser.password.algo === 'pbkdf2-sha256') {
			verified = await verifyPasswordPBKDF2(password, kvUser.password);
		} else if (kvUser.passwordHash) {
			const sha = await legacySha256(password);
			verified = sha === kvUser.passwordHash;

			// Migrate record on successful legacy login.
			if (verified) {
				const pw = await hashPasswordPBKDF2(password);
				kvUser.password = pw;
				delete kvUser.passwordHash;
				kvUser.updatedAt = new Date().toISOString();
				await kvPutUser(c.env, kvUser);
			}
		}

		if (!verified) return c.json({ error: 'Invalid username or password' }, 401);
		let token: string | null = null;
		try {
			token = await signAccessToken(c.env.JWT_SECRET, { sub: kvUser.id, username: kvUser.username });
		} catch {
			token = null;
		}
		return c.json({ ok: true, username: kvUser.username, token }, 200);
	});
}
