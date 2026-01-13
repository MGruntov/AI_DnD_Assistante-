# Backend Configuration

## Backend URL Locations

There are 3 locations in the codebase where the backend URL is specified. Each location has two options:
- **Option 1** (currently active): `https://backend.ada-assistante.workers.dev` - Shared backend (this repo's default)
- **Option 2** (commented out): `https://backend.ev713-backend.workers.dev` - ev713's personal backend (separate Cloudflare account/resources)

### 1. forge.html - Line 364
Direct assignment of backend URL:
```javascript
const backendUrl = 'https://backend.ada-assistante.workers.dev';
```

### 2. forge.html - Lines 589-592
Function with configurable backend options:
```javascript
// BACKEND OPTIONS - Choose one:
// Option 1: Shared backend (default)
return 'https://backend.ada-assistante.workers.dev';
// Option 2: ev713's personal backend (uncomment below, comment above)
// return 'https://backend.ev713-backend.workers.dev';
```

### 3. speech.js - Lines 932-935
Production backend base URL constant:
```javascript
// BACKEND OPTIONS - Choose one:
// Option 1: Shared backend (default)
const PROD_BACKEND_BASE_URL = "https://backend.ada-assistante.workers.dev";
// Option 2: ev713's personal backend (uncomment below, comment above)
// const PROD_BACKEND_BASE_URL = "https://backend.ev713-backend.workers.dev";
```

### 4. js/pages/hud.js - computeBackendBaseUrl()
HUD has a small fallback backend resolver. It will prefer `window.ADA.config.BACKEND_BASE_URL` when available,
but has its own defaults for robustness.

## Switching Backends

To switch between backends:
1. Locate each of the 3 locations listed above
2. Comment out the currently active option
3. Uncomment the desired option
4. Ensure all 3 locations use the same backend for consistency
