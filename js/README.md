# Frontend module split

This folder contains the start of an ES-module split of the previous monolithic `speech.js`.

- `api.js`: auth token storage + auth header helpers
- `api-client.js`: fetch wrappers that automatically attach auth headers
- `app.js`: bootstrap module imported by every page
- `speech-engine.js` / `ui-manager.js`: placeholders for incremental extraction

All HTML pages now load `js/app.js` as a module.
