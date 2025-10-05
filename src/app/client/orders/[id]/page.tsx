export const dynamic = "force-dynamic";

import { redirect, notFound } from "next/navigation";
import { getUserFromCookies } from "@/server/auth/session";
import { getInvoiceDetail } from "@/server/services/invoices";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { InvoiceConversation } from "@/components/messages/invoice-conversation";
import { PostAndMessageSidebar } from "@/components/messages/sidebar";

interface ClientInvoicePageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientInvoiceDetailPage({ params }: ClientInvoicePageProps) {
  const user = await getUserFromCookies();
  if (!user) redirect("/login");
  if (user.role !== "CLIENT") redirect("/");

  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isFinite(id) || id <= 0) notFound();

  try {
    const detail = await getInvoiceDetail(id);
    if (user.clientId !== detail.client.id) redirect("/client/orders");

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card className="border border-border bg-surface-overlay">
            <CardHeader>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Invoice {detail.number}</CardTitle>
                  <p className="text-xs text-muted-foreground">Issued {detail.issueDate.toLocaleDateString()}</p>
                </div>
                <Badge variant="outline">{detail.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Subtotal</div>
                  <div>${detail.subtotal.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Tax</div>
                  <div>${detail.taxTotal.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Total</div>
                  <div className="font-medium">${detail.total.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Balance</div>
                  <div className="font-medium">${detail.balanceDue.toFixed(2)}</div>
                </div>
              </div>
              {detail.stripeCheckoutUrl ? (
                <div className="pt-2 text-sm">
                  <a className="underline" href={detail.stripeCheckoutUrl}>Pay online</a>
                </div>
              ) : null}
            </CardContent>
            </Card>

            <Card className="border border-border bg-surface-overlay">
            <CardHeader>
              <CardTitle className="text-base">Attachments</CardTitle>
            </CardHeader>
            <CardContent>
              {detail.attachments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No attachments.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Size</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.attachments.map((att) => (
                      <TableRow key={att.id}>
                        <TableCell>
                          <a href={`/api/attachments/${att.id}`} className="underline">{att.filename}</a>
                        </TableCell>
                        <TableCell>{att.filetype ?? ""}</TableCell>
                        <TableCell className="text-right">{formatSize(att.size)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
            </Card>
          </div>
          <aside className="space-y-6">
            <PostAndMessageSidebar invoiceId={detail.id} />
          </aside>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card className="border border-border bg-surface-overlay">
              <CardHeader>
                <CardTitle className="text-base">Messages</CardTitle>
              </CardHeader>
              <CardContent>
                <InvoiceConversation invoiceId={detail.id} />
              </CardContent>
            </Card>
          </div>
          <div />
        </div>
      </div>
    );
  } catch {
    notFound();
  }
}

function formatSize(size: number) {
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  if (size >= 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${size} B`;
}
