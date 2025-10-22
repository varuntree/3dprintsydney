import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

const categories = [
  {
    title: "Standard materials",
    items: [
      { name: "PLA", description: "Reliable, eco-conscious prototyping" },
      { name: "PETG", description: "Durable parts with chemical resistance" },
      { name: "ABS", description: "Heat tolerant functional components" },
    ],
  },
  {
    title: "Engineering polymers",
    items: [
      { name: "Nylon", description: "Tough, flexible and wear resistant" },
      { name: "Carbon fibre", description: "High stiffness to weight ratio" },
      { name: "Polycarbonate", description: "Impact resistant up to 135°C" },
    ],
  },
  {
    title: "Resin library",
    items: [
      { name: "Standard", description: "High-detail presentation pieces" },
      { name: "Tough", description: "Functional prototypes that flex" },
      { name: "Flexible", description: "Elastomer-like grips and gaskets" },
    ],
  },
];

export function MaterialsPreview() {
  return (
    <section className="border-b border-border/60 bg-surface-subtle py-20">
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <div className="max-w-3xl">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-foreground/50">
            Materials
          </span>
          <h2 className="mt-4 text-3xl tracking-tight text-foreground sm:text-4xl">
            A curated library for prototypes and production-ready parts.
          </h2>
          <p className="mt-4 text-base text-foreground/70">
            Choose from a carefully selected range covering standard, engineering and specialty resins. Every material is profiled for strength, finish and lead time.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {categories.map((category) => (
            <div key={category.title} className="flex h-full flex-col rounded-2xl border border-border/60 bg-white p-6">
              <h3 className="text-lg font-semibold text-foreground">{category.title}</h3>
              <ul className="mt-5 space-y-4 text-sm text-foreground/70">
                {category.items.map((item) => (
                  <li key={item.name} className="flex items-start gap-3">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-foreground/40" />
                    <div>
                      <span className="font-medium text-foreground">{item.name}</span>
                      <span className="ml-2 text-foreground/60">{item.description}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/materials"
            className="inline-flex items-center gap-2 rounded-full border border-border/70 px-6 py-3 text-sm font-medium text-foreground transition hover:border-foreground/40 hover:text-foreground"
          >
            View the full materials guide
            <ArrowUpRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
