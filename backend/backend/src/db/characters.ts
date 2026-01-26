import type { Env } from '../env';
import { requireDb } from './client';
import { withTransaction } from './tx';

export type DbCharacterRow = {
	id: string;
	owner_user_id: string;
	name: string | null;
	level: number;
	xp: number;
	hp_current: number | null;
	hp_max: number | null;
	mana_current: number | null;
	mana_max: number | null;
	data_json: string;
	created_at: string;
	updated_at: string;
};

async function ensureCharactersD1Schema(env: Env): Promise<void> {
	const db = requireDb(env);
	try {
		const hasUsers = await db
			.prepare("SELECT 1 AS ok FROM sqlite_master WHERE type='table' AND name='users' LIMIT 1")
			.all<{ ok: number }>();
		const hasUsersTable = Array.isArray(hasUsers.results) && hasUsers.results.length > 0;

		// Ensure users table exists (needed for foreign key constraints on characters).
		if (!hasUsersTable) {
			await db
				.prepare(
					`CREATE TABLE IF NOT EXISTS users (
					  id TEXT PRIMARY KEY,
					  username TEXT NOT NULL UNIQUE,
					  password_algo TEXT,
					  password_hash TEXT NOT NULL,
					  password_salt TEXT NOT NULL,
					  password_iterations INTEGER NOT NULL,
					  created_at TEXT NOT NULL,
					  updated_at TEXT NOT NULL
					)`,
				)
				.run();
		}

		await db
			.prepare(
				`CREATE TABLE IF NOT EXISTS characters (
				  id TEXT PRIMARY KEY,
				  owner_user_id TEXT NOT NULL,
				  name TEXT,
				  level INTEGER NOT NULL DEFAULT 1,
				  xp INTEGER NOT NULL DEFAULT 0,
				  hp_current INTEGER,
				  hp_max INTEGER,
				  mana_current INTEGER,
				  mana_max INTEGER,
				  data_json TEXT NOT NULL,
				  created_at TEXT NOT NULL,
				  updated_at TEXT NOT NULL,
				  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
				)`,
			)
			.run();

		await db.prepare('CREATE INDEX IF NOT EXISTS idx_characters_owner ON characters(owner_user_id)').run();
	} catch {
		// Best-effort; in production migrations should handle schema.
	}
}

function safeFiniteInt(v: unknown, fallback: number | null): number | null {
	const n = typeof v === 'string' && v.trim() ? Number(v) : (v as any);
	if (!Number.isFinite(n)) return fallback;
	return Math.floor(Number(n));
}

function normalizeLevelFromForge(character: any): number {
	const level = safeFiniteInt(character?.level, null);
	if (level != null && level > 0) return Math.max(1, Math.min(20, level));

	const classes = Array.isArray(character?.classes) ? character.classes : [];
	const sum = classes.reduce((acc: number, c: any) => {
		const lvl = safeFiniteInt(c?.level, 0) ?? 0;
		return acc + Math.max(0, lvl);
	}, 0);
	return Math.max(1, Math.min(20, sum || 1));
}

function normalizeIndexFieldsFromForge(character: any): {
	name: string | null;
	level: number;
	xp: number;
	hp_current: number | null;
	hp_max: number | null;
	mana_current: number | null;
	mana_max: number | null;
} {
	const nameRaw = character?.name;
	const name = typeof nameRaw === 'string' && nameRaw.trim() ? nameRaw.trim() : null;
	const level = normalizeLevelFromForge(character);
	const xp = safeFiniteInt(character?.xp ?? character?.XP, 0) ?? 0;

	const hpMax = safeFiniteInt(character?.maxHp ?? character?.hpMax ?? character?.hp_max, null);
	const hpCur = safeFiniteInt(character?.currentHp ?? character?.hpCurrent ?? character?.hp_current, hpMax);

	// Mana is not a first-class field in the Forge output today; keep best-effort support.
	const manaMax =
		safeFiniteInt(character?.manaMax ?? character?.mana_max ?? character?.mana?.max ?? character?.manaSlots?.max, null) ??
		safeFiniteInt(character?.rawSheet?.mana_max ?? character?.rawSheet?.manaMax, null);
	const manaCur =
		safeFiniteInt(character?.manaCurrent ?? character?.mana_current ?? character?.mana?.current ?? character?.manaSlots?.current, manaMax) ??
		safeFiniteInt(character?.rawSheet?.mana_current ?? character?.rawSheet?.manaCurrent, manaMax);

	return {
		name,
		level,
		xp: Math.max(0, xp),
		hp_current: hpCur == null ? null : Math.max(0, hpCur),
		hp_max: hpMax == null ? null : Math.max(0, hpMax),
		mana_current: manaCur == null ? null : Math.max(0, manaCur),
		mana_max: manaMax == null ? null : Math.max(0, manaMax),
	};
}

