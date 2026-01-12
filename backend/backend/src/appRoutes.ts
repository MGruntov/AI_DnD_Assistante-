import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './env';

import { registerHealthRoutes } from './routes/health';
import { registerAuthRoutes } from './routes/auth';
import { registerPortraitRoutes } from './routes/portraits';
import { registerDecisionRoutes } from './routes/decisions';

export type App = Hono<{ Bindings: Env }>;

export function createApp(opts: {
	legacyFetch: (request: Request, env: Env, ctx?: ExecutionContext) => Promise<Response>;
}): App {
	const app = new Hono<{ Bindings: Env }>();

	app.use(
		'*',
		cors({
			origin: (origin) => origin || '*',
			allowMethods: ['GET', 'POST', 'OPTIONS'],
			allowHeaders: ['Content-Type', 'Authorization'],
		}),
	);

	registerHealthRoutes(app);
	registerAuthRoutes(app);
	registerPortraitRoutes(app);
	registerDecisionRoutes(app);

	// Everything not explicitly migrated yet falls back to the legacy router.
	app.all('*', (c) => {
		return opts.legacyFetch(c.req.raw, c.env);
	});

	return app;
}
