import type { Env } from '../env';
import { requireDb } from './client';
import { withTransaction } from './tx';

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
