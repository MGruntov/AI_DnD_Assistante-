const AUTH_TOKEN_KEY = 'adaAuthToken';

export function getAuthToken() {
	try {
		return localStorage.getItem(AUTH_TOKEN_KEY);
	} catch {
		return null;
	}
}

export function setAuthToken(token) {
	try {
		if (token) localStorage.setItem(AUTH_TOKEN_KEY, String(token));
		else localStorage.removeItem(AUTH_TOKEN_KEY);
	} catch {
		// ignore
	}
}

export function clearAuthToken() {
	setAuthToken(null);
}

export function authHeaders(extra) {
	const headers = { ...(extra || {}) };
	const token = getAuthToken();
	if (token) headers.Authorization = `Bearer ${token}`;
	return headers;
}
