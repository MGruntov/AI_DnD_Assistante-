const DEFAULT_PBKDF2_ITERATIONS = 210_000;
const SALT_BYTES = 16;
const DERIVED_KEY_BITS = 32 * 8; // 32 bytes

export type PasswordHashRecord = {
	saltB64: string;
	hashB64: string;
	iterations: number;
	algo: 'pbkdf2-sha256' | 'sha256-iter';
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

async function derivePbkdf2Sha256(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
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
	return new Uint8Array(bits);
}

async function deriveSha256Iter(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
	const enc = new TextEncoder();
	const fallbackIterations = Math.min(Math.max(iterations, 50_000), 300_000);
	let buf = new Uint8Array(enc.encode(password));

	// Mix in salt once.
	const mixed = new Uint8Array(salt.length + buf.length);
	mixed.set(salt, 0);
	mixed.set(buf, salt.length);
	buf = mixed;

	for (let i = 0; i < fallbackIterations; i++) {
		const digest = await crypto.subtle.digest('SHA-256', buf);
		buf = new Uint8Array(digest);
	}
	return buf;
}


export async function hashPasswordPBKDF2(
	password: string,
	opts?: { saltB64?: string; iterations?: number; forceAlgo?: PasswordHashRecord['algo']; allowFallback?: boolean },
): Promise<PasswordHashRecord> {
	const salt = opts?.saltB64 ? b64ToBytes(opts.saltB64) : crypto.getRandomValues(new Uint8Array(SALT_BYTES));
	const iterations = Number.isFinite(opts?.iterations) ? Number(opts?.iterations) : DEFAULT_PBKDF2_ITERATIONS;
	const allowFallback = opts?.allowFallback ?? true;

	if (opts?.forceAlgo === 'sha256-iter') {
		const hash = await deriveSha256Iter(password, salt, iterations);
		return {
			algo: 'sha256-iter',
			saltB64: bytesToB64(salt),
			hashB64: bytesToB64(hash),
			iterations: Math.min(Math.max(iterations, 50_000), 300_000),
		};
	}

	try {
		const hash = await derivePbkdf2Sha256(password, salt, iterations);
		return {
			algo: 'pbkdf2-sha256',
			saltB64: bytesToB64(salt),
			hashB64: bytesToB64(hash),
			iterations,
		};
	} catch {
		if (!allowFallback) throw new Error('PBKDF2 is not available in this runtime');
		// Fallback for runtimes that don't support PBKDF2 via WebCrypto.
		// NOTE: This is slower and less ideal than PBKDF2, but avoids hard failures.
		const buf = await deriveSha256Iter(password, salt, iterations);
		return {
			algo: 'sha256-iter',
			saltB64: bytesToB64(salt),
			hashB64: bytesToB64(buf),
			iterations: Math.min(Math.max(iterations, 50_000), 300_000),
		};
	}
}

export async function verifyPasswordPBKDF2(password: string, record: PasswordHashRecord): Promise<boolean> {
	if (!record) return false;
	if (record.algo === 'pbkdf2-sha256') {
		try {
			const salt = b64ToBytes(record.saltB64);
			const hash = await derivePbkdf2Sha256(password, salt, record.iterations);
			return safeEqual(hash, b64ToBytes(record.hashB64));
		} catch {
			return false;
		}
	}
	if (record.algo === 'sha256-iter') {
		const salt = b64ToBytes(record.saltB64);
		const hash = await deriveSha256Iter(password, salt, record.iterations);
		return safeEqual(hash, b64ToBytes(record.hashB64));
	}
	return false;
}
