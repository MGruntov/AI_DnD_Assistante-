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

		if (pathname === '/api/campaigns' && method === 'POST') {
			return handleCreateCampaign(request, env, origin);
		}

		if (pathname === '/api/campaigns' && method === 'GET') {
			return handleListCampaigns(request, env, origin);
		}

		return errorResponse('Not Found', 404, origin);
	},
} satisfies ExportedHandler<Env>;
