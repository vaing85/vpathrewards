/**
 * Server-Sent Events endpoint for real-time notifications.
 * GET /api/sse  (requires Bearer token in ?token= query param since
 * browser EventSource can't set headers).
 */
import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

const router = Router();

// userId → set of SSE response objects
const clients = new Map<number, Set<Response>>();

export function pushToUser(userId: number, payload: object) {
  const conns = clients.get(userId);
  if (!conns) return;
  const data = JSON.stringify(payload);
  conns.forEach((res) => {
    try { res.write(`data: ${data}\n\n`); } catch (_) { /* stale connection */ }
  });
}

router.get('/', (req: Request, res: Response) => {
  const token = (req.query.token as string) || '';
  let userId: number;
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { userId: number };
    userId = payload.userId;
  } catch {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // nginx: disable proxy buffering
  res.flushHeaders();

  res.write('data: {"type":"connected"}\n\n');

  if (!clients.has(userId)) clients.set(userId, new Set());
  clients.get(userId)!.add(res);

  const heartbeat = setInterval(() => {
    try { res.write(': heartbeat\n\n'); } catch (_) { clearInterval(heartbeat); }
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    clients.get(userId)?.delete(res);
    if (clients.get(userId)?.size === 0) clients.delete(userId);
  });
});

export default router;
