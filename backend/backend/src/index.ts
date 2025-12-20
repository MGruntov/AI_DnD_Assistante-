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

type Env = {
	ADA_DATA: KVNamespace;
};

const CORS_HEADERS_BASE = {
	'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type',
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
	createdAt: string;
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
	portraitUrl: string | null;
	validation: {
		isValid: boolean;
		issues: string[];
	};
	campaignIds: string[];
	createdAt: string;
	updatedAt: string;
};

async function handleHealth(origin: string | null): Promise<Response> {
	return jsonResponse({ status: 'ok' }, undefined, origin);
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
	const campaign: Campaign = { id, name, dm, participants, createdAt };

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

	return jsonResponse({ ok: true, campaign }, { status: 201 }, origin);
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

function forgeCharacterFromNarrative(owner: string, narrativeText: string, portraitUrl: string | null): Character {
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
		name: '',
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

	return character;
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
	const portraitUrl = typeof body?.portraitUrl === 'string' && body.portraitUrl.trim().length > 0
		? body.portraitUrl.trim()
		: null;

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

	const character = forgeCharacterFromNarrative(username, narrativeText, portraitUrl);

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
			if (parsed && parsed.id) characters.push(parsed);
		} catch {
			// ignore malformed
		}
	}

	return jsonResponse({ ok: true, characters }, undefined, origin);
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);
		const pathname = url.pathname;
		const method = request.method.toUpperCase();
		const origin = request.headers.get('Origin');

		// CORS preflight handling
		if (method === 'OPTIONS') {
			return new Response(null, {
				status: 204,
				headers: withCorsHeaders(origin, {}),
			});
		}

		// Simple routing
		if (pathname === '/api/health' && method === 'GET') {
			return handleHealth(origin);
		}

		if (pathname === '/api/register' && method === 'POST') {
			return handleRegister(request, env, origin);
		}

		if (pathname === '/api/login' && method === 'POST') {
			return handleLogin(request, env, origin);
		}

		if (pathname === '/api/characters/forge' && method === 'POST') {
			return handleForgeCharacter(request, env, origin);
		}

		if (pathname === '/api/characters' && method === 'GET') {
			return handleListCharacters(request, env, origin);
		}

		if (pathname === '/api/campaigns' && method === 'POST') {
			return handleCreateCampaign(request, env, origin);
		}

		if (pathname === '/api/campaigns' && method === 'GET') {
			return handleListCampaigns(request, env, origin);
		}

		return errorResponse('Not Found', 404, origin);
	},
} satisfies ExportedHandler<Env>;
