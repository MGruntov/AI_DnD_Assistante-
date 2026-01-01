import type { Env } from '../env';
import { getDb } from './client';

export type DbUserRow = {
	id: string;
	username: string;
	password_hash: string;
	password_salt: string;
	password_iterations: number;
	created_at: string;
	updated_at: string;
};

export async function dbGetUserByUsername(env: Env, username: string): Promise<DbUserRow | null> {
	const db = getDb(env);
	if (!db) return null;
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
		// Migration-safe behavior: if the schema hasn't been applied yet, treat D1 as empty.
		return null;
	}
}

export async function dbInsertUser(env: Env, row: DbUserRow): Promise<void> {
	const db = getDb(env);
	if (!db) throw new Error('D1 not configured');
	await db
		.prepare(
			`INSERT INTO users (id, username, password_hash, password_salt, password_iterations, created_at, updated_at)
			 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
		)
		.bind(
			row.id,
			row.username,
			row.password_hash,
			row.password_salt,
			row.password_iterations,
			row.created_at,
			row.updated_at,
		)
		.run();
}
