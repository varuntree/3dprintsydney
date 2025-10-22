import Link from "next/link";
import { ArrowRight, Mail, Phone } from "lucide-react";

export function FinalCTA() {
  return (
    <section className="bg-surface-subtle py-20">
      <div className="mx-auto max-w-5xl rounded-3xl border border-border/60 bg-white px-6 py-16 text-center shadow-sm md:px-12">
        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-foreground/50">
          Start a project
        </span>
        <h2 className="mt-4 text-3xl tracking-tight text-foreground sm:text-4xl">
          Ready to print? Share your files and we&apos;ll respond within two business hours.
        </h2>
        <p className="mt-4 text-base text-foreground/70">
          Upload for instant pricing or talk to our team if you need design support before production.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/quick-order"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            Start an instant quote
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-full border border-border/70 px-6 py-3 text-sm font-medium text-foreground/75 transition hover:border-foreground/40 hover:text-foreground"
          >
            Talk with our team
          </Link>
        </div>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 text-sm text-foreground/60 sm:flex-row">
          <a href="tel:+61458237428" className="inline-flex items-center gap-2 transition hover:text-foreground">
            <Phone className="h-4 w-4" aria-hidden /> (+61) 0458 237 428
          </a>
          <span className="hidden h-3 w-px bg-border/70 sm:block" aria-hidden />
          <a href="mailto:alan@3dprintsydney.com" className="inline-flex items-center gap-2 transition hover:text-foreground">
            <Mail className="h-4 w-4" aria-hidden /> alan@3dprintsydney.com
          </a>
        </div>
      </div>
    </section>
  );
}
