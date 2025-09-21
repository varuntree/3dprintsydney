import { PrismaClient } from "@prisma/client";
import { ensureStorage } from "@/server/files/storage";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
    transactionOptions: {
      maxWait: 10000, // Increased from 5000ms to 10000ms
      timeout: 10000, // Increased timeout to 10 seconds
    },
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

(async () => {
  try {
    await ensureStorage();
    await prisma.$queryRawUnsafe("PRAGMA journal_mode=WAL;");
    await prisma.$queryRawUnsafe("PRAGMA synchronous=NORMAL;");
    await prisma.$queryRawUnsafe("PRAGMA foreign_keys=ON;");
  } catch (error) {
    console.error("Failed to initialize storage or database pragmas", error);
  }
})();
