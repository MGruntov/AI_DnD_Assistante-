import { authHeaders } from './api.js';

export async function apiGetJson(baseUrl, path) {
	const url = `${baseUrl}${path}`;
	try {
		const res = await fetch(url, {
			method: 'GET',
			headers: authHeaders({ Accept: 'application/json' }),
		});
		const data = await res.json().catch(() => ({}));
		return { ok: res.ok, status: res.status, data };
	} catch (e) {
		console.error('[ADA] API GET error', e);
		return { ok: false, status: 0, data: null };
	}
}

export async function apiPostJson(baseUrl, path, payload) {
	const url = `${baseUrl}${path}`;
	try {
		const res = await fetch(url, {
			method: 'POST',
			headers: authHeaders({ 'Content-Type': 'application/json' }),
			body: JSON.stringify(payload),
		});
		const data = await res.json().catch(() => ({}));
		return { ok: res.ok, status: res.status, data };
	} catch (e) {
		console.error('[ADA] API error', e);
		return {
			ok: false,
			status: 0,
			data: { error: 'Network error. Please try again.' },
		};
	}
}
