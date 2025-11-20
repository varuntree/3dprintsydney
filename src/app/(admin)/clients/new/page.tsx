import { Suspense } from "react";
import { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Skeleton } from "@/components/ui/skeleton";
import { ClientCreateForm } from "@/components/clients/client-create-form";

export const metadata: Metadata = {
  title: "Add new client",
};

// This seems to be a static page mostly, but ClientCreateForm is client-side
export default function ClientNewPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Add client"
        description="Create a new client profile to begin quoting or invoicing."
      >
        <Breadcrumbs
          items={[
            { label: "Clients", href: "/clients" },
            { label: "New", current: true },
          ]}
        />
      </PageHeader>
      <Suspense
        fallback={
          <div className="space-y-4">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-[400px] w-full" />
          </div>
        }
      >
        <ClientCreateForm />
      </Suspense>
    </div>
  );
}

