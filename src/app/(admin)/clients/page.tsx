import {
  ClientsView,
  type ClientSummaryRecord,
} from "@/components/clients/clients-view";
import { listClients } from "@/server/services/clients";

interface ClientsPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ClientsPage({ searchParams }: ClientsPageProps) {
  const clients = await listClients();
  const initial: ClientSummaryRecord[] = clients.map((client) => ({
    ...client,
    company: client.company ?? "",
    email: client.email ?? "",
    phone: client.phone ?? "",
    createdAt: client.createdAt.toISOString(),
  }));

  const resolvedParams = searchParams ? await searchParams : undefined;

  const startOpen = (() => {
    const value = resolvedParams?.new;
    if (!value) return false;
    if (Array.isArray(value)) {
      return value.some((item) => item === "1" || item === "true");
    }
    return value === "1" || value === "true";
  })();

  return (
    <div className="space-y-6">
      <ClientsView initialClients={initial} startOpen={startOpen} />
    </div>
  );
}
