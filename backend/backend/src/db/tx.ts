import type { Env } from '../env';
import { requireDb } from './client';

// D1 doesn't currently expose a dedicated transaction API; use explicit BEGIN/COMMIT.
// This helper keeps the pattern consistent and easy to audit.
export async function withTransaction<T>(env: Env, fn: () => Promise<T>): Promise<T> {
	const db = requireDb(env);
	// Some runtimes (notably certain test/preview environments) reject explicit
	// BEGIN/COMMIT statements. In that case, fall back to best-effort execution
	// without an explicit SQL transaction.
	let began = false;
	try {
		await db.exec('BEGIN');
		began = true;
	} catch {
		began = false;
	}
	try {
		const out = await fn();
		if (began) {
			try {
				await db.exec('COMMIT');
			} catch {
				// ignore
			}
		}
		return out;
	} catch (e) {
		if (began) {
			try {
				await db.exec('ROLLBACK');
			} catch {
				// ignore
			}
		}
		throw e;
	}
}
