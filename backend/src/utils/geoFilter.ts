import https from 'https';

interface CacheEntry {
  state: string | null;
  expires: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

const PRIVATE_IP_PREFIXES = ['127.', '10.', '192.168.', '172.16.', '172.17.', '172.18.', '172.19.', '172.20.', '172.21.', '172.22.', '172.23.', '172.24.', '172.25.', '172.26.', '172.27.', '172.28.', '172.29.', '172.30.', '172.31.'];

function isPrivateIp(ip: string): boolean {
  return ip === '::1' || PRIVATE_IP_PREFIXES.some(p => ip.startsWith(p));
}

/** Look up the 2-letter US state code for an IP address. Returns null if unknown or non-US. */
export async function getStateFromIp(ip: string): Promise<string | null> {
  if (!ip || isPrivateIp(ip)) return null;

  const cached = cache.get(ip);
  if (cached && cached.expires > Date.now()) return cached.state;

  return new Promise((resolve) => {
    const req = https.get(`https://ipapi.co/${ip}/json/`, { timeout: 2000 }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          // Only return state for US addresses
          const state = json.country_code === 'US' && json.region_code ? (json.region_code as string).toUpperCase() : null;
          cache.set(ip, { state, expires: Date.now() + CACHE_TTL_MS });
          resolve(state);
        } catch {
          cache.set(ip, { state: null, expires: Date.now() + CACHE_TTL_MS });
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

/** Returns true if the offer should be blocked for the given user state. */
export function isGeoBlocked(excludedStates: string | null | undefined, userState: string | null): boolean {
  if (!excludedStates || !userState) return false;
  const blocked = excludedStates.split(',').map((s) => s.trim().toUpperCase());
  return blocked.includes(userState.toUpperCase());
}

/** Extract the real client IP from an Express request. */
export function getClientIp(req: { ip?: string; headers: Record<string, string | string[] | undefined> }): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const first = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
    return first.trim();
  }
  return req.ip || '127.0.0.1';
}
