import type { MiddlewareHandler } from 'hono';
import { verifyAccessToken } from '../security/jwt';
import type { Env } from '../env';

export type AuthedUser = {
	id: string;
	username: string;
};

export function requireAuth(): MiddlewareHandler<{ Bindings: Env; Variables: { user: AuthedUser } }> {
	return async (c, next) => {
		const auth = c.req.header('Authorization') || '';
		const m = auth.match(/^Bearer\s+(.+)$/i);
		if (!m) return c.json({ error: 'Unauthorized' }, 401);
		try {
			const payload = await verifyAccessToken(c.env.JWT_SECRET, m[1]);
			c.set('user', { id: payload.sub, username: payload.username });
			return await next();
		} catch {
			return c.json({ error: 'Unauthorized' }, 401);
		}
	};
}
