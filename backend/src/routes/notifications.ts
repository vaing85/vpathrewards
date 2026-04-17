import express from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { dbAll, dbGet, dbRun } from '../database';

const router = express.Router();

// GET /notifications — get user's notifications (most recent 50)
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const notifications = await dbAll(
      `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
      [req.userId]
    );
    const unreadCount = await dbGet(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
      [req.userId]
    ) as { count: number };
    res.json({ notifications, unread_count: unreadCount?.count || 0 });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /notifications/read-all — mark all as read
router.put('/read-all', authenticateToken, async (req: AuthRequest, res) => {
  try {
    await dbRun('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.userId]);
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking notifications read:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /notifications/:id/read — mark single notification as read
router.put('/:id/read', authenticateToken, async (req: AuthRequest, res) => {
  try {
    await dbRun(
      'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification read:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

// Helper used by other routes to create & push notifications
export async function createNotification(
  userId: number,
  type: string,
  title: string,
  message: string
): Promise<void> {
  try {
    const result = await dbRun(
      'INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)',
      [userId, type, title, message]
    );
    // Push real-time via SSE (lazy import to avoid circular dep)
    const { pushToUser } = await import('./sse');
    pushToUser(userId, { type: 'notification', id: result.lastID, notificationType: type, title, message });
  } catch (error) {
    console.error('Error creating notification:', error);
  }
}
