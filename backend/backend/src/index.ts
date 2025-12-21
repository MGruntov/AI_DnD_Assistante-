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
	journalEntryIds?: string[];
	scriptIds?: string[];
	linkedCharacterIds?: string[];
	// Optional AI-DM fields
	mode?: 'ai-solo' | 'standard';
	adventureId?: string;
	dmIsAI?: boolean;
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
};

async function handleHealth(origin: string | null): Promise<Response> {
	return jsonResponse({ status: 'ok' }, undefined, origin);
}

async function handleListAdventures(origin: string | null): Promise<Response> {
	return jsonResponse({ ok: true, adventures: ADVENTURES }, undefined, origin);
}

const ADVENTURES: AdventureTemplate[] = [
	{
		id: 'RED_CLOAK',
		title: 'The Red Cloak and the Shadow-Touched Wolf',
		levelMin: 1,
		levelMax: 2,
		difficulty: 'Normal',
		summary:
			'A short, spooky solo adventure in the Whispering Woods where you must deliver spirit-warding herbs to your Grandmother while a corrupted wolf stalks the paths.',
		primer:
			'You are acting as an AI Dungeon Master for D&D 5e. You are running a contained adventure in the Whispering Woods. The player is a low-level messenger wearing a red cloak, tasked with carrying spirit-warding herbs to their Grandmother. The forest is haunted by a Shadow-Touched Wolf that corrupts spirits and hunts travelers. Keep the tone atmospheric and slightly eerie, but not grotesque.',
		checkpoints: ['crossroads', 'snaring_vines', 'cottage'],
		victoryConditions: [
			'The player successfully reaches Grandmother\'s cottage and delivers the spirit-warding herbs.',
			'The Shadow-Touched Wolf is neutralized, driven away, or otherwise no longer a threat.',
		],
		defeatConditions: [
			'The player character is reduced to 0 hit points with no clear rescue available.',
			'The herbs are irretrievably lost or destroyed before reaching Grandmother.',
		],
	},
];

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
		'You are ADA, an AI Dungeon Master for D&D 5e.',
		'You run tightly scoped, structured solo adventures for a single player.',
		'Always respect D&D 5e tone and mechanics: low-level heroes are fragile, magic and powerful items are limited.',
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
		'- skill: the skill used, or "none" if no check',
		'- advantage: one of "none", "advantage", or "disadvantage"',
		'[/MECHANICS]',
		'',
		'Do not include any other sections or markup. If no check is required, set check to "none" and dc to 0.',
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
		'Recent conversation log (most recent last):',
		history || '(no previous turns – this is the opening scene)',
		'',
		`New player input: ${playerInput}`,
		'',
		'Based on this, narrate the next beat of the scene at the current checkpoint, then specify any mechanical check as per the output format.',
	].join('\n');
}

async function callAIDungeonMaster(
	adventure: AdventureTemplate,
	session: AIDMSessionState,
	character: Character,
	playerInput: string,
): Promise<string> {
	// Use Pollinations simple text endpoint for robustness.
	// We inline both the system and user prompts into a single text prompt and
	// rely on the model to follow the requested [NARRATIVE]/[MECHANICS] format.
	const systemPrompt = buildAIDMSystemPrompt();
	const userPrompt = buildAIDMUserPrompt(adventure, session, character, playerInput);
	const combinedPrompt = `${systemPrompt}\n\n---\n\n${userPrompt}`;

	const url = `https://text.pollinations.ai/${encodeURIComponent(combinedPrompt)}`;
	const res = await fetch(url, { method: 'GET' });
	if (!res.ok) {
		throw new Error(`AI-DM request failed with status ${res.status}`);
	}
	return await res.text();
}

