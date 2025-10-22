import Link from "next/link";
import { ArrowRight, Clock3, GraduationCap, Layers } from "lucide-react";

const highlights = [
  {
    icon: Clock3,
    label: "Same-day production available",
  },
  {
    icon: GraduationCap,
    label: "20% student pricing",
  },
  {
    icon: Layers,
    label: "Engineering-grade materials",
  },
];

export function Hero() {
  return (
    <section className="border-b border-border/60 bg-surface-canvas">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-20 md:px-8 md:pt-24">
        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-foreground/50">
          Sydney additive manufacturing studio
        </span>
        <h1 className="mt-6 text-4xl leading-[1.05] tracking-tight text-foreground sm:text-5xl md:text-6xl">
          Precision 3D printing with guidance from engineers who build every day.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-foreground/70">
          Prototype, iterate, and ship with confidence. We combine professional machines, premium materials, and hands-on advice to get your parts in hand within hours.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-foreground/70">
          {highlights.map(({ icon: Icon, label }) => (
            <span key={label} className="inline-flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border/60 bg-white text-foreground/70">
                <Icon className="h-3.5 w-3.5" aria-hidden />
              </span>
              {label}
            </span>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <Link
            href="/quick-order"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            Start an instant quote
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link
            href="/materials"
            className="inline-flex items-center gap-2 rounded-full border border-border/70 px-6 py-3 text-sm font-medium text-foreground/70 transition hover:border-foreground/40 hover:text-foreground"
          >
            Browse the materials guide
          </Link>
        </div>

        <p className="mt-8 max-w-xl text-sm text-foreground/60">
          Located in Elizabeth Bay with courier delivery across Sydney. Every project receives a quality review before it leaves the studio.
        </p>
      </div>
    </section>
  );
}
