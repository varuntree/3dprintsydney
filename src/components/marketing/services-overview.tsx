import Link from "next/link";
import { ArrowUpRight, Hammer, Layers3, PencilRuler, Rocket } from "lucide-react";

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
    <section className="border-b border-border/60 bg-surface-subtle py-20">
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <div className="max-w-3xl">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-foreground/50">
            Services
          </span>
          <h2 className="mt-4 text-3xl tracking-tight text-foreground sm:text-4xl">
            Everything you need from concept to final part.
          </h2>
          <p className="mt-4 text-base text-foreground/70">
            Explore the core services we deliver for teams across Sydney. Each engagement includes material guidance, print preparation and a dedicated point of contact.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {services.map(({ icon: Icon, title, description, href }) => (
            <Link
              key={title}
              href={href}
              className="group relative flex h-full flex-col justify-between rounded-2xl border border-border/60 bg-white p-6 transition hover:-translate-y-1 hover:shadow-md"
            >
              <div>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-surface-subtle text-foreground">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <h3 className="mt-5 text-xl font-semibold text-foreground">{title}</h3>
                <p className="mt-3 text-sm text-foreground/70">{description}</p>
              </div>
              <span className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-foreground/70 transition group-hover:text-foreground">
                Learn more
                <ArrowUpRight className="h-4 w-4" aria-hidden />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
