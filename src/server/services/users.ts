import { prisma } from "@/server/db/client";
import { FILES_ROOT } from "@/server/files/storage";
import path from "path";
import { rm } from "fs/promises";

export async function deleteUserAndData(userId: number) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  await prisma.$transaction(async (tx) => {
    await tx.userMessage.deleteMany({ where: { userId } });
    await tx.session.deleteMany({ where: { userId } });

    if (user.clientId) {
      const clientId = user.clientId;

      const invoices = await tx.invoice.findMany({ where: { clientId }, select: { id: true } });
      // Delete attachments files on disk
      for (const inv of invoices) {
        const dir = path.join(FILES_ROOT, String(inv.id));
        try {
          await rm(dir, { recursive: true, force: true });
        } catch {}
      }

      // Delete domain rows in safe order
      await tx.payment.deleteMany({ where: { invoice: { clientId } } });
      await tx.attachment.deleteMany({ where: { invoice: { clientId } } });
      await tx.invoiceItem.deleteMany({ where: { invoice: { clientId } } });
      await tx.job.deleteMany({ where: { clientId } });
      await tx.invoice.deleteMany({ where: { clientId } });
      await tx.quoteItem.deleteMany({ where: { quote: { clientId } } });
      await tx.quote.deleteMany({ where: { clientId } });
      await tx.activityLog.deleteMany({
        where: {
          OR: [
            { clientId },
            { invoice: { clientId } },
            { quote: { clientId } },
            { job: { clientId } },
          ],
        },
      });

      await tx.client.delete({ where: { id: clientId } });
    }

    await tx.user.delete({ where: { id: userId } });
  });
}
