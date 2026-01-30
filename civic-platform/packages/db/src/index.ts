export { prisma } from './client';

// Re-export Prisma types/helpers so apps/api never needs to import @prisma/client directly.
export { Prisma, PrismaClient } from '@prisma/client';


