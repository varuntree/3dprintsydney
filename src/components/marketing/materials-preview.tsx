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
    <section className="marketing-section" data-variant="horizon">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/3 -top-20 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/12 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-0 bottom-0 h-64 w-64 translate-x-1/3 rounded-full bg-primary/10 blur-3xl"
      />
      <div className="marketing-section__container relative">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-white/90 px-4 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-primary/70 shadow-sm backdrop-blur">
            Materials
          </span>
          <h2 className="mt-6 text-3xl tracking-tight text-foreground sm:text-4xl">
            A curated library for prototypes and production-ready parts.
          </h2>
          <p className="mt-4 text-base text-foreground/70">
            Choose from a carefully selected range covering standard, engineering and specialty resins. Every material is profiled for strength, finish and lead time.
          </p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {categories.map((category, categoryIndex) => (
            <div
              key={category.title}
              className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-border/50 bg-white/95 p-7 shadow-sm shadow-primary/5 transition duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-2xl"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-primary/15 via-primary/5 to-transparent opacity-70"
                style={{ opacity: 0.7 + categoryIndex * 0.05 }}
              />
              <div className="relative">
                <h3 className="text-lg font-semibold text-foreground">{category.title}</h3>
                <p className="mt-2 text-sm text-foreground/60">
                  Balanced combinations of strength, surface finish, and speed.
                </p>
              </div>
              <ul className="relative mt-6 space-y-4 text-sm text-foreground/70">
                {category.items.map((item, itemIndex) => (
                  <li
                    key={item.name}
                    className="flex items-start gap-3 rounded-xl border border-transparent bg-white/90 px-3 py-3 transition group-hover:border-primary/30 group-hover:bg-primary/5"
                    style={{
                      transform: `translateY(${itemIndex * 2}px)`
                    }}
                  >
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary/50" />
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

        <div className="mt-14 text-center">
          <Link
            href="/materials"
            className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-white/80 px-6 py-3 text-sm font-semibold text-foreground/75 shadow-sm transition hover:border-foreground/40 hover:text-foreground"
          >
            View the full materials guide
            <ArrowUpRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
