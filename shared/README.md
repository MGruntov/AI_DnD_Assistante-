# Shared contracts

This folder is for types/contracts shared between the backend Worker and the frontend.

Today the frontend is plain JavaScript (no build step), so the recommended way to use
shared types is via JSDoc type imports:

- `/** @typedef {import('../shared/types').UserPublic} UserPublic */`

The backend (TypeScript) can import these types directly.
