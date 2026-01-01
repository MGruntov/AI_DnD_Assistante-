export type Env = {
	ADA_DATA: KVNamespace;
	// D1 is being introduced incrementally; keep optional during migration.
	ADA_DB?: D1Database;
	GEMINI_API_KEY: string;
	// Non-secret toggle for returning debug fields in API responses.
	// Set via Wrangler vars (not secrets), e.g. ADA_DEBUG="1".
	ADA_DEBUG?: string;
	// Set via `wrangler secret put JWT_SECRET`.
	JWT_SECRET?: string;
};
