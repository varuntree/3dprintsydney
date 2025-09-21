import { notFound } from "next/navigation";
import {
  ClientDetail,
  type ClientDetailRecord,
} from "@/components/clients/client-detail";
import { getClientDetail } from "@/server/services/clients";

interface ClientDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientDetailPage({
  params,
}: ClientDetailPageProps) {
  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isFinite(id)) {
    notFound();
  }

  try {
    const detail = await getClientDetail(id);
    const payload: ClientDetailRecord = {
      client: {
        ...detail.client,
        createdAt: detail.client.createdAt.toISOString(),
        updatedAt: detail.client.updatedAt.toISOString(),
      },
      invoices: detail.invoices.map((invoice) => ({
        ...invoice,
        issueDate: invoice.issueDate.toISOString(),
      })),
      quotes: detail.quotes.map((quote) => ({
        ...quote,
        issueDate: quote.issueDate.toISOString(),
      })),
      jobs: detail.jobs.map((job) => ({
        ...job,
        createdAt: job.createdAt.toISOString(),
      })),
      activity: detail.activity.map((entry) => ({
        ...entry,
        createdAt: entry.createdAt.toISOString(),
      })),
      totals: detail.totals,
    };

    return (
      <div className="space-y-6">
        <ClientDetail detail={payload} />
      </div>
    );
  } catch {
    notFound();
  }
}
