import React from "react";
import Link from "next/link";

export function MaterialsPreview() {
  return (
    <section className="bg-neutral-50 py-16 md:py-24">
      <div className="mx-auto max-w-[1200px] px-4 md:px-8">
        <div className="text-center">
          <h2 className="font-serif text-[36px] leading-tight tracking-tight sm:text-[48px] md:text-[54px] text-neutral-900">
            Professional Materials for
            <br />
            Every Application
          </h2>
          <p className="mt-4 text-lg text-neutral-600 mx-auto max-w-2xl">
            From biodegradable PLA for prototypes to engineering-grade polymers for functional
            parts—we stock premium materials for every use case.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          <MaterialCategory
            title="Standard Materials"
            materials={[
              { name: "PLA", desc: "Eco-friendly, perfect for prototypes" },
              { name: "PETG", desc: "Durable and chemical resistant" },
              { name: "ABS", desc: "Strong and heat resistant" },
            ]}
          />
          <MaterialCategory
            title="Engineering Grade"
            materials={[
              { name: "Nylon", desc: "Exceptional strength and flexibility" },
              { name: "Carbon Fiber", desc: "Maximum strength-to-weight ratio" },
              { name: "Polycarbonate", desc: "Impact resistant and heat tolerant" },
            ]}
          />
          <MaterialCategory
            title="Specialty Resins"
            materials={[
              { name: "Standard Resin", desc: "High detail and smooth finish" },
              { name: "Tough Resin", desc: "Functional prototypes" },
              { name: "Flexible Resin", desc: "Rubber-like parts" },
            ]}
          />
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/materials"
            className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700 transition"
          >
            View Full Materials Guide <ArrowRight />
          </Link>
        </div>
      </div>
    </section>
  );
}

function MaterialCategory({
  title,
  materials,
}: {
  title: string;
  materials: { name: string; desc: string }[];
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6">
      <h3 className="mb-4 text-xl font-semibold text-neutral-900">{title}</h3>
      <ul className="space-y-3">
        {materials.map((material) => (
          <li key={material.name}>
            <div className="flex items-start gap-2">
              <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-blue-600 flex-shrink-0" />
              <div>
                <span className="font-medium text-neutral-900">{material.name}</span>
                <span className="ml-1 text-sm text-neutral-600">- {material.desc}</span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ArrowRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path
        d="M5 12h14M13 5l7 7-7 7"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
