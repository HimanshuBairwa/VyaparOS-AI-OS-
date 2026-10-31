import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

if (typeof process !== 'undefined') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

// On Vercel serverless environments, SQLite must reside in /tmp
if (process.env.VERCEL) {
  const tmpDbPath = '/tmp/dev.db';
  if (!fs.existsSync(tmpDbPath)) {
    const candidatePaths = [
      path.join(process.cwd(), 'prisma', 'template.db'),
      path.join(process.cwd(), 'prisma', 'dev.db'),
      path.join(process.cwd(), 'dev.db'),
    ];
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        try {
          fs.copyFileSync(p, tmpDbPath);
          break;
        } catch (e) {
          console.warn('Could not copy db to /tmp:', e);
        }
      }
    }
  }
  process.env.DATABASE_URL = `file:${tmpDbPath}`;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
