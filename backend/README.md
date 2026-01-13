# Backend Configuration

## Backend URL Locations

There are 3 locations in the codebase where the backend URL is specified. Each location has two options:
- **Option 1** (currently active): `https://backend.ev713-backend.workers.dev` - ev713's personal backend with fresh database
- **Option 2** (commented out): `https://backend.ada-assistante.workers.dev` - Original shared backend with all user data

### 1. forge.html - Line 364
Direct assignment of backend URL:
```javascript
const backendUrl = 'https://backend.ev713-backend.workers.dev';
```

### 2. forge.html - Lines 589-592
Function with configurable backend options:
```javascript
// BACKEND OPTIONS - Choose one:
// Option 1: ev713's personal backend
return 'https://backend.ev713-backend.workers.dev';
// Option 2: Original shared backend (uncomment below, comment above)
// return 'https://backend.ada-assistante.workers.dev';
```

### 3. speech.js - Lines 932-935
Production backend base URL constant:
```javascript
// BACKEND OPTIONS - Choose one:
// Option 1: ev713's personal backend (fresh database, your own resources)
const PROD_BACKEND_BASE_URL = "https://backend.ev713-backend.workers.dev";
// Option 2: Original shared backend (has all user data, requires owner's account to deploy)
// const PROD_BACKEND_BASE_URL = "https://backend.ada-assistante.workers.dev";
```

## Switching Backends

To switch between backends:
1. Locate each of the 3 locations listed above
2. Comment out the currently active option
3. Uncomment the desired option
4. Ensure all 3 locations use the same backend for consistency