function parseAIDMResponse(raw: string): { narrative: string; mechanics: {
	checkDescription: string | null;
	dc: number | null;
	ability: string | null;
	skill: string | null;
	advantage: 'none' | 'advantage' | 'disadvantage' | null;
} } {
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

	if (mechanicsBlock) {
		checkDescription = mechanicsBlock;
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
	}

	return {
		narrative,
		mechanics: { checkDescription, dc, ability, skill, advantage },
	};
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
	const campaign: Campaign = {
		id,
		name,
		dm,
		participants,
		createdAt,
		journalEntryIds: [],
		scriptIds: [],
		linkedCharacterIds: [],
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

	return jsonResponse({ ok: true, campaign }, { status: 201 }, origin);
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

	const adventure = ADVENTURES.find((a) => a.id === adventureId);
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
	};

	await env.ADA_DATA.put(`aiSession:${id}`, JSON.stringify(session));

	// Try to generate an opening narration from the AI-DM so the player
	// is greeted with a scene description as soon as the campaign starts.
	let openingNarrative: string | null = null;
	try {
		const openingRaw = await callAIDungeonMaster(
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

	// Record this as the first DM entry in the session log.
	const now = new Date().toISOString();
	session.log.push({ role: 'dm', text: openingNarrative ?? '', timestamp: now });
	if (session.log.length > 12) {
		session.log = session.log.slice(-12);
	}
	await env.ADA_DATA.put(`aiSession:${id}`, JSON.stringify(session));

	return jsonResponse({ ok: true, campaign, session, openingNarrative }, { status: 201 }, origin);
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
	const adventure = ADVENTURES.find((a) => a.id === adventureId);
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
	// Keep short-term memory bounded
	if (session.log.length > 12) {
		session.log = session.log.slice(-12);
	}

	let parsedNarrative: string;
	let parsedMechanics = {
		checkDescription: null as string | null,
		dc: null as number | null,
		ability: null as string | null,
		skill: null as string | null,
		advantage: null as 'none' | 'advantage' | 'disadvantage' | null,
	};
	try {
		const rawResponse = await callAIDungeonMaster(adventure, session, character, playerInput);
		const parsed = parseAIDMResponse(rawResponse);
		parsedNarrative = parsed.narrative;
		parsedMechanics = parsed.mechanics;
	} catch (err) {
		console.error('AI-DM call failed', err);
		// Fallback: generate a simple, deterministic DM response so play can
		// continue even if the external AI service is down.
		parsedNarrative = `ADA pauses for a moment, then narrates in a calm voice: "${playerInput}" plays out in the Whispering Woods. Imagine how your character moves, reacts, and feels — we will continue from there.`;
	}

	session.log.push({ role: 'dm', text: parsedNarrative, timestamp: new Date().toISOString() });
	if (session.log.length > 12) {
		session.log = session.log.slice(-12);
	}

	await env.ADA_DATA.put(sessionKey, JSON.stringify(session));

	return jsonResponse(
		{
			ok: true,
			narrative: parsedNarrative,
			mechanics: parsedMechanics,
		},
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

	// Load characters for the requesting user that are linked to this campaign
	const characters: Character[] = [];
	if (user) {
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

		for (const charId of ids) {
			const stored = await env.ADA_DATA.get(`character:${charId}`);
			if (!stored) continue;
			try {
				const parsed = JSON.parse(stored) as Character;
				const isLinkedByCharacter = Array.isArray(parsed.campaignIds) && parsed.campaignIds.includes(id);
				const isLinkedByCampaign = Array.isArray(campaign.linkedCharacterIds) && campaign.linkedCharacterIds.includes(parsed.id);
				if (parsed && parsed.id && (isLinkedByCharacter || isLinkedByCampaign)) {
					characters.push(parsed);
				}
			} catch {
				// ignore malformed
			}
		}
	}

	return jsonResponse({ ok: true, campaign, characters, journals, scripts }, undefined, origin);
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

		if (!Array.isArray(character.campaignIds)) character.campaignIds = [];
		if (!character.campaignIds.includes(campaignId)) {
			character.campaignIds.push(campaignId);
		}

		await env.ADA_DATA.put(`campaign:${campaignId}`, JSON.stringify(campaign));
		await env.ADA_DATA.put(`character:${characterId}`, JSON.stringify(character));

		// No need to send characters list right now; front-end can refresh later if needed.
		return jsonResponse({ ok: true, campaign }, { status: 200 }, origin);
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

	if (action === 'addScript') {
		const author = String(body?.author ?? '').trim();
		const prompt = String(body?.prompt ?? '').trim();
		let title = String(body?.title ?? '').trim();
		if (!author || !prompt) {
			return errorResponse('author and prompt are required for addScript', 400, origin);
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
		character.campaignIds = Array.isArray(character.campaignIds)
			? [...new Set([...character.campaignIds, campaignId])]
			: [campaignId];
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

		if (pathname === '/api/adventures' && method === 'GET') {
			return handleListAdventures(origin);
		}

		if (pathname === '/api/characters/forge' && method === 'POST') {
			return handleForgeCharacter(request, env, origin);
		}

		if (pathname === '/api/characters/delete' && method === 'POST') {
			return handleDeleteCharacter(request, env, origin);
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

		return errorResponse('Not Found', 404, origin);
	},
} satisfies ExportedHandler<Env>;
