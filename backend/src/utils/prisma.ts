import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';

function getNormalizedDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url) return undefined;

  let normalized = url.trim();

  // If using Neon or remote Postgres, ensure SSL is enabled if not already present
  if (normalized.includes('neon.tech')) {
    const hasQuery = normalized.includes('?');
    const separator = hasQuery ? '&' : '?';
    if (!normalized.includes('sslmode=')) {
      normalized = `${normalized}${separator}sslmode=require`;
    }
    // If using Neon connection pooling (-pooler), ensure pgbouncer=true for Prisma compatibility
    if (normalized.includes('-pooler') && !normalized.includes('pgbouncer=')) {
      const nextSep = normalized.includes('?') ? '&' : '?';
      normalized = `${normalized}${nextSep}pgbouncer=true`;
    }
  }

  return normalized;
}

const dbUrl = getNormalizedDatabaseUrl();

const prisma = new PrismaClient(
  dbUrl
    ? {
        datasources: {
          db: {
            url: dbUrl,
          },
        },
      }
    : undefined
);

export default prisma;

