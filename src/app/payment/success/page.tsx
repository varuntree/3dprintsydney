import Link from "next/link";

export const metadata = {
  title: "Payment Successful",
};

export default function PaymentSuccessPage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 rounded-xl border border-border bg-surface-overlay p-8 text-center">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
        ✓
      </div>
      <h1 className="text-2xl font-semibold text-foreground">Payment received</h1>
      <p className="text-sm text-muted-foreground">
        Thanks for your payment. We&apos;ve recorded the transaction and updated your order.
        You can return to your dashboard to view the status or download your invoice.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Link
          href="/client/orders"
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          View your orders
        </Link>
        <Link
          href="/dashboard"
          className="inline-flex h-10 items-center justify-center rounded-md border border-border px-4 text-sm font-medium text-foreground hover:bg-surface-muted"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
