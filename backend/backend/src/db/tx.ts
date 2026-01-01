import type { Env } from '../env';
import { requireDb } from './client';

// D1 doesn't currently expose a dedicated transaction API; use explicit BEGIN/COMMIT.
// This helper keeps the pattern consistent and easy to audit.
export async function withTransaction<T>(env: Env, fn: () => Promise<T>): Promise<T> {
	const db = requireDb(env);
	await db.exec('BEGIN');
	try {
		const out = await fn();
		await db.exec('COMMIT');
		return out;
	} catch (e) {
		await db.exec('ROLLBACK');
		throw e;
	}
}
