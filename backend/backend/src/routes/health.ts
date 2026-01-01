import type { Hono } from 'hono';
import type { Env } from '../env';

export function registerHealthRoutes(app: Hono<{ Bindings: Env }>): void {
	app.get('/api/health', (c) => c.json({ status: 'ok' }));
}
