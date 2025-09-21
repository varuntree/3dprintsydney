import { PaymentMethod } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { createClient } from "@/server/services/clients";
import { createQuote, convertQuoteToInvoice } from "@/server/services/quotes";
import { markInvoicePaid } from "@/server/services/invoices";
import {
  exportInvoicesCsv,
  exportJobsCsv,
  exportPaymentsCsv,
} from "@/server/services/exports";

async function ensureBaseline() {
  const settings = await prisma.settings.findFirst();
  if (!settings) {
    throw new Error(
      "Settings record missing. Run `npm run db:seed` before the smoke check.",
    );
  }

  const template = await prisma.productTemplate.findFirst();
  if (!template) {
    throw new Error(
      "No product templates found. Seed the database before the smoke check.",
    );
  }

  return { templateId: template.id };
}

async function run() {
  const { templateId } = await ensureBaseline();

  const client = await createClient({
    name: "Smoke Test Client",
    company: "QA Holdings",
    email: "qa@example.com",
    phone: "+61 400 555 000",
    address: "10 Test Ave, Sydney",
    paymentTerms: "Due on receipt",
    notes: "Created by automated smoke test",
    tags: ["qa"],
  });

  const quote = await createQuote({
    clientId: client.id,
    issueDate: new Date().toISOString(),
    taxRate: 10,
    discountType: "NONE",
    lines: [
      {
        productTemplateId: templateId,
        name: "Functional Print",
        description: "Automated QA line item",
        quantity: 1,
        unit: "job",
        unitPrice: 180,
        discountType: "NONE",
      },
    ],
  });

  const invoice = await convertQuoteToInvoice(quote.id);

  const payment = await markInvoicePaid(invoice.id, {
    method: PaymentMethod.BANK_TRANSFER,
    amount: Number(invoice.total ?? 0),
    reference: "SMOKE-QA",
    note: "Automated payment",
  });

  if (!payment) {
    // markInvoicePaid returns null when the invoice had zero balance
    throw new Error("Payment not recorded during smoke test");
  }

  const job = await prisma.job.findFirst({ where: { invoiceId: invoice.id } });
  if (!job) {
    throw new Error("Job was not created after payment.");
  }

  const [invoicesCsv, paymentsCsv, jobsCsv] = await Promise.all([
    exportInvoicesCsv(),
    exportPaymentsCsv(),
    exportJobsCsv(),
  ]);

  console.log("Smoke test succeeded:");
  console.log(
    JSON.stringify(
      {
        clientId: client.id,
        quoteId: quote.id,
        invoiceId: invoice.id,
        paymentId: payment.id,
        jobId: job.id,
        exports: {
          invoices: invoicesCsv.filename,
          payments: paymentsCsv.filename,
          jobs: jobsCsv.filename,
        },
      },
      null,
      2,
    ),
  );

  return { clientId: client.id, quoteId: quote.id, invoiceId: invoice.id };
}

async function cleanup(ids: { clientId: number; quoteId: number; invoiceId: number }) {
  await prisma.attachment.deleteMany({ where: { invoiceId: ids.invoiceId } });
  await prisma.activityLog.deleteMany({
    where: {
      OR: [
        { invoiceId: ids.invoiceId },
        { quoteId: ids.quoteId },
        { clientId: ids.clientId },
      ],
    },
  });
  await prisma.payment.deleteMany({ where: { invoiceId: ids.invoiceId } });
  await prisma.job.deleteMany({ where: { invoiceId: ids.invoiceId } });
  await prisma.invoice.delete({ where: { id: ids.invoiceId } });
  await prisma.quote.delete({ where: { id: ids.quoteId } });
  await prisma.client.delete({ where: { id: ids.clientId } });
}

run()
  .then(async (ids) => {
    await cleanup(ids);
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Smoke test failed", error);
    await prisma.$disconnect();
    process.exit(1);
  });
