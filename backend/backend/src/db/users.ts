import type { Env } from '../env';
import { getDb } from './client';

export type DbUserRow = {
	id: string;
	username: string;
	password_algo?: 'pbkdf2-sha256' | 'sha256-iter' | string;
	password_hash: string;
	password_salt: string;
	password_iterations: number;
	created_at: string;
	updated_at: string;
};

async function ensureUsersD1Schema(env: Env): Promise<void> {
	const db = getDb(env);
	if (!db) return;
	try {
		await db
			.prepare(
				`CREATE TABLE IF NOT EXISTS users (
				  id TEXT PRIMARY KEY,
				  username TEXT NOT NULL UNIQUE,
				  password_hash TEXT NOT NULL,
				  password_salt TEXT NOT NULL,
				  password_iterations INTEGER NOT NULL,
				  password_algo TEXT,
				  created_at TEXT NOT NULL,
				  updated_at TEXT NOT NULL
				)`,
			)
			.run();
	} catch {
		// best-effort
	}
}

export async function dbGetUserByUsername(env: Env, username: string): Promise<DbUserRow | null> {
	const db = getDb(env);
	if (!db) return null;
	try {
		const res = await db
			.prepare(
				`SELECT id, username, password_algo, password_hash, password_salt, password_iterations, created_at, updated_at
				 FROM users
				 WHERE username = ?1
				 LIMIT 1`,
			)
			.bind(username)
			.all<DbUserRow>();
		return res.results?.[0] ?? null;
	} catch (e) {
		// Migration-safe behavior:
		// - if the schema hasn't been applied yet, treat D1 as empty.
		// - if the table exists but the new column hasn't been migrated yet, fall back to the old select.
		const msg = (e as Error)?.message || '';
		if (msg.includes('no such table') && msg.includes('users')) {
			await ensureUsersD1Schema(env);
			try {
				const res = await db
					.prepare(
						`SELECT id, username, password_algo, password_hash, password_salt, password_iterations, created_at, updated_at
						 FROM users
						 WHERE username = ?1
						 LIMIT 1`,
					)
					.bind(username)
					.all<DbUserRow>();
				return res.results?.[0] ?? null;
			} catch {
				return null;
			}
		}
		if (msg.includes('no such column') && msg.includes('password_algo')) {
			try {
				const res = await db
					.prepare(
						`SELECT id, username, password_hash, password_salt, password_iterations, created_at, updated_at
						 FROM users
						 WHERE username = ?1
						 LIMIT 1`,
					)
					.bind(username)
					.all<DbUserRow>();
				return res.results?.[0] ?? null;
			} catch {
				return null;
			}
		}
		return null;
	}
}

export async function dbInsertUser(env: Env, row: DbUserRow): Promise<void> {
	const db = getDb(env);
	if (!db) throw new Error('D1 not configured');
	await ensureUsersD1Schema(env);
	await db
		.prepare(
			`INSERT INTO users (id, username, password_algo, password_hash, password_salt, password_iterations, created_at, updated_at)
			 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
		)
		.bind(
			row.id,
			row.username,
			row.password_algo ?? 'pbkdf2-sha256',
			row.password_hash,
			row.password_salt,
			row.password_iterations,
			row.created_at,
			row.updated_at,
		)
		.run();
}

export async function dbUpdateUserPassword(
	env: Env,
	params: { id: string; password_algo: string; password_hash: string; password_salt: string; password_iterations: number; updated_at: string },
): Promise<void> {
	const db = getDb(env);
	if (!db) throw new Error('D1 not configured');
	await ensureUsersD1Schema(env);
	await db
		.prepare(
			`UPDATE users
			 SET password_algo = ?2,
			     password_hash = ?3,
			     password_salt = ?4,
			     password_iterations = ?5,
			     updated_at = ?6
			 WHERE id = ?1`,
		)
		.bind(params.id, params.password_algo, params.password_hash, params.password_salt, params.password_iterations, params.updated_at)
		.run();
}
