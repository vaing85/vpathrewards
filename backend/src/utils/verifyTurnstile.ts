export async function verifyTurnstile(token: string | undefined): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    // Skip verification if secret key not configured (e.g. local dev)
    return true;
  }
  if (!token) {
    console.warn('[turnstile] no token in request body');
    return false;
  }

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret, response: token }),
  });

  // Cloudflare returns { success, "error-codes": [...] } — log the codes on failure
  // so prod issues like an invalid secret or expired token are diagnosable from
  // Railway logs instead of silently returning 400 to the user. Common codes:
  //   invalid-input-secret   → TURNSTILE_SECRET_KEY is wrong / a placeholder
  //   invalid-input-response → sitekey/secret mismatch, or tampered token
  //   timeout-or-duplicate   → token expired or already used
  // See: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
  const data = await response.json() as { success: boolean; 'error-codes'?: string[] };
  if (!data.success) {
    console.warn('[turnstile] verification failed:', data['error-codes'] ?? '(no codes)');
  }
  return data.success;
}
