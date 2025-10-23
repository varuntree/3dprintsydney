import Link from "next/link";
import { ArrowUpRight, Hammer, Layers3, PencilRuler, Rocket } from "lucide-react";

import { cn } from "@/lib/utils";

const services = [
  {
    icon: Rocket,
    title: "Rapid prototyping",
    description:
      "Concept to physical part in hours. Ideal for hardware teams and startups moving quickly.",
    href: "/services#rapid-prototyping",
  },
  {
    icon: Hammer,
    title: "Custom parts",
    description:
      "One-off replacements or short production runs with precise tolerances and fit checks.",
    href: "/services#custom-parts",
  },
  {
    icon: Layers3,
    title: "Model printing",
    description:
      "Presentation-grade architectural, product and education models with clean finishing.",
    href: "/services#model-printing",
  },
  {
    icon: PencilRuler,
    title: "Design support",
    description:
      "CAD optimisation, reverse engineering and consultation from experienced engineers.",
    href: "/services#design-services",
  },
];

export function ServicesOverview() {
  return (
    <section className="marketing-section" data-variant="dawn">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-16 h-64 w-64 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -right-20 h-80 w-80 rounded-full bg-primary/15 blur-[120px]"
      />

      <div className="marketing-section__container relative">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-white/90 px-4 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-primary/70 shadow-sm backdrop-blur">
            Services
          </span>
          <h2 className="mt-6 text-3xl tracking-tight text-foreground sm:text-4xl">
            Everything you need from concept to final part.
          </h2>
          <p className="mt-4 text-base text-foreground/70">
            Explore the core services we deliver for teams across Sydney. Each engagement includes material guidance, print preparation and a dedicated point of contact.
          </p>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-2">
          {services.map(({ icon: Icon, title, description, href }, index) => (
            <Link
              key={title}
              href={href}
              className={cn(
                "group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-border/60 bg-white/95 p-7 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl",
                index % 2 === 0
                  ? "bg-gradient-to-br from-primary/10 via-white/95 to-white"
                  : "bg-gradient-to-bl from-white via-white/95 to-primary/10",
              )}
            >
              <div className="relative">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary shadow-sm shadow-primary/20">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-6 text-xl font-semibold text-foreground">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-foreground/70">{description}</p>
              </div>
              <span className="mt-8 inline-flex items-center gap-1 text-sm font-semibold text-foreground/70 transition group-hover:text-primary">
                Learn more
                <ArrowUpRight className="h-4 w-4" aria-hidden />
              </span>

              <span
                aria-hidden
                className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/10 opacity-0 blur-3xl transition duration-300 group-hover:opacity-100"
              />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
