import { prisma } from "@/server/db/client";
import type { Prisma } from "@prisma/client";

function pad(value: number) {
  return value.toString().padStart(4, "0");
}

export async function nextDocumentNumber(
  kind: "quote" | "invoice",
  tx?: Prisma.TransactionClient,
) {
  // Inner operation that uses the provided transaction client.
  const run = async (db: Prisma.TransactionClient) => {
    const settings = await db.settings.findUnique({ where: { id: 1 } });
    const desiredPrefix =
      kind === "quote"
        ? (settings?.numberingQuotePrefix ?? "QT-")
        : (settings?.numberingInvoicePrefix ?? "INV-");

    const sequence = await db.numberSequence.upsert({
      where: { kind },
      update: {
        current: { increment: 1 },
        prefix: desiredPrefix,
      },
      create: {
        kind,
        prefix: desiredPrefix,
        current: 1,
      },
    });

    return `${sequence.prefix}${pad(sequence.current)}`;
  };

  // If caller provided a tx, reuse it to avoid nested transactions (SQLite single-writer).
  if (tx) return run(tx);

  // Otherwise, run as a standalone transaction.
  return prisma.$transaction(async (db) => run(db));
}
