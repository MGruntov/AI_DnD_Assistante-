import type { Hono } from 'hono';
import type { Env } from '../env';
import { registerBodySchema, loginBodySchema } from '../contracts/auth';
import { hashPasswordPBKDF2, verifyPasswordPBKDF2 } from '../security/password';
import { signAccessToken } from '../security/jwt';
import { dbGetUserByUsername, dbInsertUser, dbUpdateUserPassword } from '../db/users';
import { requireAuth } from '../middleware/auth';

type AuthUserKvRecord = {
	id: string;
	username: string;
	createdAt: string;
	updatedAt?: string;
	// New scheme
	password?: {
		algo: 'pbkdf2-sha256' | 'sha256-iter';
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
		try {
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
			// NOTE: The salt is not a secret; it must be stored alongside the password hash to verify passwords.
			const passwordSaltB64 = pw.saltB64;
			const passwordHashB64 = pw.hashB64;

			// Attempt D1 insert if configured.
			try {
				if (c.env.ADA_DB) {
					await dbInsertUser(c.env, {
						id,
						username,
						password_algo: pw.algo,
						password_hash: passwordHashB64,
						password_salt: passwordSaltB64,
						password_iterations: pw.iterations,
						created_at: now,
						updated_at: now,
					});
				}
			} catch (e) {
				console.error('[auth] D1 insert user failed (will fall back to KV)', e);
			}

			// Always write KV during migration so legacy endpoints remain functional.
			await kvPutUser(c.env, {
				id,
				username,
				createdAt: now,
				updatedAt: now,
				password: {
					...pw,
					// Keep KV record explicit so accidental logging can be redacted more easily.
					saltB64: passwordSaltB64,
					hashB64: passwordHashB64,
				},
			});

			// Preserve existing API behavior (tests rely on 201)
			return c.json({ ok: true }, 201, {
				// keep CORS behavior consistent with legacy
				'Access-Control-Allow-Origin': origin || '*',
			});
		} catch (e) {
			console.error('[auth] register failed', e);
			return c.json({ error: 'Internal Server Error' }, 500);
		}
	});

	app.post('/api/login', async (c) => {
		try {
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
				const algo = (d1User.password_algo || 'pbkdf2-sha256') as 'pbkdf2-sha256' | 'sha256-iter';
				const ok = await verifyPasswordPBKDF2(password, {
					algo,
					saltB64: d1User.password_salt,
					hashB64: d1User.password_hash,
					iterations: d1User.password_iterations,
				});
				if (!ok) {
					// During migration, the source of truth may still be KV. If D1 verification fails,
					// attempt KV verification before rejecting (this also helps repair algorithm mismatches).
					const kvUser = await kvGetUser(c.env, username);
					if (!kvUser) return c.json({ error: 'Invalid username or password' }, 401);
					let verified = false;
					if (kvUser.password && (kvUser.password.algo === 'pbkdf2-sha256' || kvUser.password.algo === 'sha256-iter')) {
						verified = await verifyPasswordPBKDF2(password, kvUser.password);
					} else if (kvUser.passwordHash) {
						const sha = await legacySha256(password);
						verified = sha === kvUser.passwordHash;

						if (verified) {
							const pw = await hashPasswordPBKDF2(password);
							kvUser.password = pw;
							delete kvUser.passwordHash;
							kvUser.updatedAt = new Date().toISOString();
							await kvPutUser(c.env, kvUser);
						}
					}
					if (!verified) return c.json({ error: 'Invalid username or password' }, 401);

					// If KV verification succeeded, repair D1 password fields so subsequent logins are consistent.
					try {
						if (c.env.ADA_DB && kvUser.password) {
							const now = new Date().toISOString();
								const repairedSaltB64 = kvUser.password.saltB64;
								const repairedHashB64 = kvUser.password.hashB64;
								await dbUpdateUserPassword(c.env, {
								id: d1User.id,
								password_algo: kvUser.password.algo,
									password_hash: repairedHashB64,
									password_salt: repairedSaltB64,
								password_iterations: kvUser.password.iterations,
								updated_at: now,
							});
						}
					} catch (e) {
						console.error('[auth] D1 password repair failed (continuing with token)', e);
					}
				}
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
			if (kvUser.password && (kvUser.password.algo === 'pbkdf2-sha256' || kvUser.password.algo === 'sha256-iter')) {
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

			// If D1 is configured, backfill this KV user into D1 so later migrations can rely
			// on user_id foreign keys.
			try {
				if (c.env.ADA_DB) {
					const existing = await dbGetUserByUsername(c.env, kvUser.username);
					if (!existing && kvUser.password) {
						const now = new Date().toISOString();
						const backfillSaltB64 = kvUser.password.saltB64;
						const backfillHashB64 = kvUser.password.hashB64;
						await dbInsertUser(c.env, {
							id: kvUser.id,
							username: kvUser.username,
							password_algo: kvUser.password.algo,
							password_hash: backfillHashB64,
							password_salt: backfillSaltB64,
							password_iterations: kvUser.password.iterations,
							created_at: kvUser.createdAt || now,
							updated_at: now,
						});
					}
				}
			} catch (e) {
				console.error('[auth] D1 backfill user failed (will continue with KV)', e);
			}

			let token: string | null = null;
			try {
				token = await signAccessToken(c.env.JWT_SECRET, { sub: kvUser.id, username: kvUser.username });
			} catch {
				token = null;
			}
			return c.json({ ok: true, username: kvUser.username, token }, 200);
		} catch (e) {
			console.error('[auth] login failed', e);
			return c.json({ error: 'Internal Server Error' }, 500);
		}
	});

	app.get('/api/me', requireAuth(), async (c) => {
		const user = c.get('user');
		return c.json({ ok: true, user }, 200);
	});
}
