import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __civicPrisma: PrismaClient | undefined;
}

/**
 * Singleton Prisma client.
 *
 * Invariant: PrismaClient is created ONLY here (packages/db).
 */
export const prisma: PrismaClient =
  global.__civicPrisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'production'
        ? ['error', 'warn']
        : ['error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.__civicPrisma = prisma;
}


