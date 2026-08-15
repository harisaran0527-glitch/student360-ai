import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const rawUrl = process.env.DATABASE_URL || "";
let optimizedUrl = rawUrl;

if (rawUrl.includes(":6543")) {
  optimizedUrl = rawUrl
    .replace(":6543", ":5432")
    .replace("pgbouncer=true", "")
    .replace("&&", "&")
    .replace("?&", "?");
  
  if (optimizedUrl.endsWith("?") || optimizedUrl.endsWith("&")) {
    optimizedUrl = optimizedUrl.slice(0, -1);
  }
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: optimizedUrl,
      },
    },
    log: ["query", "error", "warn"],
  });

globalForPrisma.prisma = prisma;