export async function dbUpsertForgeCharacterSheet(
	env: Env,
	args: {
		characterId?: string | null;
		ownerUserId: string;
		character: unknown;
	},
): Promise<DbCharacterRow> {
	await ensureCharactersD1Schema(env);
	const db = requireDb(env);
	const now = new Date().toISOString();

	const requestedId = typeof args.characterId === 'string' && args.characterId.trim() ? args.characterId.trim() : null;
	const id = requestedId || crypto.randomUUID();
	const character: any = args.character && typeof args.character === 'object' ? args.character : {};

	// Ensure the stored JSON includes the database id (so updates round-trip cleanly).
	const toStore = { ...character, id };
	const data_json = JSON.stringify(toStore);
	const index = normalizeIndexFieldsFromForge(toStore);

	let row: DbCharacterRow | null = null;

	await withTransaction(env, async () => {
		// Determine whether this id already exists (and if so, enforce ownership).
		const existing = await db
			.prepare(`SELECT id, owner_user_id FROM characters WHERE id = ?1 LIMIT 1`)
			.bind(id)
			.all<{ id: string; owner_user_id: string }>();
		const existingRow = existing.results?.[0] ?? null;
		if (existingRow) {
			if (String(existingRow.owner_user_id) !== String(args.ownerUserId)) {
				throw new Error('FORBIDDEN_CHARACTER_OWNER');
			}
			await db
				.prepare(
					`UPDATE characters
					 SET name = ?1,
					     level = ?2,
					     xp = ?3,
					     hp_current = ?4,
					     hp_max = ?5,
					     mana_current = ?6,
					     mana_max = ?7,
					     data_json = ?8,
					     updated_at = ?9
					 WHERE id = ?10 AND owner_user_id = ?11`,
				)
				.bind(
					index.name,
					index.level,
					index.xp,
					index.hp_current,
					index.hp_max,
					index.mana_current,
					index.mana_max,
					data_json,
					now,
					id,
					args.ownerUserId,
				)
				.run();
		} else {
			await db
				.prepare(
					`INSERT INTO characters (
					  id, owner_user_id, name, level, xp, hp_current, hp_max, mana_current, mana_max, data_json, created_at, updated_at
					) VALUES (
					  ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12
					)`,
				)
				.bind(
					id,
					args.ownerUserId,
					index.name,
					index.level,
					index.xp,
					index.hp_current,
					index.hp_max,
					index.mana_current,
					index.mana_max,
					data_json,
					now,
					now,
				)
				.run();
		}

		const fetched = await db
			.prepare(
				`SELECT id, owner_user_id, name, level, xp, hp_current, hp_max, mana_current, mana_max, data_json, created_at, updated_at
				 FROM characters
				 WHERE id = ?1 AND owner_user_id = ?2
				 LIMIT 1`,
			)
			.bind(id, args.ownerUserId)
			.all<DbCharacterRow>();
		row = fetched.results?.[0] ?? null;
	});

	if (!row) throw new Error('FAILED_TO_UPSERT_CHARACTER');
	return row;
}

export async function dbListForgeCharactersByOwnerUserId(env: Env, ownerUserId: string): Promise<DbCharacterRow[]> {
	await ensureCharactersD1Schema(env);
	const db = requireDb(env);
	const res = await db
		.prepare(
			`SELECT id, owner_user_id, name, level, xp, hp_current, hp_max, mana_current, mana_max, data_json, created_at, updated_at
			 FROM characters
			 WHERE owner_user_id = ?1
			 ORDER BY updated_at DESC`,
		)
		.bind(ownerUserId)
		.all<DbCharacterRow>();
	return Array.isArray(res.results) ? res.results : [];
}

export type CharacterProgressPatch = {
	deltaXp?: number;
	deltaHpCurrent?: number;
	setHpMax?: number;
	deltaManaCurrent?: number;
	setManaMax?: number;
	setLevel?: number;
};

// Example atomic update: used for high-traffic actions like combat damage/heal and XP awards.
export async function dbApplyCharacterProgressPatch(
	env: Env,
	args: { characterId: string; ownerUserId: string; patch: CharacterProgressPatch },
): Promise<void> {
	const db = requireDb(env);
	const now = new Date().toISOString();
	const { patch } = args;

	await withTransaction(env, async () => {
		// Ownership check + atomic mutation.
		await db
			.prepare(
				`UPDATE characters
				 SET
				  xp = xp + ?1,
				  hp_current = CASE WHEN hp_current IS NULL THEN hp_current ELSE hp_current + ?2 END,
				  hp_max = COALESCE(?3, hp_max),
				  mana_current = CASE WHEN mana_current IS NULL THEN mana_current ELSE mana_current + ?4 END,
				  mana_max = COALESCE(?5, mana_max),
				  level = COALESCE(?6, level),
				  updated_at = ?7
				 WHERE id = ?8 AND owner_user_id = ?9`,
			)
			.bind(
				Number.isFinite(patch.deltaXp) ? Number(patch.deltaXp) : 0,
				Number.isFinite(patch.deltaHpCurrent) ? Number(patch.deltaHpCurrent) : 0,
				Number.isFinite(patch.setHpMax) ? Number(patch.setHpMax) : null,
				Number.isFinite(patch.deltaManaCurrent) ? Number(patch.deltaManaCurrent) : 0,
				Number.isFinite(patch.setManaMax) ? Number(patch.setManaMax) : null,
				Number.isFinite(patch.setLevel) ? Number(patch.setLevel) : null,
				now,
				args.characterId,
				args.ownerUserId,
			)
			.run();
	});
}
