const DEFAULT_PBKDF2_ITERATIONS = 210_000;
const SALT_BYTES = 16;
const DERIVED_KEY_BITS = 32 * 8; // 32 bytes

export type PasswordHashRecord = {
	saltB64: string;
	hashB64: string;
	iterations: number;
	algo: 'pbkdf2-sha256';
};

function bytesToB64(bytes: Uint8Array): string {
	let bin = '';
	for (const b of bytes) bin += String.fromCharCode(b);
	return btoa(bin);
}

function b64ToBytes(b64: string): Uint8Array {
	const bin = atob(String(b64 || ''));
	const out = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
	return out;
}

function safeEqual(a: Uint8Array, b: Uint8Array): boolean {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
	return diff === 0;
}

export async function hashPasswordPBKDF2(password: string, opts?: { saltB64?: string; iterations?: number }): Promise<PasswordHashRecord> {
	const salt = opts?.saltB64 ? b64ToBytes(opts.saltB64) : crypto.getRandomValues(new Uint8Array(SALT_BYTES));
	const iterations = Number.isFinite(opts?.iterations) ? Number(opts?.iterations) : DEFAULT_PBKDF2_ITERATIONS;
	const enc = new TextEncoder();
	const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
	const bits = await crypto.subtle.deriveBits(
		{
			name: 'PBKDF2',
			salt,
			iterations,
			hash: 'SHA-256',
		},
		keyMaterial,
		DERIVED_KEY_BITS,
	);
	const hash = new Uint8Array(bits);
	return {
		algo: 'pbkdf2-sha256',
		saltB64: bytesToB64(salt),
		hashB64: bytesToB64(hash),
		iterations,
	};
}

export async function verifyPasswordPBKDF2(password: string, record: PasswordHashRecord): Promise<boolean> {
	if (!record || record.algo !== 'pbkdf2-sha256') return false;
	const computed = await hashPasswordPBKDF2(password, { saltB64: record.saltB64, iterations: record.iterations });
	return safeEqual(b64ToBytes(computed.hashB64), b64ToBytes(record.hashB64));
}
