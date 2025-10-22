import Link from "next/link"
import type { Metadata } from "next"
import { ArrowRight, Calculator, GraduationCap, ShieldCheck } from "lucide-react"

export const metadata: Metadata = {
  title: "Pricing - Transparent 3D Printing Pricing | 3D Print Sydney",
  description:
    "Transparent 3D printing pricing with no hidden fees. Get instant quotes online. Students save 20%.",
}

const factors = [
  {
    title: "Material",
    description:
      "Different materials have different costs. PLA is most affordable, engineering polymers cost more.",
    details: [
      "PLA: $0.15–$0.25 per gram",
      "PETG: $0.20–$0.30 per gram",
      "ABS: $0.25–$0.35 per gram",
      "Nylon: $0.40–$0.60 per gram",
      "Resins: $0.50–$1.00 per gram",
    ],
  },
  {
    title: "Size & complexity",
    description:
      "Larger parts use more material and take longer to print. Complex geometries may require supports.",
    details: [
      "Material usage (grams)",
      "Print time (hours)",
      "Support structure requirements",
      "Post-processing needs",
    ],
  },
  {
    title: "Quantity",
    description:
      "Printing multiple copies? We offer volume discounts starting at five units.",
    details: [
      "5–10 units: 10% off",
      "11–25 units: 15% off",
      "26+ units: 20% off (custom quote)",
    ],
  },
  {
    title: "Speed",
    description:
      "Need it fast? Same-day service available for an additional fee.",
    details: [
      "Standard: 2–3 business days (included)",
      "Express: Next business day (+30%)",
      "Same day: Sydney CBD only (+50%)",
    ],
  },
]

const services = [
  {
    title: "Design services",
    lines: ["File repair: $50–$100", "Simple design: $150–$300", "Complex design: $300–$600", "Reverse engineering: $200–$400"],
  },
  {
    title: "Finishing services",
    lines: ["Sanding & smoothing: $30–$80 per part", "Painting: $50–$150 per part", "Assembly: $20–$50 per hour"],
  },
  {
    title: "Delivery",
    lines: ["Pickup (Elizabeth Bay): Free", "Sydney Metro: $15–$25", "NSW Regional: $25–$45", "Interstate: Quote based"],
  },
]

const guarantees = [
  { title: "Dimensional accuracy", description: "To specification" },
  { title: "Surface quality", description: "As agreed" },
  { title: "Material properties", description: "As specified" },
  { title: "On-time delivery", description: "Or discount applied" },
]

export default function PricingPage() {
  return (
    <div className="bg-surface-canvas">
      <section className="border-b border-border/60 bg-surface-subtle py-20">
        <div className="mx-auto max-w-4xl px-4 text-center md:px-8">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-foreground/50">Pricing</span>
          <h1 className="mt-4 text-4xl tracking-tight text-foreground sm:text-5xl">Transparent pricing without surprises.</h1>
          <p className="mt-5 text-base text-foreground/70">
            Upload your file for an instant quote or review the structure below. Students automatically receive a 20% concession at checkout.
          </p>
        </div>
      </section>

      <section className="border-b border-border/60 bg-white py-20">
        <div className="mx-auto max-w-4xl rounded-3xl border border-border/60 bg-surface-subtle px-6 py-10 text-center shadow-sm md:px-12">
          <Calculator className="mx-auto h-10 w-10 text-foreground" aria-hidden />
          <h2 className="mt-4 text-3xl tracking-tight text-foreground">Get an instant quote</h2>
          <p className="mt-4 text-base text-foreground/70">Upload your 3D file and select your material to receive a detailed quote. No account required.</p>
          <ul className="mt-6 grid gap-3 text-sm text-foreground/70 md:grid-cols-2">
            <li className="flex items-start gap-3"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-foreground/40" aria-hidden />Real-time pricing</li>
            <li className="flex items-start gap-3"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-foreground/40" aria-hidden />Material comparison</li>
            <li className="flex items-start gap-3"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-foreground/40" aria-hidden />Delivery options</li>
            <li className="flex items-start gap-3"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-foreground/40" aria-hidden />Student discount applied automatically</li>
          </ul>
          <div className="mt-8 flex justify-center">
            <Link
              href="/quick-order"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              Calculate your price
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-border/60 bg-surface-subtle py-20">
        <div className="mx-auto max-w-5xl px-4 md:px-8">
          <h2 className="text-3xl font-semibold text-foreground">What affects pricing?</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {factors.map((factor) => (
              <div key={factor.title} className="rounded-2xl border border-border/60 bg-white p-6">
                <h3 className="text-lg font-semibold text-foreground">{factor.title}</h3>
                <p className="mt-3 text-sm text-foreground/70">{factor.description}</p>
                <ul className="mt-4 space-y-2 text-sm text-foreground/70">
                  {factor.details.map((detail) => (
                    <li key={detail} className="flex items-start gap-3">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-foreground/40" aria-hidden />
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border/60 bg-white py-20">
        <div className="mx-auto max-w-5xl px-4 md:px-8">
          <h2 className="text-3xl font-semibold text-foreground">Additional services</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {services.map((service) => (
              <div key={service.title} className="rounded-2xl border border-border/60 bg-surface-subtle p-6">
                <h3 className="text-lg font-semibold text-foreground">{service.title}</h3>
                <ul className="mt-4 space-y-2 text-sm text-foreground/70">
                  {service.lines.map((line) => (
                    <li key={line} className="flex items-start gap-3">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-foreground/40" aria-hidden />
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border/60 bg-surface-subtle py-20">
        <div className="mx-auto max-w-4xl px-4 md:px-8">
          <div className="rounded-3xl border border-border/60 bg-white p-8 md:p-10">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-border/60 bg-surface-subtle">
                  <GraduationCap className="h-5 w-5 text-foreground" aria-hidden />
                </span>
                <div>
                  <h3 className="text-xl font-semibold text-foreground">20% off for students</h3>
                  <p className="mt-2 text-sm text-foreground/70">We support students with automatic discounts on all printing services.</p>
                </div>
              </div>
              <div className="space-y-2 text-sm text-foreground/70">
                <p className="font-medium text-foreground">How to claim</p>
                <ul className="space-y-1">
                  <li>Create an account with your .edu email</li>
                  <li>Discount applied automatically at checkout</li>
                  <li>Valid student ID may be requested</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border/60 bg-white py-20">
        <div className="mx-auto max-w-4xl px-4 md:px-8">
          <h2 className="text-3xl font-semibold text-foreground">Our quality guarantee</h2>
          <p className="mt-3 text-base text-foreground/70">If you&apos;re not satisfied with the quality of your print, we&apos;ll reprint it for free or issue a full refund.</p>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {guarantees.map((item) => (
              <div key={item.title} className="flex items-start gap-3 rounded-2xl border border-border/60 bg-surface-subtle p-5">
                <ShieldCheck className="h-5 w-5 text-foreground" aria-hidden />
                <div>
                  <p className="font-semibold text-foreground">{item.title}</p>
                  <p className="text-sm text-foreground/70">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-surface-subtle py-20">
        <div className="mx-auto max-w-4xl rounded-3xl border border-border/60 bg-white px-6 py-12 text-center shadow-sm md:px-10">
          <h2 className="text-3xl tracking-tight text-foreground">Ready to get your quote?</h2>
          <p className="mt-4 text-base text-foreground/70">Upload your file and see pricing in seconds, or contact us for tailored advice.</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/quick-order"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              Get instant quote
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-full border border-border/70 px-6 py-3 text-sm font-medium text-foreground/75 transition hover:border-foreground/40 hover:text-foreground"
            >
              Speak with our team
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
