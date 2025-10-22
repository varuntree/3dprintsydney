import Link from "next/link"
import type { Metadata } from "next"
import {
  ArrowRight,
  Cog,
  Dumbbell,
  Flame,
  Hammer,
  Leaf,
  Layers,
  Shield,
  Sparkles,
  StretchHorizontal,
} from "lucide-react"
import type { ReactNode } from "react"

type Property = { label: string; value: string; rating: number }
type Material = {
  name: string
  pricing: string
  icon: ReactNode
  properties: Property[]
  benefits: string[]
  applications: string[]
  limitations: string[]
}

export const metadata: Metadata = {
  title: "Materials Guide - 3D Printing Materials | 3D Print Sydney",
  description:
    "Complete guide to 3D printing materials: PLA, PETG, ABS, Nylon, Carbon Fiber, and Resins. Learn properties, applications, and pricing.",
}

const categories: { title: string; materials: Material[] }[] = [
  {
    title: "Standard materials (FDM)",
    materials: [
      {
        name: "PLA (Polylactic Acid)",
        pricing: "$0.15 - $0.25 per gram",
        icon: <Leaf className="h-5 w-5" aria-hidden />,
        properties: [
          { label: "Strength", value: "Medium", rating: 3 },
          { label: "Flexibility", value: "Low", rating: 2 },
          { label: "Heat resistance", value: "Low (60°C)", rating: 2 },
          { label: "Ease of printing", value: "Excellent", rating: 5 },
        ],
        benefits: [
          "Biodegradable and eco-friendly",
          "Low warping, excellent surface finish",
          "Wide colour range available",
          "Food-safe options available",
        ],
        applications: [
          "Prototypes and concept models",
          "Display pieces and figurines",
          "Educational models",
          "Low-stress mechanical parts",
        ],
        limitations: [
          "Not suitable for high temperatures",
          "Lower impact strength than ABS",
          "UV sensitive (will degrade outdoors)",
        ],
      },
      {
        name: "PETG (Polyethylene Terephthalate Glycol)",
        pricing: "$0.20 - $0.30 per gram",
        icon: <Dumbbell className="h-5 w-5" aria-hidden />,
        properties: [
          { label: "Strength", value: "High", rating: 4 },
          { label: "Flexibility", value: "Medium", rating: 3 },
          { label: "Heat resistance", value: "Medium (80°C)", rating: 3 },
          { label: "Ease of printing", value: "Good", rating: 4 },
        ],
        benefits: [
          "Excellent layer adhesion and strength",
          "Chemical and moisture resistant",
          "Food-safe (check brand)",
          "Good impact resistance",
        ],
        applications: [
          "Functional mechanical parts",
          "Outdoor applications",
          "Protective cases and enclosures",
          "Food containers and kitchen tools",
        ],
        limitations: [
          "Slightly more difficult to print than PLA",
          "Can string between features",
          "Moderate UV resistance",
        ],
      },
      {
        name: "ABS (Acrylonitrile Butadiene Styrene)",
        pricing: "$0.25 - $0.35 per gram",
        icon: <Flame className="h-5 w-5" aria-hidden />,
        properties: [
          { label: "Strength", value: "High", rating: 4 },
          { label: "Flexibility", value: "Medium", rating: 3 },
          { label: "Heat resistance", value: "High (95°C)", rating: 4 },
          { label: "Ease of printing", value: "Moderate", rating: 3 },
        ],
        benefits: [
          "High heat resistance",
          "Excellent impact strength",
          "Can be smoothed with acetone",
          "Good electrical insulation",
        ],
        applications: [
          "Automotive parts",
          "Electronics enclosures",
          "Functional prototypes",
          "Tooling and jigs",
        ],
        limitations: [
          "Requires enclosed printer (warping issues)",
          "Emits fumes during printing",
          "Not biodegradable",
        ],
      },
    ],
  },
  {
    title: "Engineering-grade materials",
    materials: [
      {
        name: "Nylon (PA12)",
        pricing: "$0.40 - $0.60 per gram",
        icon: <Cog className="h-5 w-5" aria-hidden />,
        properties: [
          { label: "Strength", value: "Very high", rating: 5 },
          { label: "Flexibility", value: "High", rating: 4 },
          { label: "Heat resistance", value: "High (100°C)", rating: 4 },
          { label: "Ease of printing", value: "Challenging", rating: 2 },
        ],
        benefits: [
          "Exceptional strength and durability",
          "High flexibility and impact resistance",
          "Excellent wear resistance",
          "Chemical resistant",
        ],
        applications: [
          "Functional mechanical parts",
          "Gears, bearings and hinges",
          "Snap-fit assemblies",
          "Wear parts and bushings",
        ],
        limitations: [
          "Absorbs moisture (requires dry storage)",
          "Challenging to print",
          "Higher cost than standard materials",
        ],
      },
      {
        name: "Carbon fiber composite",
        pricing: "$0.50 - $0.80 per gram",
        icon: <Layers className="h-5 w-5" aria-hidden />,
        properties: [
          { label: "Strength", value: "Excellent", rating: 5 },
          { label: "Flexibility", value: "Low", rating: 2 },
          { label: "Heat resistance", value: "High (100°C)", rating: 4 },
          { label: "Ease of printing", value: "Moderate", rating: 3 },
        ],
        benefits: [
          "Maximum strength-to-weight ratio",
          "Excellent stiffness and rigidity",
          "Professional finish",
          "Heat and chemical resistant",
        ],
        applications: [
          "Aerospace and drone components",
          "Performance automotive parts",
          "High-strength structural components",
          "Professional tooling",
        ],
        limitations: [
          "Requires hardened nozzle",
          "Higher cost",
          "Cannot be smoothed post-print",
        ],
      },
      {
        name: "Polycarbonate (PC)",
        pricing: "$0.45 - $0.65 per gram",
        icon: <Shield className="h-5 w-5" aria-hidden />,
        properties: [
          { label: "Strength", value: "Excellent", rating: 5 },
          { label: "Flexibility", value: "Medium", rating: 3 },
          { label: "Heat resistance", value: "Very high (135°C)", rating: 5 },
          { label: "Ease of printing", value: "Difficult", rating: 2 },
        ],
        benefits: [
          "Exceptional impact resistance",
          "Very high heat resistance",
          "Transparent options available",
          "Excellent dimensional stability",
        ],
        applications: [
          "Protective equipment",
          "Automotive components",
          "High-temperature applications",
          "Safety shields and guards",
        ],
        limitations: [
          "Requires heated chamber",
          "Prone to warping",
          "More expensive than standard materials",
        ],
      },
    ],
  },
  {
    title: "Specialty resins (SLA/DLP)",
    materials: [
      {
        name: "Standard resin",
        pricing: "$0.50 - $0.80 per gram",
        icon: <Sparkles className="h-5 w-5" aria-hidden />,
        properties: [
          { label: "Detail level", value: "Excellent", rating: 5 },
          { label: "Surface finish", value: "Smooth", rating: 5 },
          { label: "Strength", value: "Medium", rating: 3 },
          { label: "Ease of use", value: "Good", rating: 4 },
        ],
        benefits: [
          "Ultra-high resolution (50-micron layers)",
          "Smooth, glossy surface finish",
          "Excellent detail reproduction",
          "Wide colour range",
        ],
        applications: [
          "Highly detailed models",
          "Jewellery and miniatures",
          "Product presentation models",
          "Dental and medical models",
        ],
        limitations: [
          "Brittle compared to engineering materials",
          "UV sensitive (will yellow over time)",
          "Requires post-processing (cleaning and curing)",
        ],
      },
      {
        name: "Tough resin",
        pricing: "$0.70 - $1.00 per gram",
        icon: <Hammer className="h-5 w-5" aria-hidden />,
        properties: [
          { label: "Detail level", value: "Very good", rating: 4 },
          { label: "Surface finish", value: "Smooth", rating: 4 },
          { label: "Strength", value: "High", rating: 4 },
          { label: "Ease of use", value: "Good", rating: 4 },
        ],
        benefits: [
          "High impact resistance",
          "Improved durability over standard resin",
          "Good surface finish",
          "Suitable for functional testing",
        ],
        applications: [
          "Functional prototypes",
          "Snap-fit assemblies",
          "Jigs and fixtures",
          "Durable display models",
        ],
        limitations: [
          "Higher cost than standard resin",
          "Slightly less detail than standard",
          "Requires careful post-curing",
        ],
      },
      {
        name: "Flexible resin",
        pricing: "$0.80 - $1.20 per gram",
        icon: <StretchHorizontal className="h-5 w-5" aria-hidden />,
        properties: [
          { label: "Detail level", value: "Good", rating: 4 },
          { label: "Surface finish", value: "Smooth", rating: 4 },
          { label: "Flexibility", value: "Rubber-like", rating: 5 },
          { label: "Ease of use", value: "Moderate", rating: 3 },
        ],
        benefits: [
          "Rubber-like flexibility",
          "Good tear resistance",
          "Smooth surface finish",
          "Suitable for gaskets and seals",
        ],
        applications: [
          "Gaskets and seals",
          "Soft-touch grips",
          "Wearables and straps",
          "Flexible prototypes",
        ],
        limitations: [
          "Highest cost option",
          "Limited colour selection",
          "Requires specific post-processing",
        ],
      },
    ],
  },
]

