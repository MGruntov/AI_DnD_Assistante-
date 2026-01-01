This project is migrating toward shared request/response contracts.

Today the backend uses Zod (see `backend/backend/src/contracts/*`) to validate inputs.

The frontend can reference shared types via JSDoc imports from `shared/types.ts`.
