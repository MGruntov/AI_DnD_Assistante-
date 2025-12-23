\# ADA — AI D\&D Assistant

ADA is a browser-based D\&D helper with a Cloudflare Worker backend. It supports:

- **Voice capture** and session transcripts
- **Character forging** (narrative \→ mechanics)
- **Campaigns** (standard multiplayer + AI-solo campaigns)
- **AI-DM** gameplay with **checks/roll resolution** driven by character stats
- **Per-character journals** generated from the campaign transcript
- **System-managed progression** (XP, level-ups, HP/mana resources)
- A **read-only chat-style Dialogue UI** (phone-text style bubbles)

> Note: This project uses only publicly available rules references (e.g. SRD-style lookups) and does not ship proprietary rulebook text.

---

## Repo layout (current)

Frontend is a simple static app at the repo root, and the backend is a Cloudflare Worker under `backend/backend/`.

```text
AI_DnD_Assistante-/
	index.html              # Frontend SPA shell
	speech.js               # Frontend logic (auth, campaigns, AI-DM chat, speech capture)
	style.css               # Frontend styling
	dnd_chars_all.csv       # Data file (used by backend features)
	backend/
		backend/
			src/index.ts        # Cloudflare Worker (API + KV persistence + Gemini integration)
			public/index.html   # Worker-served landing page (optional)
			wrangler.jsonc      # Worker config (KV binding, assets, compatibility date)
			package.json        # Wrangler/Vitest scripts
			test/               # Vitest tests
```

---

## Architecture overview

### Frontend (static)

- Runs entirely in the browser (no build step).
- Automatically targets:
	- `http://localhost:8787` when opened from `localhost`
	- the production Worker URL otherwise.
- Key UI modules:
	- Campaign dashboard tabs (Characters / Journals / Script / Dialogue)
	- Dialogue tab uses a **non-editable message thread** + a bottom composer.

### Backend (Cloudflare Worker)

- TypeScript Worker with KV storage (binding: `ADA_DATA`).
- Exposes REST-like endpoints used by the frontend.
- Integrates with **Google Gemini** for:
	- character forging
	- AI-DM narration + mechanics
	- journal generation
- Includes health/debug endpoints for AI observability.

---

## Running locally

### 1) Backend (Worker)

From the Worker directory:

- `cd backend/backend`
- install deps (first time): `npm install`
- run locally: `npm run dev`

#### Required secrets / vars

- `GEMINI_API_KEY` (**required**) — store as a Worker secret.
- `ADA_DEBUG=1` (optional) — when enabled, AI endpoints may include debug metadata (e.g. selected model name).

For production:

- use Wrangler secrets: `wrangler secret put GEMINI_API_KEY`

For local development:

- set `GEMINI_API_KEY` in your Wrangler dev vars (recommended: `.dev.vars`) or your shell env.

> Do not commit API keys.

### 2) Frontend (static)

You can open `index.html` directly, but speech + fetch behave more reliably when served over HTTP.

- from repo root: run any static server (example: `python3 -m http.server`)
- open the shown URL in Chrome/Edge

---

## Deploying

The backend deploy must be run **from** `backend/backend/`:

- `cd backend/backend`
- `npm run deploy`

If you run deploy from the repo root, it may fail (wrong working directory).

The frontend can be hosted anywhere static (GitHub Pages, Cloudflare Pages, Nginx, etc.).

---

## Key features (what changed recently)

### Dialogue UI (Campaign → Dialogue)

- Transcript history is displayed as a **read-only chat thread** (phone-text style).
- Player messages are labeled with your **linked character name** (falls back to username/“You”).
- New messages auto-scroll the thread to the bottom.
- A bottom composer input supports typing alongside voice capture.

### AI-DM gameplay

- `POST /api/ai-dm/turn` continues the story.
- Responses include a strict narrative/mechanics contract.
- Progression is DM-controlled using a `progress` directive (e.g. stay/advance/complete).

### Checks / rolls (Step 8 mechanics)

- `POST /api/ai-dm/resolve-check` resolves an AI-requested check using:
	- character ability modifiers
	- skill proficiency (and saving throw proficiency when applicable)
	- advantage/disadvantage handling

### Journals

- Campaign dashboard includes **Create journals (each character)**.
- Backend generates one first-person journal per linked character using campaign transcript.

### Progression (XP / HP / mana)

- Characters have system-managed progression fields.
- XP is awarded on campaign completion (AI-solo auto completion + manual completion action for standard campaigns).
- Level-ups are gated by XP thresholds and performed via a backend endpoint.

---

## Health & debugging

To verify AI connectivity/model resolution:

- `GET /api/health/ai`
- `GET /api/health/ai/models`

If `ADA_DEBUG=1` is enabled, some AI responses include debug metadata like the resolved Gemini model.

---

## Troubleshooting

- **Logout does nothing / buttons stop working**: open DevTools Console. A JavaScript error at page load will prevent event listeners from registering.
- **Speech capture not working**: use a Chromium-based browser (Chrome/Edge) and serve the page over HTTP.
- **Deploy fails from repo root**: deploy from `backend/backend/`.

