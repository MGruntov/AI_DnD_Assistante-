import { SignJWT, jwtVerify } from 'jose';

export type AccessTokenPayload = {
	sub: string; // user id
	username: string;
};

function assertSecret(secret: string | undefined): string {
	const s = String(secret || '').trim();
	if (!s) throw new Error('Missing JWT_SECRET');
	if (s.length < 32) throw new Error('JWT_SECRET too short (min 32 chars recommended)');
	return s;
}

function secretKey(secret: string): Uint8Array {
	return new TextEncoder().encode(secret);
}

export async function signAccessToken(secret: string | undefined, payload: AccessTokenPayload, opts?: { expiresInSeconds?: number }): Promise<string> {
	const s = assertSecret(secret);
	const ttl = Number.isFinite(opts?.expiresInSeconds) ? Number(opts?.expiresInSeconds) : 60 * 60 * 24; // 24h
	const now = Math.floor(Date.now() / 1000);
	return new SignJWT({ username: payload.username })
		.setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
		.setSubject(payload.sub)
		.setIssuedAt(now)
		.setExpirationTime(now + ttl)
		.sign(secretKey(s));
}

export async function verifyAccessToken(secret: string | undefined, token: string): Promise<AccessTokenPayload> {
	const s = assertSecret(secret);
	const res = await jwtVerify(token, secretKey(s), {
		algorithms: ['HS256'],
	});
	const username = typeof res.payload.username === 'string' ? res.payload.username : '';
	const sub = typeof res.payload.sub === 'string' ? res.payload.sub : '';
	if (!sub || !username) throw new Error('Invalid token');
	return { sub, username };
}
