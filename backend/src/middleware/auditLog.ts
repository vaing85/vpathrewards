import { Request } from 'express';
import { dbRun } from '../database';

export interface AuditEvent {
  adminId: number;
  action: string;   // e.g. 'UPDATE_WITHDRAWAL_STATUS', 'DELETE_USER'
  resource: string; // e.g. 'withdrawal', 'user'
  resourceId?: string | number;
  details?: Record<string, unknown>;
  req: Request;
}

/**
 * Write one row to admin_audit_log.
 * Fire-and-forget: errors are logged but do NOT propagate to the caller.
 */
export function auditLog(event: AuditEvent): void {
  const ip = (event.req.headers['x-forwarded-for'] as string | undefined)
    ?.split(',')[0]
    .trim() ?? event.req.socket.remoteAddress ?? null;

  dbRun(
    `INSERT INTO admin_audit_log (admin_id, action, resource, resource_id, details, ip_address)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      event.adminId,
      event.action,
      event.resource,
      event.resourceId != null ? String(event.resourceId) : null,
      event.details ? JSON.stringify(event.details) : null,
      ip,
    ]
  ).catch((err) => console.error('auditLog write failed:', err));
}
