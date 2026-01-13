import { authHeaders } from './api.js';

function timeoutMsForPath(path, method) {
	const p = String(path || '');
	// AI turns can legitimately take longer due to model latency.
	if (p.includes('/api/ai-dm/turn') || p.includes('/api/hidden-hand/turn') || p.includes('/api/ai-player/turn')) {
		return 120_000;
	}
	// Campaign details can involve many KV reads.
	if (p.includes('/api/campaigns/details')) {
		return 45_000;
	}
	// Default: keep UI snappy.
	return method === 'GET' ? 20_000 : 30_000;
}

async function fetchWithTimeout(url, options, timeoutMs) {
	const controller = new AbortController();
	const ms = Number.isFinite(Number(timeoutMs)) ? Number(timeoutMs) : 30_000;
	const startedAt = Date.now();
	const timer = setTimeout(() => {
		try {
			controller.abort();
		} catch {
			// ignore
		}
	}, ms);

	try {
		const res = await fetch(url, { ...(options || {}), signal: controller.signal });
		return { res, ms: Date.now() - startedAt };
	} finally {
		clearTimeout(timer);
	}
}

async function safeReadJson(res) {
	// Prefer JSON, but fall back to text so we can surface something useful.
	try {
		return await res.json();
	} catch {
		try {
			const text = await res.text();
			return text ? { message: text } : {};
		} catch {
			return {};
		}
	}
}

export async function apiGetJson(baseUrl, path) {
	const url = `${baseUrl}${path}`;
	try {
		const timeoutMs = timeoutMsForPath(path, 'GET');
		const { res, ms } = await fetchWithTimeout(
			url,
			{
				method: 'GET',
				headers: authHeaders({ Accept: 'application/json' }),
			},
			timeoutMs,
		);
		const data = await safeReadJson(res);
		if (!res.ok) {
			const msg = (data && (data.error || data.message)) || res.statusText || 'Request failed.';
			return { ok: false, status: res.status, data: { ...(data || {}), error: msg } };
		}
		// Lightweight timing breadcrumb for debugging slow pages.
		if (ms > 5_000) console.warn('[ADA] Slow GET', { path, ms, status: res.status });
		return { ok: true, status: res.status, data };
	} catch (e) {
		const name = e && typeof e === 'object' && 'name' in e ? String(e.name) : '';
		const isAbort = name === 'AbortError';
		if (isAbort) console.warn('[ADA] API GET timeout', { path });
		else console.error('[ADA] API GET error', e);
		return {
			ok: false,
			status: 0,
			data: { error: isAbort ? 'Request timed out. Please try again.' : 'Network error. Please try again.' },
		};
	}
}

export async function apiPostJson(baseUrl, path, payload) {
	const url = `${baseUrl}${path}`;
	try {
		const timeoutMs = timeoutMsForPath(path, 'POST');
		const { res, ms } = await fetchWithTimeout(
			url,
			{
				method: 'POST',
				headers: authHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' }),
				body: JSON.stringify(payload),
			},
			timeoutMs,
		);
		const data = await safeReadJson(res);
		if (!res.ok) {
			const msg = (data && (data.error || data.message)) || res.statusText || 'Request failed.';
			return { ok: false, status: res.status, data: { ...(data || {}), error: msg } };
		}
		// Timing breadcrumb for AI-turn slowness investigations.
		if (ms > 10_000 || String(path).includes('/api/ai-dm/turn') || String(path).includes('/api/hidden-hand/turn')) {
			console.info('[ADA] POST complete', { path, ms, status: res.status });
		}
		return { ok: true, status: res.status, data };
	} catch (e) {
		const name = e && typeof e === 'object' && 'name' in e ? String(e.name) : '';
		const isAbort = name === 'AbortError';
		if (isAbort) console.warn('[ADA] API POST timeout', { path });
		else console.error('[ADA] API error', e);
		return {
			ok: false,
			status: 0,
			data: { error: isAbort ? 'Request timed out. Please try again.' : 'Network error. Please try again.' },
		};
	}
}
