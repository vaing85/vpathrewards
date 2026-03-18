import { dbAll, dbGet, dbRun } from '../database';

export interface ListMerchantsParams {
  search?: string;
  category?: string;
  minCashback?: number;
  sort?: 'cashback' | 'name' | 'offers' | string;
  page?: number;
  limit?: number;
}

export async function listMerchants(params: ListMerchantsParams = {}) {
  const { search, category, minCashback, sort = 'name', page = 1, limit = 20 } = params;
  const pageNum = Math.max(1, page);
  const limitNum = Math.min(100, Math.max(1, limit));
  const offset = (pageNum - 1) * limitNum;

  let query = `
    SELECT 
      m.*,
      COUNT(o.id) as offer_count,
      MAX(o.cashback_rate) as max_cashback
    FROM merchants m
    LEFT JOIN offers o ON m.id = o.merchant_id AND o.is_active = 1
    WHERE 1=1
  `;
  const queryParams: unknown[] = [];

  if (search) {
    const term = `%${search}%`;
    query += ` AND (m.name LIKE ? OR m.description LIKE ?)`;
    queryParams.push(term, term);
  }
  if (category) {
    query += ` AND m.category = ?`;
    queryParams.push(category);
  }
  if (minCashback != null) {
    query += ` AND (SELECT MAX(cashback_rate) FROM offers WHERE merchant_id = m.id AND is_active = 1) >= ?`;
    queryParams.push(minCashback);
  }
  query += ` GROUP BY m.id`;

  switch (sort) {
    case 'cashback':
      query += ` ORDER BY max_cashback DESC, m.name`;
      break;
    case 'name':
      query += ` ORDER BY m.name ASC`;
      break;
    case 'offers':
      query += ` ORDER BY offer_count DESC, m.name`;
      break;
    default:
      query += ` ORDER BY m.name`;
  }

  let countQuery = `
    SELECT COUNT(DISTINCT m.id) as total
    FROM merchants m
    LEFT JOIN offers o ON m.id = o.merchant_id AND o.is_active = 1
    WHERE 1=1
  `;
  const countParams: unknown[] = [];
  if (search) {
    const term = `%${search}%`;
    countQuery += ` AND (m.name LIKE ? OR m.description LIKE ?)`;
    countParams.push(term, term);
  }
  if (category) {
    countQuery += ` AND m.category = ?`;
    countParams.push(category);
  }
  if (minCashback != null) {
    countQuery += ` AND (SELECT MAX(cashback_rate) FROM offers WHERE merchant_id = m.id AND is_active = 1) >= ?`;
    countParams.push(minCashback);
  }

  const totalResult = await dbGet(countQuery, countParams) as { total: number };
  const total = totalResult?.total || 0;
  const totalPages = Math.ceil(total / limitNum);

  query += ` LIMIT ? OFFSET ?`;
  queryParams.push(limitNum, offset);
  const merchants = await dbAll(query, queryParams);

  return {
    data: merchants || [],
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages,
      hasNext: pageNum < totalPages,
      hasPrev: pageNum > 1
    }
  };
}

export async function getMerchantById(id: string | number) {
  return dbGet('SELECT * FROM merchants WHERE id = ?', [id]);
}

export async function getReviews(merchantId: string | number) {
  const merchant = await dbGet('SELECT id FROM merchants WHERE id = ?', [merchantId]);
  if (!merchant) return null;

  const reviews = await dbAll(
    `SELECT r.id, r.merchant_id, r.user_id, r.rating, r.comment, r.created_at, u.name as user_name
     FROM merchant_reviews r
     JOIN users u ON r.user_id = u.id
     WHERE r.merchant_id = ?
     ORDER BY r.created_at DESC`,
    [merchantId]
  );
  const stats = await dbGet(
    `SELECT COUNT(*) as count, AVG(rating) as avg_rating FROM merchant_reviews WHERE merchant_id = ?`,
    [merchantId]
  ) as { count: number; avg_rating: number | null };

  return {
    reviews,
    average_rating: stats?.avg_rating != null ? Math.round(parseFloat(String(stats.avg_rating)) * 10) / 10 : null,
    total_count: stats?.count ?? 0
  };
}

export async function upsertReview(merchantId: number, userId: number, rating: number, comment: string | null) {
  const merchant = await dbGet('SELECT id FROM merchants WHERE id = ?', [merchantId]);
  if (!merchant) return null;
  const commentStr = comment != null && comment.length > 0 ? comment.slice(0, Math.min(2000, comment.length)) : null;
  await dbRun(
    'INSERT INTO merchant_reviews (merchant_id, user_id, rating, comment) VALUES (?, ?, ?, ?) ON CONFLICT(merchant_id, user_id) DO UPDATE SET rating = excluded.rating, comment = excluded.comment',
    [merchantId, userId, Math.round(rating), commentStr]
  );
  return dbGet(
    `SELECT r.*, u.name as user_name FROM merchant_reviews r JOIN users u ON r.user_id = u.id WHERE r.merchant_id = ? AND r.user_id = ?`,
    [merchantId, userId]
  );
}

export async function getOffersForMerchant(merchantId: string | number) {
  return dbAll(
    `SELECT o.*, m.name as merchant_name
     FROM offers o
     JOIN merchants m ON o.merchant_id = m.id
     WHERE o.merchant_id = ? AND o.is_active = 1
     ORDER BY o.cashback_rate DESC`,
    [merchantId]
  );
}
