# ADA CLI

A small Node.js CLI for generating adventures (scenarios) via the production Worker endpoint.

## Setup

1. Install dependencies:

- `npm install` (run inside `cli/`)

2. Create `cli/.env`:

- Copy `cli/.env.example` to `cli/.env`
- Set:
  - `ADA_WORKER_URL` (production Worker base URL)
  - `ARCHITECT_SECRET`

## Commands

### Generate one scenario

- `node ./generator.js generate --alignment "Lawful Good" --minLevel 1 --maxLevel 2 --theme "Haunted coastline"`

### Bulk generate from a JSON file

The file must be a JSON array of objects like:

```json
[
  { "alignment": "Lawful Good", "minLevel": 1, "maxLevel": 2, "theme": "Haunted coastline" },
  { "alignment": "Chaotic Evil", "minLevel": 3, "maxLevel": 5, "theme": "Arcane uprising" }
]
```

Run:

- `node ./generator.js bulk-generate ./scenarios.json`

## Environment variable names

- `ADA_WORKER_URL` (preferred)
- `WORKER_URL` / `PROD_WORKER_URL` (accepted aliases)
