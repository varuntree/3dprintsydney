import Link from "next/link";

export const metadata = {
  title: "Payment Cancelled",
};

export default function PaymentCancelledPage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 rounded-xl border border-border bg-surface-overlay p-8 text-center">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
        !
      </div>
      <h1 className="text-2xl font-semibold text-foreground">Payment cancelled</h1>
      <p className="text-sm text-muted-foreground">
        Your Stripe checkout was cancelled. No payment was taken. You can return to your dashboard and try
        again when you&apos;re ready.
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
