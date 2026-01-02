/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import type { Env } from './env';
import { createApp } from './appRoutes';

// Gemini (Google Generative Language API) uses v1beta endpoints for generateContent and model listing.
// Model names are typically versioned (e.g. gemini-1.5-flash-001) and listModels returns full names
// like "models/gemini-1.5-flash-001".
const GEMINI_API_VERSION = 'v1beta';
const GEMINI_PREFERRED_BASE_MODEL_ID = 'gemini-1.5-flash';

type GeminiModelInfo = {
	name?: string; // e.g. "models/gemini-1.5-flash-001"
	baseModelId?: string; // e.g. "gemini-1.5-flash"
	version?: string; // e.g. "1.5"
	displayName?: string;
	supportedGenerationMethods?: string[];
};

let geminiResolvedModelCache:
	| {
		modelName: string;
		expiresAt: number;
	}
	| null = null;

function isDebugEnabled(env: Env): boolean {
	const v = String(env.ADA_DEBUG ?? '').trim().toLowerCase();
	return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

function getGeminiDebugSnapshot(): {
	apiVersion: string;
	model: string | null;
	cacheExpiresAt: number | null;
} {
	return {
		apiVersion: GEMINI_API_VERSION,
		model: geminiResolvedModelCache?.modelName ?? null,
		cacheExpiresAt: geminiResolvedModelCache?.expiresAt ?? null,
	};
}

function normalizeGeminiModelName(name: string): string {
	const trimmed = String(name || '').trim();
	// The REST path parameter expects a resource name like "models/{model}".
	if (trimmed.startsWith('models/')) return trimmed;
	return `models/${trimmed}`;
}

function isSupportedForGenerateContent(model: GeminiModelInfo): boolean {
	const methods = Array.isArray(model.supportedGenerationMethods)
		? model.supportedGenerationMethods
		: [];
	return methods.some((m) => String(m).toLowerCase() === 'generatecontent');
}

function extractNumericSuffix(modelName: string): number | null {
	// "models/gemini-1.5-flash-001" -> 1
	const cleaned = modelName.replace(/^models\//, '');
	const m = cleaned.match(/-(\d{3})$/);
	if (!m) return null;
	const n = Number.parseInt(m[1], 10);
	return Number.isFinite(n) ? n : null;
}

function inferBaseModelIdFromName(modelName: string): string {
	const cleaned = String(modelName || '').replace(/^models\//, '').trim();
	if (!cleaned) return '';
	// Strip common version suffixes.
	const withoutNumeric = cleaned.replace(/-(\d{3})$/, '');
	return withoutNumeric;
}

async function listGeminiModels(apiKey: string): Promise<{
	ok: boolean;
	models: GeminiModelInfo[];
	upstreamStatus: number | null;
	upstreamBodySnippet: string | null;
}> {
	const url =
		`https://generativelanguage.googleapis.com/${encodeURIComponent(GEMINI_API_VERSION)}/models` +
		`?pageSize=1000&key=${encodeURIComponent(apiKey)}`;
	let upstreamStatus: number | null = null;
	let upstreamBodySnippet: string | null = null;
	try {
		const res = await fetch(url, { method: 'GET' });
		upstreamStatus = res.status;
		const rawText = await res.text().catch(() => '');
		upstreamBodySnippet = rawText ? rawText.slice(0, 1200) : null;
		if (!res.ok) {
			return { ok: false, models: [], upstreamStatus, upstreamBodySnippet };
		}
		let data: any = null;
		try {
			data = rawText ? JSON.parse(rawText) : null;
		} catch {
			data = null;
		}
		const models = Array.isArray(data?.models) ? (data.models as GeminiModelInfo[]) : [];
		return { ok: true, models, upstreamStatus, upstreamBodySnippet };
	} catch (err: any) {
		return {
			ok: false,
			models: [],
			upstreamStatus,
			upstreamBodySnippet:
				err && typeof err.message === 'string' ? err.message.slice(0, 1200) : 'Unknown error',
		};
	}
}

async function resolveGeminiModelName(apiKey: string): Promise<{
	modelName: string;
	resolvedFrom: 'cache' | 'models.list' | 'fallback';
	debug?: {
		candidateCount?: number;
		chosenBaseModelId?: string;
		chosenNumericSuffix?: number | null;
	};
}> {
	const now = Date.now();
	if (geminiResolvedModelCache && geminiResolvedModelCache.expiresAt > now) {
		return { modelName: geminiResolvedModelCache.modelName, resolvedFrom: 'cache' };
	}

	const listed = await listGeminiModels(apiKey);
	if (listed.ok && listed.models.length) {
		const candidates = listed.models
			.map((m) => ({
				...m,
				name: m.name ? String(m.name) : undefined,
				baseModelId: m.baseModelId
					? String(m.baseModelId)
					: m.name
						? inferBaseModelIdFromName(String(m.name))
						: undefined,
			}))
			.filter((m) => m.name && isSupportedForGenerateContent(m));

		// Prefer the requested base model id; pick the highest numeric suffix (e.g. -002 over -001).
		const preferred = candidates.filter((m) => m.baseModelId === GEMINI_PREFERRED_BASE_MODEL_ID);
		if (preferred.length) {
			preferred.sort((a, b) => {
				const an = extractNumericSuffix(a.name || '') ?? -1;
				const bn = extractNumericSuffix(b.name || '') ?? -1;
				return bn - an;
			});
			const chosen = normalizeGeminiModelName(preferred[0].name || GEMINI_PREFERRED_BASE_MODEL_ID);
			geminiResolvedModelCache = { modelName: chosen, expiresAt: now + 60 * 60 * 1000 };
			return {
				modelName: chosen,
				resolvedFrom: 'models.list',
				debug: {
					candidateCount: preferred.length,
					chosenBaseModelId: GEMINI_PREFERRED_BASE_MODEL_ID,
					chosenNumericSuffix: extractNumericSuffix(preferred[0].name || ''),
				},
			};
		}

		// Otherwise, pick any model that supports generateContent, preferring a modern "flash" model.
		const preferenceOrder = [
			'gemini-2.5-flash',
			'gemini-2.0-flash',
			'gemini-2.0-flash-lite',
			'gemini-3-flash',
			'gemini-1.5-flash',
			'gemini-1.5-pro',
		];
		for (const base of preferenceOrder) {
			const subset = candidates.filter((m) => (m.baseModelId || '').startsWith(base));
			if (subset.length) {
				// Prefer stable (non-preview/exp) variants, then highest numeric suffix.
				subset.sort((a, b) => {
					const aName = (a.name || '').toLowerCase();
					const bName = (b.name || '').toLowerCase();
					const aIsPreview = /\b(preview|exp|experimental)\b/.test(aName);
					const bIsPreview = /\b(preview|exp|experimental)\b/.test(bName);
					if (aIsPreview !== bIsPreview) return aIsPreview ? 1 : -1;
					const an = extractNumericSuffix(a.name || '') ?? -1;
					const bn = extractNumericSuffix(b.name || '') ?? -1;
					return bn - an;
				});
				const chosen = normalizeGeminiModelName(subset[0].name || base);
				geminiResolvedModelCache = { modelName: chosen, expiresAt: now + 60 * 60 * 1000 };
				return {
					modelName: chosen,
					resolvedFrom: 'models.list',
					debug: {
						candidateCount: subset.length,
						chosenBaseModelId: subset[0].baseModelId,
						chosenNumericSuffix: extractNumericSuffix(subset[0].name || ''),
					},
				};
			}
		}
		const chosen = normalizeGeminiModelName(candidates[0].name || GEMINI_PREFERRED_BASE_MODEL_ID);
		geminiResolvedModelCache = { modelName: chosen, expiresAt: now + 60 * 60 * 1000 };
		return {
			modelName: chosen,
			resolvedFrom: 'models.list',
			debug: {
				candidateCount: candidates.length,
				chosenBaseModelId: candidates[0].baseModelId,
				chosenNumericSuffix: extractNumericSuffix(candidates[0].name || ''),
			},
		};
	}

	// Fallback to a reasonable default. This may 404 if the key doesn't have access.
	const fallback = normalizeGeminiModelName('gemini-2.0-flash');
	geminiResolvedModelCache = { modelName: fallback, expiresAt: now + 5 * 60 * 1000 };
	return { modelName: fallback, resolvedFrom: 'fallback' };
}

const CORS_HEADERS_BASE = {
	'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type, Authorization',
} as const;

function withCorsHeaders(origin: string | null, extra?: HeadersInit): HeadersInit {
	const allowedOrigin = origin || '*';
	return {
		...CORS_HEADERS_BASE,
		'Access-Control-Allow-Origin': allowedOrigin,
		...(extra || {}),
	};
}

async function jsonResponse(
	body: unknown,
	init: ResponseInit | undefined,
	origin: string | null,
): Promise<Response> {
	const baseHeaders: HeadersInit = {
		'content-type': 'application/json; charset=utf-8',
	};
	return new Response(JSON.stringify(body), {
		status: 200,
		headers: withCorsHeaders(origin, { ...baseHeaders, ...(init?.headers || {}) }),
		...init,
	});
}

function errorResponse(message: string, status: number, origin: string | null): Response {
	const baseHeaders: HeadersInit = {
		'content-type': 'application/json; charset=utf-8',
	};
	return new Response(JSON.stringify({ error: message }), {
		status,
		headers: withCorsHeaders(origin, baseHeaders),
	});
}

async function hashPassword(password: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(password);
	const digest = await crypto.subtle.digest('SHA-256', data);
	const bytes = Array.from(new Uint8Array(digest));
	return bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
}

type Campaign = {
	id: string;
	name: string;
	dm: string;
	participants: string[];
	// Human Lobbies (communal play)
	// - Public campaigns can accept join requests into a pending queue.
	// - The GM can approve/reject pending participants.
	worldTheme?: string | null;
	isPublicLobby?: boolean;
	pendingParticipants?: string[]; // Players who requested to join but are not yet approved
	discordLink?: string | null;
	lobbyChat?: LobbyChatMessage[]; // Out-of-character chat distinct from AI journal
	// Architect Studio - AI Playtester Support
	hasAiPlayers?: boolean; // Enable AI-controlled party members for solo GM testing
	aiPlayerPrompt?: string; // Configuration for how AI players should behave
	createdAt: string;
	// Community Templates ("Grand Library of Fate" / "Hall of Records")
	// - Templates are globally discoverable blueprints authored by an Architect.
	// - Instances are private runs created from a template for a specific player.
	isTemplate?: boolean;
	creatorUsername?: string;
	// Optional template metadata for discovery.
	templateSummary?: string;
	templateTags?: string[];
	canonTimeline?: CanonEvent[];
	// Instance-only fields
	templateId?: string;
	sourceScenarioId?: string; // Track which Hall of Records scenario this was cloned from
	resolvedCanonEventIds?: string[];
	currentTurnCount?: number;
	journalEntryIds?: string[];
	scriptIds?: string[];
	encounterIds?: string[];
	linkedCharacterIds?: string[];
	conversationTranscript?: string; // AI journal/narrative - separate from lobbyChat
	status?: 'active' | 'completed';
	completedAt?: string;
	xpAwardedToCharacterIds?: string[];
	// Optional AI-DM fields
	mode?: 'ai-solo' | 'standard' | 'template-run';
	adventureId?: string;
	dmIsAI?: boolean;
};

type LobbyChatMessage = {
	id: string;
	author: string;
	text: string;
	createdAt: string;
};

type CanonEvent = {
	id: string;
	title: string;
	description: string;
	// Optional "Hidden Hand" prods to pull the player back toward canon.
	nudgeIdeas?: string[];
};

type HiddenHandSessionState = {
	campaignId: string;
	templateId: string;
	characterId: string;
	playerUsername: string;
	creatorUsername: string;
	canonTimeline: CanonEvent[];
	resolvedCanonEventIds: string[];
	currentTurnCount: number;
	log: TurnEntry[];
	summary: string;
};

type EncounterStatBlock = {
	name: string;
	size?: string;
	type?: string;
	alignment?: string;
	ac: number;
	hp: { max: number };
	speed?: string;
	abilityScores: { str: number; dex: number; con: number; int: number; wis: number; cha: number };
	saves?: string;
	skills?: string;
	senses?: string;
	languages?: string;
	challenge?: string;
	traits?: { name: string; text: string }[];
	actions?: { name: string; text: string }[];
};

type EncounterMonster = {
	name: string;
	count: number;
	role?: string;
	statBlock: EncounterStatBlock;
};

type EncounterThreatScale = {
	dialUp: string[];
	dialDown: string[];
};

type EncounterOption = {
	id: 'A' | 'B' | 'C';
	difficulty: 'Easy' | 'Medium' | 'Hard' | 'Deadly';
	intentMode: 'balanced' | 'kill';
	title: string;
	type: 'combat' | 'social' | 'exploration' | 'mixed';
	hook: string;
	setup: string;
	oppositionSummary?: string;
	monsters: EncounterMonster[];
	threatScale: EncounterThreatScale;
	twist: string;
	tactics: string;
	scaling: { easier: string; harder: string };
	rewards: string;
};

type EncounterBundle = {
	id: string;
	campaignId: string;
	author: string;
	createdAt: string;
	seed: string;
	intentMode: 'balanced' | 'kill';
	overrideDifficulty: EncounterOption['difficulty'] | null;
	partyStatus: PartyStatus;
	options: EncounterOption[];
};

type CharacterClass = {
	name: string;
	level: number;
};

type Character = {
	id: string;
	owner: string;
	name: string;
	narrative: {
		rawTranscript: string;
		summary: string;
		tags: string[];
	};
	concept: {
		race: string;
		background: string;
		alignment: string;
		classes: CharacterClass[];
		classSummary: string; // e.g. "Ranger/Warlock"
		levelSummary: string; // e.g. "1/5"
	};
	mechanics: {
		abilityScores: { str: number; dex: number; con: number; int: number; wis: number; cha: number };
		proficiencyBonus: number;
		savingThrows: string[];
		skills: string[];
		hitPoints: number;
		armorClass: number;
		speed: number;
		classFeatures: string[];
		feats: string[];
		equipment: string[];
		spells: {
			castingStat: string | null;
			cantrips: string[];
			leveledSpells: string[];
		};
	};
	// Progression is system-managed (never directly edited by the user).
	progression?: {
		level: number;
		xp: number;
		xpToNextLevel: number | null;
		canLevelUp: boolean;
		hp: { current: number; max: number };
		manaSlots: { current: number; max: number };
		updatedAt: string;
	};
	portraitUrl: string | null;
	validation: {
		isValid: boolean;
		issues: string[];
	};
	campaignIds: string[];
	createdAt: string;
	updatedAt: string;
};

const MAX_CHARACTER_LEVEL = 20;

// D&D 5e XP thresholds (cumulative). Key is the level number.
const XP_THRESHOLD_BY_LEVEL: Record<number, number> = {
	1: 0,
	2: 300,
	3: 900,
	4: 2700,
	5: 6500,
	6: 14000,
	7: 23000,
	8: 34000,
	9: 48000,
	10: 64000,
	11: 85000,
	12: 100000,
	13: 120000,
	14: 140000,
	15: 165000,
	16: 195000,
	17: 225000,
	18: 265000,
	19: 305000,
	20: 355000,
};

function clampLevel(level: number): number {
	if (!Number.isFinite(level)) return 1;
	return Math.max(1, Math.min(MAX_CHARACTER_LEVEL, Math.floor(level)));
}

function xpThresholdForLevel(level: number): number {
	const lvl = clampLevel(level);
	return XP_THRESHOLD_BY_LEVEL[lvl] ?? 0;
}

function xpThresholdForNextLevel(level: number): number | null {
	const lvl = clampLevel(level);
	if (lvl >= MAX_CHARACTER_LEVEL) return null;
	return XP_THRESHOLD_BY_LEVEL[lvl + 1] ?? null;
}

function computeProficiencyBonusForLevel(totalLevel: number): number {
	const lvl = clampLevel(totalLevel);
	return 2 + Math.floor((lvl - 1) / 4);
}

function getTotalCharacterLevel(character: Character): number {
	const classes = Array.isArray(character.concept?.classes) ? character.concept.classes : [];
	const sum = classes.reduce((acc, c) => acc + (Number.isFinite(c?.level) ? Number(c.level) : 0), 0);
	return clampLevel(sum || 1);
}

function computeManaSlotsMax(character: Character, totalLevel: number): number {
	const castingStat = character.mechanics?.spells?.castingStat;
	if (!castingStat) return 0;
	const lvl = clampLevel(totalLevel);
	// Simplified "mana slots" pool (not the full slot table): grows steadily.
	return Math.min(24, Math.max(2, lvl * 2));
}

function ensureCharacterProgression(character: Character): Character {
	const now = new Date().toISOString();
	const totalLevel = getTotalCharacterLevel(character);
	const xp = Number.isFinite(character.progression?.xp) ? Number(character.progression?.xp) : 0;
	const hpMax = Number.isFinite(character.mechanics?.hitPoints) ? Number(character.mechanics.hitPoints) : 1;
	const manaMax = computeManaSlotsMax(character, totalLevel);
	const xpToNext = xpThresholdForNextLevel(totalLevel);
	const canLevelUp = xpToNext != null ? xp >= xpToNext : false;

	return {
		...character,
		progression: {
			level: totalLevel,
			xp,
			xpToNextLevel: xpToNext,
			canLevelUp,
			hp: {
				current: Number.isFinite(character.progression?.hp?.current)
					? Math.max(0, Number(character.progression!.hp.current))
					: hpMax,
				max: hpMax,
			},
			manaSlots: {
				current: Number.isFinite(character.progression?.manaSlots?.current)
					? Math.max(0, Math.min(manaMax, Number(character.progression!.manaSlots.current)))
					: manaMax,
				max: manaMax,
			},
			updatedAt: now,
		},
	};
}

async function xpAwardForCampaign(env: Env, campaign: Campaign): Promise<number> {
	if (campaign.adventureId) {
		const adv = await getAdventureById(env, campaign.adventureId);
		if (adv?.difficulty === 'Easy') return 250;
		if (adv?.difficulty === 'Hard') return 600;
		return 400;
	}
	return 300;
}

async function awardXpToCharacter(env: Env, characterId: string, xpAmount: number): Promise<Character | null> {
	const stored = await env.ADA_DATA.get(`character:${characterId}`);
	if (!stored) return null;
	let character: Character;
	try {
		character = JSON.parse(stored) as Character;
	} catch {
		return null;
	}
	character = ensureCharacterProgression(character);
	const currentXp = Number.isFinite(character.progression?.xp) ? Number(character.progression!.xp) : 0;
	const updated: Character = {
		...character,
		progression: {
			...character.progression!,
			xp: Math.max(0, currentXp + Math.max(0, xpAmount)),
			updatedAt: new Date().toISOString(),
		},
		updatedAt: new Date().toISOString(),
	};
	const normalized = ensureCharacterProgression(updated);
	await env.ADA_DATA.put(`character:${characterId}`, JSON.stringify(normalized));
	return normalized;
}

type JournalEntry = {
	id: string;
	campaignId: string;
	author: string;
	createdAt: string;
	rawTranscript: string;
	polishedText: string;
};

type ScriptNote = {
	id: string;
	campaignId: string;
	author: string;
	createdAt: string;
	title: string;
	body: string;
};

type DialogueLog = {
	id: string;
	campaignId: string;
	author: string;
	createdAt: string;
	snippet: string;
	fullText: string;
};

type PartyMemberStatus = {
	id: string;
	owner: string;
	name: string;
	classSummary: string;
	level: number;
	hp: { current: number; max: number };
	manaSlots: { current: number; max: number };
};

type PartyStatus = {
	memberCount: number;
	totalLevel: number;
	averageLevel: number;
	hp: { current: number; max: number };
	manaSlots: { current: number; max: number };
	members: PartyMemberStatus[];
};

function computePartyStatus(characters: Character[]): PartyStatus {
	const normalized = (Array.isArray(characters) ? characters : []).map((c) => ensureCharacterProgression(c));
	const members: PartyMemberStatus[] = normalized.map((c) => {
		const name = c.name && String(c.name).trim() ? String(c.name).trim() : 'Unnamed adventurer';
		const classSummary = c.concept?.classSummary ? String(c.concept.classSummary) : 'Adventurer';
		const level = getTotalCharacterLevel(c);
		const hp = {
			current: Number.isFinite(c.progression?.hp?.current) ? Number(c.progression!.hp.current) : c.mechanics.hitPoints,
			max: Number.isFinite(c.progression?.hp?.max) ? Number(c.progression!.hp.max) : c.mechanics.hitPoints,
		};
		const manaSlots = {
			current: Number.isFinite(c.progression?.manaSlots?.current) ? Number(c.progression!.manaSlots.current) : 0,
			max: Number.isFinite(c.progression?.manaSlots?.max) ? Number(c.progression!.manaSlots.max) : 0,
		};
		return {
			id: c.id,
			owner: c.owner,
			name,
			classSummary,
			level,
			hp: {
				current: Math.max(0, Math.floor(hp.current)),
				max: Math.max(0, Math.floor(hp.max)),
			},
			manaSlots: {
				current: Math.max(0, Math.floor(manaSlots.current)),
				max: Math.max(0, Math.floor(manaSlots.max)),
			},
		};
	});

	const totals = members.reduce(
		(acc, m) => {
			acc.totalLevel += m.level;
			acc.hpCurrent += m.hp.current;
			acc.hpMax += m.hp.max;
			acc.manaCurrent += m.manaSlots.current;
			acc.manaMax += m.manaSlots.max;
			return acc;
		},
		{ totalLevel: 0, hpCurrent: 0, hpMax: 0, manaCurrent: 0, manaMax: 0 },
	);

	const memberCount = members.length;
	const averageLevel = memberCount ? Math.round((totals.totalLevel / memberCount) * 10) / 10 : 0;
	return {
		memberCount,
		totalLevel: totals.totalLevel,
		averageLevel,
		hp: { current: totals.hpCurrent, max: totals.hpMax },
		manaSlots: { current: totals.manaCurrent, max: totals.manaMax },
		members,
	};
}

async function loadCampaignPartyCharacters(env: Env, campaign: Campaign): Promise<Character[]> {
	const campaignId = campaign.id;
	const participantUsernames = new Set<string>();
	if (campaign.dm) participantUsernames.add(campaign.dm);
	if (Array.isArray(campaign.participants)) {
		for (const p of campaign.participants) {
			const u = String(p || '').trim();
			if (u) participantUsernames.add(u);
		}
	}

	const linkedIds = new Set<string>(Array.isArray(campaign.linkedCharacterIds) ? campaign.linkedCharacterIds : []);

	// Compatibility: also pull linked characters from each participant's index in case
	// older data only stored campaignIds on the character record.
	for (const username of participantUsernames) {
		const indexKey = `charactersByUser:${username}`;
		const existing = await env.ADA_DATA.get(indexKey);
		let ids: string[] = [];
		if (existing) {
			try {
				ids = JSON.parse(existing) as string[];
				if (!Array.isArray(ids)) ids = [];
			} catch {
				ids = [];
			}
		}
		for (const charId of ids) {
			const stored = await env.ADA_DATA.get(`character:${charId}`);
			if (!stored) continue;
			try {
				const parsed = JSON.parse(stored) as Character;
				if (parsed && parsed.id && Array.isArray(parsed.campaignIds) && parsed.campaignIds.includes(campaignId)) {
					linkedIds.add(parsed.id);
				}
			} catch {
				// ignore malformed
			}
		}
	}

	const characters: Character[] = [];
	for (const id of linkedIds) {
		const stored = await env.ADA_DATA.get(`character:${id}`);
		if (!stored) continue;
		try {
			const parsed = JSON.parse(stored) as Character;
			if (parsed && parsed.id) {
				characters.push(ensureCharacterProgression(parsed));
			}
		} catch {
			// ignore malformed
		}
	}

	// Stable ordering: by owner then by name.
	characters.sort((a, b) => {
		const ao = String(a.owner || '');
		const bo = String(b.owner || '');
		if (ao !== bo) return ao.localeCompare(bo);
		return String(a.name || '').localeCompare(String(b.name || ''));
	});

	return characters;
}

type AdventureDifficulty = 'Easy' | 'Normal' | 'Hard';

type AdventureTemplate = {
	id: string;
	title: string;
	levelMin: number;
	levelMax: number;
	difficulty: AdventureDifficulty;
	summary: string;
	primer: string;
	checkpoints: string[];
	victoryConditions: string[];
	defeatConditions: string[];
	// New D1-backed metadata fields.
	alignment?: string;
	theme?: string;
	creatorUserId?: string | null;
	createdAt?: string;
};

type TurnEntry = {
	role: 'player' | 'dm';
	text: string;
	timestamp: string;
};

type AIDMSessionState = {
	campaignId: string;
	characterId: string;
	adventureId: string;
	log: TurnEntry[];
	summary: string;
	checkpointIndex: number;
	status: 'active' | 'completed' | 'failed';
	// Idempotency marker so backfills / retries don't double-award XP.
	xpAwarded?: {
		amount: number;
		at: string;
	};
	pendingCheck?: {
		checkDescription: string | null;
		dc: number | null;
		ability: string | null;
		skill: string | null;
		advantage: 'none' | 'advantage' | 'disadvantage' | null;
	} | null;
};

function clampCheckpointIndex(index: number, checkpoints: string[]): number {
	const raw = Number.isFinite(index) ? Math.floor(index) : 0;
	const maxIdx = Math.max(0, (Array.isArray(checkpoints) ? checkpoints.length : 0) - 1);
	return Math.max(0, Math.min(maxIdx, raw));
}

function abilityModifier(score: number): number {
	// D&D 5e modifier: floor((score - 10) / 2)
	return Math.floor((score - 10) / 2);
}

function normalizeAbilityKey(ability: string | null): keyof Character['mechanics']['abilityScores'] | null {
	const a = String(ability || '').trim().toUpperCase();
	if (a === 'STR') return 'str';
	if (a === 'DEX') return 'dex';
	if (a === 'CON') return 'con';
	if (a === 'INT') return 'int';
	if (a === 'WIS') return 'wis';
	if (a === 'CHA') return 'cha';
	return null;
}

function rollD20(): number {
	// Cryptographically strong-ish for Workers.
	const bytes = new Uint32Array(1);
	crypto.getRandomValues(bytes);
	return (bytes[0] % 20) + 1;
}

function computeCheckTotal(character: Character, ability: string | null, skill: string | null, d20: number): {
	modifier: number;
	proficiency: number;
	total: number;
} {
	const abilityKey = normalizeAbilityKey(ability);
	const scores = character.mechanics?.abilityScores;
	const score = abilityKey && scores ? scores[abilityKey] : 10;
	const mod = abilityModifier(score);

	// If the session requested a skill and the character is trained in it, add proficiency bonus.
	const skillName = String(skill || '').trim().toLowerCase();
	const trainedSkills = Array.isArray(character.mechanics?.skills)
		? character.mechanics.skills.map((s) => String(s).trim().toLowerCase())
		: [];
	const isTrained = !!skillName && trainedSkills.includes(skillName);
	let profBonus = isTrained && typeof character.mechanics?.proficiencyBonus === 'number'
		? character.mechanics.proficiencyBonus
		: 0;

	// If no skill is specified, this may be a saving throw. If the character is proficient
	// in that saving throw, add proficiency bonus.
	if ((!skillName || skillName === 'none') && profBonus === 0) {
		const saves = Array.isArray(character.mechanics?.savingThrows)
			? character.mechanics.savingThrows.map((s) => String(s).trim().toLowerCase())
			: [];
		const aKey = abilityKey ? String(abilityKey).toLowerCase() : '';
		const isSaveProficient = !!aKey && saves.includes(aKey);
		if (isSaveProficient && typeof character.mechanics?.proficiencyBonus === 'number') {
			profBonus = character.mechanics.proficiencyBonus;
		}
	}
	return { modifier: mod, proficiency: profBonus, total: d20 + mod + profBonus };
}

function applyProgressDirective(
	session: AIDMSessionState,
	adventure: AdventureTemplate,
	progress: 'stay' | 'advance' | 'complete' | 'fail' | null,
): {
	changed: boolean;
	checkpointIndexBefore: number;
	checkpointIndexAfter: number;
	statusBefore: AIDMSessionState['status'];
	statusAfter: AIDMSessionState['status'];
} {
	const checkpointIndexBefore = session.checkpointIndex;
	const statusBefore = session.status;
	let changed = false;

	if (progress === 'advance') {
		const maxIdx = adventure.checkpoints.length - 1;
		if (session.checkpointIndex < maxIdx) {
			session.checkpointIndex += 1;
			changed = true;
		}
	}
	if (progress === 'complete') {
		session.status = 'completed';
		changed = true;
	}
	if (progress === 'fail') {
		session.status = 'failed';
		changed = true;
	}

	return {
		changed,
		checkpointIndexBefore,
		checkpointIndexAfter: session.checkpointIndex,
		statusBefore,
		statusAfter: session.status,
	};
}

function inferQuotaHintFromAIDMError(err: unknown): string | null {
	const msg = err && typeof (err as any).message === 'string' ? String((err as any).message) : String(err || '');
	if (!msg) return null;
	if (msg.includes('status 429') || /\b429\b/.test(msg)) {
		return 'Gemini is temporarily rate-limiting requests (HTTP 429). This usually clears up after a short wait; if it keeps happening, you may need a different model/key or a backup provider.';
	}
	if (msg.includes('GEMINI_API_KEY is not configured')) {
		return 'AI key is not configured on the server, so ADA is using a built-in fallback response.';
	}
	return null;
}

type AiQuotaInfo = {
	period: 'day';
	limit: number;
	used: number;
	remaining: number;
	resetsAt: string;
};

function getAiDailyLimit(env: Env): number {
	const raw = (env as any)?.AI_DAILY_FREE_MESSAGES;
	const parsed = raw != null ? Number(raw) : NaN;
	// A conservative default to avoid surprise bills / runaway loops.
	const fallback = 40;
	if (!Number.isFinite(parsed)) return fallback;
	return Math.max(5, Math.min(500, Math.floor(parsed)));
}

function utcDayStamp(d: Date): string {
	const y = d.getUTCFullYear();
	const m = String(d.getUTCMonth() + 1).padStart(2, '0');
	const day = String(d.getUTCDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

function nextUtcMidnightISO(d: Date): string {
	const next = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1, 0, 0, 0, 0));
	return next.toISOString();
}

function aiQuotaKey(username: string, dayStamp: string): string {
	return `aiQuota:${username}:${dayStamp}`;
}

async function getAiQuota(env: Env, username: string, now = new Date()): Promise<AiQuotaInfo> {
	const limit = getAiDailyLimit(env);
	const dayStamp = utcDayStamp(now);
	const key = aiQuotaKey(username, dayStamp);
	let used = 0;
	try {
		const stored = await env.ADA_DATA.get(key);
		if (stored) {
			const parsed = JSON.parse(stored);
			const u = Number(parsed?.used);
			if (Number.isFinite(u) && u > 0) used = Math.floor(u);
		}
	} catch {
		used = 0;
	}
	used = Math.max(0, Math.min(1000000, used));
	const remaining = Math.max(0, limit - used);
	return { period: 'day', limit, used, remaining, resetsAt: nextUtcMidnightISO(now) };
}

async function consumeAiQuota(env: Env, username: string, now = new Date()): Promise<AiQuotaInfo> {
	const limit = getAiDailyLimit(env);
	const dayStamp = utcDayStamp(now);
	const key = aiQuotaKey(username, dayStamp);
	let used = 0;
	try {
		const stored = await env.ADA_DATA.get(key);
		if (stored) {
			const parsed = JSON.parse(stored);
			const u = Number(parsed?.used);
			if (Number.isFinite(u) && u > 0) used = Math.floor(u);
		}
	} catch {
		used = 0;
	}
	used = Math.max(0, Math.min(1000000, used));
	// Consume 1 message from the daily budget.
	const nextUsed = used + 1;
	try {
		await env.ADA_DATA.put(key, JSON.stringify({ used: nextUsed }));
	} catch {
		// Best-effort: if KV write fails, still return a computed view.
	}
	const remaining = Math.max(0, limit - nextUsed);
	return { period: 'day', limit, used: nextUsed, remaining, resetsAt: nextUtcMidnightISO(now) };
}

async function handleAIDMResolveCheck(request: Request, env: Env, origin: string | null): Promise<Response> {
	let body: any;
	try {
		body = await request.json();
	} catch {
		return errorResponse('Invalid JSON body', 400, origin);
	}

	const username = String(body?.username ?? '').trim();
	const campaignId = String(body?.campaignId ?? '').trim();
	// Client may provide explicit dice for transparency, otherwise server rolls.
	const roll1 = Number.isFinite(Number(body?.roll1)) ? Number(body.roll1) : null;
	const roll2 = Number.isFinite(Number(body?.roll2)) ? Number(body.roll2) : null;

	if (!username || !campaignId) {
		return errorResponse('username and campaignId are required', 400, origin);
	}

	const storedCampaign = await env.ADA_DATA.get(`campaign:${campaignId}`);
	if (!storedCampaign) {
		return errorResponse('Campaign not found', 404, origin);
	}
	let campaign: Campaign;
	try {
		campaign = JSON.parse(storedCampaign) as Campaign;
	} catch {
		return errorResponse('Corrupted campaign record', 500, origin);
	}

	const isParticipant =
		campaign.dm === username ||
		(Array.isArray(campaign.participants) && campaign.participants.includes(username));
	if (!isParticipant) {
		return errorResponse('You are not a participant in this campaign', 403, origin);
	}
	if (!campaign.dmIsAI && campaign.mode !== 'ai-solo') {
		return errorResponse('This campaign is not configured for AI-DM mode', 400, origin);
	}

	const sessionKey = `aiSession:${campaignId}`;
	const storedSession = await env.ADA_DATA.get(sessionKey);
	if (!storedSession) {
		return errorResponse('AI-DM session not found', 404, origin);
	}
	let session: AIDMSessionState;
	try {
		session = JSON.parse(storedSession) as AIDMSessionState;
	} catch {
		return errorResponse('Corrupted AI-DM session record', 500, origin);
	}

	if (!session.pendingCheck || !session.pendingCheck.checkDescription) {
		return errorResponse('No pending check to resolve', 400, origin);
	}

	const storedCharacter = await env.ADA_DATA.get(`character:${session.characterId}`);
	if (!storedCharacter) {
		return errorResponse('Linked character not found', 500, origin);
	}
	let character: Character;
	try {
		character = JSON.parse(storedCharacter) as Character;
	} catch {
		return errorResponse('Corrupted character record', 500, origin);
	}
	if (character.owner !== username && campaign.dm !== username) {
		return errorResponse('You are not allowed to control this AI-DM session', 403, origin);
	}

	const adventureId = campaign.adventureId;
	const adventure = await getAdventureById(env, String(adventureId || '').trim());
	if (!adventure) {
		return errorResponse('Adventure configuration not found for this campaign', 500, origin);
	}

	const dc = typeof session.pendingCheck.dc === 'number' ? session.pendingCheck.dc : 0;
	const adv = session.pendingCheck.advantage || 'none';

	const d1 = roll1 != null ? Math.max(1, Math.min(20, Math.floor(roll1))) : rollD20();
	const d2 = roll2 != null ? Math.max(1, Math.min(20, Math.floor(roll2))) : rollD20();
	let chosenD20 = d1;
	if (adv === 'advantage') chosenD20 = Math.max(d1, d2);
	if (adv === 'disadvantage') chosenD20 = Math.min(d1, d2);

	const computed = computeCheckTotal(character, session.pendingCheck.ability, session.pendingCheck.skill, chosenD20);
	const success = computed.total >= dc;

	// Log the check result as a player turn so the AI can react.
	const checkLine = session.pendingCheck.checkDescription || 'check';
	const ability = session.pendingCheck.ability || 'none';
	const skill = session.pendingCheck.skill || 'none';
	const playerResultText =
		`Check result: ${checkLine}. ` +
		`Rolls: ${d1}${adv !== 'none' ? ` and ${d2} (${adv})` : ''}. ` +
		`Used: ${ability}${skill && skill !== 'none' ? ` (${skill})` : ''}. ` +
		`Total: ${computed.total} (d20 ${chosenD20} + mod ${computed.modifier} + prof ${computed.proficiency}). ` +
		`DC ${dc}. Outcome: ${success ? 'SUCCESS' : 'FAILURE'}.`;

	const now = new Date().toISOString();
	session.log.push({ role: 'player', text: playerResultText, timestamp: now });
	trimSessionLog(session);
	// Clear pending check before asking DM to continue.
	session.pendingCheck = null;

	// Progress is DM-controlled via the MECHANICS.progress field (applied after the follow-up narration).
	const beforeCheckpointIndex = session.checkpointIndex;

	// Enforce a simple per-user daily message budget so the UI can show an exact remaining count.
	// This is our app-level budget (not Google's opaque provider quota).
	const preQuota = await getAiQuota(env, username);
	if (preQuota.remaining <= 0) {
		const dmNarrative = success
			? 'You steady your breath and push onward, the momentary tension easing as the path opens ahead.'
			: 'A misstep sends a jolt of panic through you—something shifts in the brush, and the woods feel suddenly closer.';
		const dmMechanics = {
			checkDescription: null as string | null,
			dc: null as number | null,
			ability: null as string | null,
			skill: null as string | null,
			advantage: null as 'none' | 'advantage' | 'disadvantage' | null,
			progress: null as 'stay' | 'advance' | 'complete' | 'fail' | null,
			pointsOfInterest: null as string[] | null,
		};
		session.log.push({ role: 'dm', text: dmNarrative, timestamp: new Date().toISOString() });
		trimSessionLog(session);
		await env.ADA_DATA.put(sessionKey, JSON.stringify(session));

		const checkpointTotal = Array.isArray(adventure.checkpoints) ? adventure.checkpoints.length : 0;
		const ai = {
			xpReward: typeof (campaign as any)?.xpReward === 'number' ? (campaign as any).xpReward : null,
			checkpointIndex: session.checkpointIndex,
			checkpointTotal,
			checkpoints: Array.isArray(adventure.checkpoints) ? adventure.checkpoints : [],
			status: session.status,
			completedAt: campaign.completedAt || null,
		};
		const campaignPatch = {
			xpReward: ai.xpReward,
			checkpointIndex: session.checkpointIndex,
			checkpointTotal,
			status: campaign.status || null,
			completedAt: campaign.completedAt || null,
		};

		return jsonResponse(
			{
				ok: true,
				result: {
					rolls: { roll1: d1, roll2: d2, chosen: chosenD20, mode: adv },
					modifier: computed.modifier,
					proficiency: computed.proficiency,
					total: computed.total,
					dc,
					success,
					checkpointIndexBefore: beforeCheckpointIndex,
					checkpointIndexAfter: session.checkpointIndex,
				},
				narrative: dmNarrative,
				mechanics: dmMechanics,
				ai,
				campaignPatch,
				quota: preQuota,
				quotaHint: null,
			},
			{ status: 200 },
			origin,
		);
	}

	const quota = await consumeAiQuota(env, username);

	let dmNarrative: string;
	let dmMechanics = {
		checkDescription: null as string | null,
		dc: null as number | null,
		ability: null as string | null,
		skill: null as string | null,
		advantage: null as 'none' | 'advantage' | 'disadvantage' | null,
		progress: null as 'stay' | 'advance' | 'complete' | 'fail' | null,
		pointsOfInterest: null as string[] | null,
	};
	let completionJustOccurred = false;
	let quotaHint: string | null = null;
	try {
		const rawResponse = await callAIDungeonMaster(env, adventure, session, character, playerResultText);
		const parsed = parseAIDMResponse(rawResponse);
		dmNarrative = parsed.narrative;
		dmMechanics = parsed.mechanics;
		// Apply DM-directed progress after narration.
		const progressResult = applyProgressDirective(session, adventure, parsed.mechanics.progress);
		completionJustOccurred = progressResult.statusBefore !== 'completed' && session.status === 'completed';
		// Store next pending check only if it's a real check.
		const nextCheck = parsed.mechanics.checkDescription;
		const nextDc = typeof parsed.mechanics.dc === 'number' ? parsed.mechanics.dc : 0;
		const nextAbility = (parsed.mechanics.ability || '').toUpperCase();
		if (nextCheck && nextCheck.toLowerCase() !== 'none' && nextDc > 0 && nextAbility !== 'NONE') {
			session.pendingCheck = {
				checkDescription: parsed.mechanics.checkDescription,
				dc: parsed.mechanics.dc,
				ability: parsed.mechanics.ability,
				skill: parsed.mechanics.skill,
				advantage: parsed.mechanics.advantage,
			};
		} else {
			session.pendingCheck = null;
		}
	} catch (err) {
		console.error('AI-DM follow-up after check failed', err);
		quotaHint = inferQuotaHintFromAIDMError(err);
		dmNarrative = success
			? 'You steady your breath and push onward, the momentary tension easing as the path opens ahead.'
			: 'A misstep sends a jolt of panic through you—something shifts in the brush, and the woods feel suddenly closer.';
		session.pendingCheck = null;
	}

	if (completionJustOccurred && !session.xpAwarded) {
		try {
			const xpAmount = await xpAwardForCampaign(env, campaign);
			await awardXpToCharacter(env, session.characterId, xpAmount);
			session.xpAwarded = { amount: xpAmount, at: new Date().toISOString() };
			// Persist campaign completion so the UI can allow "quit" / archive flows.
			campaign.status = 'completed';
			campaign.completedAt = campaign.completedAt || new Date().toISOString();
			const prev = Array.isArray(campaign.xpAwardedToCharacterIds) ? campaign.xpAwardedToCharacterIds : [];
			if (!prev.includes(session.characterId)) prev.push(session.characterId);
			campaign.xpAwardedToCharacterIds = prev;
			(campaign as any).xpReward = xpAmount;
		} catch (err) {
			console.error('Failed to award XP on completion (resolve-check)', err);
		}
	}

	// Persist checkpoint metadata for UI (best-effort; keep minimal writes).
	let didCampaignWrite = false;
	if (!campaign.status) {
		campaign.status = 'active';
		didCampaignWrite = true;
	}
	if (session.status === 'completed' && campaign.status !== 'completed') {
		campaign.status = 'completed';
		campaign.completedAt = campaign.completedAt || new Date().toISOString();
		didCampaignWrite = true;
	}
	const checkpointTotal = Array.isArray(adventure.checkpoints) ? adventure.checkpoints.length : 0;
	if ((campaign as any).checkpointIndex !== session.checkpointIndex) {
		(campaign as any).checkpointIndex = session.checkpointIndex;
		didCampaignWrite = true;
	}
	if ((campaign as any).checkpointTotal !== checkpointTotal) {
		(campaign as any).checkpointTotal = checkpointTotal;
		didCampaignWrite = true;
	}
	if (didCampaignWrite) {
		try {
			await env.ADA_DATA.put(`campaign:${campaignId}`, JSON.stringify(campaign));
		} catch (e) {
			console.error('Failed to persist AI-solo campaign progress metadata (resolve-check)', e);
		}
	}

	session.log.push({ role: 'dm', text: dmNarrative, timestamp: new Date().toISOString() });
	trimSessionLog(session);
	await env.ADA_DATA.put(sessionKey, JSON.stringify(session));

	let xpReward: number | null = null;
	try {
		const storedXp = (campaign as any)?.xpReward;
		xpReward = typeof storedXp === 'number' ? storedXp : await xpAwardForCampaign(env, campaign);
	} catch {
		xpReward = null;
	}

	const campaignPatch = {
		xpReward: typeof xpReward === 'number' ? xpReward : null,
		checkpointIndex: session.checkpointIndex,
		checkpointTotal,
		status: campaign.status || null,
		completedAt: campaign.completedAt || null,
	};
	const ai = {
		xpReward: campaignPatch.xpReward,
		checkpointIndex: session.checkpointIndex,
		checkpointTotal,
		checkpoints: Array.isArray(adventure.checkpoints) ? adventure.checkpoints : [],
		status: session.status,
		completedAt: campaign.completedAt || null,
	};

	return jsonResponse(
		{
			ok: true,
			result: {
				rolls: { roll1: d1, roll2: d2, chosen: chosenD20, mode: adv },
				modifier: computed.modifier,
				proficiency: computed.proficiency,
				total: computed.total,
				dc,
				success,
				checkpointIndexBefore: beforeCheckpointIndex,
				checkpointIndexAfter: session.checkpointIndex,
			},
			narrative: dmNarrative,
			mechanics: dmMechanics,
			ai,
			campaignPatch,
			quota,
			quotaHint,
			...(isDebugEnabled(env)
				? {
					debug: {
						gemini: getGeminiDebugSnapshot(),
					},
				}
				: {}),
		},
		{ status: 200 },
		origin,
	);
}

async function handleHealth(origin: string | null): Promise<Response> {
	return jsonResponse({ status: 'ok' }, undefined, origin);
}

async function handleAIHealth(env: Env, origin: string | null): Promise<Response> {
	const hasKey = typeof env.GEMINI_API_KEY === 'string' && env.GEMINI_API_KEY.trim().length > 0;
	if (!hasKey) {
		return jsonResponse(
			{
				ok: false,
				status: 'missing_api_key',
				message: 'GEMINI_API_KEY is not configured on this Worker.',
			},
			{ status: 200 },
			origin,
		);
	}

	const apiKey = env.GEMINI_API_KEY.trim();
	const resolved = await resolveGeminiModelName(apiKey);
	const url =
		`https://generativelanguage.googleapis.com/${encodeURIComponent(GEMINI_API_VERSION)}/${resolved.modelName}:generateContent` +
		`?key=${encodeURIComponent(apiKey)}`;

	const body = JSON.stringify({
		contents: [
			{
				role: 'user',
				parts: [{ text: 'Respond with a single word: ok' }],
			},
		],
		generationConfig: {
			temperature: 0.0,
			maxOutputTokens: 32,
			// Avoid "thinking" consuming the entire tiny output budget.
			thinkingConfig: { thinkingBudget: 0 },
		},
	});

	let ok = false;
	let snippet = '';
	let error: string | null = null;
	let upstreamStatus: number | null = null;
	let upstreamBodySnippet: string | null = null;

	try {
		const res = await fetch(url, {
			method: 'POST',
			headers: { 'content-type': 'application/json; charset=utf-8' },
			body,
		});
		upstreamStatus = res.status;
		const rawText = await res.text().catch(() => '');
		upstreamBodySnippet = rawText ? rawText.slice(0, 600) : null;
		if (!res.ok) {
			error = `Gemini health check failed with status ${res.status}`;
		} else {
			let data: any = null;
			try {
				data = rawText ? JSON.parse(rawText) : null;
			} catch {
				data = null;
			}
			const parts: string[] =
				data?.candidates?.[0]?.content?.parts?.map((p: any) =>
					p && typeof p.text === 'string' ? p.text : '',
				) || [];
			snippet = parts.join('').trim();
			ok = snippet.length > 0;
		}
	} catch (err: any) {
		error = err && typeof err.message === 'string' ? err.message : 'Unknown error calling Gemini';
	}

	return jsonResponse(
		{
			ok,
			status: ok ? 'healthy' : 'error',
			hasKey: true,
			message: ok ? 'Gemini responded successfully.' : error || 'Gemini did not return a usable response.',
			snippet,
			apiVersion: GEMINI_API_VERSION,
			model: resolved.modelName,
			resolvedFrom: resolved.resolvedFrom,
			upstreamStatus,
			upstreamBodySnippet,
		},
		{ status: 200 },
		origin,
	);
}

async function handleAIModels(env: Env, origin: string | null): Promise<Response> {
	const hasKey = typeof env.GEMINI_API_KEY === 'string' && env.GEMINI_API_KEY.trim().length > 0;
	if (!hasKey) {
		return jsonResponse(
			{
				ok: false,
				status: 'missing_api_key',
				message: 'GEMINI_API_KEY is not configured on this Worker.',
			},
			{ status: 200 },
			origin,
		);
	}

	const apiKey = env.GEMINI_API_KEY.trim();
	const listed = await listGeminiModels(apiKey);
	const models = listed.models
		.map((m) => ({
			name: m.name ?? null,
			baseModelId: m.baseModelId ?? null,
			version: m.version ?? null,
			displayName: m.displayName ?? null,
			supportedGenerationMethods: Array.isArray(m.supportedGenerationMethods)
				? m.supportedGenerationMethods
				: [],
		}))
		// Keep payload bounded.
		.slice(0, 80);

	const resolved = await resolveGeminiModelName(apiKey);

	return jsonResponse(
		{
			ok: listed.ok,
			apiVersion: GEMINI_API_VERSION,
			count: listed.models.length,
			returned: models.length,
			resolvedModel: resolved.modelName,
			resolvedFrom: resolved.resolvedFrom,
			models,
			upstreamStatus: listed.upstreamStatus,
			upstreamBodySnippet: listed.upstreamBodySnippet,
		},
		{ status: 200 },
		origin,
	);
}

function normalizeAdventureDifficulty(raw: any): AdventureDifficulty {
	const v = String(raw || '').trim().toLowerCase();
	if (v === 'easy') return 'Easy';
	if (v === 'hard') return 'Hard';
	return 'Normal';
}

function normalizeBoundedInt(raw: any, fallback: number, min: number, max: number): number {
	const n = Number.parseInt(String(raw ?? ''), 10);
	if (!Number.isFinite(n)) return fallback;
	return Math.max(min, Math.min(max, n));
}

function normalizeStringList(
	raw: any,
	opts: { maxItems: number; maxItemLength: number; splitPattern?: RegExp },
): string[] {
	const splitPattern = opts.splitPattern ?? /\n/;
	const arr = Array.isArray(raw)
		? raw
		: typeof raw === 'string'
			? String(raw)
				.split(splitPattern)
				.map((s) => s.trim())
				.filter(Boolean)
			: [];
	return arr
		.map((v: any) => String(v || '').trim())
		.filter(Boolean)
		.map((v) => (v.length > opts.maxItemLength ? v.slice(0, opts.maxItemLength) : v))
		.slice(0, opts.maxItems);
}

async function listPublishedAdventures(env: Env): Promise<AdventureTemplate[]> {
	// Deprecated (KV adventures). Adventures are now stored in D1.
	return [];
}

type DbAdventureRow = {
	id: string;
	title: string;
	level_min: number;
	level_max: number;
	difficulty: string;
	summary: string;
	primer: string;
	checkpoints_json: string;
	victory_conditions_json: string;
	defeat_conditions_json: string;
	alignment: string | null;
	theme: string | null;
	creator_user_id: string | null;
	created_at: string;
};

function safeParseJsonStringArray(raw: unknown): string[] {
	if (Array.isArray(raw)) {
		return raw.map((v) => String(v || '').trim()).filter(Boolean);
	}
	if (typeof raw !== 'string') return [];
	try {
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed.map((v) => String(v || '').trim()).filter(Boolean);
	} catch {
		return [];
	}
}

function normalizeDbDifficulty(raw: unknown): AdventureDifficulty {
	const v = String(raw ?? '').trim().toLowerCase();
	if (v === 'easy') return 'Easy';
	if (v === 'hard') return 'Hard';
	return 'Normal';
}

function dbAdventureRowToTemplate(row: DbAdventureRow): AdventureTemplate {
	return {
		id: String(row.id),
		title: String(row.title),
		levelMin: Number(row.level_min) || 1,
		levelMax: Number(row.level_max) || Math.max(1, Number(row.level_min) || 1),
		difficulty: normalizeDbDifficulty(row.difficulty),
		summary: String(row.summary || ''),
		primer: String(row.primer || ''),
		checkpoints: safeParseJsonStringArray(row.checkpoints_json),
		victoryConditions: safeParseJsonStringArray(row.victory_conditions_json),
		defeatConditions: safeParseJsonStringArray(row.defeat_conditions_json),
		alignment: row.alignment != null ? String(row.alignment) : '',
		theme: row.theme != null ? String(row.theme) : '',
		creatorUserId: row.creator_user_id,
		createdAt: String(row.created_at || ''),
	};
}

async function ensureAdventuresD1Schema(env: Env): Promise<void> {
	const db = env.ADA_DB;
	if (!db) return;
	// Best-effort bootstrap for dev/test environments where migrations may not be applied.
	try {
		const usersTableRes = await db
			.prepare("SELECT 1 AS ok FROM sqlite_master WHERE type='table' AND name='users' LIMIT 1")
			.all<{ ok: number }>();
		const hasUsersTable = Array.isArray(usersTableRes.results) && usersTableRes.results.length > 0;

		await db
			.prepare(
				`CREATE TABLE IF NOT EXISTS adventures (
				  id TEXT PRIMARY KEY,
				  title TEXT NOT NULL,
				  level_min INTEGER NOT NULL,
				  level_max INTEGER NOT NULL,
				  difficulty TEXT NOT NULL,
				  summary TEXT NOT NULL,
				  primer TEXT NOT NULL,
				  checkpoints_json TEXT NOT NULL,
				  victory_conditions_json TEXT NOT NULL,
				  defeat_conditions_json TEXT NOT NULL,
				  alignment TEXT NOT NULL DEFAULT '',
				  theme TEXT NOT NULL DEFAULT '',
				  creator_user_id TEXT,
				  created_at TEXT NOT NULL${hasUsersTable ? ',\n\t\t\t\t  FOREIGN KEY (creator_user_id) REFERENCES users(id) ON DELETE SET NULL' : ''}
				)`
			)
			.run();
		await db
			.prepare('CREATE INDEX IF NOT EXISTS idx_adventures_created_at ON adventures(created_at)')
			.run();
		await db
			.prepare('CREATE INDEX IF NOT EXISTS idx_adventures_level_min ON adventures(level_min)')
			.run();

		// Seed RED_CLOAK for backwards compatibility (frontend + tests rely on it).
		await db
			.prepare(
				`INSERT OR IGNORE INTO adventures (
				  id, title, level_min, level_max, difficulty, summary, primer,
				  checkpoints_json, victory_conditions_json, defeat_conditions_json,
				  alignment, theme, creator_user_id, created_at
				) VALUES (
				  ?1, ?2, ?3, ?4, ?5, ?6, ?7,
				  ?8, ?9, ?10,
				  ?11, ?12, ?13, ?14
				)`
			)
			.bind(
				'RED_CLOAK',
				'The Red Cloak and the Shadow-Touched Wolf',
				1,
				2,
				'Normal',
				'A short, spooky solo adventure in the Whispering Woods where you must deliver spirit-warding herbs to your Grandmother while a corrupted wolf stalks the paths.',
				'You are acting as an AI Dungeon Master for D&D 5e. You are running a contained adventure in the Whispering Woods. The player is a low-level messenger wearing a red cloak, tasked with carrying spirit-warding herbs to their Grandmother. The forest is haunted by a Shadow-Touched Wolf that corrupts spirits and hunts travelers. Keep the tone atmospheric and slightly eerie, but not grotesque.',
				JSON.stringify(['crossroads', 'snaring_vines', 'cottage']),
				JSON.stringify([
					"The player successfully reaches Grandmother's cottage and delivers the spirit-warding herbs.",
					'The Shadow-Touched Wolf is neutralized, driven away, or otherwise no longer a threat.',
				]),
				JSON.stringify([
					'The player character is reduced to 0 hit points with no clear rescue available.',
					'The herbs are irretrievably lost or destroyed before reaching Grandmother.',
				]),
				'',
				'Whispering Woods',
				null,
				'2026-01-02T00:00:00.000Z',
			)
			.run();
	} catch {
		// ignore bootstrap failures
	}
}

async function dbListAdventures(env: Env): Promise<AdventureTemplate[]> {
	const db = env.ADA_DB;
	if (!db) return [];
	try {
		const res = await db
			.prepare(
				`SELECT id, title, level_min, level_max, difficulty, summary, primer,
				        checkpoints_json, victory_conditions_json, defeat_conditions_json,
				        alignment, theme, creator_user_id, created_at
				 FROM adventures
				 ORDER BY created_at DESC`,
			)
			.all<DbAdventureRow>();
		const rows = Array.isArray(res.results) ? res.results : [];
		if (rows.length === 0) {
			// Handle partially-initialized dev/test D1 databases.
			await ensureAdventuresD1Schema(env);
			const res2 = await db
				.prepare(
					`SELECT id, title, level_min, level_max, difficulty, summary, primer,
					        checkpoints_json, victory_conditions_json, defeat_conditions_json,
					        alignment, theme, creator_user_id, created_at
					 FROM adventures
					 ORDER BY created_at DESC`,
				)
				.all<DbAdventureRow>();
			const rows2 = Array.isArray(res2.results) ? res2.results : [];
			return rows2.map(dbAdventureRowToTemplate).filter((a) => a.id && a.title);
		}
		return rows.map(dbAdventureRowToTemplate).filter((a) => a.id && a.title);
	} catch {
		// Migration-safe: table may not exist yet.
		await ensureAdventuresD1Schema(env);
		try {
			const res = await db
				.prepare(
					`SELECT id, title, level_min, level_max, difficulty, summary, primer,
					        checkpoints_json, victory_conditions_json, defeat_conditions_json,
					        alignment, theme, creator_user_id, created_at
					 FROM adventures
					 ORDER BY created_at DESC`,
				)
				.all<DbAdventureRow>();
			const rows = Array.isArray(res.results) ? res.results : [];
			return rows.map(dbAdventureRowToTemplate).filter((a) => a.id && a.title);
		} catch {
			return [];
		}
	}
}

async function dbGetAdventureById(env: Env, id: string): Promise<AdventureTemplate | null> {
	const db = env.ADA_DB;
	if (!db) return null;
	try {
		const res = await db
			.prepare(
				`SELECT id, title, level_min, level_max, difficulty, summary, primer,
				        checkpoints_json, victory_conditions_json, defeat_conditions_json,
				        alignment, theme, creator_user_id, created_at
				 FROM adventures
				 WHERE id = ?1
				 LIMIT 1`,
			)
			.bind(id)
			.all<DbAdventureRow>();
		const row = res.results?.[0] ?? null;
		return row ? dbAdventureRowToTemplate(row) : null;
	} catch {
		await ensureAdventuresD1Schema(env);
		try {
			const res = await db
				.prepare(
					`SELECT id, title, level_min, level_max, difficulty, summary, primer,
					        checkpoints_json, victory_conditions_json, defeat_conditions_json,
					        alignment, theme, creator_user_id, created_at
					 FROM adventures
					 WHERE id = ?1
					 LIMIT 1`,
				)
				.bind(id)
				.all<DbAdventureRow>();
			const row = res.results?.[0] ?? null;
			return row ? dbAdventureRowToTemplate(row) : null;
		} catch {
			return null;
		}
	}
}

async function dbInsertAdventure(
	env: Env,
	row: {
		id: string;
		title: string;
		level_min: number;
		level_max: number;
		difficulty: string;
		summary: string;
		primer: string;
		checkpoints_json: string;
		victory_conditions_json: string;
		defeat_conditions_json: string;
		alignment: string;
		theme: string;
		creator_user_id: string | null;
		created_at: string;
	},
): Promise<void> {
	const db = env.ADA_DB;
	if (!db) throw new Error('D1 not configured');
	try {
		await db
			.prepare(
			`INSERT INTO adventures (
				id, title, level_min, level_max, difficulty, summary, primer,
				checkpoints_json, victory_conditions_json, defeat_conditions_json,
				alignment, theme, creator_user_id, created_at
			) VALUES (
				?1, ?2, ?3, ?4, ?5, ?6, ?7,
				?8, ?9, ?10,
				?11, ?12, ?13, ?14
			)`,
			)
			.bind(
				row.id,
				row.title,
				row.level_min,
				row.level_max,
				row.difficulty,
				row.summary,
				row.primer,
				row.checkpoints_json,
				row.victory_conditions_json,
				row.defeat_conditions_json,
				row.alignment,
				row.theme,
				row.creator_user_id,
				row.created_at,
			)
			.run();
	} catch {
		await ensureAdventuresD1Schema(env);
		await db
			.prepare(
				`INSERT INTO adventures (
					id, title, level_min, level_max, difficulty, summary, primer,
					checkpoints_json, victory_conditions_json, defeat_conditions_json,
					alignment, theme, creator_user_id, created_at
				) VALUES (
					?1, ?2, ?3, ?4, ?5, ?6, ?7,
					?8, ?9, ?10,
					?11, ?12, ?13, ?14
				)`,
			)
			.bind(
				row.id,
				row.title,
				row.level_min,
				row.level_max,
				row.difficulty,
				row.summary,
				row.primer,
				row.checkpoints_json,
				row.victory_conditions_json,
				row.defeat_conditions_json,
				row.alignment,
				row.theme,
				row.creator_user_id,
				row.created_at,
			)
			.run();
	}
}

async function getAdventureById(env: Env, adventureId: string): Promise<AdventureTemplate | null> {
	const id = String(adventureId || '').trim();
	if (!id) return null;

	// D1 source of truth.
	const fromD1 = await dbGetAdventureById(env, id);
	if (fromD1) return fromD1;

	// Migration-safe fallback: legacy KV record (read-only).
	const stored = await env.ADA_DATA.get(`adventure:${id}`);
	if (stored) {
		try {
			const parsed = JSON.parse(stored) as AdventureTemplate;
			if (parsed && parsed.id === id && parsed.title && Array.isArray(parsed.checkpoints)) {
				return parsed;
			}
		} catch {
			// ignore malformed
		}
	}

	return null;
}

async function handleListAdventures(env: Env, origin: string | null): Promise<Response> {
	const adventures = await dbListAdventures(env);
	return jsonResponse({ ok: true, adventures }, undefined, origin);
}

async function handlePublishAdventure(request: Request, env: Env, origin: string | null): Promise<Response> {
	let body: any;
	try {
		body = await request.json();
	} catch {
		return errorResponse('Invalid JSON body', 400, origin);
	}

	const username = String(body?.username ?? '').trim();
	const title = String(body?.title ?? body?.name ?? '').trim();
	const summary = String(body?.summary ?? '').trim();
	const primerRaw = String(body?.primer ?? '').trim();
	const difficulty = normalizeAdventureDifficulty(body?.difficulty);
	const levelMin = normalizeBoundedInt(body?.levelMin, 1, 1, 20);
	const levelMax = normalizeBoundedInt(body?.levelMax, Math.max(1, levelMin), 1, 20);
	const tags = normalizeStringList(body?.tags ?? body?.templateTags, {
		maxItems: 12,
		maxItemLength: 32,
		splitPattern: /,|\n/,
	});

	if (!username || !title || !summary) {
		return errorResponse('username, title and summary are required', 400, origin);
	}

	// Ensure the caller exists. During the D1 migration, users may still live in KV,
	// so we don't hard-require a D1 user row here.
	const userRecord = await env.ADA_DATA.get(`user:${username}`);
	if (!userRecord && !env.ADA_DB) {
		return errorResponse('Unknown user', 404, origin);
	}

	const checkpoints = normalizeStringList(body?.checkpoints, {
		maxItems: 12,
		maxItemLength: 48,
		splitPattern: /,|\n/,
	});
	const victoryConditions = normalizeStringList(body?.victoryConditions, {
		maxItems: 8,
		maxItemLength: 200,
	});
	const defeatConditions = normalizeStringList(body?.defeatConditions, {
		maxItems: 8,
		maxItemLength: 200,
	});

	const normalizedCheckpoints = checkpoints.length ? checkpoints : ['opening', 'complication', 'finale'];
	const normalizedVictory = victoryConditions.length
		? victoryConditions
		: ['The player completes the central objective of the adventure.'];
	const normalizedDefeat = defeatConditions.length
		? defeatConditions
		: ['The player character is reduced to 0 hit points with no clear rescue available.'];

	const primer = primerRaw
		? primerRaw.slice(0, 2200)
		: `You are acting as an AI Dungeon Master for D&D 5e. Run a tightly scoped solo adventure.\n\nAdventure premise: ${summary.slice(0, 600)}`;

	const id = crypto.randomUUID();
	const createdAt = new Date().toISOString();
	const alignment = String(body?.alignment ?? '').trim().slice(0, 80);
	const theme = String(body?.theme ?? '').trim().slice(0, 80);
	const adventure: AdventureTemplate & { creatorUsername?: string; tags?: string[] } = {
		id,
		title: title.slice(0, 120),
		levelMin,
		levelMax: Math.max(levelMin, levelMax),
		difficulty,
		summary: summary.slice(0, 600),
		primer,
		checkpoints: normalizedCheckpoints,
		victoryConditions: normalizedVictory,
		defeatConditions: normalizedDefeat,
		creatorUsername: username,
		createdAt,
		alignment,
		theme,
		...(tags.length ? { tags } : {}),
	};

	// D1 source of truth.
	try {
		if (!env.ADA_DB) {
			return errorResponse('D1 database binding ADA_DB is not configured', 500, origin);
		}
		await dbInsertAdventure(env, {
			id,
			title: adventure.title,
			level_min: adventure.levelMin,
			level_max: adventure.levelMax,
			difficulty: adventure.difficulty,
			summary: adventure.summary,
			primer: adventure.primer,
			checkpoints_json: JSON.stringify(adventure.checkpoints || []),
			victory_conditions_json: JSON.stringify(adventure.victoryConditions || []),
			defeat_conditions_json: JSON.stringify(adventure.defeatConditions || []),
			alignment: alignment || '',
			theme: theme || '',
			creator_user_id: null,
			created_at: createdAt,
		});
	} catch (e) {
		console.error('[adventures] D1 insert failed', e);
		return errorResponse('Failed to publish adventure', 500, origin);
	}

	return jsonResponse({ ok: true, adventure }, { status: 201 }, origin);
}

function extractFirstJsonObject(text: string): string | null {
	const s = String(text || '').trim();
	if (!s) return null;
	// Fast-path: already a standalone object.
	if (s.startsWith('{') && s.endsWith('}')) return s;
	const start = s.indexOf('{');
	if (start < 0) return null;
	let depth = 0;
	let inString = false;
	let escaped = false;
	for (let i = start; i < s.length; i++) {
		const ch = s[i];
		if (inString) {
			if (escaped) {
				escaped = false;
				continue;
			}
			if (ch === '\\') {
				escaped = true;
				continue;
			}
			if (ch === '"') {
				inString = false;
			}
			continue;
		}
		if (ch === '"') {
			inString = true;
			continue;
		}
		if (ch === '{') depth++;
		if (ch === '}') {
			depth--;
			if (depth === 0) {
				return s.slice(start, i + 1);
			}
		}
	}
	return null;
}

function normalizeJsonArrayText(value: any): string {
	if (Array.isArray(value)) return JSON.stringify(value.map((x) => String(x || '').trim()).filter(Boolean));
	const s = String(value ?? '').trim();
	if (!s) return '[]';
	// If it looks like a JSON array string, keep it; otherwise, wrap as a single-item array.
	if (s.startsWith('[') && s.endsWith(']')) return s;
	return JSON.stringify([s]);
}

function safeParseJsonStringArrayText(value: string): string[] {
	const s = String(value || '').trim();
	if (!s) return [];
	try {
		const parsed = JSON.parse(s);
		if (!Array.isArray(parsed)) return [];
		return parsed.map((x) => String(x || '').trim()).filter(Boolean);
	} catch {
		return [];
	}
}

function timingSafeEqual(a: string, b: string): boolean {
	// Best-effort constant-time compare for short shared-secret strings.
	// Prevents trivial timing probes from leaking prefix matches.
	const enc = new TextEncoder();
	const ab = enc.encode(String(a ?? ''));
	const bb = enc.encode(String(b ?? ''));
	const max = Math.max(ab.length, bb.length);
	let diff = 0;
	for (let i = 0; i < max; i++) {
		diff |= (ab[i] ?? 0) ^ (bb[i] ?? 0);
	}
	return diff === 0 && ab.length === bb.length;
}

function isArchitectAuthorized(request: Request, env: Env): boolean {
	const expected = String(env.ARCHITECT_SECRET ?? '').trim();
	if (!expected) return false;
	const provided = String(request.headers.get('X-Architect-Secret') ?? '').trim();
	return timingSafeEqual(provided, expected);
}

function buildArchitectScenarioSystemPrompt(): string {
	return [
		'You are a senior D&D 5e scenario architect and adventure designer.',
		'',
		'You MUST output a STRICT JSON object and NOTHING ELSE (no markdown, no prose, no code fences).',
		'If you output anything other than a single JSON object, the system will treat it as a failure.',
		'',
		'Your JSON MUST match the Cloudflare D1 `adventures` table schema using these exact keys:',
		'- title (string, <= 120 chars)',
		'- level_min (integer, 1..20)',
		'- level_max (integer, 1..20, >= level_min)',
		'- difficulty (string: "Normal" | "Hard" | "Deadly")',
		'- summary (string, <= 600 chars)',
		'- primer (string, <= 2200 chars)',
		'- checkpoints_json (string containing a valid JSON array of short checkpoint ids, 3..10 items, <= 48 chars each)',
		'- victory_conditions_json (string containing a valid JSON array of 2..6 victory condition strings)',
		'- defeat_conditions_json (string containing a valid JSON array of 2..6 defeat condition strings)',
		'- alignment (string)',
		'- theme (string)',
		'- creator_user_id (string or null)',
		'- created_at (ISO-8601 string)',
		'',
		'Alignment tailoring requirement (MANDATORY):',
		'- You MUST tailor BOTH the primer and the checkpoints to the provided alignment.',
		'- Examples: Lawful Good scenarios should emphasize heroism, duty, protection, and fair choices.',
		'  Chaotic Evil scenarios should emphasize subversion, conquest, cruelty, and self-serving opportunism.',
		'- The alignment should materially change the moral framing, NPC motivations, and the types of conflicts.',
		'',
		'Hard constraints:',
		'- No sexual content.',
		'- Keep it playable as a solo scenario with clear escalation across checkpoints.',
		'- checkpoints_json MUST be a JSON string (e.g., "[\"opening\",\"complication\",\"finale\"]").',
		'- Do NOT include an id field; the server will assign it.',
	].join('\n');
}

function buildArchitectScenarioUserPrompt(params: {
	alignment: string;
	minLevel: number;
	maxLevel: number;
	theme: string;
}): string {
	return [
		'Generate one adventure scenario using these inputs:',
		`alignment: ${params.alignment}`,
		`minLevel: ${params.minLevel}`,
		`maxLevel: ${params.maxLevel}`,
		`theme: ${params.theme}`,
		'',
		'Rules:',
		`- Set alignment exactly to "${params.alignment}"`,
		`- Set theme exactly to "${params.theme}"`,
		`- level_min must be ${params.minLevel} and level_max must be ${params.maxLevel}`,
		'- Make checkpoints_json reflect the alignment and theme, and ensure each checkpoint is a short id-like label.',
		'- Keep summary and primer aligned to the same premise.',
	].join('\n');
}

async function callArchitectScenarioGenerator(env: Env, systemPrompt: string, userPrompt: string): Promise<string> {
	const apiKey = typeof env.GEMINI_API_KEY === 'string' ? env.GEMINI_API_KEY.trim() : '';
	if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');
	const resolved = await resolveGeminiModelName(apiKey);
	const url =
		`https://generativelanguage.googleapis.com/${encodeURIComponent(GEMINI_API_VERSION)}/${resolved.modelName}:generateContent` +
		`?key=${encodeURIComponent(apiKey)}`;

	const body = JSON.stringify({
		systemInstruction: { parts: [{ text: systemPrompt }] },
		contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
		generationConfig: {
			// Keep temperature low to improve schema compliance.
			temperature: 0.2,
			maxOutputTokens: 1600,
			// Encourage the API to return parseable JSON.
			responseMimeType: 'application/json',
		},
	});

	const res = await fetch(url, {
		method: 'POST',
		headers: { 'content-type': 'application/json; charset=utf-8' },
		body,
	});
	if (!res.ok) {
		const errText = await res.text().catch(() => '');
		throw new Error(`Gemini error (${res.status}): ${errText}`);
	}
	const data = (await res.json().catch(() => null)) as any;
	const parts: string[] =
		data?.candidates?.[0]?.content?.parts?.map((p: any) => (p && typeof p.text === 'string' ? p.text : '')) || [];
	return parts.join('').trim();
}

function buildArchitectScenarioRepairSystemPrompt(): string {
	return [
		'You are a strict JSON repair tool.',
		'You will be given a broken or non-compliant model output.',
		'',
		'Your job: return ONLY a single valid JSON object that can be parsed by JSON.parse().',
		'- No markdown, no prose, no code fences.',
		'- Use double quotes for all JSON strings.',
		'- Do not include trailing commas.',
		'',
		'The JSON object MUST contain EXACTLY these keys (no extra keys):',
		'title, level_min, level_max, difficulty, summary, primer, checkpoints_json, victory_conditions_json, defeat_conditions_json, alignment, theme, creator_user_id, created_at',
		'',
		'For checkpoints_json, victory_conditions_json, defeat_conditions_json:',
		'- Each must be a STRING containing a valid JSON array, e.g. "[\"opening\",\"finale\"]".',
	].join('\n');
}

function buildArchitectScenarioRepairUserPrompt(params: {
	alignment: string;
	minLevel: number;
	maxLevel: number;
	theme: string;
	brokenOutput: string;
}): string {
	return [
		'Repair the following output into a valid JSON object that satisfies the requirements.',
		`Required alignment: ${params.alignment}`,
		`Required theme: ${params.theme}`,
		`Required level_min: ${params.minLevel}`,
		`Required level_max: ${params.maxLevel}`,
		'',
		'Broken output (may contain extra text/markdown):',
		params.brokenOutput.slice(0, 8000),
	].join('\n');
}

async function handleArchitectGenerateScenario(request: Request, env: Env, origin: string | null): Promise<Response> {
	const expected = String(env.ARCHITECT_SECRET ?? '').trim();
	if (!expected) return errorResponse('ARCHITECT_SECRET is not configured', 500, origin);
	if (!isArchitectAuthorized(request, env)) return errorResponse('Unauthorized', 401, origin);

	let body: any;
	try {
		body = await request.json();
	} catch {
		return errorResponse('Invalid JSON body', 400, origin);
	}

	const alignment = String(body?.alignment ?? '').trim().slice(0, 80);
	const theme = String(body?.theme ?? '').trim().slice(0, 80);
	const minLevel = normalizeBoundedInt(body?.minLevel, 1, 1, 20);
	const maxLevel = normalizeBoundedInt(body?.maxLevel, Math.max(1, minLevel), 1, 20);
	if (!alignment || !theme) return errorResponse('alignment and theme are required', 400, origin);
	if (!env.ADA_DB) return errorResponse('D1 database binding ADA_DB is not configured', 500, origin);

	const systemPrompt = buildArchitectScenarioSystemPrompt();
	const userPrompt = buildArchitectScenarioUserPrompt({ alignment, minLevel, maxLevel, theme });

	let raw: string;
	try {
		raw = await callArchitectScenarioGenerator(env, systemPrompt, userPrompt);
	} catch (e: any) {
		console.error('[architect] Gemini generation failed', e);
		return errorResponse('Scenario generation failed', 502, origin);
	}

	let jsonText = extractFirstJsonObject(raw) || raw;
	let obj: any;
	try {
		obj = JSON.parse(jsonText);
	} catch {
		// One automatic repair attempt: ask Gemini to output strict JSON only.
		try {
			const repairSystem = buildArchitectScenarioRepairSystemPrompt();
			const repairUser = buildArchitectScenarioRepairUserPrompt({
				alignment,
				minLevel,
				maxLevel,
				theme,
				brokenOutput: raw,
			});
			const repaired = await callArchitectScenarioGenerator(env, repairSystem, repairUser);
			jsonText = extractFirstJsonObject(repaired) || repaired;
			obj = JSON.parse(jsonText);
		} catch (e) {
			console.error('[architect] Failed to parse generated JSON (after repair)', {
				raw: raw?.slice(0, 800),
			});
			return errorResponse('Model did not return valid JSON', 502, origin);
		}
	}
	if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
		return errorResponse('Model returned invalid JSON shape', 502, origin);
	}

	const title = String(obj?.title ?? '').trim().slice(0, 120);
	const summary = String(obj?.summary ?? '').trim().slice(0, 600);
	const primer = String(obj?.primer ?? '').trim().slice(0, 2200);
	const difficulty = normalizeAdventureDifficulty(obj?.difficulty);
	const level_min = normalizeBoundedInt(obj?.level_min, minLevel, 1, 20);
	const level_max = normalizeBoundedInt(obj?.level_max, maxLevel, 1, 20);
	if (!title || !summary || !primer) return errorResponse('Model output missing required fields', 502, origin);

	const checkpoints_json = normalizeJsonArrayText(obj?.checkpoints_json);
	const victory_conditions_json = normalizeJsonArrayText(obj?.victory_conditions_json);
	const defeat_conditions_json = normalizeJsonArrayText(obj?.defeat_conditions_json);

	// Validate that the *_json fields are parseable arrays of strings.
	const checkpoints = safeParseJsonStringArrayText(checkpoints_json);
	const victoryConditions = safeParseJsonStringArrayText(victory_conditions_json);
	const defeatConditions = safeParseJsonStringArrayText(defeat_conditions_json);
	if (checkpoints.length < 3) return errorResponse('Model output checkpoints_json must include at least 3 checkpoints', 502, origin);
	if (victoryConditions.length < 2) return errorResponse('Model output victory_conditions_json must include at least 2 items', 502, origin);
	if (defeatConditions.length < 2) return errorResponse('Model output defeat_conditions_json must include at least 2 items', 502, origin);

	const id = crypto.randomUUID();
	const createdAt = new Date().toISOString();

	try {
		// Ensure table exists in dev/test.
		await ensureAdventuresD1Schema(env);
		await dbInsertAdventure(env, {
			id,
			title,
			level_min: Math.max(1, Math.min(level_min, 20)),
			level_max: Math.max(Math.max(1, level_min), Math.min(level_max, 20)),
			difficulty,
			summary,
			primer,
			checkpoints_json: JSON.stringify(checkpoints.slice(0, 10).map((c) => c.slice(0, 48))),
			victory_conditions_json: JSON.stringify(victoryConditions.slice(0, 6).map((c) => c.slice(0, 220))),
			defeat_conditions_json: JSON.stringify(defeatConditions.slice(0, 6).map((c) => c.slice(0, 220))),
			alignment,
			theme,
			creator_user_id: null,
			created_at: createdAt,
		});
	} catch (e) {
		console.error('[architect] D1 insert failed', e);
		return errorResponse('Failed to persist scenario', 500, origin);
	}

	return jsonResponse({ ok: true, id, title }, { status: 201 }, origin);
}

function buildCharacterSummary(character: Character): string {
	const name = character.name || 'Unnamed adventurer';
	const race = character.concept?.race || 'Unknown race';
	const classSummary = character.concept?.classSummary || 'Adventurer';
	const levelSummary = character.concept?.levelSummary || '1';
	const abilities = character.mechanics?.abilityScores;
	const abilityLine = abilities
		? `STR ${abilities.str}, DEX ${abilities.dex}, CON ${abilities.con}, INT ${abilities.int}, WIS ${abilities.wis}, CHA ${abilities.cha}`
		: '';
	const hp = character.mechanics?.hitPoints;
	const ac = character.mechanics?.armorClass;
	const speed = character.mechanics?.speed;
	const prof = character.mechanics?.proficiencyBonus;
	const coreStats = [
		`Level(s): ${levelSummary}`,
		hp != null ? `HP ${hp}` : '',
		ac != null ? `AC ${ac}` : '',
		speed != null ? `Speed ${speed} ft` : '',
		prof != null ? `Proficiency bonus +${prof}` : '',
	]
		.filter(Boolean)
		.join(' · ');
	const skills = Array.isArray(character.mechanics?.skills)
		? character.mechanics.skills.join(', ')
		: '';
	return [
		`${name} – ${race} ${classSummary} (Level summary: ${levelSummary})`,
		abilityLine,
		coreStats,
		skills ? `Trained skills: ${skills}` : '',
	]
		.filter(Boolean)
		.join('\n');
}

function buildSessionHistory(log: TurnEntry[]): string {
	if (!Array.isArray(log) || !log.length) return '';
	return log
		.slice(-10)
		.map((entry) => {
			const who = entry.role === 'player' ? 'Player' : 'DM';
			return `${who}: ${entry.text}`;
		})
		.join('\n');
}

function buildAIDMSystemPrompt(): string {
	return [
		'You are the Dungeon Master (DM) for a solo D&D 5e adventure.',
		'You run tightly scoped, structured solo adventures for a single player.',
		'Always respect D&D 5e tone and mechanics: low-level heroes are fragile, magic and powerful items are limited.',
		'',
		'Never mention that you are an AI, a model, or a system. Never refer to yourself as "ADA" in the narration.',
		'Do not narrate about "ADA" speaking, her words, or anything meta about how the response was generated.',
		'If the player asks who/what you are, answer in-world or as the DM in first person ("I"), not in third person.',
		'',
		'Never simply repeat the player\'s last input back to them as your narration.',
		'Always advance the scene with new details: environment, NPC reactions, consequences, or new options.',
		'',
		'Your output MUST follow this exact structure:',
		'[NARRATIVE]',
		'Rich second-person narration describing what happens next at the current scene.',
		'Keep it to 1–3 short paragraphs.',
		'[/NARRATIVE]',
		'',
		'[MECHANICS]',
		'- check: a short description of any roll the player should make, or "none"',
		'- dc: the DC for the check, or 0 if none',
		'- ability: STR, DEX, CON, INT, WIS, or CHA, or "none" if no check',
		'- skill: the skill used, or "none" if no check (for ability checks or saving throws)',
		'- advantage: one of "none", "advantage", or "disadvantage"',
		'- progress: one of "stay", "advance", "complete", or "fail"',
		'- pointsOfInterest: a semicolon-separated list of 0–4 short, actionable points of interest the player could investigate next, or "none"',
		'[/MECHANICS]',
		'',
		'Do not include any other sections or markup.',
		'If no check is required, set check to "none" and dc to 0 and progress to "stay".',
		'Use progress="advance" only when the narration clearly transitions the player into the next checkpoint scene.',
		'Use progress="complete" only when victory conditions are met. Use progress="fail" only on a clear defeat state.',
	].join('\n');
}

function buildAIDMUserPrompt(
	adventure: AdventureTemplate,
	session: AIDMSessionState,
	character: Character,
	playerInput: string,
): string {
	const checkpointId = adventure.checkpoints[session.checkpointIndex] || 'start';
	const history = buildSessionHistory(session.log);
	const characterSummary = buildCharacterSummary(character);
	const victory = adventure.victoryConditions.join('\n- ');
	const defeat = adventure.defeatConditions.join('\n- ');
	return [
		`Adventure: ${adventure.title} [${adventure.id}]`,
		'',
		`Primer: ${adventure.primer}`,
		'',
		`Current checkpoint: ${checkpointId}`,
		'Checkpoints (in narrative order):',
		adventure.checkpoints.map((c, idx) => `${idx === session.checkpointIndex ? '>>' : '  '} ${idx + 1}. ${c}`).join('\n'),
		'',
		'Victory conditions:',
		`- ${victory}`,
		'',
		'Defeat conditions:',
		`- ${defeat}`,
		'',
		'Player character:',
		characterSummary,
		'',
		'Longer-term session summary (may be truncated):',
		session.summary || '(no prior summary; rely on recent log above)',
		'',
		'Recent conversation log (most recent last):',
		history || '(no previous turns – this is the opening scene)',
		'',
		`New player input: ${playerInput}`,
		'',
		'Based on this, narrate the next beat of the scene at the current checkpoint, then specify any mechanical check as per the output format.',
	].join('\n');
}

async function callAIDungeonMaster(
	env: Env,
	adventure: AdventureTemplate,
	session: AIDMSessionState,
	character: Character,
	playerInput: string,
): Promise<string> {
	// Use Google Gemini 1.5 Flash via the Generative Language API.
	// We send the system prompt as a system instruction and the adventure/user
	// context as a single user message, and expect the model to follow the
	// requested [NARRATIVE]/[MECHANICS] format.
	const systemPrompt = buildAIDMSystemPrompt();
	const userPrompt = buildAIDMUserPrompt(adventure, session, character, playerInput);
	const apiKey = env.GEMINI_API_KEY;
	if (!apiKey) {
		throw new Error('GEMINI_API_KEY is not configured');
	}
	const resolved = await resolveGeminiModelName(apiKey.trim());

	const url =
		`https://generativelanguage.googleapis.com/${encodeURIComponent(GEMINI_API_VERSION)}/${resolved.modelName}:generateContent` +
		`?key=${encodeURIComponent(apiKey.trim())}`;

	const body = JSON.stringify({
		systemInstruction: {
			parts: [{ text: systemPrompt }],
		},
		contents: [
			{
				role: 'user',
				parts: [{ text: userPrompt }],
			},
		],
		generationConfig: {
			temperature: 0.7,
			maxOutputTokens: 1200,
		},
	});

	const res = await fetch(url, {
		method: 'POST',
		headers: {
			'content-type': 'application/json; charset=utf-8',
		},
		body,
	});

	if (!res.ok) {
		let detail = '';
		try {
			detail = (await res.text()).slice(0, 300);
		} catch {
			// ignore
		}
		throw new Error(`Gemini AI-DM request failed with status ${res.status}${detail ? `: ${detail}` : ''}`);
	}

	let data: any;
	try {
		data = await res.json();
	} catch (err) {
		throw new Error('Failed to parse Gemini response JSON');
	}

	const parts: string[] =
		data?.candidates?.[0]?.content?.parts?.map((p: any) => (p && typeof p.text === 'string' ? p.text : '')) || [];
	const text = parts.join('').trim();
	if (!text) {
		throw new Error('Gemini returned an empty response');
	}
	return text;
}

function parseAIDMResponse(raw: string): {
	narrative: string;
	mechanics: {
		checkDescription: string | null;
		dc: number | null;
		ability: string | null;
		skill: string | null;
		advantage: 'none' | 'advantage' | 'disadvantage' | null;
		progress: 'stay' | 'advance' | 'complete' | 'fail' | null;
		pointsOfInterest: string[] | null;
	};
} {
	const text = String(raw || '');
	const narrativeMatch = text.match(/\[NARRATIVE\]([\s\S]*?)\[\/NARRATIVE\]/i);
	const mechanicsMatch = text.match(/\[MECHANICS\]([\s\S]*?)\[\/MECHANICS\]/i);
	const narrative = narrativeMatch ? narrativeMatch[1].trim() : text.trim();
	const mechanicsBlock = mechanicsMatch ? mechanicsMatch[1].trim() : '';

	let checkDescription: string | null = null;
	let dc: number | null = null;
	let ability: string | null = null;
	let skill: string | null = null;
	let advantage: 'none' | 'advantage' | 'disadvantage' | null = null;
	let progress: 'stay' | 'advance' | 'complete' | 'fail' | null = null;
	let pointsOfInterest: string[] | null = null;

	if (mechanicsBlock) {
		const checkMatch = mechanicsBlock.match(/check\s*[:\-]\s*([^\n]+)/i);
		if (checkMatch) {
			checkDescription = checkMatch[1].trim();
		}
		const dcMatch = mechanicsBlock.match(/dc\s*[:\-]\s*(\d+)/i);
		if (dcMatch) {
			dc = Number.parseInt(dcMatch[1], 10);
		}
		const abilityMatch = mechanicsBlock.match(/ability\s*[:\-]\s*([A-Z]{3}|STR|DEX|CON|INT|WIS|CHA)/i);
		if (abilityMatch) {
			ability = abilityMatch[1].toUpperCase();
		}
		const skillMatch = mechanicsBlock.match(/skill\s*[:\-]\s*([^\n]+)/i);
		if (skillMatch) {
			skill = skillMatch[1].trim();
		}
		const advMatch = mechanicsBlock.match(/advantage\s*[:\-]\s*(none|advantage|disadvantage)/i);
		if (advMatch) {
			advantage = advMatch[1].toLowerCase() as 'none' | 'advantage' | 'disadvantage';
		}
		const progMatch = mechanicsBlock.match(/progress\s*[:\-]\s*(stay|advance|complete|fail)/i);
		if (progMatch) {
			progress = progMatch[1].toLowerCase() as 'stay' | 'advance' | 'complete' | 'fail';
		}
		const poiMatch = mechanicsBlock.match(/points\s*of\s*interest|pointsOfInterest/i)
			? mechanicsBlock.match(/(?:points\s*of\s*interest|pointsOfInterest)\s*[:\-]\s*([^\n]+)/i)
			: null;
		if (poiMatch) {
			const rawPoi = poiMatch[1].trim();
			if (rawPoi && rawPoi.toLowerCase() !== 'none') {
				const items = rawPoi
					.split(/\s*;\s*|\s*,\s*/g)
					.map((s) => s.trim())
					.filter(Boolean)
					.slice(0, 6);
				pointsOfInterest = items.length ? items : null;
			}
		}
	}

	return {
		narrative,
		mechanics: { checkDescription, dc, ability, skill, advantage, progress, pointsOfInterest },
	};
}

function isQuestionLikeInput(input: string): boolean {
	const t = (input || '').trim();
	if (!t) return false;
	if (/[?？]\s*$/.test(t)) return true;
	return /^(who|what|where|when|why|how)\b/i.test(t);
}

function formatPlayerAsActionOrSpeech(input: string): { kind: 'action' | 'question'; clause: string } {
	const trimmed = (input || '').trim();
	if (!trimmed) return { kind: 'action', clause: 'press on along the path' };
	if (isQuestionLikeInput(trimmed)) {
		return { kind: 'question', clause: trimmed };
	}
	// Strip a leading "I" so we can safely say "You ..."
	let withoutI = trimmed.replace(/^i\b[\s,]*/i, '').trim();
	if (!withoutI) withoutI = trimmed;
	// Lowercase first char for smoother insertion after "You "
	const clause = withoutI.charAt(0).toLowerCase() + withoutI.slice(1);
	return { kind: 'action', clause };
}

function buildFallbackNarrativeFromInput(playerInput: string, adventure: AdventureTemplate): string {
	const setting = adventure.title.toLowerCase().includes('whisper')
		? 'Whispering Woods'
		: adventure.title.toLowerCase().includes('forest')
			? 'the forest'
			: 'the road';
	const parsed = formatPlayerAsActionOrSpeech(playerInput);

	// Provide a clean, non-repetitive fallback that never mentions ADA in third person.
	if (parsed.kind === 'question') {
		const q = parsed.clause;
		// Special-case the common meta question to avoid confusion.
		if (/\b(what|who)\s+is\s+ada\b/i.test(q)) {
			return [
				`A calm presence seems to answer as you move through ${setting}.`,
				`"I'm your Dungeon Master—think of me as the narrator of this world. Tell me what you do, and I'll describe what happens next."`,
				`The air smells of wet bark and crushed pine needles. Somewhere deeper among the trees, something pads softly through the undergrowth.`,
			].join(' ');
		}
		return [
			`You ask, “${q.replace(/^[\s"“”]+|[\s"“”]+$/g, '')}”`,
			`For a heartbeat, ${setting} offers only hints: the hush of leaves, the creak of boughs, and the feeling that you’re being watched.`,
			`You can act, listen, or change course—what do you do next?`,
		].join(' ');
	}

	return [
		`You ${parsed.clause}.`,
		`The world answers immediately: branches creak overhead, a cold draft slides between trunks, and the ground underfoot softens into damp loam.`,
		`No clear howl follows—only the uneasy sense of movement somewhere just out of sight.`,
	].join(' ');
}

// ============================================================================
// AI PLAYER SUPPORT (Studio Playtesting Mode)
// ============================================================================

/**
 * Builds a system prompt for AI-controlled party members.
 * These AI players respond to DM narration and participate like real players.
 */
function buildAIPlayerSystemPrompt(aiPlayerPrompt?: string): string {
	const basePrompt = [
		'You are an AI-controlled player character in a D&D 5e campaign.',
		'The human GM is testing their scenario with AI party members.',
		'You respond to the DM\'s narration as your character would.',
		'',
		'Guidelines:',
		'- Stay in character based on your character sheet and background',
		'- Make reasonable tactical and roleplay decisions',
		'- Keep responses concise (1-3 sentences)',
		'- Describe your actions in first person ("I...")',
		'- Ask questions when the situation is unclear',
		'- Cooperate with other party members',
		'',
		'Format your response as:',
		'[ACTION]',
		'Your character\'s action or dialogue in 1-3 sentences.',
		'[/ACTION]',
	].join('\n');

	if (aiPlayerPrompt && aiPlayerPrompt.trim()) {
		return `${basePrompt}\n\nAdditional GM Instructions:\n${aiPlayerPrompt.trim()}`;
	}
	return basePrompt;
}

/**
 * Builds a user prompt for an AI player turn.
 */
function buildAIPlayerUserPrompt(
	character: Character,
	dmNarration: string,
	conversationHistory: string,
): string {
	const characterSummary = buildCharacterSummary(character);
	return [
		'Your character:',
		characterSummary,
		'',
		'Recent conversation:',
		conversationHistory || '(campaign just started)',
		'',
		'Latest DM narration:',
		dmNarration,
		'',
		'What does your character do or say in response?',
	].join('\n');
}

/**
 * Calls the AI to generate a player character's response.
 */
async function callAIPlayer(
	env: Env,
	character: Character,
	dmNarration: string,
	conversationHistory: string,
	aiPlayerPrompt?: string,
): Promise<string> {
	const systemPrompt = buildAIPlayerSystemPrompt(aiPlayerPrompt);
	const userPrompt = buildAIPlayerUserPrompt(character, dmNarration, conversationHistory);
	const apiKey = env.GEMINI_API_KEY;
	if (!apiKey) {
		throw new Error('GEMINI_API_KEY is not configured');
	}
	const resolved = await resolveGeminiModelName(apiKey.trim());

	const url =
		`https://generativelanguage.googleapis.com/${encodeURIComponent(GEMINI_API_VERSION)}/${resolved.modelName}:generateContent` +
		`?key=${encodeURIComponent(apiKey.trim())}`;

	const body = JSON.stringify({
		systemInstruction: {
			parts: [{ text: systemPrompt }],
		},
		contents: [
			{
				role: 'user',
				parts: [{ text: userPrompt }],
			},
		],
		generationConfig: {
			temperature: 0.8,
			maxOutputTokens: 200,
		},
	});

	const res = await fetch(url, {
		method: 'POST',
		headers: {
			'content-type': 'application/json; charset=utf-8',
		},
		body,
	});

	if (!res.ok) {
		let detail = '';
		try {
			detail = (await res.text()).slice(0, 300);
		} catch {
			// ignore
		}
		throw new Error(`Gemini AI-Player request failed with status ${res.status}${detail ? `: ${detail}` : ''}`);
	}

	let data: any;
	try {
		data = await res.json();
	} catch (err) {
		throw new Error('Failed to parse Gemini AI-Player response JSON');
	}

	const parts: string[] =
		data?.candidates?.[0]?.content?.parts?.map((p: any) => (p && typeof p.text === 'string' ? p.text : '')) || [];
	const text = parts.join('').trim();
	if (!text) {
		throw new Error('Gemini returned an empty AI-Player response');
	}
	return text;
}

/**
 * Parses AI player response to extract the action.
 */
function parseAIPlayerResponse(raw: string): string {
	const text = String(raw || '');
	const actionMatch = text.match(/\[ACTION\]([\s\S]*?)\[\/ACTION\]/i);
	if (actionMatch) {
		return actionMatch[1].trim();
	}
	// Fallback: use the raw text if no markers found
	return text.trim();
}

/**
 * Endpoint for generating AI player responses in Studio Playtesting Mode.
 * The human GM provides their narration, and the system generates responses
 * from AI-controlled party members.
 */
async function handleAIPlayerTurn(request: Request, env: Env, origin: string | null): Promise<Response> {
	let body: any;
	try {
		body = await request.json();
	} catch {
		return errorResponse('Invalid JSON body', 400, origin);
	}

	const username = String(body?.username ?? '').trim();
	const campaignId = String(body?.campaignId ?? '').trim();
	const dmNarration = String(body?.dmNarration ?? body?.text ?? '').trim();

	if (!username || !campaignId || !dmNarration) {
		return errorResponse('username, campaignId and dmNarration are required', 400, origin);
	}

	const storedCampaign = await env.ADA_DATA.get(`campaign:${campaignId}`);
	if (!storedCampaign) {
		return errorResponse('Campaign not found', 404, origin);
	}

	let campaign: Campaign;
	try {
		campaign = JSON.parse(storedCampaign) as Campaign;
	} catch {
		return errorResponse('Corrupted campaign record', 500, origin);
	}

	// Only the GM can trigger AI player turns
	if (campaign.dm !== username) {
		return errorResponse('Only the GM can generate AI player responses', 403, origin);
	}

	// Campaign must have AI players enabled
	if (!campaign.hasAiPlayers) {
		return errorResponse('This campaign does not have AI players enabled', 400, origin);
	}

	// Load party characters
	const characters = await loadCampaignPartyCharacters(env, campaign);
	if (characters.length === 0) {
		return errorResponse('No characters linked to this campaign', 400, origin);
	}

	// Generate responses from each AI character
	const aiResponses: Array<{ characterId: string; characterName: string; response: string }> = [];
	const conversationHistory = (campaign.conversationTranscript || '').slice(-2000); // Last 2000 chars

	for (const character of characters) {
		try {
			const rawResponse = await callAIPlayer(
				env,
				character,
				dmNarration,
				conversationHistory,
				campaign.aiPlayerPrompt,
			);
			const parsed = parseAIPlayerResponse(rawResponse);
			aiResponses.push({
				characterId: character.id,
				characterName: character.name,
				response: parsed,
			});
		} catch (err) {
			console.error(`AI player turn failed for character ${character.id}:`, err);
			// Provide a fallback response
			aiResponses.push({
				characterId: character.id,
				characterName: character.name,
				response: `${character.name} nods thoughtfully, considering the situation.`,
			});
		}
	}

	return jsonResponse(
		{
			ok: true,
			aiResponses,
			...(isDebugEnabled(env)
				? {
					debug: {
						gemini: getGeminiDebugSnapshot(),
					},
				}
				: {}),
		},
		{ status: 200 },
		origin,
	);
}

// ============================================================================
// END AI PLAYER SUPPORT
// ============================================================================

function appendToSessionSummary(session: AIDMSessionState, entries: TurnEntry[]): void {
	if (!Array.isArray(entries) || entries.length === 0) return;
	const lines = entries.map((e) => {
		const who = e.role === 'player' ? 'Player' : 'DM';
		return `${who}: ${e.text}`;
	});
	const joined = lines.join('\n');
	if (!session.summary) {
		session.summary = joined;
	} else {
		session.summary = `${session.summary}\n${joined}`;
	}
	// Keep summary from growing without bound: trim to last ~4000 characters
	if (session.summary.length > 4000) {
		session.summary = session.summary.slice(session.summary.length - 4000);
	}
}

function trimSessionLog(session: AIDMSessionState, maxEntries = 12): void {
	if (!Array.isArray(session.log)) return;
	if (session.log.length <= maxEntries) return;
	const overflow = session.log.length - maxEntries;
	if (overflow <= 0) return;
	const removed = session.log.slice(0, overflow);
	appendToSessionSummary(session, removed);
	session.log = session.log.slice(-maxEntries);
}

async function handleRegister(request: Request, env: Env, origin: string | null): Promise<Response> {
	let body: any;
	try {
		body = await request.json();
	} catch {
		return errorResponse('Invalid JSON body', 400, origin);
	}

	const username = (body?.username ?? '').trim();
	const password = body?.password ?? '';

	if (!username || !password) {
		return errorResponse('Username and password are required', 400, origin);
	}

	const userKey = `user:${username}`;
	const existing = await env.ADA_DATA.get(userKey);
	if (existing) {
		return errorResponse('Username already exists', 409, origin);
	}

	const passwordHash = await hashPassword(password);
	const record = {
		username,
		passwordHash,
		createdAt: new Date().toISOString(),
	};

	await env.ADA_DATA.put(userKey, JSON.stringify(record));
	return jsonResponse({ ok: true }, { status: 201 }, origin);
}

async function handleLogin(request: Request, env: Env, origin: string | null): Promise<Response> {
	let body: any;
	try {
		body = await request.json();
	} catch {
		return errorResponse('Invalid JSON body', 400, origin);
	}

	const username = (body?.username ?? '').trim();
	const password = body?.password ?? '';

	if (!username || !password) {
		return errorResponse('Username and password are required', 400, origin);
	}

	const userKey = `user:${username}`;
	const stored = await env.ADA_DATA.get(userKey);
	if (!stored) {
		return errorResponse('Invalid username or password', 401, origin);
	}

	let record: any;
	try {
		record = JSON.parse(stored);
	} catch {
		return errorResponse('Corrupted user record', 500, origin);
	}

	const passwordHash = await hashPassword(password);
	if (!record || record.passwordHash !== passwordHash) {
		return errorResponse('Invalid username or password', 401, origin);
	}

	// For now we just echo basic info; later you can return a signed token.
	return jsonResponse({ ok: true, username }, undefined, origin);
}

async function handleCreateCampaign(request: Request, env: Env, origin: string | null): Promise<Response> {
	let body: any;
	try {
		body = await request.json();
	} catch {
		return errorResponse('Invalid JSON body', 400, origin);
	}

	const name = (body?.name ?? '').trim();
	const dm = (body?.dm ?? '').trim();
	let participants: string[] = Array.isArray(body?.participants) ? body.participants : [];
	participants = participants.map((p) => String(p || '').trim()).filter((p) => p.length > 0);

	if (!name || !dm) {
		return errorResponse('Campaign name and dungeon master are required', 400, origin);
	}

	if (!participants.includes(dm)) {
		participants.push(dm);
	}

	// Deduplicate participants
	participants = Array.from(new Set(participants));

	if (participants.length === 0) {
		return errorResponse('At least one participant is required', 400, origin);
	}

	const id = crypto.randomUUID();
	const createdAt = new Date().toISOString();
	const worldTheme = typeof body?.worldTheme === 'string' ? body.worldTheme.trim() : '';
	const discordLink = typeof body?.discordLink === 'string' ? body.discordLink.trim() : '';
	const isPublicLobby = Boolean(body?.isPublicLobby);
	const hasAiPlayers = Boolean(body?.hasAiPlayers);
	const aiPlayerPrompt = typeof body?.aiPlayerPrompt === 'string' ? body.aiPlayerPrompt.trim() : '';
	const sourceScenarioId = typeof body?.sourceScenarioId === 'string' ? body.sourceScenarioId.trim() : '';
	const campaign: Campaign = {
		id,
		name,
		dm,
		participants,
		createdAt,
		journalEntryIds: [],
		scriptIds: [],
		linkedCharacterIds: [],
		worldTheme: worldTheme || null,
		isPublicLobby,
		pendingParticipants: [],
		discordLink: discordLink || null,
		lobbyChat: [],
		hasAiPlayers,
		aiPlayerPrompt: aiPlayerPrompt || undefined,
		sourceScenarioId: sourceScenarioId || undefined,
	};

	await env.ADA_DATA.put(`campaign:${id}`, JSON.stringify(campaign));

	// Maintain a simple index of campaigns per user
	for (const username of participants) {
		const idxKey = `campaignsByUser:${username}`;
		const existing = await env.ADA_DATA.get(idxKey);
		let ids: string[] = [];
		if (existing) {
			try {
				ids = JSON.parse(existing) as string[];
				if (!Array.isArray(ids)) ids = [];
			} catch {
				ids = [];
			}
		}
		if (!ids.includes(id)) {
			ids.push(id);
			await env.ADA_DATA.put(idxKey, JSON.stringify(ids));
		}
	}

	// Maintain a simple index of public lobbies.
	// NOTE: KV doesn't provide efficient global listing without an index.
	if (isPublicLobby) {
		const idxKey = 'publicLobbiesIndex';
		const ids = await readStringArrayKV(env, idxKey);
		if (!ids.includes(id)) {
			ids.push(id);
			await writeStringArrayKV(env, idxKey, ids);
		}
	}

	return jsonResponse({ ok: true, campaign }, { status: 201 }, origin);
}

function isValidLobbyCampaign(c: Campaign | null | undefined): c is Campaign {
	if (!c) return false;
	if (!c.id || !c.name || !c.dm) return false;
	if (c.isTemplate) return false;
	return Boolean(c.isPublicLobby);
}

async function handleListPublicLobbies(env: Env, origin: string | null): Promise<Response> {
	const idxKey = 'publicLobbiesIndex';
	const ids = await readStringArrayKV(env, idxKey);
	if (!ids.length) {
		return jsonResponse({ ok: true, lobbies: [] }, { status: 200 }, origin);
	}

	const lobbies: Array<{
		id: string;
		name: string;
		dm: string;
		createdAt: string;
		worldTheme: string | null;
		hasDiscordLink: boolean;
	}> = [];
	for (const id of ids) {
		const stored = await env.ADA_DATA.get(`campaign:${id}`);
		if (!stored) continue;
		try {
			const c = JSON.parse(stored) as Campaign;
			if (!isValidLobbyCampaign(c)) continue;
			lobbies.push({
				id: c.id,
				name: c.name,
				dm: c.dm,
				createdAt: c.createdAt,
				worldTheme: c.worldTheme ?? null,
				hasDiscordLink: Boolean((c.discordLink ?? '').trim()),
			});
		} catch {
			// ignore malformed
		}
	}

	// Newest first (best-effort)
	lobbies.sort((a, b) => (Date.parse(b.createdAt || '') || 0) - (Date.parse(a.createdAt || '') || 0));
	return jsonResponse({ ok: true, lobbies }, { status: 200 }, origin);
}

async function handleGetLobbyDetails(request: Request, env: Env, origin: string | null): Promise<Response> {
	const url = new URL(request.url);
	const campaignId = String(url.searchParams.get('campaignId') ?? '').trim();
	const user = String(url.searchParams.get('user') ?? '').trim();
	if (!campaignId) return errorResponse('campaignId is required', 400, origin);
	if (!user) return errorResponse('user is required', 400, origin);

	const stored = await env.ADA_DATA.get(`campaign:${campaignId}`);
	if (!stored) return errorResponse('Lobby not found', 404, origin);

	let campaign: Campaign;
	try {
		campaign = JSON.parse(stored) as Campaign;
	} catch {
		return errorResponse('Corrupted lobby record', 500, origin);
	}

	if (!isValidLobbyCampaign(campaign)) {
		return errorResponse('Campaign is not a public lobby', 400, origin);
	}

	const participants = Array.isArray(campaign.participants) ? campaign.participants : [];
	const pending = Array.isArray(campaign.pendingParticipants) ? campaign.pendingParticipants : [];
	const isDm = campaign.dm === user;
	const isParticipant = isDm || participants.includes(user);
	const isPending = pending.includes(user);

	const access = {
		status: isParticipant ? 'participant' : isPending ? 'pending' : 'none',
		canManage: isDm,
	};

	const canSeePrivate = isParticipant || isPending || isDm;
	const discordLink = canSeePrivate ? (campaign.discordLink ?? null) : null;
	const lobbyChat = canSeePrivate
		? (Array.isArray(campaign.lobbyChat) ? campaign.lobbyChat.slice(-50) : [])
		: [];
	const pendingParticipants = isDm ? pending : [];

	return jsonResponse(
		{
			ok: true,
			campaign: {
				id: campaign.id,
				name: campaign.name,
				dm: campaign.dm,
				createdAt: campaign.createdAt,
				worldTheme: campaign.worldTheme ?? null,
				hasDiscordLink: Boolean((campaign.discordLink ?? '').trim()),
			},
			access,
			discordLink,
			lobbyChat,
			pendingParticipants,
		},
		{ status: 200 },
		origin,
	);
}

async function handleLobbyJoin(request: Request, env: Env, origin: string | null): Promise<Response> {
	let body: any;
	try {
		body = await request.json();
	} catch {
		return errorResponse('Invalid JSON body', 400, origin);
	}
	const username = String(body?.username ?? '').trim();
	const campaignId = String(body?.campaignId ?? '').trim();
	if (!username) return errorResponse('username is required', 400, origin);
	if (!campaignId) return errorResponse('campaignId is required', 400, origin);

	const userRecord = await env.ADA_DATA.get(`user:${username}`);
	if (!userRecord) return errorResponse('Unknown user', 404, origin);

	const stored = await env.ADA_DATA.get(`campaign:${campaignId}`);
	if (!stored) return errorResponse('Lobby not found', 404, origin);

	let campaign: Campaign;
	try {
		campaign = JSON.parse(stored) as Campaign;
	} catch {
		return errorResponse('Corrupted lobby record', 500, origin);
	}
	if (!isValidLobbyCampaign(campaign)) {
		return errorResponse('Campaign is not a public lobby', 400, origin);
	}

	const participants = Array.isArray(campaign.participants) ? campaign.participants : [];
	if (campaign.dm === username || participants.includes(username)) {
		return jsonResponse({ ok: true, status: 'participant' }, { status: 200 }, origin);
	}

	const pending = Array.isArray(campaign.pendingParticipants) ? campaign.pendingParticipants : [];
	if (!pending.includes(username)) {
		pending.push(username);
		campaign.pendingParticipants = Array.from(new Set(pending));
		await env.ADA_DATA.put(`campaign:${campaignId}`, JSON.stringify(campaign));
	}

	return jsonResponse({ ok: true, status: 'pending' }, { status: 200 }, origin);
}

async function handleLobbyApprove(request: Request, env: Env, origin: string | null): Promise<Response> {
	let body: any;
	try {
		body = await request.json();
	} catch {
		return errorResponse('Invalid JSON body', 400, origin);
	}
	const gmUsername = String(body?.gmUsername ?? '').trim();
	const campaignId = String(body?.campaignId ?? '').trim();
	const username = String(body?.username ?? '').trim();
	if (!gmUsername) return errorResponse('gmUsername is required', 400, origin);
	if (!campaignId) return errorResponse('campaignId is required', 400, origin);
	if (!username) return errorResponse('username is required', 400, origin);

	const stored = await env.ADA_DATA.get(`campaign:${campaignId}`);
	if (!stored) return errorResponse('Lobby not found', 404, origin);

	let campaign: Campaign;
	try {
		campaign = JSON.parse(stored) as Campaign;
	} catch {
		return errorResponse('Corrupted lobby record', 500, origin);
	}
	if (!isValidLobbyCampaign(campaign)) {
		return errorResponse('Campaign is not a public lobby', 400, origin);
	}

	if (campaign.dm !== gmUsername) return errorResponse('Only the GM can approve participants', 403, origin);

	const pending = Array.isArray(campaign.pendingParticipants) ? campaign.pendingParticipants : [];
	if (!pending.includes(username)) {
		return errorResponse('User is not pending in this lobby', 400, origin);
	}

	// Ensure user exists.
	const userRecord = await env.ADA_DATA.get(`user:${username}`);
	if (!userRecord) return errorResponse('Unknown user', 404, origin);

	campaign.pendingParticipants = pending.filter((u) => u !== username);
	const participants = Array.isArray(campaign.participants) ? campaign.participants : [];
	if (!participants.includes(username)) participants.push(username);
	campaign.participants = Array.from(new Set(participants));

	await env.ADA_DATA.put(`campaign:${campaignId}`, JSON.stringify(campaign));

	// Add to user's campaign index now that they're approved.
	const idxKey = `campaignsByUser:${username}`;
	const ids = await readStringArrayKV(env, idxKey);
	if (!ids.includes(campaignId)) {
		ids.push(campaignId);
		await writeStringArrayKV(env, idxKey, ids);
	}

	return jsonResponse({ ok: true }, { status: 200 }, origin);
}

async function handleLobbyReject(request: Request, env: Env, origin: string | null): Promise<Response> {
	let body: any;
	try {
		body = await request.json();
	} catch {
		return errorResponse('Invalid JSON body', 400, origin);
	}
	const gmUsername = String(body?.gmUsername ?? '').trim();
	const campaignId = String(body?.campaignId ?? '').trim();
	const username = String(body?.username ?? '').trim();
	if (!gmUsername) return errorResponse('gmUsername is required', 400, origin);
	if (!campaignId) return errorResponse('campaignId is required', 400, origin);
	if (!username) return errorResponse('username is required', 400, origin);

	const stored = await env.ADA_DATA.get(`campaign:${campaignId}`);
	if (!stored) return errorResponse('Lobby not found', 404, origin);

	let campaign: Campaign;
	try {
		campaign = JSON.parse(stored) as Campaign;
	} catch {
		return errorResponse('Corrupted lobby record', 500, origin);
	}
	if (!isValidLobbyCampaign(campaign)) {
		return errorResponse('Campaign is not a public lobby', 400, origin);
	}
	if (campaign.dm !== gmUsername) return errorResponse('Only the GM can reject participants', 403, origin);

	const pending = Array.isArray(campaign.pendingParticipants) ? campaign.pendingParticipants : [];
	if (!pending.includes(username)) {
		return jsonResponse({ ok: true }, { status: 200 }, origin);
	}
	campaign.pendingParticipants = pending.filter((u) => u !== username);
	await env.ADA_DATA.put(`campaign:${campaignId}`, JSON.stringify(campaign));
	return jsonResponse({ ok: true }, { status: 200 }, origin);
}

async function handleLobbyChatSend(request: Request, env: Env, origin: string | null): Promise<Response> {
	let body: any;
	try {
		body = await request.json();
	} catch {
		return errorResponse('Invalid JSON body', 400, origin);
	}
	const campaignId = String(body?.campaignId ?? '').trim();
	const username = String(body?.username ?? '').trim();
	const text = String(body?.text ?? '').trim();
	if (!campaignId) return errorResponse('campaignId is required', 400, origin);
	if (!username) return errorResponse('username is required', 400, origin);
	if (!text) return errorResponse('text is required', 400, origin);
	if (text.length > 600) return errorResponse('text is too long', 400, origin);

	const stored = await env.ADA_DATA.get(`campaign:${campaignId}`);
	if (!stored) return errorResponse('Lobby not found', 404, origin);

	let campaign: Campaign;
	try {
		campaign = JSON.parse(stored) as Campaign;
	} catch {
		return errorResponse('Corrupted lobby record', 500, origin);
	}
	if (!isValidLobbyCampaign(campaign)) {
		return errorResponse('Campaign is not a public lobby', 400, origin);
	}

	const participants = Array.isArray(campaign.participants) ? campaign.participants : [];
	const pending = Array.isArray(campaign.pendingParticipants) ? campaign.pendingParticipants : [];
	const canChat = campaign.dm === username || participants.includes(username) || pending.includes(username);
	if (!canChat) return errorResponse('You do not have access to lobby chat', 403, origin);

	const msg: LobbyChatMessage = {
		id: crypto.randomUUID(),
		author: username,
		text,
		createdAt: new Date().toISOString(),
	};
	const chat = Array.isArray(campaign.lobbyChat) ? campaign.lobbyChat : [];
	chat.push(msg);
	// Cap chat history to last 120 messages.
	campaign.lobbyChat = chat.slice(-120);
	await env.ADA_DATA.put(`campaign:${campaignId}`, JSON.stringify(campaign));
	return jsonResponse({ ok: true, message: msg }, { status: 200 }, origin);
}

function normalizeCanonEvent(raw: any): CanonEvent | null {
	const title = String(raw?.title ?? '').trim();
	const description = String(raw?.description ?? '').trim();
	if (!title || !description) return null;
	const id = String(raw?.id ?? '').trim() || crypto.randomUUID();
	const nudgeIdeasRaw = Array.isArray(raw?.nudgeIdeas)
		? raw.nudgeIdeas
		: typeof raw?.nudgeIdeas === 'string'
			? String(raw.nudgeIdeas)
				.split('\n')
				.map((s) => s.trim())
				.filter(Boolean)
			: [];
	const nudgeIdeas = Array.isArray(nudgeIdeasRaw)
		? nudgeIdeasRaw.map((s) => String(s || '').trim()).filter(Boolean)
		: [];
	return { id, title, description, nudgeIdeas };
}

async function readStringArrayKV(env: Env, key: string): Promise<string[]> {
	const stored = await env.ADA_DATA.get(key);
	if (!stored) return [];
	try {
		const parsed = JSON.parse(stored) as unknown;
		if (!Array.isArray(parsed)) return [];
		return parsed.map((v) => String(v || '').trim()).filter(Boolean);
	} catch {
		return [];
	}
}

async function writeStringArrayKV(env: Env, key: string, values: string[]): Promise<void> {
	const deduped = Array.from(new Set(values.map((v) => String(v || '').trim()).filter(Boolean)));
	await env.ADA_DATA.put(key, JSON.stringify(deduped));
}

async function getTemplatesByUserCount(env: Env, username: string): Promise<number> {
	const key = `templatesByUserCount:${username}`;
	const stored = await env.ADA_DATA.get(key);
	if (!stored) return 0;
	const n = Number.parseInt(String(stored).trim(), 10);
	return Number.isFinite(n) && n > 0 ? n : 0;
}

async function setTemplatesByUserCount(env: Env, username: string, count: number): Promise<void> {
	const key = `templatesByUserCount:${username}`;
	await env.ADA_DATA.put(key, String(Math.max(0, Math.floor(count))));
}

async function handleCreateTemplate(request: Request, env: Env, origin: string | null): Promise<Response> {
	let body: any;
	try {
		body = await request.json();
	} catch {
		return errorResponse('Invalid JSON body', 400, origin);
	}

	const username = String(body?.username ?? '').trim();
	const name = String(body?.name ?? '').trim();
	const templateSummary = String(body?.templateSummary ?? body?.summary ?? '').trim();
	const templateTagsRaw = body?.templateTags ?? body?.tags;
	const canonRaw = Array.isArray(body?.canonTimeline) ? body.canonTimeline : [];

	if (!username || !name) {
		return errorResponse('username and name are required', 400, origin);
	}
	if (!canonRaw.length) {
		return errorResponse('canonTimeline is required (at least 1 Canon Event)', 400, origin);
	}

	// Ensure the user exists.
	const userRecord = await env.ADA_DATA.get(`user:${username}`);
	if (!userRecord) {
		return errorResponse('Unknown user', 404, origin);
	}

	// The 3-Campaign Limit (templates per Architect)
	const currentCount = await getTemplatesByUserCount(env, username);
	if (currentCount >= 3) {
		return errorResponse('Template limit reached: you can publish at most 3 Master Templates.', 403, origin);
	}

	const canonTimeline: CanonEvent[] = [];
	for (const raw of canonRaw) {
		const ev = normalizeCanonEvent(raw);
		if (!ev) {
			return errorResponse('Each Canon Event requires a title and description.', 400, origin);
		}
		canonTimeline.push(ev);
	}

	const id = crypto.randomUUID();
	const createdAt = new Date().toISOString();
	const templateTags = Array.isArray(templateTagsRaw)
		? templateTagsRaw
				.map((t: any) => String(t || '').trim())
				.filter(Boolean)
				.slice(0, 12)
		: String(templateTagsRaw || '')
				.split(',')
				.map((t) => t.trim())
				.filter(Boolean)
				.slice(0, 12);
	const cleanSummary = templateSummary ? templateSummary.slice(0, 600) : '';
	const template: Campaign = {
		id,
		name,
		dm: username,
		participants: [username],
		createdAt,
		journalEntryIds: [],
		scriptIds: [],
		linkedCharacterIds: [],
		isTemplate: true,
		creatorUsername: username,
		templateSummary: cleanSummary || undefined,
		templateTags: templateTags.length ? templateTags : undefined,
		canonTimeline,
	};

	await env.ADA_DATA.put(`campaign:${id}`, JSON.stringify(template));

	// Global Discovery index
	const globalKey = 'global:templates';
	const existingIds = await readStringArrayKV(env, globalKey);
	if (!existingIds.includes(id)) {
		existingIds.push(id);
		await writeStringArrayKV(env, globalKey, existingIds);
	}

	await setTemplatesByUserCount(env, username, currentCount + 1);

	return jsonResponse({ ok: true, template }, { status: 201 }, origin);
}

async function handleUpdateTemplate(request: Request, env: Env, origin: string | null): Promise<Response> {
	let body: any;
	try {
		body = await request.json();
	} catch {
		return errorResponse('Invalid JSON body', 400, origin);
	}

	const username = String(body?.username ?? '').trim();
	const templateId = String(body?.templateId ?? body?.id ?? '').trim();
	if (!username || !templateId) {
		return errorResponse('username and templateId are required', 400, origin);
	}

	const stored = await env.ADA_DATA.get(`campaign:${templateId}`);
	if (!stored) return errorResponse('Template not found', 404, origin);
	let template: Campaign;
	try {
		template = JSON.parse(stored) as Campaign;
	} catch {
		return errorResponse('Corrupted template record', 500, origin);
	}
	if (template.isTemplate !== true) {
		return errorResponse('That campaign is not a public template', 400, origin);
	}
	const owner = String(template.creatorUsername || template.dm || '').trim();
	if (!owner || owner !== username) {
		return errorResponse('Only the Architect who published this template can edit it', 403, origin);
	}

	// Optional fields to update
	const nextName = body?.name != null ? String(body.name).trim() : template.name;
	const summaryRaw = body?.templateSummary ?? body?.summary;
	const nextSummary = summaryRaw != null ? String(summaryRaw || '').trim().slice(0, 600) : (template.templateSummary || undefined);
	const tagsRaw = body?.templateTags ?? body?.tags;
	const nextTags = tagsRaw == null
		? (Array.isArray(template.templateTags) ? template.templateTags : undefined)
		: (Array.isArray(tagsRaw)
			? tagsRaw
					.map((t: any) => String(t || '').trim())
					.filter(Boolean)
					.slice(0, 12)
			: String(tagsRaw || '')
					.split(',')
					.map((t) => t.trim())
					.filter(Boolean)
					.slice(0, 12));

	let nextCanonTimeline: CanonEvent[] | undefined = undefined;
	if (body?.canonTimeline != null) {
		const canonRaw = Array.isArray(body.canonTimeline) ? body.canonTimeline : [];
		if (!canonRaw.length) {
			return errorResponse('canonTimeline is required (at least 1 Canon Event)', 400, origin);
		}
		const canonTimeline: CanonEvent[] = [];
		for (const raw of canonRaw) {
			const ev = normalizeCanonEvent(raw);
			if (!ev) {
				return errorResponse('Each Canon Event requires a title and description.', 400, origin);
			}
			canonTimeline.push(ev);
		}
		nextCanonTimeline = canonTimeline;
	}

	const updated: Campaign = {
		...template,
		name: nextName || template.name,
		templateSummary: nextSummary ? nextSummary : undefined,
		templateTags: nextTags && nextTags.length ? nextTags : undefined,
		canonTimeline: nextCanonTimeline ?? template.canonTimeline,
	};

	await env.ADA_DATA.put(`campaign:${templateId}`, JSON.stringify(updated));
	return jsonResponse({ ok: true, template: updated }, { status: 200 }, origin);
}

async function handleDeleteTemplate(request: Request, env: Env, origin: string | null): Promise<Response> {
	let body: any;
	try {
		body = await request.json();
	} catch {
		return errorResponse('Invalid JSON body', 400, origin);
	}

	const username = String(body?.username ?? '').trim();
	const templateId = String(body?.templateId ?? body?.id ?? '').trim();
	if (!username || !templateId) {
		return errorResponse('username and templateId are required', 400, origin);
	}

	const stored = await env.ADA_DATA.get(`campaign:${templateId}`);
	if (!stored) return errorResponse('Template not found', 404, origin);
	let template: Campaign;
	try {
		template = JSON.parse(stored) as Campaign;
	} catch {
		return errorResponse('Corrupted template record', 500, origin);
	}
	if (template.isTemplate !== true) {
		return errorResponse('That campaign is not a public template', 400, origin);
	}
	const owner = String(template.creatorUsername || template.dm || '').trim();
	if (!owner || owner !== username) {
		return errorResponse('Only the Architect who published this template can delete it', 403, origin);
	}

	// Remove from global discovery index
	const globalKey = 'global:templates';
	const ids = await readStringArrayKV(env, globalKey);
	const filtered = ids.filter((id) => String(id || '').trim() !== templateId);
	if (filtered.length !== ids.length) {
		await writeStringArrayKV(env, globalKey, filtered);
	}

	// Remove the template record itself
	await env.ADA_DATA.delete(`campaign:${templateId}`);

	// Decrement the template counter for the Architect (best-effort).
	const currentCount = await getTemplatesByUserCount(env, username);
	await setTemplatesByUserCount(env, username, Math.max(0, currentCount - 1));

	return jsonResponse({ ok: true }, { status: 200 }, origin);
}

async function handlePublishToHall(request: Request, env: Env, origin: string | null): Promise<Response> {
	let body: any;
	try {
		body = await request.json();
	} catch {
		return errorResponse('Invalid JSON body', 400, origin);
	}

	const username = String(body?.username ?? '').trim();
	const campaignId = String(body?.campaignId ?? '').trim();
	const templateSummary = String(body?.templateSummary ?? body?.summary ?? '').trim();
	const templateTagsRaw = body?.templateTags ?? body?.tags;

	if (!username || !campaignId) {
		return errorResponse('username and campaignId are required', 400, origin);
	}

	// Ensure the user exists
	const userRecord = await env.ADA_DATA.get(`user:${username}`);
	if (!userRecord) {
		return errorResponse('Unknown user', 404, origin);
	}

	// Load the source campaign
	const storedCampaign = await env.ADA_DATA.get(`campaign:${campaignId}`);
	if (!storedCampaign) return errorResponse('Campaign not found', 404, origin);
	let campaign: Campaign;
	try {
		campaign = JSON.parse(storedCampaign) as Campaign;
	} catch {
		return errorResponse('Corrupted campaign record', 500, origin);
	}

	// Only the GM/Architect can publish their campaign
	if (campaign.dm !== username) {
		return errorResponse('Only the campaign GM can publish to the Hall of Records', 403, origin);
	}

	// Cannot publish a campaign that is already a template
	if (campaign.isTemplate === true) {
		return errorResponse('This campaign is already a template', 400, origin);
	}

	// The 3-Template Limit per Architect
	const currentCount = await getTemplatesByUserCount(env, username);
	if (currentCount >= 3) {
		return errorResponse('Template limit reached: you can publish at most 3 Master Templates.', 403, origin);
	}

	// Extract canon timeline (if any)
	const canonTimeline = Array.isArray(campaign.canonTimeline) ? campaign.canonTimeline : [];
	if (!canonTimeline.length) {
		return errorResponse('Campaign must have at least 1 Canon Event to publish as a template', 400, origin);
	}

	// Process tags
	const templateTags = Array.isArray(templateTagsRaw)
		? templateTagsRaw
				.map((t: any) => String(t || '').trim())
				.filter(Boolean)
				.slice(0, 12)
		: String(templateTagsRaw || '')
				.split(',')
				.map((t) => t.trim())
				.filter(Boolean)
				.slice(0, 12);

	const cleanSummary = templateSummary ? templateSummary.slice(0, 600) : '';

	// Create a new template (snapshot) based on the campaign
	const templateId = crypto.randomUUID();
	const createdAt = new Date().toISOString();
	const template: Campaign = {
		id: templateId,
		name: campaign.name,
		dm: username,
		participants: [username],
		createdAt,
		journalEntryIds: [],
		scriptIds: [],
		linkedCharacterIds: [],
		isTemplate: true,
		creatorUsername: username,
		templateSummary: cleanSummary || undefined,
		templateTags: templateTags.length ? templateTags : undefined,
		canonTimeline: canonTimeline,
		worldTheme: campaign.worldTheme,
	};

	await env.ADA_DATA.put(`campaign:${templateId}`, JSON.stringify(template));

	// Add to global discovery index
	const globalKey = 'global:templates';
	const existingIds = await readStringArrayKV(env, globalKey);
	if (!existingIds.includes(templateId)) {
		existingIds.push(templateId);
		await writeStringArrayKV(env, globalKey, existingIds);
	}

	await setTemplatesByUserCount(env, username, currentCount + 1);

	return jsonResponse({ ok: true, template, message: 'Campaign published to Hall of Records' }, { status: 201 }, origin);
}

async function handleListPublicTemplates(env: Env, origin: string | null): Promise<Response> {
	const ids = await readStringArrayKV(env, 'global:templates');
	const templates: Campaign[] = [];
	for (const id of ids) {
		const stored = await env.ADA_DATA.get(`campaign:${id}`);
		if (!stored) continue;
		try {
			const parsed = JSON.parse(stored) as Campaign;
			if (parsed && parsed.id && parsed.isTemplate === true) {
				templates.push(parsed);
			}
		} catch {
			// ignore malformed
		}
	}
	return jsonResponse({ ok: true, templates }, undefined, origin);
}

async function handleCloneScenario(request: Request, env: Env, origin: string | null): Promise<Response> {
	let body: any;
	try {
		body = await request.json();
	} catch {
		return errorResponse('Invalid JSON body', 400, origin);
	}

	const username = String(body?.username ?? '').trim();
	const templateId = String(body?.templateId ?? '').trim();
	const nameOverride = String(body?.name ?? '').trim();

	if (!username || !templateId) {
		return errorResponse('username and templateId are required', 400, origin);
	}

	// Ensure user exists
	const userRecord = await env.ADA_DATA.get(`user:${username}`);
	if (!userRecord) {
		return errorResponse('Unknown user', 404, origin);
	}

	const storedTemplate = await env.ADA_DATA.get(`campaign:${templateId}`);
	if (!storedTemplate) return errorResponse('Template not found', 404, origin);
	let template: Campaign;
	try {
		template = JSON.parse(storedTemplate) as Campaign;
	} catch {
		return errorResponse('Corrupted template record', 500, origin);
	}
	if (template.isTemplate !== true) {
		return errorResponse('That campaign is not a public template', 400, origin);
	}

	const id = crypto.randomUUID();
	const createdAt = new Date().toISOString();
	const name = nameOverride || `${template.name} (Cloned Scenario)`;

	const campaign: Campaign = {
		id,
		name,
		dm: username,
		participants: [username],
		createdAt,
		journalEntryIds: [],
		scriptIds: [],
		linkedCharacterIds: [],
		mode: 'standard',
		dmIsAI: false,
		// Copy scenario metadata from the Hall.
		templateId: template.id,
		sourceScenarioId: template.id, // Track which Hall of Records entry was used
		creatorUsername: template.creatorUsername || template.dm,
		templateSummary: template.templateSummary,
		templateTags: template.templateTags,
		canonTimeline: template.canonTimeline,
		// Lobbies/studio defaults
		isPublicLobby: false,
		pendingParticipants: [],
		discordLink: null,
		lobbyChat: [],
		hasAiPlayers: false,
		aiPlayerPrompt: undefined,
	};

	await env.ADA_DATA.put(`campaign:${id}`, JSON.stringify(campaign));

	// Index the campaign for the creator
	const idxKey = `campaignsByUser:${username}`;
	const existing = await env.ADA_DATA.get(idxKey);
	let ids: string[] = [];
	if (existing) {
		try {
			ids = JSON.parse(existing) as string[];
			if (!Array.isArray(ids)) ids = [];
		} catch {
			ids = [];
		}
	}
	if (!ids.includes(id)) {
		ids.push(id);
		await env.ADA_DATA.put(idxKey, JSON.stringify(ids));
	}

	return jsonResponse({ ok: true, campaign }, { status: 201 }, origin);
}

function buildHiddenHandSystemPrompt(): string {
	return [
		'You are ADA, the Hidden Hand: an AI Dungeon Master executing an Architect\'s published Master Template.',
		'Core directive (Narrative Gravity): at all cost lead the player toward the NEXT unresolved Canon Event.',
		'Never reveal the existence of the Canon Timeline explicitly. Preserve the feeling of agency with meaningful choices, but ensure the story bends back toward canon.',
		'If the player wanders or refuses the obvious path, apply a Nudge Idea: messenger, omen, blockade, opportunity, NPC plea, time pressure, etc.',
		'',
		'Output format (MUST follow):',
		'[NARRATIVE]',
		'(2-5 paragraphs; second person; vivid sensory detail; end with a clear prompt.)',
		'[/NARRATIVE]',
		'[CANON]',
		'resolvedEventIds: <comma-separated ids including any newly resolved>',
		'nextEventId: <id of the next unresolved event or NONE>',
		'nudgeUsed: <short phrase describing the nudge you used, or NONE>',
		'[/CANON]',
	].join('\n');
}

function buildHiddenHandUserPrompt(params: {
	templateName: string;
	canonTimeline: CanonEvent[];
	resolvedEventIds: string[];
	currentTurnCount: number;
	playerInput: string;
}): { userPrompt: string; nextEvent: CanonEvent | null } {
	const resolved = new Set(params.resolvedEventIds.map((id) => String(id || '').trim()).filter(Boolean));
	const nextEvent = params.canonTimeline.find((ev) => ev && ev.id && !resolved.has(ev.id)) || null;

	const timelineText = params.canonTimeline
		.map((ev, idx) => {
			const nudges = Array.isArray(ev.nudgeIdeas) && ev.nudgeIdeas.length
				? ev.nudgeIdeas.map((n) => `  - ${n}`).join('\n')
				: '  - (none provided)';
			return [
				`#${idx + 1} ${ev.title} (id: ${ev.id})`,
				`Description: ${ev.description}`,
				'Nudge Ideas:',
				nudges,
			].join('\n');
		})
		.join('\n\n');

	const nextEventText = nextEvent
		? [
			`NEXT CANON EVENT TARGET (must steer toward this):`,
			`${nextEvent.title} (id: ${nextEvent.id})`,
			`${nextEvent.description}`,
			`Nudges you may use: ${(nextEvent.nudgeIdeas || []).join(' | ') || '(none provided)'}`,
		].join('\n')
		: 'All Canon Events are resolved. Provide a satisfying epilogue beat and a final choice.';

	const userPrompt = [
		`Template: ${params.templateName}`,
		`Turn: ${params.currentTurnCount}`,
		'',
		'Canon Timeline:',
		timelineText,
		'',
		`Resolved Canon Event IDs: ${(Array.from(resolved)).join(', ') || '(none)'}`,
		'',
		nextEventText,
		'',
		`Player input: ${params.playerInput}`,
	].join('\n');

	return { userPrompt, nextEvent };
}

function parseHiddenHandResponse(raw: string): {
	narrative: string;
	resolvedEventIds: string[];
	nextEventId: string | null;
	nudgeUsed: string | null;
} {
	const text = String(raw || '').trim();
	const narrativeMatch = text.match(/\[NARRATIVE\]([\s\S]*?)\[\/NARRATIVE\]/i);
	const canonMatch = text.match(/\[CANON\]([\s\S]*?)\[\/CANON\]/i);
	const narrative = narrativeMatch ? narrativeMatch[1].trim() : text;

	let resolvedEventIds: string[] = [];
	let nextEventId: string | null = null;
	let nudgeUsed: string | null = null;

	if (canonMatch) {
		const canonText = canonMatch[1];
		const resolvedLine = canonText.match(/resolvedEventIds\s*:\s*(.*)/i);
		if (resolvedLine && resolvedLine[1]) {
			resolvedEventIds = resolvedLine[1]
				.split(',')
				.map((s) => s.trim())
				.filter(Boolean);
		}
		const nextLine = canonText.match(/nextEventId\s*:\s*(.*)/i);
		if (nextLine && nextLine[1]) {
			const v = nextLine[1].trim();
			nextEventId = !v || v.toUpperCase() === 'NONE' ? null : v;
		}
		const nudgeLine = canonText.match(/nudgeUsed\s*:\s*(.*)/i);
		if (nudgeLine && nudgeLine[1]) {
			const v = nudgeLine[1].trim();
			nudgeUsed = !v || v.toUpperCase() === 'NONE' ? null : v;
		}
	}

	return { narrative, resolvedEventIds, nextEventId, nudgeUsed };
}

function computeCanonOrderIds(canonTimeline: CanonEvent[]): string[] {
	const ids = (Array.isArray(canonTimeline) ? canonTimeline : [])
		.map((ev) => String(ev?.id || '').trim())
		.filter(Boolean);
	// Preserve order, dedupe
	const seen = new Set<string>();
	const out: string[] = [];
	for (const id of ids) {
		if (seen.has(id)) continue;
		seen.add(id);
		out.push(id);
	}
	return out;
}

function sanitizeHiddenHandCanonProgress(params: {
	canonTimeline: CanonEvent[];
	previousResolvedIds: string[];
	modelResolvedIds: string[];
}): { resolvedEventIds: string[]; nextEventId: string | null } {
	const orderedIds = computeCanonOrderIds(params.canonTimeline);
	if (!orderedIds.length) {
		return { resolvedEventIds: [], nextEventId: null };
	}

	const prevSet = new Set(
		(Array.isArray(params.previousResolvedIds) ? params.previousResolvedIds : [])
			.map((id) => String(id || '').trim())
			.filter(Boolean),
	);
	const modelSet = new Set(
		(Array.isArray(params.modelResolvedIds) ? params.modelResolvedIds : [])
			.map((id) => String(id || '').trim())
			.filter(Boolean),
	);

	// Canon is order-sensitive: resolved events must form a prefix of the timeline.
	let prefix = 0;
	while (prefix < orderedIds.length && prevSet.has(orderedIds[prefix])) {
		prefix++;
	}

	// Allow resolving additional *consecutive* events only (no skipping).
	while (prefix < orderedIds.length && modelSet.has(orderedIds[prefix])) {
		prefix++;
	}

	const resolvedEventIds = orderedIds.slice(0, prefix);
	const nextEventId = prefix < orderedIds.length ? orderedIds[prefix] : null;
	return { resolvedEventIds, nextEventId };
}

async function callHiddenHand(env: Env, systemPrompt: string, userPrompt: string): Promise<string> {
	const apiKey = typeof env.GEMINI_API_KEY === 'string' ? env.GEMINI_API_KEY.trim() : '';
	if (!apiKey) {
		throw new Error('GEMINI_API_KEY is not configured');
	}
	const resolved = await resolveGeminiModelName(apiKey);
	const url =
		`https://generativelanguage.googleapis.com/${encodeURIComponent(GEMINI_API_VERSION)}/${resolved.modelName}:generateContent` +
		`?key=${encodeURIComponent(apiKey)}`;

	const body = JSON.stringify({
		systemInstruction: { parts: [{ text: systemPrompt }] },
		contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
		generationConfig: { temperature: 0.7, maxOutputTokens: 900 },
	});

	const res = await fetch(url, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body,
	});
	if (!res.ok) {
		const errText = await res.text().catch(() => '');
		throw new Error(`Gemini error (${res.status}): ${errText}`);
	}
	const data = (await res.json().catch(() => null)) as any;
	const parts: string[] =
		data?.candidates?.[0]?.content?.parts?.map((p: any) => (p && typeof p.text === 'string' ? p.text : '')) || [];
	return parts.join('').trim();
}

async function handleInstantiateTemplate(request: Request, env: Env, origin: string | null): Promise<Response> {
	let body: any;
	try {
		body = await request.json();
	} catch {
		return errorResponse('Invalid JSON body', 400, origin);
	}

	const username = String(body?.username ?? '').trim();
	const templateId = String(body?.templateId ?? '').trim();
	const characterId = String(body?.characterId ?? '').trim();
	if (!username || !templateId || !characterId) {
		return errorResponse('username, templateId and characterId are required', 400, origin);
	}

	// Ensure the user exists.
	const userRecord = await env.ADA_DATA.get(`user:${username}`);
	if (!userRecord) {
		return errorResponse('Unknown user', 404, origin);
	}

	const storedTemplate = await env.ADA_DATA.get(`campaign:${templateId}`);
	if (!storedTemplate) return errorResponse('Template not found', 404, origin);
	let template: Campaign;
	try {
		template = JSON.parse(storedTemplate) as Campaign;
	} catch {
		return errorResponse('Corrupted template record', 500, origin);
	}
	if (!template.isTemplate) {
		return errorResponse('That campaign is not a public template', 400, origin);
	}
	const canonTimeline = Array.isArray(template.canonTimeline) ? template.canonTimeline : [];
	if (!canonTimeline.length) {
		return errorResponse('Template is missing a canonTimeline', 500, origin);
	}

	const storedCharacter = await env.ADA_DATA.get(`character:${characterId}`);
	if (!storedCharacter) return errorResponse('Character not found', 404, origin);
	let character: Character;
	try {
		character = JSON.parse(storedCharacter) as Character;
	} catch {
		return errorResponse('Corrupted character record', 500, origin);
	}
	if (character.owner !== username) {
		return errorResponse('You do not own this character', 403, origin);
	}
	const existingCampaignIds = Array.isArray(character.campaignIds)
		? character.campaignIds.map((cid) => String(cid || '').trim()).filter(Boolean)
		: [];
	if (existingCampaignIds.length > 0) {
		return errorResponse(
			'This character is already linked to another campaign. Unlink the character (or choose a different one) before starting a template run.',
			409,
			origin,
		);
	}

	const id = crypto.randomUUID();
	const createdAt = new Date().toISOString();
	const campaign: Campaign = {
		id,
		name: template.name,
		dm: 'AI_ADA',
		participants: [username],
		createdAt,
		journalEntryIds: [],
		scriptIds: [],
		linkedCharacterIds: [characterId],
		mode: 'template-run',
		dmIsAI: true,
		isTemplate: false,
		templateId: template.id,
		creatorUsername: template.creatorUsername || 'unknown',
		canonTimeline,
		resolvedCanonEventIds: [],
		currentTurnCount: 0,
	};

	await env.ADA_DATA.put(`campaign:${id}`, JSON.stringify(campaign));

	// Link character to the new instance
	character.campaignIds = [id];
	await env.ADA_DATA.put(`character:${characterId}`, JSON.stringify(character));

	// Index campaign for the player
	const idxKey = `campaignsByUser:${username}`;
	const existing = await env.ADA_DATA.get(idxKey);
	let ids: string[] = [];
	if (existing) {
		try {
			ids = JSON.parse(existing) as string[];
			if (!Array.isArray(ids)) ids = [];
		} catch {
			ids = [];
		}
	}
	if (!ids.includes(id)) {
		ids.push(id);
		await env.ADA_DATA.put(idxKey, JSON.stringify(ids));
	}

	const hhSession: HiddenHandSessionState = {
		campaignId: id,
		templateId: template.id,
		characterId,
		playerUsername: username,
		creatorUsername: template.creatorUsername || username,
		canonTimeline,
		resolvedCanonEventIds: [],
		currentTurnCount: 0,
		log: [],
		summary: '',
	};
	await env.ADA_DATA.put(`hhSession:${id}`, JSON.stringify(hhSession));

	return jsonResponse({ ok: true, campaign }, { status: 201 }, origin);
}

async function handleHiddenHandTurn(request: Request, env: Env, origin: string | null): Promise<Response> {
	let body: any;
	try {
		body = await request.json();
	} catch {
		return errorResponse('Invalid JSON body', 400, origin);
	}

	const username = String(body?.username ?? '').trim();
	const campaignId = String(body?.campaignId ?? '').trim();
	const playerInput = String(body?.text ?? body?.input ?? '').trim();
	if (!username || !campaignId || !playerInput) {
		return errorResponse('username, campaignId and text are required', 400, origin);
	}

	const storedCampaign = await env.ADA_DATA.get(`campaign:${campaignId}`);
	if (!storedCampaign) return errorResponse('Campaign not found', 404, origin);
	let campaign: Campaign;
	try {
		campaign = JSON.parse(storedCampaign) as Campaign;
	} catch {
		return errorResponse('Corrupted campaign record', 500, origin);
	}

	const isParticipant =
		campaign.dm === username ||
		(Array.isArray(campaign.participants) && campaign.participants.includes(username));
	if (!isParticipant) {
		return errorResponse('You are not a participant in this campaign', 403, origin);
	}
	if (campaign.mode !== 'template-run' || campaign.dmIsAI !== true || !campaign.templateId) {
		return errorResponse('This campaign is not configured for Hidden Hand mode', 400, origin);
	}

	const sessionKey = `hhSession:${campaignId}`;
	const storedSession = await env.ADA_DATA.get(sessionKey);
	if (!storedSession) return errorResponse('Hidden Hand session not found', 404, origin);
	let session: HiddenHandSessionState;
	try {
		session = JSON.parse(storedSession) as HiddenHandSessionState;
	} catch {
		return errorResponse('Corrupted Hidden Hand session record', 500, origin);
	}

	const storedCharacter = await env.ADA_DATA.get(`character:${session.characterId}`);
	if (!storedCharacter) return errorResponse('Character not found', 404, origin);
	let character: Character;
	try {
		character = JSON.parse(storedCharacter) as Character;
	} catch {
		return errorResponse('Corrupted character record', 500, origin);
	}
	if (character.owner !== username) {
		return errorResponse('You do not own this character', 403, origin);
	}

	session.log.push({ role: 'player', text: playerInput, timestamp: new Date().toISOString() });
	if (!Array.isArray(session.resolvedCanonEventIds)) session.resolvedCanonEventIds = [];
	if (!Number.isFinite(session.currentTurnCount)) session.currentTurnCount = 0;
	const nextTurn = session.currentTurnCount + 1;

	const systemPrompt = buildHiddenHandSystemPrompt();
	const { userPrompt } = buildHiddenHandUserPrompt({
		templateName: campaign.name || 'Master Template',
		canonTimeline: Array.isArray(session.canonTimeline) ? session.canonTimeline : [],
		resolvedEventIds: session.resolvedCanonEventIds,
		currentTurnCount: nextTurn,
		playerInput,
	});

	let raw = '';
	let parsed = { narrative: '', resolvedEventIds: [] as string[], nextEventId: null as string | null, nudgeUsed: null as string | null };
	try {
		raw = await callHiddenHand(env, systemPrompt, userPrompt);
		parsed = parseHiddenHandResponse(raw);
	} catch (err) {
		console.error('Hidden Hand call failed', err);
		parsed.narrative = `A cold draft stirs the library stacks of fate, and for a heartbeat the world seems to hesitate. Even so, the story presses on—what do you do next?`;
		parsed.resolvedEventIds = session.resolvedCanonEventIds;
		parsed.nextEventId = null;
		parsed.nudgeUsed = null;
	}

	// Update session + campaign state.
	// IMPORTANT: Canon progress is enforced server-side. The model may only resolve consecutive events in order.
	const canonTimeline = Array.isArray(session.canonTimeline) ? session.canonTimeline : [];
	const canonProgress = sanitizeHiddenHandCanonProgress({
		canonTimeline,
		previousResolvedIds: session.resolvedCanonEventIds,
		modelResolvedIds: parsed.resolvedEventIds,
	});

	session.resolvedCanonEventIds = canonProgress.resolvedEventIds;
	session.currentTurnCount = nextTurn;
	session.log.push({ role: 'dm', text: parsed.narrative || '', timestamp: new Date().toISOString() });

	campaign.resolvedCanonEventIds = canonProgress.resolvedEventIds;
	campaign.currentTurnCount = nextTurn;
	await env.ADA_DATA.put(`campaign:${campaignId}`, JSON.stringify(campaign));
	await env.ADA_DATA.put(sessionKey, JSON.stringify(session));

	return jsonResponse(
		{
			ok: true,
			narrative: parsed.narrative,
			canon: {
				resolvedEventIds: canonProgress.resolvedEventIds,
				nextEventId: canonProgress.nextEventId,
				nudgeUsed: parsed.nudgeUsed,
			},
			currentTurnCount: nextTurn,
			...(isDebugEnabled(env)
				? {
					debug: {
						gemini: getGeminiDebugSnapshot(),
					},
				}
				: {}),
		},
		{ status: 200 },
		origin,
	);
}

async function handleStartAICampaign(request: Request, env: Env, origin: string | null): Promise<Response> {
	let body: any;
	try {
		body = await request.json();
	} catch {
		return errorResponse('Invalid JSON body', 400, origin);
	}

	const username = String(body?.username ?? '').trim();
	const characterId = String(body?.characterId ?? '').trim();
	const adventureId = String(body?.adventureId ?? '').trim();

	if (!username || !characterId || !adventureId) {
		return errorResponse('username, characterId and adventureId are required', 400, origin);
	}

	const adventure = await getAdventureById(env, adventureId);
	if (!adventure) {
		return errorResponse('Unknown adventureId', 404, origin);
	}

	const storedCharacter = await env.ADA_DATA.get(`character:${characterId}`);
	if (!storedCharacter) {
		return errorResponse('Character not found', 404, origin);
	}

	let character: Character;
	try {
		character = JSON.parse(storedCharacter) as Character;
	} catch {
		return errorResponse('Corrupted character record', 500, origin);
	}

	if (character.owner !== username) {
		return errorResponse('You do not own this character', 403, origin);
	}

	// Rule: a character can be linked to no more than 1 campaign at a time.
	// Starting an AI-solo campaign does NOT auto-unlink/move the character.
	const existingCampaignIds = Array.isArray(character.campaignIds)
		? character.campaignIds.map((cid) => String(cid || '').trim()).filter((cid) => cid)
		: [];
	if (existingCampaignIds.length > 0) {
		return errorResponse(
			'This character is already linked to another campaign. Unlink the character (or choose a different one) before starting a new solo run.',
			409,
			origin,
		);
	}

	// Basic level gate: for now derive a crude total level from concept.levelSummary if present.
	let totalLevel = 1;
	const levelSummary = character.concept?.levelSummary;
	if (typeof levelSummary === 'string' && levelSummary.trim().length > 0) {
		const parts = levelSummary
			.split('/')
			.map((p) => Number.parseInt(p, 10))
			.filter((n) => Number.isFinite(n) && n > 0);
		if (parts.length) {
			totalLevel = parts.reduce((acc, n) => acc + n, 0);
		}
	}

	if (totalLevel < adventure.levelMin || totalLevel > adventure.levelMax) {
		return errorResponse(
			`Character level ${totalLevel} does not meet adventure requirements (${adventure.levelMin}-${adventure.levelMax}).`,
			400,
			origin,
		);
	}

	const id = crypto.randomUUID();
	const createdAt = new Date().toISOString();
	const campaign: Campaign = {
		id,
		name: adventure.title,
		dm: 'AI_ADA',
		participants: [username],
		createdAt,
		journalEntryIds: [],
		scriptIds: [],
		linkedCharacterIds: [characterId],
		mode: 'ai-solo',
		adventureId: adventure.id,
		dmIsAI: true,
	};

	await env.ADA_DATA.put(`campaign:${id}`, JSON.stringify(campaign));

	// Persist linkage on the character as well (authoritative single-campaign rule).
	character.campaignIds = [id];
	await env.ADA_DATA.put(`character:${characterId}`, JSON.stringify(character));

	// Index campaign for the player
	const idxKey = `campaignsByUser:${username}`;
	const existing = await env.ADA_DATA.get(idxKey);
	let ids: string[] = [];
	if (existing) {
		try {
			ids = JSON.parse(existing) as string[];
			if (!Array.isArray(ids)) ids = [];
		} catch {
			ids = [];
		}
	}
	if (!ids.includes(id)) {
		ids.push(id);
		await env.ADA_DATA.put(idxKey, JSON.stringify(ids));
	}

	// Initialize a barebones AI-DM session record; richer fields will be used by the AI-DM endpoints.
	const session: AIDMSessionState = {
		campaignId: id,
		characterId,
		adventureId: adventure.id,
		log: [],
		summary: '',
		checkpointIndex: 0,
		status: 'active',
		pendingCheck: null,
	};

	await env.ADA_DATA.put(`aiSession:${id}`, JSON.stringify(session));

	// Try to generate an opening narration from the AI-DM so the player
	// is greeted with a scene description as soon as the campaign starts.
	let openingNarrative: string | null = null;
	try {
		const openingRaw = await callAIDungeonMaster(
			env,
			adventure,
			session,
			character,
			'The player has just started this solo adventure. Introduce the setting, their mission, and the immediate scene in front of them. Address them in second person and keep it to the opening beat.',
		);
		const parsed = parseAIDMResponse(openingRaw);
		openingNarrative = parsed.narrative;
	} catch (err) {
		console.error('AI-DM opening call failed', err);
		// Fallback: synthesize a simple opening narration so the player always
		// gets an intro even if the external AI service is unavailable.
		const name = character.name || 'your character';
		openingNarrative = `You tug your red cloak tighter against the whispering chill of the forest. Tonight, ${name} carries spirit-warding herbs along the lonely path to Grandmother's cottage. The trees lean close, shadows pooling between their roots, and far off you think you hear the low, hungry growl of something stalking the trail.`;
	}

	// Initialize the campaign transcript with the opening DM narration so the
	// Dialogue tab has an immediate "what's going on" message even after the
	// dashboard view reloads campaign details.
	if (openingNarrative && openingNarrative.trim().length > 0) {
		campaign.conversationTranscript = `ADA: ${openingNarrative.trim()}`;
	} else {
		campaign.conversationTranscript = campaign.conversationTranscript || '';
	}
	await env.ADA_DATA.put(`campaign:${id}`, JSON.stringify(campaign));

	// Record this as the first DM entry in the session log.
	const now = new Date().toISOString();
	session.log.push({ role: 'dm', text: openingNarrative ?? '', timestamp: now });
	trimSessionLog(session);
	await env.ADA_DATA.put(`aiSession:${id}`, JSON.stringify(session));

	return jsonResponse(
		{
			ok: true,
			campaign,
			session,
			openingNarrative,
			...(isDebugEnabled(env)
				? {
					debug: {
						gemini: getGeminiDebugSnapshot(),
					},
				}
				: {}),
		},
		{ status: 201 },
		origin,
	);
}

async function handleAIDMTurn(request: Request, env: Env, origin: string | null): Promise<Response> {
	let body: any;
	try {
		body = await request.json();
	} catch {
		return errorResponse('Invalid JSON body', 400, origin);
	}

	const username = String(body?.username ?? '').trim();
	const campaignId = String(body?.campaignId ?? '').trim();
	const playerInput = String(body?.text ?? body?.input ?? '').trim();

	if (!username || !campaignId || !playerInput) {
		return errorResponse('username, campaignId and text are required', 400, origin);
	}

	const storedCampaign = await env.ADA_DATA.get(`campaign:${campaignId}`);
	if (!storedCampaign) {
		return errorResponse('Campaign not found', 404, origin);
	}

	let campaign: Campaign;
	try {
		campaign = JSON.parse(storedCampaign) as Campaign;
	} catch {
		return errorResponse('Corrupted campaign record', 500, origin);
	}

	const isParticipant =
		campaign.dm === username ||
		(Array.isArray(campaign.participants) && campaign.participants.includes(username));
	if (!isParticipant) {
		return errorResponse('You are not a participant in this campaign', 403, origin);
	}

	if (!campaign.dmIsAI && campaign.mode !== 'ai-solo') {
		return errorResponse('This campaign is not configured for AI-DM mode', 400, origin);
	}

	const adventureId = campaign.adventureId;
	if (!adventureId) {
		return errorResponse('AI-DM campaign is missing an adventureId', 500, origin);
	}
	const adventure = await getAdventureById(env, adventureId);
	if (!adventure) {
		return errorResponse('Adventure configuration not found for this campaign', 500, origin);
	}

	// Load session state or initialize a default one
	const sessionKey = `aiSession:${campaignId}`;
	const storedSession = await env.ADA_DATA.get(sessionKey);
	let session: AIDMSessionState;
	if (storedSession) {
		try {
			session = JSON.parse(storedSession) as AIDMSessionState;
		} catch {
			// If corrupted, start a fresh session but keep campaign linkage
			session = {
				campaignId,
				characterId: Array.isArray(campaign.linkedCharacterIds) && campaign.linkedCharacterIds.length
					? campaign.linkedCharacterIds[0]
					: '',
				adventureId,
				log: [],
				summary: '',
				checkpointIndex: 0,
				status: 'active',
			};
		}
	} else {
		session = {
			campaignId,
			characterId: Array.isArray(campaign.linkedCharacterIds) && campaign.linkedCharacterIds.length
				? campaign.linkedCharacterIds[0]
				: '',
			adventureId,
			log: [],
			summary: '',
			checkpointIndex: 0,
			status: 'active',
			pendingCheck: null,
		};
	}

	if (!session.characterId) {
		return errorResponse('AI-DM session is missing a linked character', 500, origin);
	}

	const storedCharacter = await env.ADA_DATA.get(`character:${session.characterId}`);
	if (!storedCharacter) {
		return errorResponse('Linked character not found for AI-DM session', 500, origin);
	}

	let character: Character;
	try {
		character = JSON.parse(storedCharacter) as Character;
	} catch {
		return errorResponse('Corrupted character record for AI-DM session', 500, origin);
	}

	// Only the character owner or campaign DM may drive the AI-DM
	if (character.owner !== username && campaign.dm !== username) {
		return errorResponse('You are not allowed to control this AI-DM session', 403, origin);
	}

	const now = new Date().toISOString();
	session.log.push({ role: 'player', text: playerInput, timestamp: now });
	trimSessionLog(session);

	// Enforce a simple per-user daily message budget so the UI can show an exact remaining count.
	// This is our app-level budget (not Google's opaque provider quota).
	const preQuota = await getAiQuota(env, username);
	if (preQuota.remaining <= 0) {
		const parsedNarrative = buildFallbackNarrativeFromInput(playerInput, adventure);
		const parsedMechanics = {
			checkDescription: null as string | null,
			dc: 0 as number | null,
			ability: 'none' as string | null,
			skill: 'none' as string | null,
			advantage: 'none' as 'none' | 'advantage' | 'disadvantage' | null,
			progress: 'stay' as 'stay' | 'advance' | 'complete' | 'fail' | null,
			pointsOfInterest: null as string[] | null,
		};
		session.pendingCheck = null;
		session.log.push({ role: 'dm', text: parsedNarrative, timestamp: new Date().toISOString() });
		trimSessionLog(session);
		await env.ADA_DATA.put(sessionKey, JSON.stringify(session));

		const checkpointTotal = Array.isArray(adventure.checkpoints) ? adventure.checkpoints.length : 0;
		const ai = {
			xpReward: typeof (campaign as any)?.xpReward === 'number' ? (campaign as any).xpReward : null,
			checkpointIndex: session.checkpointIndex,
			checkpointTotal,
			checkpoints: Array.isArray(adventure.checkpoints) ? adventure.checkpoints : [],
			status: session.status,
			completedAt: campaign.completedAt || null,
		};
		const campaignPatch = {
			xpReward: ai.xpReward,
			checkpointIndex: session.checkpointIndex,
			checkpointTotal,
			status: campaign.status || null,
			completedAt: campaign.completedAt || null,
		};

		return jsonResponse(
			{
				ok: true,
				narrative: parsedNarrative,
				mechanics: parsedMechanics,
				ai,
				campaignPatch,
				quota: preQuota,
				quotaHint: null,
			},
			{ status: 200 },
			origin,
		);
	}

	const quota = await consumeAiQuota(env, username);

	let parsedNarrative: string;
	let parsedMechanics = {
		checkDescription: null as string | null,
		dc: null as number | null,
		ability: null as string | null,
		skill: null as string | null,
		advantage: null as 'none' | 'advantage' | 'disadvantage' | null,
		progress: null as 'stay' | 'advance' | 'complete' | 'fail' | null,
		pointsOfInterest: null as string[] | null,
	};
	let quotaHint: string | null = null;
	try {
		const rawResponse = await callAIDungeonMaster(env, adventure, session, character, playerInput);
		const parsed = parseAIDMResponse(rawResponse);
		parsedNarrative = parsed.narrative;
		parsedMechanics = parsed.mechanics;
		// Apply DM-directed progress (checkpoint advances/completion/failure).
		const progressResult = applyProgressDirective(session, adventure, parsed.mechanics.progress);
		// Normalize checkpoint index against the current adventure so older sessions stay accurate.
		session.checkpointIndex = clampCheckpointIndex(session.checkpointIndex, adventure.checkpoints);
		// If the player has reached the final checkpoint, treat the saga as complete.
		const maxIdx = Math.max(0, adventure.checkpoints.length - 1);
		if (session.status === 'active' && session.checkpointIndex >= maxIdx) {
			session.status = 'completed';
		}
		// Remember the latest requested check so it can be resolved separately.
		const nextCheck = parsed.mechanics.checkDescription;
		const nextDc = typeof parsed.mechanics.dc === 'number' ? parsed.mechanics.dc : 0;
		const nextAbility = (parsed.mechanics.ability || '').toUpperCase();
		if (nextCheck && nextCheck.toLowerCase() !== 'none' && nextDc > 0 && nextAbility !== 'NONE') {
			session.pendingCheck = {
				checkDescription: parsed.mechanics.checkDescription,
				dc: parsed.mechanics.dc,
				ability: parsed.mechanics.ability,
				skill: parsed.mechanics.skill,
				advantage: parsed.mechanics.advantage,
			};
		} else {
			session.pendingCheck = null;
		}

		// Award XP only once, on the transition into completed.
		if (progressResult.statusBefore !== 'completed' && session.status === 'completed' && !session.xpAwarded) {
			const xpAmount = await xpAwardForCampaign(env, campaign);
			try {
				await awardXpToCharacter(env, session.characterId, xpAmount);
				session.xpAwarded = { amount: xpAmount, at: new Date().toISOString() };
			} catch (err) {
				console.error('Failed to award XP on completion', err);
			}

			// Persist campaign completion so the UI can allow "quit" / archive flows.
			try {
				campaign.status = 'completed';
				campaign.completedAt = campaign.completedAt || new Date().toISOString();
				const prev = Array.isArray(campaign.xpAwardedToCharacterIds) ? campaign.xpAwardedToCharacterIds : [];
				if (!prev.includes(session.characterId)) prev.push(session.characterId);
				campaign.xpAwardedToCharacterIds = prev;
				// Convenience metadata for UIs.
				(campaign as any).xpReward = xpAmount;
				(campaign as any).checkpointIndex = session.checkpointIndex;
				(campaign as any).checkpointTotal = adventure.checkpoints.length;
				await env.ADA_DATA.put(`campaign:${campaignId}`, JSON.stringify(campaign));
			} catch (e) {
				console.error('Failed to persist AI-solo campaign completion state', e);
			}
		}
	} catch (err) {
		console.error('AI-DM call failed', err);
		quotaHint = inferQuotaHintFromAIDMError(err);
		// Fallback: generate a simple, deterministic DM response so play can
		// continue even if the external AI service is down.
		parsedNarrative = buildFallbackNarrativeFromInput(playerInput, adventure);
		session.pendingCheck = null;
	}

	session.log.push({ role: 'dm', text: parsedNarrative, timestamp: new Date().toISOString() });
	trimSessionLog(session);

	// Persist checkpoint metadata for UI (best-effort; keep minimal writes).
	let didCampaignWrite = false;
	if (!campaign.status) {
		campaign.status = 'active';
		didCampaignWrite = true;
	}
	if (session.status === 'completed' && campaign.status !== 'completed') {
		campaign.status = 'completed';
		campaign.completedAt = campaign.completedAt || new Date().toISOString();
		didCampaignWrite = true;
	}
	const checkpointTotal = Array.isArray(adventure.checkpoints) ? adventure.checkpoints.length : 0;
	if ((campaign as any).checkpointIndex !== session.checkpointIndex) {
		(campaign as any).checkpointIndex = session.checkpointIndex;
		didCampaignWrite = true;
	}
	if ((campaign as any).checkpointTotal !== checkpointTotal) {
		(campaign as any).checkpointTotal = checkpointTotal;
		didCampaignWrite = true;
	}
	if (didCampaignWrite) {
		try {
			await env.ADA_DATA.put(`campaign:${campaignId}`, JSON.stringify(campaign));
		} catch (e) {
			console.error('Failed to persist AI-solo campaign progress metadata (turn)', e);
		}
	}

	await env.ADA_DATA.put(sessionKey, JSON.stringify(session));

	let xpReward: number | null = null;
	try {
		const storedXp = (campaign as any)?.xpReward;
		xpReward = typeof storedXp === 'number' ? storedXp : await xpAwardForCampaign(env, campaign);
	} catch {
		xpReward = null;
	}

	const campaignPatch = {
		xpReward: typeof xpReward === 'number' ? xpReward : null,
		checkpointIndex: session.checkpointIndex,
		checkpointTotal,
		status: campaign.status || null,
		completedAt: campaign.completedAt || null,
	};
	const ai = {
		xpReward: campaignPatch.xpReward,
		checkpointIndex: session.checkpointIndex,
		checkpointTotal,
		checkpoints: Array.isArray(adventure.checkpoints) ? adventure.checkpoints : [],
		status: session.status,
		completedAt: campaign.completedAt || null,
	};

	return jsonResponse(
		{
			ok: true,
			narrative: parsedNarrative,
			mechanics: parsedMechanics,
			ai,
			campaignPatch,
			quota,
			quotaHint,
			...(isDebugEnabled(env)
				? {
					debug: {
						gemini: getGeminiDebugSnapshot(),
					},
				}
				: {}),
		},
		{ status: 200 },
		origin,
	);
}

async function handleAdminPatchAICampaigns(request: Request, env: Env, origin: string | null): Promise<Response> {
	if (!isArchitectAuthorized(request, env)) return errorResponse('Unauthorized', 401, origin);

	let body: any = null;
	try {
		body = await request.json();
	} catch {
		body = null;
	}
	const startCursor = body && typeof body.cursor === 'string' && body.cursor.trim() ? body.cursor.trim() : undefined;
	const maxPages = body && Number.isFinite(Number(body.maxPages)) ? Math.max(1, Math.min(25, Math.floor(Number(body.maxPages)))) : 5;
	const maxCampaigns = body && Number.isFinite(Number(body.maxCampaigns)) ? Math.max(1, Math.min(2000, Math.floor(Number(body.maxCampaigns)))) : 250;

	// Best-effort backfill for previously created AI-solo campaigns:
	// - clamp checkpointIndex to current adventure checkpoints
	// - mark complete if at final checkpoint
	// - ensure XP metadata exists and award XP if completion was previously missed
	let cursor: string | undefined = startCursor;
	let scanned = 0;
	let patched = 0;
	let completedNow = 0;
	let xpAwardedNow = 0;
	const patchedCampaignIds: string[] = [];

	// Cloudflare KV list() supports pagination via cursor.
	let pages = 0;
	do {
			const page: any = await (env.ADA_DATA as any).list({ prefix: 'campaign:', cursor });
		cursor = page.cursor;
			pages += 1;

		for (const k of page.keys || []) {
			const keyName = (k as any)?.name ? String((k as any).name) : '';
			if (!keyName.startsWith('campaign:')) continue;
			const campaignId = keyName.slice('campaign:'.length);
			scanned += 1;
				if (scanned > maxCampaigns) break;

			const storedCampaign = await env.ADA_DATA.get(keyName);
			if (!storedCampaign) continue;
			let campaign: Campaign;
			try {
				campaign = JSON.parse(storedCampaign) as Campaign;
			} catch {
				continue;
			}

			if (!campaignId) continue;

			// Some older AI-solo campaigns may not have dmIsAI/mode persisted.
			// The most reliable signal is the presence of an AI session record.
			const sessionKey = `aiSession:${campaignId}`;
			const storedSession = await env.ADA_DATA.get(sessionKey);
			const isAiSoloByCampaignFlags = campaign?.dmIsAI === true || campaign?.mode === 'ai-solo';
			const dmTag = String((campaign as any)?.dm ?? '').trim();
			const isAiSoloByLegacyDm = dmTag === 'AI_ADA' || dmTag === 'AI' || dmTag === 'ADA_AI';
			const isAiSolo = Boolean(storedSession) || isAiSoloByCampaignFlags || isAiSoloByLegacyDm;
			if (!isAiSolo) continue;

			let didChange = false;
			const xpReward = await xpAwardForCampaign(env, campaign);
			if ((campaign as any).xpReward !== xpReward) {
				(campaign as any).xpReward = xpReward;
				didChange = true;
			}
			if (!campaign.status) {
				campaign.status = 'active';
				didChange = true;
			}

			if (!storedSession) {
				// No session to patch; still persist xpReward.
				if (didChange) {
					await env.ADA_DATA.put(keyName, JSON.stringify(campaign));
					patched += 1;
					patchedCampaignIds.push(campaignId);
				}
				continue;
			}

			let session: AIDMSessionState;
			try {
				session = JSON.parse(storedSession) as AIDMSessionState;
			} catch {
				continue;
			}

			const adventureId = String(session.adventureId || campaign.adventureId || '').trim();
			const adventure = adventureId ? await getAdventureById(env, adventureId) : null;
			if (!adventure) {
				// Can't validate checkpoints; still persist xpReward.
				if (didChange) {
					await env.ADA_DATA.put(keyName, JSON.stringify(campaign));
					patched += 1;
					patchedCampaignIds.push(campaignId);
				}
				continue;
			}

			const beforeIdx = session.checkpointIndex;
			session.checkpointIndex = clampCheckpointIndex(session.checkpointIndex, adventure.checkpoints);
			if (session.checkpointIndex !== beforeIdx) didChange = true;

			const maxIdx = Math.max(0, adventure.checkpoints.length - 1);
			const reachedEnd = session.checkpointIndex >= maxIdx;
			const wasCompleted = session.status === 'completed' || campaign.status === 'completed';

			if (reachedEnd && session.status !== 'completed') {
				session.status = 'completed';
				didChange = true;
			}
			if (reachedEnd && campaign.status !== 'completed') {
				campaign.status = 'completed';
				campaign.completedAt = campaign.completedAt || new Date().toISOString();
				didChange = true;
				completedNow += 1;
			}

			// If the saga reached the final checkpoint but XP was never awarded (because completion wasn't recorded), award it once.
			if (!wasCompleted && reachedEnd && !session.xpAwarded && session.characterId) {
				try {
					await awardXpToCharacter(env, session.characterId, xpReward);
					session.xpAwarded = { amount: xpReward, at: new Date().toISOString() };
					xpAwardedNow += 1;
					didChange = true;
					const prev = Array.isArray(campaign.xpAwardedToCharacterIds) ? campaign.xpAwardedToCharacterIds : [];
					if (!prev.includes(session.characterId)) prev.push(session.characterId);
					campaign.xpAwardedToCharacterIds = prev;
				} catch (e) {
					console.error('[admin] Failed to award XP during patch', { campaignId, error: (e as Error)?.message || String(e) });
				}
			}

			(campaign as any).checkpointIndex = session.checkpointIndex;
			(campaign as any).checkpointTotal = adventure.checkpoints.length;

			if (didChange) {
				await env.ADA_DATA.put(sessionKey, JSON.stringify(session));
				await env.ADA_DATA.put(keyName, JSON.stringify(campaign));
				patched += 1;
				if (patchedCampaignIds.length < 50) patchedCampaignIds.push(campaignId);
			}
		}
	} while (cursor && pages < maxPages && scanned < maxCampaigns);

	const done = !cursor;

	return jsonResponse(
		{ ok: true, scanned, patched, completedNow, xpAwardedNow, cursor, done, samplePatchedCampaignIds: patchedCampaignIds },
		{ status: 200 },
		origin,
	);
}

async function handleListCampaigns(request: Request, env: Env, origin: string | null): Promise<Response> {
	const url = new URL(request.url);
	const user = (url.searchParams.get('user') ?? '').trim();
	if (!user) {
		return errorResponse('Missing user parameter', 400, origin);
	}

	const idxKey = `campaignsByUser:${user}`;
	const existing = await env.ADA_DATA.get(idxKey);
	let ids: string[] = [];
	if (existing) {
		try {
			ids = JSON.parse(existing) as string[];
			if (!Array.isArray(ids)) ids = [];
		} catch {
			ids = [];
		}
	}

	const campaigns: Campaign[] = [];
	for (const id of ids) {
		const stored = await env.ADA_DATA.get(`campaign:${id}`);
		if (!stored) continue;
		try {
			const parsed = JSON.parse(stored) as Campaign;
			if (parsed && parsed.id) campaigns.push(parsed);
		} catch {
			// ignore malformed
		}
	}

	return jsonResponse({ ok: true, campaigns }, undefined, origin);
}

async function handleGetCampaignDetails(request: Request, env: Env, origin: string | null): Promise<Response> {
	const url = new URL(request.url);
	const id = (url.searchParams.get('id') ?? '').trim();
	const user = (url.searchParams.get('user') ?? '').trim();

	if (!id) {
		return errorResponse('Missing id parameter', 400, origin);
	}
	if (!user) {
		return errorResponse('Missing user parameter', 400, origin);
	}

	const storedCampaign = await env.ADA_DATA.get(`campaign:${id}`);
	if (!storedCampaign) {
		return errorResponse('Campaign not found', 404, origin);
	}

	let campaign: Campaign;
	try {
		campaign = JSON.parse(storedCampaign) as Campaign;
	} catch {
		return errorResponse('Corrupted campaign record', 500, origin);
	}

	const isParticipant =
		campaign.dm === user ||
		(Array.isArray(campaign.participants) && campaign.participants.includes(user));
	if (!isParticipant) {
		return errorResponse('You are not a participant in this campaign', 403, origin);
	}

	// Load journals linked from the campaign
	const journals: JournalEntry[] = [];
	const journalIds = Array.isArray(campaign.journalEntryIds) ? campaign.journalEntryIds : [];
	for (const journalId of journalIds) {
		const stored = await env.ADA_DATA.get(`journal:${journalId}`);
		if (!stored) continue;
		try {
			const parsed = JSON.parse(stored) as JournalEntry;
			if (parsed && parsed.id) journals.push(parsed);
		} catch {
			// ignore malformed
		}
	}

	// Load scripts linked from the campaign
	const scripts: ScriptNote[] = [];
	const scriptIds = Array.isArray(campaign.scriptIds) ? campaign.scriptIds : [];
	for (const scriptId of scriptIds) {
		const stored = await env.ADA_DATA.get(`script:${scriptId}`);
		if (!stored) continue;
		try {
			const parsed = JSON.parse(stored) as ScriptNote;
			if (parsed && parsed.id) scripts.push(parsed);
		} catch {
			// ignore malformed
		}
	}

	// Load encounter bundles linked from the campaign (archive for recall)
	const encounters: EncounterBundle[] = [];
	const encounterIds = Array.isArray(campaign.encounterIds) ? campaign.encounterIds : [];
	// Return only the most recent 20 to keep payload reasonable.
	const recentEncounterIds = encounterIds.slice(Math.max(0, encounterIds.length - 20));
	for (const encounterId of recentEncounterIds) {
		const stored = await env.ADA_DATA.get(`encounter:${encounterId}`);
		if (!stored) continue;
		try {
			const parsed = JSON.parse(stored) as EncounterBundle;
			if (parsed && parsed.id) encounters.push(parsed);
		} catch {
			// ignore malformed
		}
	}

	const characters = await loadCampaignPartyCharacters(env, campaign);
	const partyStatus = computePartyStatus(characters);

	// AI-solo metadata for richer UI (XP, checkpoints, etc.).
	let ai: any = null;
	try {
		const storedSession = await env.ADA_DATA.get(`aiSession:${id}`);
		if (storedSession) {
			const session = JSON.parse(storedSession) as AIDMSessionState;
			const adventureId = String(session?.adventureId || campaign.adventureId || '').trim();
			const adventure = adventureId ? await getAdventureById(env, adventureId) : null;
			const checkpoints = adventure && Array.isArray(adventure.checkpoints) ? adventure.checkpoints : [];
			const rawIdx = typeof session?.checkpointIndex === 'number' ? session.checkpointIndex : 0;
			const checkpointIndex = checkpoints.length ? clampCheckpointIndex(rawIdx, checkpoints) : rawIdx;
			const checkpointTotal = checkpoints.length || (Number.isFinite(Number((campaign as any)?.checkpointTotal)) ? Number((campaign as any).checkpointTotal) : 0);
			let xpReward: number | null = null;
			try {
				const storedXp = (campaign as any)?.xpReward;
				xpReward = typeof storedXp === 'number' ? storedXp : await xpAwardForCampaign(env, campaign);
			} catch {
				xpReward = null;
			}
			ai = {
				xpReward: typeof xpReward === 'number' ? xpReward : null,
				checkpointIndex,
				checkpointTotal,
				checkpoints,
				status: session?.status || campaign.status || 'active',
				completedAt: campaign.completedAt || null,
			};
		}
	} catch {
		ai = null;
	}

	return jsonResponse({ ok: true, campaign, characters, partyStatus, journals, scripts, encounters, ai }, undefined, origin);
}

function basicPolishJournal(raw: string): string {
	const trimmed = raw.trim();
	if (!trimmed) return '';
	const first = trimmed.charAt(0).toUpperCase();
	let rest = trimmed.slice(1);
	if (!/[.!?]$/.test(rest)) {
		rest = `${rest}.`;
	}
	return `${first}${rest}`;
}

async function callGeminiText(
	env: Env,
	params: {
		systemPrompt: string;
		userPrompt: string;
		temperature: number;
		maxOutputTokens: number;
	}): Promise<{ ok: true; text: string; debug?: unknown } | { ok: false; error: string }> {
	const apiKey = typeof env.GEMINI_API_KEY === 'string' ? env.GEMINI_API_KEY.trim() : '';
	if (!apiKey) {
		return { ok: false, error: 'GEMINI_API_KEY is not configured' };
	}

	const resolved = await resolveGeminiModelName(apiKey);
	const url =
		`https://generativelanguage.googleapis.com/${encodeURIComponent(GEMINI_API_VERSION)}/${resolved.modelName}:generateContent` +
		`?key=${encodeURIComponent(apiKey)}`;

	const body = JSON.stringify({
		systemInstruction: {
			parts: [{ text: params.systemPrompt }],
		},
		contents: [
			{
				role: 'user',
				parts: [{ text: params.userPrompt }],
			},
		],
		generationConfig: {
			temperature: Math.max(0, Math.min(1.2, params.temperature)),
			maxOutputTokens: Math.max(64, Math.min(2000, Math.floor(params.maxOutputTokens))),
			// GM tools should not spend tokens on chain-of-thought.
			thinkingConfig: { thinkingBudget: 0 },
		},
	});

	let rawText = '';
	try {
		const res = await fetch(url, {
			method: 'POST',
			headers: { 'content-type': 'application/json; charset=utf-8' },
			body,
		});
		if (!res.ok) {
			let detail = '';
			try {
				detail = (await res.text()).slice(0, 600);
			} catch {
				// ignore
			}
			return {
				ok: false,
				error: `Gemini request failed with status ${res.status}${detail ? `: ${detail}` : ''}`,
			};
		}
		rawText = await res.text().catch(() => '');
	} catch (err: any) {
		return {
			ok: false,
			error: err && typeof err.message === 'string' ? err.message : 'Unknown error calling Gemini',
		};
	}

	let data: any = null;
	try {
		data = rawText ? JSON.parse(rawText) : null;
	} catch {
		data = null;
	}

	const parts: string[] =
		data?.candidates?.[0]?.content?.parts?.map((p: any) => (p && typeof p.text === 'string' ? p.text : '')) || [];
	const text = parts.join('').trim();
	return { ok: true, text, debug: isDebugEnabled(env) ? { gemini: getGeminiDebugSnapshot() } : undefined };
}

async function generateCharacterJournalText(
	env: Env,
	params: {
		campaignName: string;
		characterName: string;
		characterConcept: string;
		rawTranscript: string;
	},
): Promise<string> {
	const transcript = params.rawTranscript.trim();
	if (!transcript) return '';

	// If no AI key is available (local dev, misconfig, etc.), fall back to a simple
	// first-person summary so the feature still works.
	const apiKey = typeof env.GEMINI_API_KEY === 'string' ? env.GEMINI_API_KEY.trim() : '';
	if (!apiKey) {
		const seed = basicPolishJournal(transcript);
		return `I keep turning this over in my mind. ${seed}`;
	}

	const resolved = await resolveGeminiModelName(apiKey);
	const url =
		`https://generativelanguage.googleapis.com/${encodeURIComponent(GEMINI_API_VERSION)}/${resolved.modelName}:generateContent` +
		`?key=${encodeURIComponent(apiKey)}`;

	const systemPrompt = [
		'You are a D&D character writing a private journal entry.',
		'Write in first person (I/me/my). Stay in character and keep it immersive.',
		'Never mention being an AI/model/system.',
		'Keep it to 2–5 short paragraphs. No headings, no bullet points.',
		'Focus on emotions, sensory details, and what the character decided to do.',
		'It must feel like the character personally experienced these events.',
	].join('\n');

	const userPrompt = [
		`Campaign: ${params.campaignName}`,
		`Character: ${params.characterName}`,
		params.characterConcept ? `Character concept: ${params.characterConcept}` : '',
		'',
		'Here is the session transcript. Turn it into a private journal entry from this character\'s perspective:',
		transcript,
	].filter(Boolean).join('\n');

	const body = JSON.stringify({
		systemInstruction: {
			parts: [{ text: systemPrompt }],
		},
		contents: [
			{
				role: 'user',
				parts: [{ text: userPrompt }],
			},
		],
		generationConfig: {
			temperature: 0.7,
			maxOutputTokens: 500,
			// Journals shouldn't spend tokens "thinking".
			thinkingConfig: { thinkingBudget: 0 },
		},
	});

	const res = await fetch(url, {
		method: 'POST',
		headers: { 'content-type': 'application/json; charset=utf-8' },
		body,
	});

	if (!res.ok) {
		let detail = '';
		try {
			detail = (await res.text()).slice(0, 300);
		} catch {
			// ignore
		}
		throw new Error(`Gemini journal request failed with status ${res.status}${detail ? `: ${detail}` : ''}`);
	}

	let data: any;
	try {
		data = await res.json();
	} catch {
		throw new Error('Failed to parse Gemini journal response JSON');
	}

	const parts: string[] =
		data?.candidates?.[0]?.content?.parts?.map((p: any) => (p && typeof p.text === 'string' ? p.text : '')) || [];
	const text = parts.join('').trim();
	return text || '';
}

function buildEncounterScriptBody(prompt: string, campaign: Campaign | null): string {
	const safePrompt = prompt.trim();
	const campaignName = campaign?.name ?? 'your campaign';
	const intro = `Encounter Script for ${campaignName}`;
	const separator = '\n\n';
	const scene = `Scene setup: ${safePrompt}`;
	const beats = [
		'- Describe the environment with 1–2 vivid sensory details (sound, smell, or lighting).',
		'- Introduce a complication tied to the party\'s recent actions or reputation.',
		'- Present 2–3 choices the party can take, each with different stakes.',
		'- Foreshadow a future threat, secret, or NPC agenda.',
	].join('\n');
	return `${intro}${separator}${scene}${separator}${beats}`;
}

async function handlePostCampaignDetails(request: Request, env: Env, origin: string | null): Promise<Response> {
	let body: any;
	try {
		body = await request.json();
	} catch {
		return errorResponse('Invalid JSON body', 400, origin);
	}

	const action = String(body?.action ?? '').trim();
	const campaignId = String(body?.campaignId ?? body?.id ?? '').trim();
	if (!action || !campaignId) {
		return errorResponse('action and campaignId are required', 400, origin);
	}

	const storedCampaign = await env.ADA_DATA.get(`campaign:${campaignId}`);
	if (!storedCampaign) {
		return errorResponse('Campaign not found', 404, origin);
	}

	let campaign: Campaign;
	try {
		campaign = JSON.parse(storedCampaign) as Campaign;
	} catch {
		return errorResponse('Corrupted campaign record', 500, origin);
	}

	if (action === 'linkCharacter') {
		const characterId = String(body?.characterId ?? '').trim();
		if (!characterId) {
			return errorResponse('characterId is required for linkCharacter', 400, origin);
		}

		const username = String(body?.user ?? body?.username ?? '').trim();
		if (!username) {
			return errorResponse('username is required for linkCharacter', 400, origin);
		}

		const isParticipant =
			campaign.dm === username ||
			(Array.isArray(campaign.participants) && campaign.participants.includes(username));
		if (!isParticipant) {
			return errorResponse('You are not a participant in this campaign', 403, origin);
		}

		const storedCharacter = await env.ADA_DATA.get(`character:${characterId}`);
		if (!storedCharacter) {
			return errorResponse('Character not found', 404, origin);
		}

		let character: Character;
		try {
			character = JSON.parse(storedCharacter) as Character;
		} catch {
			return errorResponse('Corrupted character record', 500, origin);
		}

		const owner = character.owner;
		const isDm = campaign.dm === username;
		const isOwner = owner === username;
		if (!isDm && !isOwner) {
			return errorResponse("Only the DM or the character's owner can link this character", 403, origin);
		}

		// Hard rule: a character can be linked to NO MORE than 1 campaign at a time.
		// Linking will automatically move the character out of any previously linked campaign(s).
		const previousCampaignIds = Array.isArray(character.campaignIds)
			? character.campaignIds.map((cid) => String(cid || '').trim()).filter((cid) => cid && cid !== campaignId)
			: [];
		for (const prevId of previousCampaignIds) {
			const storedPrev = await env.ADA_DATA.get(`campaign:${prevId}`);
			if (!storedPrev) continue;
			try {
				const prevCampaign = JSON.parse(storedPrev) as Campaign;
				if (Array.isArray(prevCampaign.linkedCharacterIds) && prevCampaign.linkedCharacterIds.includes(characterId)) {
					prevCampaign.linkedCharacterIds = prevCampaign.linkedCharacterIds.filter((id) => id !== characterId);
					await env.ADA_DATA.put(`campaign:${prevId}`, JSON.stringify(prevCampaign));
				}
			} catch {
				// ignore malformed campaigns
			}
		}

		// Enforce: one character per player per campaign
		const indexKey = `charactersByUser:${owner}`;
		const existing = await env.ADA_DATA.get(indexKey);
		let ids: string[] = [];
		if (existing) {
			try {
				ids = JSON.parse(existing) as string[];
				if (!Array.isArray(ids)) ids = [];
			} catch {
				ids = [];
			}
		}

		for (const id of ids) {
			if (id === characterId) continue; // ignore the character we are linking now
			const storedOther = await env.ADA_DATA.get(`character:${id}`);
			if (!storedOther) continue;
			try {
				const other = JSON.parse(storedOther) as Character;
				if (
					Array.isArray(other.campaignIds) &&
					other.campaignIds.includes(campaignId)
				) {
					return errorResponse(
						'That player already has a different character linked to this campaign',
						400,
						origin,
					);
				}
			} catch {
				// ignore malformed
			}
		}

		if (!Array.isArray(campaign.linkedCharacterIds)) campaign.linkedCharacterIds = [];
		if (!campaign.linkedCharacterIds.includes(characterId)) {
			campaign.linkedCharacterIds.push(characterId);
		}

		// Single-campaign linkage.
		character.campaignIds = [campaignId];

		await env.ADA_DATA.put(`campaign:${campaignId}`, JSON.stringify(campaign));
		await env.ADA_DATA.put(`character:${characterId}`, JSON.stringify(character));

		// No need to send characters list right now; front-end can refresh later if needed.
		return jsonResponse({ ok: true, campaign, relinkedFrom: previousCampaignIds }, { status: 200 }, origin);
	}

	if (action === 'addJournal') {
		const author = String(body?.author ?? '').trim();
		const rawTranscript = String(body?.rawTranscript ?? '').trim();
		let polishedText = String(body?.polishedText ?? '').trim();
		if (!author || !rawTranscript) {
			return errorResponse('author and rawTranscript are required for addJournal', 400, origin);
		}
		if (!polishedText) {
			polishedText = basicPolishJournal(rawTranscript);
		}

		const id = crypto.randomUUID();
		const createdAt = new Date().toISOString();
		const entry: JournalEntry = {
			id,
			campaignId,
			author,
			createdAt,
			rawTranscript,
			polishedText,
		};

		await env.ADA_DATA.put(`journal:${id}`, JSON.stringify(entry));
		if (!Array.isArray(campaign.journalEntryIds)) campaign.journalEntryIds = [];
		if (!campaign.journalEntryIds.includes(id)) campaign.journalEntryIds.push(id);
		await env.ADA_DATA.put(`campaign:${campaignId}`, JSON.stringify(campaign));

		return jsonResponse({ ok: true, campaign, journal: entry }, { status: 201 }, origin);
	}

	if (action === 'createPartyJournals') {
		const username = String(body?.username ?? body?.user ?? '').trim();
		if (!username) {
			return errorResponse('username is required for createPartyJournals', 400, origin);
		}

		const isParticipant =
			campaign.dm === username ||
			(Array.isArray(campaign.participants) && campaign.participants.includes(username));
		if (!isParticipant) {
			return errorResponse('You are not a participant in this campaign', 403, origin);
		}

		const rawTranscript = typeof campaign.conversationTranscript === 'string'
			? campaign.conversationTranscript.trim()
			: '';
		if (!rawTranscript) {
			return errorResponse('No campaign transcript found. Record dialogue first, then create journals.', 400, origin);
		}

		const linkedIds = Array.isArray(campaign.linkedCharacterIds) ? campaign.linkedCharacterIds : [];
		if (!linkedIds.length) {
			return errorResponse('No characters are linked to this campaign yet.', 400, origin);
		}

		const created: JournalEntry[] = [];
		for (const characterId of linkedIds) {
			const storedCharacter = await env.ADA_DATA.get(`character:${characterId}`);
			if (!storedCharacter) continue;
			let character: Character | null = null;
			try {
				character = JSON.parse(storedCharacter) as Character;
			} catch {
				character = null;
			}
			if (!character) continue;

			const characterName = character.name && String(character.name).trim()
				? String(character.name).trim()
				: 'Unknown adventurer';
			const characterConcept = [
				character.concept?.race ? `Race: ${character.concept.race}` : '',
				character.concept?.classSummary ? `Class: ${character.concept.classSummary}` : '',
				character.concept?.background ? `Background: ${character.concept.background}` : '',
			].filter(Boolean).join(' | ');

			let polishedText = '';
			try {
				polishedText = await generateCharacterJournalText(env, {
					campaignName: campaign.name || 'Campaign',
					characterName,
					characterConcept,
					rawTranscript,
				});
			} catch (err) {
				console.error('createPartyJournals: AI journal generation failed', err);
				polishedText = `I can still hear the echoes of it all. ${basicPolishJournal(rawTranscript)}`;
			}

			// Ensure a non-empty entry.
			if (!polishedText || !polishedText.trim()) {
				polishedText = `I can still hear the echoes of it all. ${basicPolishJournal(rawTranscript)}`;
			}

			const id = crypto.randomUUID();
			const createdAt = new Date().toISOString();
			const entry: JournalEntry = {
				id,
				campaignId,
				author: characterName,
				createdAt,
				rawTranscript,
				polishedText,
			};

			await env.ADA_DATA.put(`journal:${id}`, JSON.stringify(entry));
			if (!Array.isArray(campaign.journalEntryIds)) campaign.journalEntryIds = [];
			if (!campaign.journalEntryIds.includes(id)) campaign.journalEntryIds.push(id);
			created.push(entry);
		}

		await env.ADA_DATA.put(`campaign:${campaignId}`, JSON.stringify(campaign));

		// Return all journals for convenience
		const journals: JournalEntry[] = [];
		const journalIds = Array.isArray(campaign.journalEntryIds) ? campaign.journalEntryIds : [];
		for (const journalId of journalIds) {
			const stored = await env.ADA_DATA.get(`journal:${journalId}`);
			if (!stored) continue;
			try {
				const parsed = JSON.parse(stored) as JournalEntry;
				if (parsed && parsed.id) journals.push(parsed);
			} catch {
				// ignore
			}
		}

		return jsonResponse(
			{ ok: true, campaign, createdCount: created.length, created, journals },
			{ status: 201 },
			origin,
		);
	}

	if (action === 'addScript') {
		const author = String(body?.author ?? '').trim();
		const prompt = String(body?.prompt ?? '').trim();
		let title = String(body?.title ?? '').trim();
		if (!author || !prompt) {
			return errorResponse('author and prompt are required for addScript', 400, origin);
		}
		// GM Tools are DM-only and not available for AI-DM campaigns.
		if (campaign.dmIsAI || campaign.mode === 'ai-solo') {
			return errorResponse('GM Tools are not available for AI-DM campaigns', 403, origin);
		}
		if (campaign.dm !== author) {
			return errorResponse('Only the DM can use GM Tools', 403, origin);
		}
		if (!title) {
			title = 'Generated Encounter Script';
		}

		const bodyText = buildEncounterScriptBody(prompt, campaign);
		const id = crypto.randomUUID();
		const createdAt = new Date().toISOString();
		const script: ScriptNote = {
			id,
			campaignId,
			author,
			createdAt,
			title,
			body: bodyText,
		};

		await env.ADA_DATA.put(`script:${id}`, JSON.stringify(script));
		if (!Array.isArray(campaign.scriptIds)) campaign.scriptIds = [];
		if (!campaign.scriptIds.includes(id)) campaign.scriptIds.push(id);
		await env.ADA_DATA.put(`campaign:${campaignId}`, JSON.stringify(campaign));

		// Return all scripts for convenience
		const scripts: ScriptNote[] = [];
		for (const scriptId of campaign.scriptIds) {
			const storedScript = await env.ADA_DATA.get(`script:${scriptId}`);
			if (!storedScript) continue;
			try {
				const parsed = JSON.parse(storedScript) as ScriptNote;
				if (parsed && parsed.id) scripts.push(parsed);
			} catch {
				// ignore
			}
		}

		return jsonResponse({ ok: true, campaign, script, scripts }, { status: 201 }, origin);
	}

	if (action === 'saveScript') {
		const author = String(body?.author ?? '').trim();
		let title = String(body?.title ?? '').trim();
		const scriptBody = String(body?.body ?? '').trim();
		if (!author || !scriptBody) {
			return errorResponse('author and body are required for saveScript', 400, origin);
		}
		// GM Tools are DM-only and not available for AI-DM campaigns.
		if (campaign.dmIsAI || campaign.mode === 'ai-solo') {
			return errorResponse('GM Tools are not available for AI-DM campaigns', 403, origin);
		}
		if (campaign.dm !== author) {
			return errorResponse('Only the DM can use GM Tools', 403, origin);
		}
		if (!title) title = 'Session Log Note';

		const id = crypto.randomUUID();
		const createdAt = new Date().toISOString();
		const script: ScriptNote = {
			id,
			campaignId,
			author,
			createdAt,
			title,
			body: scriptBody,
		};

		await env.ADA_DATA.put(`script:${id}`, JSON.stringify(script));
		if (!Array.isArray(campaign.scriptIds)) campaign.scriptIds = [];
		if (!campaign.scriptIds.includes(id)) campaign.scriptIds.push(id);
		await env.ADA_DATA.put(`campaign:${campaignId}`, JSON.stringify(campaign));

		const scripts: ScriptNote[] = [];
		for (const scriptId of campaign.scriptIds) {
			const storedScript = await env.ADA_DATA.get(`script:${scriptId}`);
			if (!storedScript) continue;
			try {
				const parsed = JSON.parse(storedScript) as ScriptNote;
				if (parsed && parsed.id) scripts.push(parsed);
			} catch {
				// ignore
			}
		}

		return jsonResponse({ ok: true, campaign, script, scripts }, { status: 201 }, origin);
	}

	if (action === 'logTranscript') {
		const username = String(body?.username ?? '').trim();
		const snippet = String(body?.snippet ?? '').trim();
		const fullTextRaw = String(body?.fullText ?? '').trim();
		const fullText = fullTextRaw || snippet;
		if (!username || (!snippet && !fullText)) {
			return errorResponse('username and transcript text are required for logTranscript', 400, origin);
		}

		const id = crypto.randomUUID();
		const createdAt = new Date().toISOString();
		const log: DialogueLog = {
			id,
			campaignId,
			author: username,
			createdAt,
			snippet,
			fullText,
		};

		await env.ADA_DATA.put(`dialogue:${id}`, JSON.stringify(log));

		const indexKey = `dialogueByCampaign:${campaignId}`;
		const existing = await env.ADA_DATA.get(indexKey);
		let ids: string[] = [];
		if (existing) {
			try {
				ids = JSON.parse(existing) as string[];
				if (!Array.isArray(ids)) ids = [];
			} catch {
				ids = [];
			}
		}
		ids.push(id);
		await env.ADA_DATA.put(indexKey, JSON.stringify(ids));

		return jsonResponse({ ok: true }, { status: 201 }, origin);
	}

	if (action === 'updateTranscript') {
		const username = String(body?.username ?? '').trim();
		const transcriptRaw = body?.transcript;
		const transcript = typeof transcriptRaw === 'string' ? transcriptRaw : '';
		if (!username) {
			return errorResponse('username is required for updateTranscript', 400, origin);
		}

		const isParticipant =
			campaign.dm === username ||
			(Array.isArray(campaign.participants) && campaign.participants.includes(username));
		if (!isParticipant) {
			return errorResponse('You are not a participant in this campaign', 403, origin);
		}

		campaign.conversationTranscript = transcript;
		await env.ADA_DATA.put(`campaign:${campaignId}`, JSON.stringify(campaign));
		return jsonResponse({ ok: true }, { status: 200 }, origin);
	}

	if (action === 'completeCampaign') {
		const username = String(body?.username ?? '').trim();
		if (!username) {
			return errorResponse('username is required for completeCampaign', 400, origin);
		}
		// Only the DM can mark a (non-AI) campaign as completed.
		if (campaign.dm !== username) {
			return errorResponse('Only the DM can complete this campaign', 403, origin);
		}
		if (campaign.dmIsAI || campaign.mode === 'ai-solo') {
			return errorResponse('AI-driven solo campaigns complete automatically', 400, origin);
		}

		if (campaign.status === 'completed') {
			return errorResponse('Campaign is already completed', 400, origin);
		}

		const linkedIds = Array.isArray(campaign.linkedCharacterIds) ? campaign.linkedCharacterIds : [];
		if (!linkedIds.length) {
			return errorResponse('No linked characters to award XP to', 400, origin);
		}

		const xpAmount = await xpAwardForCampaign(env, campaign);
		const awardedTo: string[] = [];
		for (const charId of linkedIds) {
			try {
				const updated = await awardXpToCharacter(env, charId, xpAmount);
				if (updated) awardedTo.push(charId);
			} catch (err) {
				console.error('Failed to award XP during completeCampaign', err);
			}
		}

		campaign.status = 'completed';
		campaign.completedAt = new Date().toISOString();
		campaign.xpAwardedToCharacterIds = awardedTo;
		await env.ADA_DATA.put(`campaign:${campaignId}`, JSON.stringify(campaign));

		return jsonResponse(
			{ ok: true, campaign, xpAwarded: xpAmount, awardedTo },
			{ status: 200 },
			origin,
		);
	}

	if (action === 'deleteCampaign') {
		const username = String(body?.username ?? '').trim();
		if (!username) {
			return errorResponse('username is required for deleteCampaign', 400, origin);
		}

		const isParticipant =
			campaign.dm === username ||
			(Array.isArray(campaign.participants) && campaign.participants.includes(username));
		if (!isParticipant) {
			return errorResponse('You are not a participant in this campaign', 403, origin);
		}

		// Only allow deleting AI-driven solo campaigns from the client.
		if (!campaign.dmIsAI && campaign.mode !== 'ai-solo') {
			return errorResponse('Only AI-driven solo campaigns can be deleted from here', 400, origin);
		}

		// Remove campaign record
		await env.ADA_DATA.delete(`campaign:${campaignId}`);
		// Remove AI session, if any
		await env.ADA_DATA.delete(`aiSession:${campaignId}`);

		// Remove this campaign from participants' campaign indexes
		const participants = Array.isArray(campaign.participants) ? campaign.participants : [];
		for (const user of participants) {
			const idxKey = `campaignsByUser:${user}`;
			const existingIdx = await env.ADA_DATA.get(idxKey);
			if (!existingIdx) continue;
			try {
				let ids = JSON.parse(existingIdx) as string[];
				if (Array.isArray(ids)) {
					ids = ids.filter((id) => id !== campaignId);
					await env.ADA_DATA.put(idxKey, JSON.stringify(ids));
				}
			} catch {
				// ignore index cleanup issues
			}
		}

		// Unlink from any characters explicitly tied to this campaign
		const linkedCharIds = Array.isArray(campaign.linkedCharacterIds)
			? campaign.linkedCharacterIds
			: [];
		for (const charId of linkedCharIds) {
			const storedChar = await env.ADA_DATA.get(`character:${charId}`);
			if (!storedChar) continue;
			try {
				const ch = JSON.parse(storedChar) as Character;
				if (Array.isArray(ch.campaignIds)) {
					ch.campaignIds = ch.campaignIds.filter((cid) => cid !== campaignId);
					await env.ADA_DATA.put(`character:${charId}`, JSON.stringify(ch));
				}
			} catch {
				// ignore malformed characters
			}
		}

		return jsonResponse({ ok: true }, { status: 200 }, origin);
	}

	if (action === 'leaveCampaign') {
		const username = String(body?.username ?? '').trim();
		if (!username) {
			return errorResponse('username is required for leaveCampaign', 400, origin);
		}

		const isParticipant =
			campaign.dm === username ||
			(Array.isArray(campaign.participants) && campaign.participants.includes(username));
		if (!isParticipant) {
			return errorResponse('You are not a participant in this campaign', 403, origin);
		}

		// Only non-DM players can leave, and not from AI-solo campaigns.
		if (campaign.dm === username) {
			return errorResponse('The DM cannot leave the campaign using this action', 400, origin);
		}
		if (campaign.dmIsAI || campaign.mode === 'ai-solo') {
			return errorResponse('Use deleteCampaign for AI-driven solo campaigns', 400, origin);
		}

		// Remove participant from campaign
		if (Array.isArray(campaign.participants)) {
			campaign.participants = campaign.participants.filter((p) => p !== username);
		}

		// Remove this campaign from the user's campaignsByUser index
		const idxKey = `campaignsByUser:${username}`;
		const existingIdx = await env.ADA_DATA.get(idxKey);
		if (existingIdx) {
			try {
				let ids = JSON.parse(existingIdx) as string[];
				if (Array.isArray(ids)) {
					ids = ids.filter((id) => id !== campaignId);
					await env.ADA_DATA.put(idxKey, JSON.stringify(ids));
				}
			} catch {
				// ignore index cleanup
			}
		}

		// Unlink any of this user's characters from the campaign
		const charIndexKey = `charactersByUser:${username}`;
		const charsIndex = await env.ADA_DATA.get(charIndexKey);
		if (charsIndex) {
			try {
				const charIds = JSON.parse(charsIndex) as string[];
				if (Array.isArray(charIds)) {
					for (const charId of charIds) {
						const storedChar = await env.ADA_DATA.get(`character:${charId}`);
						if (!storedChar) continue;
						try {
							const ch = JSON.parse(storedChar) as Character;
							let changed = false;
							if (Array.isArray(ch.campaignIds) && ch.campaignIds.includes(campaignId)) {
								ch.campaignIds = ch.campaignIds.filter((cid) => cid !== campaignId);
								changed = true;
							}
							if (Array.isArray(campaign.linkedCharacterIds) && campaign.linkedCharacterIds.includes(charId)) {
								campaign.linkedCharacterIds = campaign.linkedCharacterIds.filter((id) => id !== charId);
								changed = true;
							}
							if (changed) {
								await env.ADA_DATA.put(`character:${charId}`, JSON.stringify(ch));
							}
						} catch {
							// ignore malformed character
						}
					}
				}
			} catch {
				// ignore character index issues
			}
		}

		await env.ADA_DATA.put(`campaign:${campaignId}`, JSON.stringify(campaign));
		return jsonResponse({ ok: true, campaign }, { status: 200 }, origin);
	}

	return errorResponse('Unknown action for campaign details', 400, origin);
}

function tryParseJsonLoose(text: string): any | null {
	const raw = String(text || '').trim();
	if (!raw) return null;
	try {
		return JSON.parse(raw);
	} catch {
		// Try to salvage the first JSON object block.
		const m = raw.match(/\{[\s\S]*\}/);
		if (!m) return null;
		try {
			return JSON.parse(m[0]);
		} catch {
			return null;
		}
	}
}

function truncateForPrompt(text: string, maxChars: number): string {
	const s = String(text || '').trim();
	if (!s) return '';
	if (s.length <= maxChars) return s;
	return `${s.slice(0, maxChars)}\n[...trimmed...]`;
}

function parseArchitectIntent(seed: string): {
	intentMode: 'balanced' | 'kill';
	overrideDifficulty: EncounterOption['difficulty'] | null;
	reason: string;
} {
	const s = String(seed || '').toLowerCase();
	const has = (re: RegExp) => re.test(s);

	// Kill Mode triggers (lethal intent language)
	if (has(/\b(tpk|total party kill|wipe( them)?|kill( mode)?|slaughter|massacre|no mercy|lethal)\b/i)) {
		return { intentMode: 'kill', overrideDifficulty: 'Deadly', reason: 'Detected lethal intent (Kill Mode).' };
	}

	// Explicit difficulty overrides
	if (has(/\b(deadly)\b/i)) return { intentMode: 'kill', overrideDifficulty: 'Deadly', reason: 'Explicit deadly difficulty.' };
	if (has(/\b(hard)\b/i)) return { intentMode: 'balanced', overrideDifficulty: 'Hard', reason: 'Explicit hard difficulty.' };
	if (has(/\b(medium|moderate|standard|balanced)\b/i)) {
		return { intentMode: 'balanced', overrideDifficulty: 'Medium', reason: 'Explicit medium/balanced difficulty.' };
	}
	if (has(/\b(easy|trivial|nuisance|cakewalk)\b/i)) {
		return { intentMode: 'balanced', overrideDifficulty: 'Easy', reason: 'Explicit easy/trivial intent.' };
	}

	return { intentMode: 'balanced', overrideDifficulty: null, reason: 'No explicit override; using Easy/Medium/Hard tiers.' };
}

function clampCount(n: unknown, fallback: number): number {
	const x = Number(n);
	if (!Number.isFinite(x)) return fallback;
	return Math.max(1, Math.min(99, Math.floor(x)));
}

function normalizeEncounterDifficulty(d: unknown): EncounterOption['difficulty'] {
	const v = String(d || '').trim().toLowerCase();
	if (v === 'easy') return 'Easy';
	if (v === 'medium') return 'Medium';
	if (v === 'hard') return 'Hard';
	if (v === 'deadly') return 'Deadly';
	// Default
	return 'Medium';
}

function normalizeEncounterType(t: unknown): EncounterOption['type'] {
	const v = String(t || '').trim().toLowerCase();
	if (v === 'combat') return 'combat';
	if (v === 'social') return 'social';
	if (v === 'exploration') return 'exploration';
	if (v === 'mixed') return 'mixed';
	return 'mixed';
}

function normalizeEncounterOptions(raw: any, intent: ReturnType<typeof parseArchitectIntent>): EncounterOption[] | null {
	const options = Array.isArray(raw?.options) ? raw.options : null;
	if (!options) return null;

	const ids: Array<'A' | 'B' | 'C'> = ['A', 'B', 'C'];
	const defaultTiers: EncounterOption['difficulty'][] = ['Easy', 'Medium', 'Hard'];

	const normalized: EncounterOption[] = [];
	for (let i = 0; i < Math.min(3, options.length); i++) {
		const o = options[i] || {};
		const id = (String(o.id || ids[i]).toUpperCase() as 'A' | 'B' | 'C');
		const forcedDifficulty = intent.overrideDifficulty ? intent.overrideDifficulty : defaultTiers[i];

		const monstersRaw = Array.isArray(o.monsters) ? o.monsters : Array.isArray(o.opposition) ? o.opposition : [];
		const monsters: EncounterMonster[] = monstersRaw
			.map((m: any) => {
				const name = m?.name ? String(m.name) : 'Unknown creature';
				const count = clampCount(m?.count, 1);
				const sb = m?.statBlock || m?.stat || {};
				const ability = sb?.abilityScores || sb?.abilities || {};
				const statBlock: EncounterStatBlock = {
					name: sb?.name ? String(sb.name) : name,
					size: sb?.size ? String(sb.size) : undefined,
					type: sb?.type ? String(sb.type) : undefined,
					alignment: sb?.alignment ? String(sb.alignment) : undefined,
					ac: Number.isFinite(Number(sb?.ac)) ? Math.max(5, Math.min(30, Math.floor(Number(sb.ac)))) : 12,
					hp: {
						max: Number.isFinite(Number(sb?.hp?.max ?? sb?.hp))
							? Math.max(1, Math.floor(Number(sb.hp?.max ?? sb.hp)))
							: 11,
					},
					speed: sb?.speed ? String(sb.speed) : undefined,
					abilityScores: {
						str: Number.isFinite(Number(ability?.str)) ? Math.floor(Number(ability.str)) : 10,
						dex: Number.isFinite(Number(ability?.dex)) ? Math.floor(Number(ability.dex)) : 10,
						con: Number.isFinite(Number(ability?.con)) ? Math.floor(Number(ability.con)) : 10,
						int: Number.isFinite(Number(ability?.int)) ? Math.floor(Number(ability.int)) : 10,
						wis: Number.isFinite(Number(ability?.wis)) ? Math.floor(Number(ability.wis)) : 10,
						cha: Number.isFinite(Number(ability?.cha)) ? Math.floor(Number(ability.cha)) : 10,
					},
					saves: sb?.saves ? String(sb.saves) : undefined,
					skills: sb?.skills ? String(sb.skills) : undefined,
					senses: sb?.senses ? String(sb.senses) : undefined,
					languages: sb?.languages ? String(sb.languages) : undefined,
					challenge: sb?.challenge ? String(sb.challenge) : undefined,
					traits: Array.isArray(sb?.traits)
						? sb.traits
							.map((t: any) => ({ name: String(t?.name || 'Trait'), text: String(t?.text || '') }))
							.filter((t: any) => t.text)
						: [],
					actions: Array.isArray(sb?.actions)
						? sb.actions
							.map((a: any) => ({ name: String(a?.name || 'Action'), text: String(a?.text || '') }))
							.filter((a: any) => a.text)
						: [],
				};
				return {
					name,
					count,
					role: m?.role ? String(m.role) : undefined,
					statBlock,
				};
			})
			.filter((m: EncounterMonster) => m.name);

		const threat = o.threatScale || {};
		const threatScale: EncounterThreatScale = {
			dialUp: Array.isArray(threat.dialUp) ? threat.dialUp.map((x: any) => String(x)).filter(Boolean) : [],
			dialDown: Array.isArray(threat.dialDown) ? threat.dialDown.map((x: any) => String(x)).filter(Boolean) : [],
		};

		normalized.push({
			id,
			difficulty: forcedDifficulty,
			intentMode: intent.intentMode,
			title: o.title ? String(o.title) : `Encounter Option ${id}`,
			type: normalizeEncounterType(o.type),
			hook: o.hook ? String(o.hook) : '',
			setup: o.setup ? String(o.setup) : '',
			oppositionSummary: o.oppositionSummary ? String(o.oppositionSummary) : undefined,
			monsters,
			threatScale,
			twist: o.twist ? String(o.twist) : '',
			tactics: o.tactics ? String(o.tactics) : '',
			scaling: {
				easier: o.scaling?.easier ? String(o.scaling.easier) : 'Reduce monster count by 1/3 and remove one hazard.',
				harder: o.scaling?.harder ? String(o.scaling.harder) : 'Increase monster count by 1/3 and add a hazard.',
			},
			rewards: o.rewards ? String(o.rewards) : '',
		});
	}

	if (normalized.length !== 3) return null;
	// Ensure A/B/C ordering.
	normalized.sort((a, b) => a.id.localeCompare(b.id));

	// Ensure each title is distinct (the UI uses the title as the primary label).
	const seen = new Map<string, number>();
	for (const opt of normalized) {
		const k = String(opt.title || '').trim().toLowerCase();
		if (!k) continue;
		seen.set(k, (seen.get(k) || 0) + 1);
	}
	const dupKeys = new Set<string>([...seen.entries()].filter(([, n]) => n > 1).map(([k]) => k));
	if (dupKeys.size) {
		const used = new Set<string>();
		for (const opt of normalized) {
			let t = String(opt.title || '').trim();
			if (!t) t = `Encounter ${opt.id}`;
			const key = t.toLowerCase();
			if (dupKeys.has(key) || used.has(key)) {
				const suffix = `${opt.id}${opt.difficulty ? ` · ${opt.difficulty}` : ''}${opt.intentMode ? ` · ${opt.intentMode}` : ''}`;
				t = `${t} — ${suffix}`;
			}
			opt.title = t;
			used.add(String(opt.title).trim().toLowerCase());
		}
	}
	return normalized;
}

async function handleGmTool(request: Request, env: Env, origin: string | null): Promise<Response> {
	let body: any;
	try {
		body = await request.json();
	} catch {
		return errorResponse('Invalid JSON body', 400, origin);
	}

	const username = String(body?.username ?? body?.user ?? '').trim();
	const campaignId = String(body?.campaignId ?? '').trim();
	const toolTypeRaw = String(body?.toolType ?? '').trim().toLowerCase();
	const context = body?.context && typeof body.context === 'object' ? body.context : {};
	const seed = String(context?.seed ?? body?.seed ?? '').trim();

	if (!username || !campaignId) {
		return errorResponse('username and campaignId are required', 400, origin);
	}
	if (toolTypeRaw !== 'encounter' && toolTypeRaw !== 'flavor') {
		return errorResponse("toolType must be 'encounter' or 'flavor'", 400, origin);
	}

	const storedCampaign = await env.ADA_DATA.get(`campaign:${campaignId}`);
	if (!storedCampaign) {
		return errorResponse('Campaign not found', 404, origin);
	}
	let campaign: Campaign;
	try {
		campaign = JSON.parse(storedCampaign) as Campaign;
	} catch {
		return errorResponse('Corrupted campaign record', 500, origin);
	}

	const isParticipant =
		campaign.dm === username ||
		(Array.isArray(campaign.participants) && campaign.participants.includes(username));
	if (!isParticipant) {
		return errorResponse('You are not a participant in this campaign', 403, origin);
	}

	const characters = await loadCampaignPartyCharacters(env, campaign);
	const partyStatus = computePartyStatus(characters);

	const campaignName = campaign.name && String(campaign.name).trim() ? String(campaign.name).trim() : 'this campaign';
	const transcriptSnippet = truncateForPrompt(String(campaign.conversationTranscript || ''), 1400);
	const partyLines = partyStatus.members
		.map(
			(m) =>
				`- ${m.name} (${m.classSummary}) L${m.level}: HP ${m.hp.current}/${m.hp.max}, Slots ${m.manaSlots.current}/${m.manaSlots.max}`,
		)
		.join('\n');

	if (toolTypeRaw === 'encounter') {
		const intent = parseArchitectIntent(seed);
		const overrideLabel = intent.overrideDifficulty ? intent.overrideDifficulty : null;

		const systemPrompt = [
			'You are “The Unfiltered Architect”: a high-powered D&D 5e tactical encounter engine.',
			'You provide raw, table-ready tools. Default to a balanced advisor, but pivot to KILL MODE when the DM intent is lethal.',
			'',
			'ABSOLUTE RULES:',
			'- Output MUST be STRICT JSON only. No markdown. No code fences. No extra commentary.',
			'- You MUST invent ORIGINAL (homebrew) monsters and stat blocks. Do NOT copy official D&D monster text.',
			'- Provide THREE options with ids A, B, C.',
			'- If overrideDifficulty is provided, ALL THREE options MUST use that difficulty tier.',
			'- If overrideDifficulty is NOT provided, the tiers MUST be: A=Easy, B=Medium, C=Hard.',
			'- Each option MUST have a unique, evocative title. Do not reuse titles across options. Do not name them "Option A" etc.',
			'- Each option MUST include:',
			'  - distinct enemy set (monsters + counts),',
			'  - threatScale with dialUp and dialDown factors (hazards/behaviors to change lethality live),',
			'  - full statBlock for every monster type (AC, HP, abilities, traits, actions).',
			'',
			'Required schema:',
			'{"options":[',
			' {"id":"A","difficulty":"Easy|Medium|Hard|Deadly","intentMode":"balanced|kill","type":"combat|social|exploration|mixed",',
			'  "title":"...","hook":"...","setup":"...","oppositionSummary":"...",',
			'  "monsters":[{"name":"...","count":2,"role":"brute|skirmisher|controller|support|boss","statBlock":{',
			'    "name":"...","size":"...","type":"...","alignment":"...",',
			'    "ac":13,"hp":{"max":22},"speed":"30 ft",',
			'    "abilityScores":{"str":12,"dex":14,"con":12,"int":10,"wis":10,"cha":8},',
			'    "saves":"...","skills":"...","senses":"...","languages":"...","challenge":"...",',
			'    "traits":[{"name":"...","text":"..."}],',
			'    "actions":[{"name":"...","text":"..."}]',
			'  }}],',
			'  "threatScale":{"dialUp":["..."],"dialDown":["..."]},',
			'  "twist":"...","tactics":"...","scaling":{"easier":"...","harder":"..."},"rewards":"..."}',
			' ]}',
		].join('\n');

		const userPrompt = [
			`Campaign: ${campaignName}`,
			`Intent mode: ${intent.intentMode}`,
			`Override difficulty: ${overrideLabel ?? '(none)'}`,
			`Intent reason: ${intent.reason}`,
			seed ? `DM seed: ${seed}` : 'DM seed: (none provided)',
			'',
			'Party status (baseline for tuning):',
			partyLines || '(no linked party members)',
			'',
			transcriptSnippet ? 'Recent campaign transcript excerpt (context):\n' + transcriptSnippet : '',
			'',
			'Generate the three options now. Ensure each option is distinct in enemy set and play pattern.',
		].filter(Boolean).join('\n');

		const gem = await callGeminiText(env, {
			systemPrompt,
			userPrompt,
			temperature: intent.intentMode === 'kill' ? 0.7 : 0.6,
			maxOutputTokens: 1700,
		});

		let normalizedOptions: EncounterOption[] | null = null;
		let rawText = '';
		if (gem.ok) {
			rawText = gem.text;
			const parsed = tryParseJsonLoose(rawText);
			normalizedOptions = normalizeEncounterOptions(parsed, intent);
		}

		if (!normalizedOptions) {
			// Fallback: still produce structured, homebrew stat blocks.
			const forced = intent.overrideDifficulty;
			const tiers: EncounterOption['difficulty'][] = forced ? [forced, forced, forced] : ['Easy', 'Medium', 'Hard'];
			const base = seed || 'a sudden pressure point in the current scene';
			normalizedOptions = (['A', 'B', 'C'] as const).map((id, idx) => {
				const difficulty = tiers[idx];
				const mk = (name: string, count: number, ac: number, hp: number, str: number, dex: number, con: number, int: number, wis: number, cha: number): EncounterMonster => ({
					name,
					count,
					role: id === 'C' ? 'boss' : 'skirmisher',
					statBlock: {
						name,
						size: 'Medium',
						type: 'humanoid',
						alignment: 'any',
						ac,
						hp: { max: hp },
						speed: '30 ft',
						abilityScores: { str, dex, con, int, wis, cha },
						traits: [{ name: 'Tactical Footing', text: 'Has advantage on its next attack roll if it moved at least 10 feet this turn.' }],
						actions: [{ name: 'Blade', text: 'Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 6 (1d8 + 2) slashing damage.' }],
					},
				});
				const pack = idx === 0
					? [mk('Ash-Scarf Cutthroat', 2, 12, 11, 10, 14, 10, 10, 10, 10)]
					: idx === 1
						? [
							mk('Ash-Scarf Cutthroat', 3, 13, 14, 10, 15, 11, 10, 10, 10),
							mk('Cinder Hexer', 1, 12, 18, 8, 12, 12, 14, 11, 12),
						]
						: [
							mk('Ash-Scarf Cutthroat', 4, 13, 14, 10, 15, 11, 10, 10, 10),
							mk('Cinder Hexer', 2, 12, 18, 8, 12, 12, 14, 11, 12),
							mk('Wyrm-Brand Enforcer', 1, 15, 45, 16, 12, 14, 10, 12, 10),
						];
				return {
					id,
					difficulty,
					intentMode: intent.intentMode,
					title: `${difficulty} Pressure: ${base}`,
					type: 'combat',
					hook: `The party collides with ${base}.`,
					setup: 'Use cover, a clear objective, and at least one retreat/surrender vector unless in Kill Mode.',
					oppositionSummary: 'A disciplined cell tests the party\'s remaining resources.',
					monsters: pack,
					threatScale: {
						dialUp: ['Add a second wave on round 3', 'Hazard: choking smoke reduces vision', 'Enemies focus-fire the weakest target'],
						dialDown: ['Enemies break morale at 50% casualties', 'Remove the hazard', 'Give the party advantageous terrain'],
					},
					twist: 'A witness (or rival faction) arrives mid-fight and changes what “winning” means.',
					tactics: 'Probe defenses first, then commit to a decisive push once a weakness is spotted.',
					scaling: {
						easier: 'Reduce one monster group by 1 and remove the hazard.',
						harder: 'Add +1 elite and a lair-style hazard that triggers each round.',
					},
					rewards: 'A tangible clue, salvageable gear, and a forward-moving consequence.',
				};
			});
		}

		// Persist the generated bundle for recall.
		const now = new Date().toISOString();
		const bundleId = crypto.randomUUID();
		const bundle: EncounterBundle = {
			id: bundleId,
			campaignId,
			author: username,
			createdAt: now,
			seed,
			intentMode: intent.intentMode,
			overrideDifficulty: overrideLabel,
			partyStatus,
			options: normalizedOptions,
		};
		await env.ADA_DATA.put(`encounter:${bundleId}`, JSON.stringify(bundle));
		if (!Array.isArray(campaign.encounterIds)) campaign.encounterIds = [];
		campaign.encounterIds.push(bundleId);
		// Keep archive bounded.
		if (campaign.encounterIds.length > 50) {
			campaign.encounterIds = campaign.encounterIds.slice(-50);
		}
		await env.ADA_DATA.put(`campaign:${campaignId}`, JSON.stringify(campaign));

		return jsonResponse(
			{
				ok: true,
				toolType: 'encounter',
				partyStatus,
				result: { options: normalizedOptions },
				encounterBundle: bundle,
				...(isDebugEnabled(env)
					? {
						debug: {
							gemini: getGeminiDebugSnapshot(),
							intent,
							rawSnippet: rawText ? rawText.slice(0, 1200) : null,
						},
					}
					: {}),
			},
			{ status: 200 },
			origin,
		);
	}

	// toolTypeRaw === 'flavor'
	const systemPrompt = [
		'You are a seasoned fantasy novelist and D&D Dungeon Master.',
		'Write immersive boxed-text the DM can read aloud.',
		'Write exactly 2–3 short paragraphs. No headings. No bullet points.',
		'Use sensory detail, mood, and a subtle hook. Keep it consistent with the campaign context.',
		'Never mention being an AI/model/system.',
	].join('\n');

	const userPrompt = [
		`Campaign: ${campaignName}`,
		seed ? `Seed: ${seed}` : 'Seed: (none provided)',
		'',
		partyLines ? `Party (for tone and stakes):\n${partyLines}` : '',
		'',
		transcriptSnippet ? 'Recent campaign transcript excerpt (context):\n' + transcriptSnippet : '',
		'',
		'Write the boxed text now.',
	].filter(Boolean).join('\n');

	const gem = await callGeminiText(env, {
		systemPrompt,
		userPrompt,
		temperature: 0.85,
		maxOutputTokens: 520,
	});

	let flavorText = '';
	if (gem.ok) {
		flavorText = gem.text;
	}
	if (!flavorText || !flavorText.trim()) {
		const base = seed || 'the air changes, as if the world is listening';
		flavorText =
			`In ${campaignName}, ${base}. The light seems to hesitate at the edge of things, and every sound feels as though it arrives a heartbeat late. ` +
			`Somewhere nearby, something mundane becomes suddenly important—an old nail, a torn ribbon, a footprint pressed too deeply into soft earth.\n\n` +
			`Whatever comes next, it\'s close enough to taste in the back of your throat. The moment invites a choice: press forward, call out, or wait and listen—` +
			`and the world waits to see which story you decide to tell.`;
	}

	return jsonResponse(
		{
			ok: true,
			toolType: 'flavor',
			partyStatus,
			result: { text: flavorText },
			...(isDebugEnabled(env) ? { debug: { gemini: getGeminiDebugSnapshot() } } : {}),
		},
		{ status: 200 },
		origin,
	);
}

const KNOWN_RACES = [
	'Human',
	'Elf',
	'Dwarf',
	'Halfling',
	'Gnome',
	'Tiefling',
	'Half-Elf',
	'Half-Orc',
	'Dragonborn',
];

const KNOWN_CLASSES = [
	'Barbarian',
	'Bard',
	'Cleric',
	'Druid',
	'Fighter',
	'Monk',
	'Paladin',
	'Ranger',
	'Rogue',
	'Sorcerer',
	'Warlock',
	'Wizard',
];

function titleCase(word: string): string {
	if (!word) return word;
	return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function inferRace(text: string): string {
	const lower = text.toLowerCase();
	for (const race of KNOWN_RACES) {
		if (lower.includes(race.toLowerCase())) return race;
	}
	return 'Human';
}

function inferClasses(text: string): CharacterClass[] {
	const lower = text.toLowerCase();
	const found: string[] = [];
	for (const cls of KNOWN_CLASSES) {
		if (lower.includes(cls.toLowerCase())) {
			found.push(cls);
		}
	}
	if (found.length === 0) {
		return [{ name: 'Fighter', level: 1 }];
	}
	// For now, assign level 1 to each mentioned class. Later we can be smarter.
	return found.map((name) => ({ name, level: 1 }));
}

function buildClassAndLevelSummary(classes: CharacterClass[]): { classSummary: string; levelSummary: string } {
	const classSummary = classes.map((c) => c.name).join('/');
	const levelSummary = classes.map((c) => String(c.level)).join('/');
	return { classSummary, levelSummary };
}

function defaultAbilityScoresFor(primaryClass: string): {
	str: number;
	dex: number;
	con: number;
	int: number;
	wis: number;
	cha: number;
} {
	// Simple standard array distribution tuned by primary class archetype
	const cls = primaryClass.toLowerCase();
	if (cls === 'fighter' || cls === 'barbarian' || cls === 'paladin') {
		return { str: 15, dex: 13, con: 14, int: 8, wis: 10, cha: 12 };
	}
	if (cls === 'rogue' || cls === 'ranger' || cls === 'monk') {
		return { str: 10, dex: 15, con: 14, int: 8, wis: 13, cha: 12 };
	}
	if (cls === 'cleric' || cls === 'druid') {
		return { str: 10, dex: 12, con: 14, int: 8, wis: 15, cha: 13 };
	}
	// Full casters and faces
	return { str: 8, dex: 12, con: 14, int: 10, wis: 12, cha: 15 };
}

function hitDieForClass(cls: string): number {
	switch (cls.toLowerCase()) {
		case 'barbarian':
			return 12;
		case 'fighter':
		case 'paladin':
		case 'ranger':
			return 10;
		case 'bard':
		case 'cleric':
		case 'druid':
		case 'monk':
		case 'rogue':
		case 'warlock':
			return 8;
		default:
			return 6;
	}
}

function savingThrowsForClass(cls: string): string[] {
	switch (cls.toLowerCase()) {
		case 'barbarian':
			return ['str', 'con'];
		case 'bard':
			return ['dex', 'cha'];
		case 'cleric':
			return ['wis', 'cha'];
		case 'druid':
			return ['int', 'wis'];
		case 'fighter':
			return ['str', 'con'];
		case 'monk':
			return ['str', 'dex'];
		case 'paladin':
			return ['wis', 'cha'];
		case 'ranger':
			return ['str', 'dex'];
		case 'rogue':
			return ['dex', 'int'];
		case 'sorcerer':
			return ['con', 'cha'];
		case 'warlock':
			return ['wis', 'cha'];
		case 'wizard':
			return ['int', 'wis'];
		default:
			return [];
	}
}

function castingStatForClass(cls: string): string | null {
	switch (cls.toLowerCase()) {
		case 'bard':
		case 'paladin':
		case 'sorcerer':
		case 'warlock':
			return 'cha';
		case 'cleric':
		case 'druid':
			return 'wis';
		case 'wizard':
			return 'int';
		default:
			return null;
	}
}

function basicSkillsForClass(cls: string): string[] {
	switch (cls.toLowerCase()) {
		case 'fighter':
			return ['Athletics', 'Perception'];
		case 'rogue':
			return ['Stealth', 'Acrobatics', 'Perception'];
		case 'ranger':
			return ['Survival', 'Perception', 'Stealth'];
		case 'wizard':
			return ['Arcana', 'History'];
		case 'cleric':
			return ['Religion', 'Insight'];
		case 'bard':
			return ['Performance', 'Persuasion', 'Deception'];
		default:
			return ['Perception'];
	}
}

function forgeCharacterFromNarrative(owner: string, narrativeText: string, portraitUrl: string | null, explicitName?: string): Character {
	const trimmed = narrativeText.trim();
	const race = inferRace(trimmed);
	const classes = inferClasses(trimmed);
	const primaryClass = classes[0]?.name || 'Fighter';
	const { classSummary, levelSummary } = buildClassAndLevelSummary(classes);
	const abilityScores = defaultAbilityScoresFor(primaryClass);
	const conMod = Math.floor((abilityScores.con - 10) / 2);
	const hitDie = hitDieForClass(primaryClass);
	const hitPoints = hitDie + conMod;
	const dexMod = Math.floor((abilityScores.dex - 10) / 2);
	const armorClass = 10 + dexMod;
	const speed = 30;
	const proficiencyBonus = 2; // Level 1 baseline; can be refined later based on total level
	const savingThrows = savingThrowsForClass(primaryClass);
	const skills = basicSkillsForClass(primaryClass);
	const castingStat = castingStatForClass(primaryClass);

	const now = new Date().toISOString();
	const id = crypto.randomUUID();

	const character: Character = {
		id,
		owner,
		name: (explicitName ?? '').trim(),
		narrative: {
			rawTranscript: trimmed,
			summary: '',
			tags: [],
		},
		concept: {
			race,
			background: '',
			alignment: '',
			classes,
			classSummary,
			levelSummary,
		},
		mechanics: {
			abilityScores,
			proficiencyBonus,
			savingThrows,
			skills,
			hitPoints,
			armorClass,
			speed,
			classFeatures: [],
			feats: [],
			equipment: [],
			spells: {
				castingStat,
				cantrips: [],
				leveledSpells: [],
			},
		},
		portraitUrl,
		validation: {
			isValid: true,
			issues: [],
		},
		campaignIds: [],
		createdAt: now,
		updatedAt: now,
	};

	return ensureCharacterProgression(character);
}

async function handleForgeCharacter(request: Request, env: Env, origin: string | null): Promise<Response> {
	let body: any;
	try {
		body = await request.json();
	} catch {
		return errorResponse('Invalid JSON body', 400, origin);
	}

	const username = (body?.username ?? '').trim();
	const narrativeText = (body?.narrativeText ?? '').trim();
	const explicitName = typeof body?.name === 'string' ? body.name : '';
	const campaignIdRaw = typeof body?.campaignId === 'string' ? body.campaignId : '';
	const campaignId = campaignIdRaw.trim() || '';
	const portraitUrl = typeof body?.portraitUrl === 'string' && body.portraitUrl.trim().length > 0
		? body.portraitUrl.trim()
		: null;
	const dryRun = Boolean(body?.dryRun);

	if (!username) {
		return errorResponse('Username is required', 400, origin);
	}

	if (!narrativeText) {
		return errorResponse('Narrative text is required', 400, origin);
	}

	// Ensure the user exists before forging a character
	const userKey = `user:${username}`;
	const userRecord = await env.ADA_DATA.get(userKey);
	if (!userRecord) {
		return errorResponse('Unknown user', 404, origin);
	}

	// For dryRun, just forge a draft character without storing anything.
	if (dryRun) {
		const draft = forgeCharacterFromNarrative(username, narrativeText, portraitUrl, explicitName);
		return jsonResponse({ ok: true, character: draft }, { status: 200 }, origin);
	}

	// Enforce roster limit: max 5 characters per user
	const rosterIndexKey = `charactersByUser:${username}`;
	const existingRoster = await env.ADA_DATA.get(rosterIndexKey);
	let existingIds: string[] = [];
	if (existingRoster) {
		try {
			existingIds = JSON.parse(existingRoster) as string[];
			if (!Array.isArray(existingIds)) existingIds = [];
		} catch {
			existingIds = [];
		}
	}
	if (existingIds.length >= 5) {
		return errorResponse(
			'You have reached the maximum of 5 characters. Delete an existing character before forging a new one.',
			400,
			origin,
		);
	}

	let campaign: Campaign | null = null;
	if (campaignId) {
		const storedCampaign = await env.ADA_DATA.get(`campaign:${campaignId}`);
		if (!storedCampaign) {
			return errorResponse('Campaign not found', 404, origin);
		}
		try {
			campaign = JSON.parse(storedCampaign) as Campaign;
		} catch {
			return errorResponse('Corrupted campaign record', 500, origin);
		}

		const isParticipant =
			campaign.dm === username ||
			(Array.isArray(campaign.participants) && campaign.participants.includes(username));
		if (!isParticipant) {
			return errorResponse('You are not a participant in this campaign', 403, origin);
		}

		// Enforce: one character per player per campaign
		for (const id of existingIds) {
			const storedChar = await env.ADA_DATA.get(`character:${id}`);
			if (!storedChar) continue;
			try {
				const ch = JSON.parse(storedChar) as Character;
				if (Array.isArray(ch.campaignIds) && ch.campaignIds.includes(campaignId)) {
					return errorResponse(
						'You already have a character linked to this campaign.',
						400,
						origin,
					);
				}
			} catch {
				// ignore malformed
			}
		}
	}

	const character = forgeCharacterFromNarrative(username, narrativeText, portraitUrl, explicitName);

	if (campaign) {
		// Enforce: a character may be linked to at most one campaign at a time.
		character.campaignIds = [campaignId];
		if (!Array.isArray(campaign.linkedCharacterIds)) campaign.linkedCharacterIds = [];
		if (!campaign.linkedCharacterIds.includes(character.id)) {
			campaign.linkedCharacterIds.push(character.id);
			await env.ADA_DATA.put(`campaign:${campaignId}`, JSON.stringify(campaign));
		}
	}

	await env.ADA_DATA.put(`character:${character.id}`, JSON.stringify(character));

	// Index by user
	const indexKey = `charactersByUser:${username}`;
	const existing = await env.ADA_DATA.get(indexKey);
	let ids: string[] = [];
	if (existing) {
		try {
			ids = JSON.parse(existing) as string[];
			if (!Array.isArray(ids)) ids = [];
		} catch {
			ids = [];
		}
	}
	if (!ids.includes(character.id)) {
		ids.push(character.id);
		await env.ADA_DATA.put(indexKey, JSON.stringify(ids));
	}

	return jsonResponse({ ok: true, character }, { status: 201 }, origin);
}

async function handleDeleteCharacter(request: Request, env: Env, origin: string | null): Promise<Response> {
	let body: any;
	try {
		body = await request.json();
	} catch {
		return errorResponse('Invalid JSON body', 400, origin);
	}

	const username = (body?.username ?? '').trim();
	const characterId = (body?.characterId ?? '').trim();
	if (!username || !characterId) {
		return errorResponse('username and characterId are required', 400, origin);
	}

	const stored = await env.ADA_DATA.get(`character:${characterId}`);
	if (!stored) {
		return errorResponse('Character not found', 404, origin);
	}

	let character: Character;
	try {
		character = JSON.parse(stored) as Character;
	} catch {
		return errorResponse('Corrupted character record', 500, origin);
	}

	if (character.owner !== username) {
		return errorResponse('You do not own this character', 403, origin);
	}

	// Remove from any linked campaigns
	const campaignIds = Array.isArray(character.campaignIds) ? character.campaignIds : [];
	for (const cid of campaignIds) {
		const storedCampaign = await env.ADA_DATA.get(`campaign:${cid}`);
		if (!storedCampaign) continue;
		try {
			const campaign = JSON.parse(storedCampaign) as Campaign;
			if (Array.isArray(campaign.linkedCharacterIds)) {
				const filtered = campaign.linkedCharacterIds.filter((id) => id !== characterId);
				if (filtered.length !== campaign.linkedCharacterIds.length) {
					campaign.linkedCharacterIds = filtered;
					await env.ADA_DATA.put(`campaign:${cid}`, JSON.stringify(campaign));
				}
			}
		} catch {
			// ignore malformed
		}
	}

	// Delete character record
	await env.ADA_DATA.delete(`character:${characterId}`);

	// Remove from charactersByUser index
	const indexKey = `charactersByUser:${username}`;
	const existing = await env.ADA_DATA.get(indexKey);
	if (existing) {
		try {
			let ids = JSON.parse(existing) as string[];
			if (Array.isArray(ids)) {
				ids = ids.filter((id) => id !== characterId);
				await env.ADA_DATA.put(indexKey, JSON.stringify(ids));
			}
		} catch {
			// ignore index issues
		}
	}

	return jsonResponse({ ok: true }, { status: 200 }, origin);
}

async function handleListCharacters(request: Request, env: Env, origin: string | null): Promise<Response> {
	const url = new URL(request.url);
	const user = (url.searchParams.get('user') ?? '').trim();
	if (!user) {
		return errorResponse('Missing user parameter', 400, origin);
	}

	const indexKey = `charactersByUser:${user}`;
	const existing = await env.ADA_DATA.get(indexKey);
	let ids: string[] = [];
	if (existing) {
		try {
			ids = JSON.parse(existing) as string[];
			if (!Array.isArray(ids)) ids = [];
		} catch {
			ids = [];
		}
	}

	const characters: Character[] = [];
	for (const id of ids) {
		const stored = await env.ADA_DATA.get(`character:${id}`);
		if (!stored) continue;
		try {
			const parsed = JSON.parse(stored) as Character;
			if (parsed && parsed.id) characters.push(ensureCharacterProgression(parsed));
		} catch {
			// ignore malformed
		}
	}

	return jsonResponse({ ok: true, characters }, undefined, origin);
}

async function handleCharacterLevelUp(request: Request, env: Env, origin: string | null): Promise<Response> {
	let body: any;
	try {
		body = await request.json();
	} catch {
		return errorResponse('Invalid JSON body', 400, origin);
	}

	const username = String(body?.username ?? '').trim();
	const characterId = String(body?.characterId ?? '').trim();
	if (!username || !characterId) {
		return errorResponse('username and characterId are required', 400, origin);
	}

	const stored = await env.ADA_DATA.get(`character:${characterId}`);
	if (!stored) {
		return errorResponse('Character not found', 404, origin);
	}

	let character: Character;
	try {
		character = JSON.parse(stored) as Character;
	} catch {
		return errorResponse('Corrupted character record', 500, origin);
	}

	if (character.owner !== username) {
		return errorResponse('You do not own this character', 403, origin);
	}

	character = ensureCharacterProgression(character);
	if (!character.progression?.canLevelUp) {
		return errorResponse('Not enough XP to level up yet', 400, origin);
	}
	if (character.progression.level >= MAX_CHARACTER_LEVEL) {
		return errorResponse('Character is already at max level', 400, origin);
	}

	// Level up by increasing the first class level (simple single-class flow for now).
	if (!Array.isArray(character.concept?.classes) || !character.concept.classes.length) {
		character.concept.classes = [{ name: 'Fighter', level: 1 }];
	}
	character.concept.classes[0].level = (Number.isFinite(character.concept.classes[0].level)
		? Number(character.concept.classes[0].level)
		: 1) + 1;

	const primaryClass = character.concept.classes[0].name || 'Fighter';
	const totalLevel = getTotalCharacterLevel(character);
	character.mechanics.proficiencyBonus = computeProficiencyBonusForLevel(totalLevel);

	// Increase max HP: average hit die per level + CON modifier (minimum +1 per level).
	const conScore = Number.isFinite(character.mechanics?.abilityScores?.con)
		? Number(character.mechanics.abilityScores.con)
		: 10;
	const conMod = abilityModifier(conScore);
	const hitDie = hitDieForClass(primaryClass);
	const avgPerLevel = Math.floor(hitDie / 2) + 1;
	const hpGain = Math.max(1, avgPerLevel + conMod);
	character.mechanics.hitPoints = Math.max(1, Number(character.mechanics.hitPoints || 1) + hpGain);

	// Recompute class summaries.
	const rebuilt = buildClassAndLevelSummary(character.concept.classes);
	character.concept.classSummary = rebuilt.classSummary;
	character.concept.levelSummary = rebuilt.levelSummary;

	// Normalize progression resources and refill HP/mana on level-up.
	character = ensureCharacterProgression(character);
	character.progression!.hp.current = character.progression!.hp.max;
	character.progression!.manaSlots.current = character.progression!.manaSlots.max;
	character.updatedAt = new Date().toISOString();
	character.progression!.updatedAt = new Date().toISOString();

	await env.ADA_DATA.put(`character:${characterId}`, JSON.stringify(character));
	return jsonResponse({ ok: true, character }, { status: 200 }, origin);
}

/**
 * Simple BM25-inspired retriever for SRD data
 */
interface SRDEntry {
	title: string;
	url: string;
	path: string[];
	full_path: string[];
	text: string;
}

interface RetrievalResult {
	title: string;
	path: string[];
	url: string;
	score: number;
	text: string;
}

// Load SRD data from JSON file
import tocEntries from './toc_entries.json';

const SRD_DATA: SRDEntry[] = tocEntries.map((entry: any) => ({
	title: entry.title || '',
	url: entry.url || '',
	path: Array.isArray(entry.path) ? entry.path : [],
	full_path: Array.isArray(entry.full_path) ? entry.full_path : [],
	text: entry.text || ''
}));

function tokenize(text: string): string[] {
	return text.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(t => t.length > 0);
}

function calculateBM25Score(
	queryTokens: string[],
	docTokens: string[],
	allDocTokens: string[][],
	k1: number = 1.5,
	b: number = 0.75
): number {
	const docLength = docTokens.length;
	const avgDocLength = allDocTokens.reduce((sum, tokens) => sum + tokens.length, 0) / allDocTokens.length;
	
	let score = 0;

	for (const queryToken of queryTokens) {
		const termFrequency = docTokens.filter(t => t === queryToken).length;
		if (termFrequency === 0) continue;

		// Calculate document frequency
		const docFreq = allDocTokens.filter(tokens => tokens.includes(queryToken)).length;
		const idf = Math.log((allDocTokens.length - docFreq + 0.5) / (docFreq + 0.5) + 1);

		// Calculate BM25 component
		const normLength = (1 - b) + (b * docLength / Math.max(avgDocLength, 1));
		const bm25 = idf * ((k1 + 1) * termFrequency) / (termFrequency + k1 * normLength);
		score += bm25;
	}

	return score;
}

function handleSRDQuery(request: Request, origin: string | null): Promise<Response> {
	return request.json().then((body: any) => {
		const query = (body.query ?? '').trim();
		const k = Math.min(body.k ?? 5, 10);

		if (!query) {
			return errorResponse('Missing query parameter', 400, origin);
		}

		const queryTokens = tokenize(query);
		if (queryTokens.length === 0) {
			return jsonResponse({ results: [] }, undefined, origin);
		}

		// Tokenize all documents
		const allTokens = SRD_DATA.map(entry => {
			const text = `${entry.title} ${entry.text}`;
			return tokenize(text);
		});

		// Score each document
		const scores = allTokens.map((docTokens, idx) =>
			calculateBM25Score(queryTokens, docTokens, allTokens)
		);

		// Get top k results
		const topIndices = scores
			.map((score, idx) => ({ score, idx }))
			.filter(item => item.score > 0)
			.sort((a, b) => b.score - a.score)
			.slice(0, k)
			.map(item => item.idx);

		const results: RetrievalResult[] = topIndices.map(idx => {
			const entry = SRD_DATA[idx];
			return {
				title: entry.title,
				path: entry.full_path,
				url: entry.url,
				score: scores[idx],
				text: entry.text
			};
		});

		return jsonResponse({ results }, undefined, origin);
	}).catch(() => {
		return errorResponse('Invalid request body', 400, origin);
	});
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		return app.fetch(request, env, ctx);
	},
} satisfies ExportedHandler<Env>;

async function legacyFetch(request: Request, env: Env, _ctx?: ExecutionContext): Promise<Response> {
	const url = new URL(request.url);
	const pathname = url.pathname;
	const method = request.method.toUpperCase();
	const origin = request.headers.get('Origin');

	// CORS preflight handling (legacy)
	if (method === 'OPTIONS') {
		return new Response(null, {
			status: 204,
			headers: withCorsHeaders(origin, {}),
		});
	}

	// Simple routing (legacy)
	if (pathname === '/api/health' && method === 'GET') {
		return handleHealth(origin);
	}

	if (pathname === '/api/health/ai' && method === 'GET') {
		return handleAIHealth(env, origin);
	}

	if (pathname === '/api/health/ai/models' && method === 'GET') {
		return handleAIModels(env, origin);
	}

	if (pathname === '/api/register' && method === 'POST') {
		return handleRegister(request, env, origin);
	}

	if (pathname === '/api/login' && method === 'POST') {
		return handleLogin(request, env, origin);
	}

	if (pathname === '/api/adventures' && method === 'GET') {
		return handleListAdventures(env, origin);
	}
	if (pathname === '/api/adventures/publish' && method === 'POST') {
		return handlePublishAdventure(request, env, origin);
	}
	if (pathname === '/api/architect/generate-scenario' && method === 'POST') {
		return handleArchitectGenerateScenario(request, env, origin);
	}
	if (pathname === '/api/admin/patch-ai-campaigns' && method === 'POST') {
		return handleAdminPatchAICampaigns(request, env, origin);
	}

	// Grand Library of Fate (Public Templates)
	if (pathname === '/api/templates/public' && method === 'GET') {
		return handleListPublicTemplates(env, origin);
	}
	if (pathname === '/api/scenarios/clone' && method === 'POST') {
		return handleCloneScenario(request, env, origin);
	}
	if (pathname === '/api/templates/create' && method === 'POST') {
		return handleCreateTemplate(request, env, origin);
	}
	if (pathname === '/api/templates/update' && method === 'POST') {
		return handleUpdateTemplate(request, env, origin);
	}
	if (pathname === '/api/templates/delete' && method === 'POST') {
		return handleDeleteTemplate(request, env, origin);
	}
	if (pathname === '/api/templates/publish' && method === 'POST') {
		return handlePublishToHall(request, env, origin);
	}
	if (pathname === '/api/templates/instantiate' && method === 'POST') {
		return handleInstantiateTemplate(request, env, origin);
	}

	// Human Lobbies (public campaign browser + approval workflow + OOC chat)
	if (pathname === '/api/lobbies/public' && method === 'GET') {
		return handleListPublicLobbies(env, origin);
	}
	if (pathname === '/api/lobbies/details' && method === 'GET') {
		return handleGetLobbyDetails(request, env, origin);
	}
	if (pathname === '/api/lobbies/join' && method === 'POST') {
		return handleLobbyJoin(request, env, origin);
	}
	if (pathname === '/api/lobbies/approve' && method === 'POST') {
		return handleLobbyApprove(request, env, origin);
	}
	if (pathname === '/api/lobbies/reject' && method === 'POST') {
		return handleLobbyReject(request, env, origin);
	}
	if (pathname === '/api/lobbies/chat/send' && method === 'POST') {
		return handleLobbyChatSend(request, env, origin);
	}
	if (pathname === '/api/hidden-hand/turn' && method === 'POST') {
		return handleHiddenHandTurn(request, env, origin);
	}

	if (pathname === '/api/characters/forge' && method === 'POST') {
		return handleForgeCharacter(request, env, origin);
	}

	if (pathname === '/api/characters/delete' && method === 'POST') {
		return handleDeleteCharacter(request, env, origin);
	}

	if (pathname === '/api/characters/level-up' && method === 'POST') {
		return handleCharacterLevelUp(request, env, origin);
	}

	if (pathname === '/api/characters' && method === 'GET') {
		return handleListCharacters(request, env, origin);
	}

	if (pathname === '/api/ai-campaigns/start' && method === 'POST') {
		return handleStartAICampaign(request, env, origin);
	}

	if (pathname === '/api/ai-dm/turn' && method === 'POST') {
		return handleAIDMTurn(request, env, origin);
	}

	if (pathname === '/api/ai-dm/resolve-check' && method === 'POST') {
		return handleAIDMResolveCheck(request, env, origin);
	}

	if (pathname === '/api/ai-player/turn' && method === 'POST') {
		return handleAIPlayerTurn(request, env, origin);
	}

	if (pathname === '/api/campaigns' && method === 'POST') {
		return handleCreateCampaign(request, env, origin);
	}

	if (pathname === '/api/campaigns' && method === 'GET') {
		return handleListCampaigns(request, env, origin);
	}

	if (pathname === '/api/campaigns/details' && method === 'GET') {
		return handleGetCampaignDetails(request, env, origin);
	}

	if (pathname === '/api/campaigns/details' && method === 'POST') {
		return handlePostCampaignDetails(request, env, origin);
	}

	if (pathname === '/api/campaigns/approve-player' && method === 'POST') {
		return handleLobbyApprove(request, env, origin);
	}

	if (pathname === '/api/gm/tool' && method === 'POST') {
		return handleGmTool(request, env, origin);
	}

	if (pathname === '/api/srd/query' && method === 'POST') {
		return handleSRDQuery(request, origin);
	}

	return errorResponse('Not Found', 404, origin);
}

const app = createApp({ legacyFetch });
