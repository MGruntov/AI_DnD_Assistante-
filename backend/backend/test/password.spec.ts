import { describe, it, expect } from 'vitest';
import { hashPasswordPBKDF2, verifyPasswordPBKDF2 } from '../src/security/password';

describe('password hashing', () => {
	it('hash + verify roundtrip works', async () => {
		const record = await hashPasswordPBKDF2('testpass123');
		const ok = await verifyPasswordPBKDF2('testpass123', record);
		expect(ok).toBe(true);
	});

	it('sha256-iter records can be verified in PBKDF2-capable runtimes', async () => {
		const record = await hashPasswordPBKDF2('testpass123', { forceAlgo: 'sha256-iter', iterations: 75_000 });
		expect(record.algo).toBe('sha256-iter');
		const ok = await verifyPasswordPBKDF2('testpass123', record);
		expect(ok).toBe(true);
	});

	it('verify fails for wrong password', async () => {
		const record = await hashPasswordPBKDF2('testpass123');
		const ok = await verifyPasswordPBKDF2('wrong', record);
		expect(ok).toBe(false);
	});
});
