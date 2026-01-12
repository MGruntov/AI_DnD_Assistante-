\# ADA — AI D\&D Assistant

ADA is a browser-based D\&D helper with a Cloudflare Worker backend. It supports:

- **Voice capture** and session transcripts
- **Character forging** (two modes)
	- **AI forge** (narrative \→ mechanics)
	- **Interactive forge** (step-by-step SRD-style decision tree)
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
	forge.html              # Character Forge (AI + interactive decision-tree mode)
	speech.js               # Frontend logic (auth, campaigns, AI-DM chat, speech capture)
	style.css               # Frontend styling
	js/character-generator.js # Client-side decision-tree generator (interactive + random)
	character_decision_tree.json # Decision tree (generated) powering interactive creation
	character_sheet_initial.json  # Initial sheet state for decision-tree engine
	character_domain_creator.py   # Python domain+actions generator for the decision tree
	compile_actions.py            # Python compiler that writes decision tree JSON
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
	- Character Forge has:
		- **AI forge** (backend-driven narrative \→ mechanics)
		- **Interactive forge** (client-side decision tree; user picks options)

#### Interactive Forge (decision tree)

The interactive character creator runs entirely in the browser using:

- `js/character-generator.js`
- `character_decision_tree.json` (a `decisions` array)
- `character_sheet_initial.json`

Each decision is a record with an `id` and optional `title`, plus:

- `preconditions`: array of tuples `[param, op, expected]`
- `effects`: array of tuples `[param, op, value]`

Supported effect ops include `set`, `add`, `inc`, `dec`.
The sheet becomes valid when `validate_character_sheet` can be applied (all required choices/counters are satisfied).

#### Portrait image generation provider

Character portrait thumbnails are generated client-side by building an image URL from a prompt + seed.

- Default provider: **Pollinations**
- To switch providers (e.g. to **Nanobanana**), set these keys in the browser console:
	- `localStorage.setItem("adaPortraitImageProvider", "nanobanana")`

By default, `nanobanana` uses the backend Worker endpoint (`/api/portraits/generate`) which calls Gemini server-side (so your API key stays private).

If you *do* have a direct image URL template you want to use instead, you can override it with:

	- `localStorage.setItem("adaPortraitImageUrlTemplate", "<YOUR_IMAGE_URL_TEMPLATE>")`

The URL template must include:

- `{prompt}` — URL-encoded prompt
- `{seed}` — seed number

Example (Pollinations):

- `https://image.pollinations.ai/prompt/{prompt}?seed={seed}`

 If `nanobanana`/`custom` is selected but no template is configured, the UI will automatically fall back to Pollinations.

When `adaPortraitImageProvider` is set to `nanobanana` (or `custom`), the client will **try that URL first**; if the image request fails to load, it will automatically **retry with Pollinations**.

### Backend (Cloudflare Worker)

- TypeScript Worker with KV storage (binding: `ADA_DATA`).
- Exposes REST-like endpoints used by the frontend.
- Integrates with **Google Gemini** for:
	- character forging
	- AI-DM narration + mechanics
	- journal generation
- Includes health/debug endpoints for AI observability.

#### Character endpoints used by the Forge

- `POST /api/characters/forge` — AI forge (server builds a character from narrative inputs)
- `POST /api/characters/save-sheet` — interactive forge save/update (server stores the full decision-tree sheet)

`/api/characters/save-sheet` is required for saving interactive characters. The UI will show a clear error if the backend is missing this endpoint.

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

Notes:

- The **interactive forge** can run client-side without the backend.
- Saving an interactive character to **My Characters** requires the backend endpoint `POST /api/characters/save-sheet`.

---

## Deploying

The backend deploy must be run **from** `backend/backend/`:

- `cd backend/backend`
- `npm run deploy`

If you run deploy from the repo root, it may fail (wrong working directory).

The frontend can be hosted anywhere static (GitHub Pages, Cloudflare Pages, Nginx, etc.).

---

## Key features (what changed recently)

### Interactive Character Forge (decision-tree)

Recent work focused on making the interactive forge robust and “finishable”:

- Dynamic import hardening for `js/character-generator.js` (handles default-vs-named export differences).
- Loader compatibility for decision tree shapes (legacy object vs `decisions` array) + cache-busting fetch.
- Expanded progress panel (race/class/background, ability scores, resources) and visible “choices remaining” counters.
- Decision/effect support improvements:
	- new `dec` operation in the client decision-tree engine
	- friendlier button titles via `decision.title`
- Save flow:
	- new backend endpoint `POST /api/characters/save-sheet` to persist full interactive sheets
	- finish action navigates to **My Characters (Vault)** after successful save
	- clearer guidance when the backend is missing the save endpoint (no silent fallback)

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

