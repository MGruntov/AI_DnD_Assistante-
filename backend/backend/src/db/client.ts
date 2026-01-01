import type { Env } from '../env';

export function getDb(env: Env): D1Database | null {
	return env.ADA_DB ?? null;
}

export function requireDb(env: Env): D1Database {
	const db = getDb(env);
	if (!db) throw new Error('D1 database binding ADA_DB is not configured');
	return db;
}