const useCases = [
  {
    title: "For prototypes & concept models",
    recommendation: "PLA or Standard resin",
    reasoning:
      "Low cost, easy to print, excellent detail. PLA for larger parts, resin for high-detail small parts.",
  },
  {
    title: "For functional parts",
    recommendation: "PETG, Nylon or Tough resin",
    reasoning:
      "Good strength, durability and impact resistance for parts that need to perform under stress.",
  },
  {
    title: "For outdoor use",
    recommendation: "PETG or ABS",
    reasoning:
      "UV and weather resistance. PETG offers better moisture resistance, ABS handles heat better.",
  },
  {
    title: "For high-detail models",
    recommendation: "Standard resin",
    reasoning:
      "Best surface finish and detail reproduction. Ideal for jewellery, miniatures and presentation models.",
  },
  {
    title: "For high temperatures",
    recommendation: "ABS, PC or Nylon",
    reasoning:
      "PC offers the highest heat resistance (135°C), followed by ABS and Nylon.",
  },
  {
    title: "For maximum strength",
    recommendation: "Carbon fiber or Polycarbonate",
    reasoning:
      "Engineering-grade materials for demanding applications requiring high strength-to-weight ratio.",
  },
]

export default function MaterialsPage() {
  return (
    <div className="bg-surface-canvas">
      <section className="border-b border-border/60 bg-surface-subtle py-20">
        <div className="mx-auto max-w-4xl px-4 text-center md:px-8">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-foreground/50">Materials</span>
          <h1 className="mt-4 text-4xl tracking-tight text-foreground sm:text-5xl">A curated library for every application.</h1>
          <p className="mt-5 text-base text-foreground/70">
            From biodegradable PLA to engineering-grade polymers and specialty resins, we stock materials that balance performance, finish and lead time for your project.
          </p>
        </div>
      </section>

      {categories.map((category) => (
        <section key={category.title} className="border-b border-border/60 bg-white py-20">
          <div className="mx-auto max-w-6xl px-4 md:px-8">
            <h2 className="text-3xl font-semibold text-foreground">{category.title}</h2>
            <div className="mt-10 space-y-8">
              {category.materials.map((material) => (
                <MaterialCard key={material.name} {...material} />
              ))}
            </div>
          </div>
        </section>
      ))}

      <section className="border-b border-border/60 bg-surface-subtle py-20">
        <div className="mx-auto max-w-5xl px-4 md:px-8">
          <h2 className="text-3xl font-semibold text-foreground">How to choose the right material</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {useCases.map((useCase) => (
              <UseCaseCard key={useCase.title} {...useCase} />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-4xl rounded-3xl border border-border/60 bg-surface-subtle px-6 py-12 text-center shadow-sm md:px-10">
          <h2 className="text-3xl tracking-tight text-foreground">Need guidance on material selection?</h2>
          <p className="mt-4 text-base text-foreground/70">
            Share your application and we&apos;ll recommend the best combination of material, technology and finish for your parts.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/quick-order"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              Get quote with material options
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-full border border-border/70 px-6 py-3 text-sm font-medium text-foreground/75 transition hover:border-foreground/40 hover:text-foreground"
            >
              Talk to our team
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

function MaterialCard({
  name,
  pricing,
  icon,
  properties,
  benefits,
  applications,
  limitations,
}: Material) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-white">
      <div className="flex items-center justify-between border-b border-border/60 bg-surface-subtle px-6 py-5">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-white text-foreground">
            {icon}
          </span>
          <div>
            <h3 className="text-xl font-semibold text-foreground">{name}</h3>
            <p className="text-sm text-foreground/60">{pricing}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-8 px-6 py-6 md:grid-cols-2">
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-foreground/50">Properties</h4>
            <div className="mt-4 space-y-4 text-sm text-foreground/70">
              {properties.map((property) => (
                <div key={property.label}>
                  <div className="flex items-center justify-between text-xs uppercase tracking-wide text-foreground/60">
                    <span>{property.label}</span>
                    <span className="font-medium text-foreground">{property.value}</span>
                  </div>
                  <div className="mt-2 flex gap-1">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <span
                        key={index}
                        className={"h-1.5 flex-1 rounded-full " + (index < property.rating ? "bg-[color:var(--color-blue-accent)]" : "bg-foreground/10")}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-foreground/50">Benefits</h4>
            <ul className="mt-4 space-y-2 text-sm text-foreground/70">
              {benefits.map((benefit) => (
                <li key={benefit} className="flex items-start gap-3">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-foreground/40" aria-hidden />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-foreground/50">Best for</h4>
            <ul className="mt-4 space-y-2 text-sm text-foreground/70">
              {applications.map((application) => (
                <li key={application} className="flex items-start gap-3">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-foreground/40" aria-hidden />
                  {application}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-foreground/50">Limitations</h4>
            <ul className="mt-4 space-y-2 text-sm text-foreground/70">
              {limitations.map((limitation) => (
                <li key={limitation} className="flex items-start gap-3">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-foreground/40" aria-hidden />
                  {limitation}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

function UseCaseCard({
  title,
  recommendation,
  reasoning,
}: { title: string; recommendation: string; reasoning: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-white p-6">
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm font-medium text-foreground">Recommendation: {recommendation}</p>
      <p className="mt-2 text-sm text-foreground/70">{reasoning}</p>
    </div>
  )
}
