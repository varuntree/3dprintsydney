"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, GitBranch } from "lucide-react";

export function WorkflowsSection() {
  return (
    <div className="space-y-6">
      {/* Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Business Workflows Overview</CardTitle>
          </div>
          <CardDescription>
            High-level view of key business processes and state transitions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This section provides a simplified overview of the main business workflows in the
            system. These processes govern how quotes become invoices, how payments are
            processed, and how jobs are managed from creation to completion.
          </p>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Note:</strong> This is a high-level overview. For detailed technical
              implementation, refer to the full system documentation.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Quote to Invoice Workflow */}
      <Card>
        <CardHeader>
          <CardTitle>Quote → Invoice → Job Workflow</CardTitle>
          <CardDescription>
            The complete lifecycle from initial quote to job creation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Visual Flow */}
          <div className="bg-slate-50 p-6 rounded-lg border overflow-x-auto">
            <div className="flex items-center gap-3 text-sm font-mono whitespace-nowrap">
              <div className="flex flex-col items-center">
                <Badge>DRAFT</Badge>
                <span className="text-xs text-muted-foreground mt-1">Quote</span>
              </div>
              <span className="text-muted-foreground">→</span>
              <div className="flex flex-col items-center">
                <Badge>PENDING</Badge>
                <span className="text-xs text-muted-foreground mt-1">Quote</span>
              </div>
              <span className="text-muted-foreground">→</span>
              <div className="flex flex-col items-center">
                <Badge variant="default">ACCEPTED</Badge>
                <span className="text-xs text-muted-foreground mt-1">Quote</span>
              </div>
              <span className="text-muted-foreground">→</span>
              <div className="flex flex-col items-center">
                <Badge variant="secondary">CONVERTED</Badge>
                <span className="text-xs text-muted-foreground mt-1">Quote</span>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm font-mono mt-6 whitespace-nowrap">
              <div className="flex flex-col items-center">
                <Badge>PENDING</Badge>
                <span className="text-xs text-muted-foreground mt-1">Invoice</span>
              </div>
              <span className="text-muted-foreground">→</span>
              <div className="flex flex-col items-center">
                <Badge variant="default">PAID</Badge>
                <span className="text-xs text-muted-foreground mt-1">Invoice</span>
              </div>
              <span className="text-muted-foreground">→</span>
              <div className="flex flex-col items-center">
                <Badge variant="outline">JOB CREATED</Badge>
                <span className="text-xs text-muted-foreground mt-1">Automatic</span>
              </div>
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm">Process Steps</h4>

            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="shrink-0 w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-sm font-bold">
                  1
                </div>
                <div>
                  <p className="font-semibold text-sm">Create Quote</p>
                  <p className="text-xs text-muted-foreground">
                    Admin creates a quote for a client with line items, pricing, and terms.
                    Initial status: DRAFT.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="shrink-0 w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <div>
                  <p className="font-semibold text-sm">Send Quote to Client</p>
                  <p className="text-xs text-muted-foreground">
                    Quote is sent to client for review. Status changes to PENDING.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="shrink-0 w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <div>
                  <p className="font-semibold text-sm">Client Reviews Quote</p>
                  <p className="text-xs text-muted-foreground">
                    Client can accept, decline, or request changes. If accepted, status becomes ACCEPTED.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="shrink-0 w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-sm font-bold">
                  4
                </div>
                <div>
                  <p className="font-semibold text-sm">Convert to Invoice</p>
                  <p className="text-xs text-muted-foreground">
                    Admin converts accepted quote to invoice. Quote status becomes CONVERTED.
                    Invoice created with status PENDING.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="shrink-0 w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-sm font-bold">
                  5
                </div>
                <div>
                  <p className="font-semibold text-sm">Client Pays Invoice</p>
                  <p className="text-xs text-muted-foreground">
                    Payment received (Stripe, bank transfer, or cash). Invoice status changes to PAID.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="shrink-0 w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-sm font-bold">
                  6
                </div>
                <div>
                  <p className="font-semibold text-sm">Job Creation (Automatic)</p>
                  <p className="text-xs text-muted-foreground">
                    System automatically creates a job when invoice is paid (based on job creation policy).
                    Job enters the production queue.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Processing Flow */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Processing Flow</CardTitle>
          <CardDescription>
            How payments are handled and recorded
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="p-4 bg-white rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline">Online Payment</Badge>
                <span className="text-sm font-semibold">Stripe Checkout</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-xs text-muted-foreground ml-2">
                <li>Client clicks &quot;Pay Online&quot; on invoice</li>
                <li>System creates Stripe checkout session</li>
                <li>Client redirected to Stripe payment page</li>
                <li>Client completes payment</li>
                <li>Stripe webhook notifies system of successful payment</li>
                <li>Invoice marked as PAID automatically</li>
                <li>Job created if policy is &quot;on payment&quot;</li>
              </ol>
            </div>

            <div className="p-4 bg-white rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline">Manual Payment</Badge>
                <span className="text-sm font-semibold">Bank Transfer / Cash</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-xs text-muted-foreground ml-2">
                <li>Admin receives payment outside the system</li>
                <li>Admin records payment in invoice with amount, method, reference</li>
                <li>System recalculates balance due</li>
                <li>If balance = $0, invoice marked as PAID</li>
                <li>Job created if policy is &quot;on payment&quot;</li>
              </ol>
            </div>

            <div className="p-4 bg-white rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline">Wallet Credits</Badge>
                <span className="text-sm font-semibold">Store Credit Application</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-xs text-muted-foreground ml-2">
                <li>Client has positive wallet balance from previous credits</li>
                <li>Client chooses to apply credits when paying</li>
                <li>System deducts credit amount from wallet</li>
                <li>Invoice balance reduced by credit amount</li>
                <li>If remaining balance &gt; $0, client pays remainder via card</li>
                <li>If balance = $0, invoice marked as PAID immediately</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Job Lifecycle */}
      <Card>
        <CardHeader>
          <CardTitle>Job Production Lifecycle</CardTitle>
          <CardDescription>
            Simplified view of job states from creation to completion
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Visual Flow */}
          <div className="bg-slate-50 p-6 rounded-lg border overflow-x-auto">
            <div className="flex items-center gap-2 text-sm font-mono flex-wrap">
              <Badge>PRE_PROCESSING</Badge>
              <span className="text-muted-foreground">→</span>
              <Badge>IN_QUEUE</Badge>
              <span className="text-muted-foreground">→</span>
              <Badge>QUEUED</Badge>
              <span className="text-muted-foreground">→</span>
              <Badge variant="default">PRINTING</Badge>
              <span className="text-muted-foreground">→</span>
              <Badge variant="secondary">COMPLETED</Badge>
            </div>
          </div>

          {/* Key States */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Key Job States</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 bg-white rounded-lg border">
                <Badge className="mb-2">PRE_PROCESSING</Badge>
                <p className="text-xs text-muted-foreground">
                  Initial state. Files being prepared, job queued for assignment.
                </p>
              </div>

              <div className="p-3 bg-white rounded-lg border">
                <Badge className="mb-2">IN_QUEUE / QUEUED</Badge>
                <p className="text-xs text-muted-foreground">
                  Job ready to print. Waiting for printer availability.
                </p>
              </div>

              <div className="p-3 bg-white rounded-lg border">
                <Badge className="mb-2">PRINTING</Badge>
                <p className="text-xs text-muted-foreground">
                  Currently printing on assigned printer. Time tracking active.
                </p>
              </div>

              <div className="p-3 bg-white rounded-lg border">
                <Badge className="mb-2">PAUSED</Badge>
                <p className="text-xs text-muted-foreground">
                  Print temporarily stopped. Can be resumed to continue.
                </p>
              </div>

              <div className="p-3 bg-white rounded-lg border">
                <Badge className="mb-2">PRINTING_COMPLETE</Badge>
                <p className="text-xs text-muted-foreground">
                  Print finished. Needs post-processing (support removal, etc.).
                </p>
              </div>

              <div className="p-3 bg-white rounded-lg border">
                <Badge className="mb-2">COMPLETED</Badge>
                <p className="text-xs text-muted-foreground">
                  Job fully complete. Ready for pickup or delivery.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Automation */}
          <div>
            <h4 className="font-semibold text-sm mb-3">Automated Actions</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex gap-2">
                <Badge variant="outline" className="shrink-0">Auto</Badge>
                <span className="text-muted-foreground">
                  Job created automatically when invoice paid (if policy = &quot;on payment&quot;)
                </span>
              </li>
              <li className="flex gap-2">
                <Badge variant="outline" className="shrink-0">Auto</Badge>
                <span className="text-muted-foreground">
                  Job detached from printer when marked complete (freeing printer capacity)
                </span>
              </li>
              <li className="flex gap-2">
                <Badge variant="outline" className="shrink-0">Auto</Badge>
                <span className="text-muted-foreground">
                  Print time automatically tracked when job transitions between states
                </span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Quick Order Flow */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Order Self-Service Flow</CardTitle>
          <CardDescription>
            Client-driven ordering process for uploaded 3D models
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="shrink-0 w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-sm font-bold">
                1
              </div>
              <div>
                <p className="font-semibold text-sm">Upload Model Files</p>
                <p className="text-xs text-muted-foreground">
                  Client uploads STL/3MF files via drag-and-drop interface
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="shrink-0 w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-sm font-bold">
                2
              </div>
              <div>
                <p className="font-semibold text-sm">Configure Print Settings</p>
                <p className="text-xs text-muted-foreground">
                  Select material, layer height, infill, support options per file
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="shrink-0 w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-sm font-bold">
                3
              </div>
              <div>
                <p className="font-semibold text-sm">Automatic Slicing</p>
                <p className="text-xs text-muted-foreground">
                  System slices files to calculate material weight and print time
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="shrink-0 w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-sm font-bold">
                4
              </div>
              <div>
                <p className="font-semibold text-sm">Calculate Pricing</p>
                <p className="text-xs text-muted-foreground">
                  Real-time price calculation based on metrics, settings, and shipping location
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="shrink-0 w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-sm font-bold">
                5
              </div>
              <div>
                <p className="font-semibold text-sm">Checkout & Payment</p>
                <p className="text-xs text-muted-foreground">
                  Review order, enter shipping address, pay online via Stripe
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="shrink-0 w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-sm font-bold">
                6
              </div>
              <div>
                <p className="font-semibold text-sm">Invoice & Job Creation</p>
                <p className="text-xs text-muted-foreground">
                  System creates invoice and job automatically. Production begins.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Policies */}
      <Card>
        <CardHeader>
          <CardTitle>Configurable Policies</CardTitle>
          <CardDescription>
            System behaviors that affect workflow automation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-4 bg-white rounded-lg border">
              <p className="font-semibold text-sm mb-2">Job Creation Policy</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">ON_INVOICE</Badge>
                  <p className="text-xs text-muted-foreground">
                    Jobs created immediately when invoice is created
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">ON_PAYMENT</Badge>
                  <p className="text-xs text-muted-foreground">
                    Jobs created only after invoice is fully paid
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-white rounded-lg border">
              <p className="font-semibold text-sm mb-2">Job Auto-Archive</p>
              <p className="text-xs text-muted-foreground">
                Completed jobs can be automatically archived after N days to keep the active
                job board clean. Configurable in settings.
              </p>
            </div>

            <div className="p-4 bg-white rounded-lg border">
              <p className="font-semibold text-sm mb-2">Auto-Detach on Complete</p>
              <p className="text-xs text-muted-foreground">
                When a job is marked complete, it&apos;s automatically removed from the printer queue
                to free up capacity for the next job.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
