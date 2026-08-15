import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const rawUrl = process.env.DATABASE_URL || "";
let optimizedUrl = rawUrl;

try {
  if (rawUrl.includes("pooler.supabase.com") || rawUrl.includes(":6543")) {
    const parsed = new URL(rawUrl);
    const username = parsed.username;
    let projectId = "";
    
    if (username.startsWith("postgres.")) {
      projectId = username.split(".")[1];
    }
    
    if (projectId) {
      optimizedUrl = `postgresql://postgres:${parsed.password}@db.${projectId}.supabase.co:5432/postgres`;
    }
  }
} catch (e) {
  if (rawUrl.includes(":6543")) {
    optimizedUrl = rawUrl.replace(":6543", ":5432").replace("pgbouncer=true", "");
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

