// VITE_* vars are inlined at build time, so a missing VITE_API_URL silently
// fell back to localhost and broke every API call in production. Warn loudly
// instead of failing quietly.
if (import.meta.env.PROD && !import.meta.env.VITE_API_URL) {
  console.error(
    '[config] VITE_API_URL is not set. Falling back to http://localhost:3001/api, ' +
    'which will fail in production. Set VITE_API_URL on the frontend service and rebuild.'
  );
}

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
