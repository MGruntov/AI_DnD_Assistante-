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

		return errorResponse('Not Found', 404, origin);
	},
} satisfies ExportedHandler<Env>;
