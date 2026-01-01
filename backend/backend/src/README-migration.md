# ADA backend migration notes

This backend is being migrated incrementally:

- Legacy router and endpoints still live in `src/index.ts`.
- New Hono router lives in `src/appRoutes.ts` and registers new route modules.
- Any route not migrated yet falls back to the legacy router.

## D1

Schema lives in `migrations/0001_init.sql`.

Create a D1 database and apply migrations (example commands):

- `wrangler d1 create ada-db`
- Add the resulting `database_id` into `wrangler.jsonc` under `d1_databases`.
- `wrangler d1 migrations apply ada-db --local`
- `wrangler d1 migrations apply ada-db`

During migration:
- Auth routes try D1 first, but fall back to KV if D1 isn't configured or doesn't have tables yet.

## JWT

Set the secret:

- `wrangler secret put JWT_SECRET`

Frontend stores the token in `localStorage` key `adaAuthToken` and sends `Authorization: Bearer <token>`.
