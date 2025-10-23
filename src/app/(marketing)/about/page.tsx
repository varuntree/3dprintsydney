import Link from "next/link"
import type { Metadata } from "next"
import {
  ArrowRight,
  Building,
  Clock3,
  GraduationCap,
  Handshake,
  Leaf,
  Lightbulb,
  Printer,
  ShieldCheck,
  Sparkles,
  Wrench
} from "lucide-react"

export const metadata: Metadata = {
  title: "About Us - 3D Print Sydney | Professional 3D Printing Since 2018",
  description:
    "Meet the team behind Sydney's fastest 3D printing service. Located in Elizabeth Bay, we're passionate about making professional 3D printing accessible to everyone.",
}

const values = [
  { icon: Sparkles, title: "Speed without compromise", description: "Same-day service with a meticulous quality process." },
  { icon: Lightbulb, title: "Expertise included", description: "Engineering guidance baked into every project." },
  { icon: GraduationCap, title: "Supporting education", description: "20% concession for students and educators." },
  { icon: ShieldCheck, title: "Transparent pricing", description: "Instant quotes and no hidden fees." },
  { icon: Leaf, title: "Sustainability", description: "Biodegradable materials and local production." },
  { icon: Handshake, title: "Community first", description: "Active contributors to Sydney's maker scene." },
]

const advantages = [
  {
    title: "Professional equipment",
    description:
      "Commercial-grade FDM and resin printers from Prusa, Ultimaker and Formlabs with multi-material capability.",
    bullet: "Large format printing up to 300mm³",
  },
  {
    title: "Premium materials",
    description:
      "Engineering polymers, specialty resins and biodegradable options chosen for performance.",
    bullet: "Nylon, PC, carbon fibre, tough and flexible resins",
  },
  {
    title: "True same-day service",
    description:
      "Optimised workflows and central Sydney location so urgent parts arrive when you need them.",
    bullet: "CBD delivery within hours when files arrive before 10am",
  },
  {
    title: "Engineering expertise",
    description:
      "We review every file for manufacturability, strength and cost before we press print.",
    bullet: "Design consultation and file repair included",
  },
]

export default function AboutPage() {
  return (
    <div className="bg-gradient-to-b from-[#edf4ff] via-white to-[#fff5ea]">
      <section className="marketing-section" data-variant="hero">
        <div className="marketing-section__container">
          <div className="mx-auto max-w-4xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-white/80 px-4 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-primary/70 shadow-sm backdrop-blur">
              About
            </span>
            <h1 className="mt-6 text-4xl tracking-tight text-foreground sm:text-5xl">
              Sydney&apos;s on-demand 3D printing studio.
            </h1>
            <p className="mt-5 text-base text-foreground/70">
              Founded in 2018, 3D Print Sydney brings together engineers, designers and makers to deliver professional results without the red tape.
            </p>
          </div>
        </div>
      </section>

      <section className="marketing-section" data-variant="cloud">
        <div className="marketing-section__container">
          <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-border/30 bg-white/90 p-8 shadow-lg shadow-primary/5 backdrop-blur">
            <span className="absolute -top-20 right-6 h-40 w-40 rounded-full bg-primary/10 blur-3xl" aria-hidden />
            <span className="absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-primary/5 blur-[120px]" aria-hidden />
            <h2 className="relative text-3xl font-semibold text-foreground">Our story</h2>
            <div className="relative mt-6 space-y-6 text-base text-foreground/70">
              <p>
                We started 3D Print Sydney after experiencing week-long turnaround times, opaque pricing and limited technical guidance from traditional providers.
              </p>
              <p>
                Today we&apos;ve supported more than a thousand projects across startups, universities and established manufacturers. Our Elizabeth Bay facility houses professional-grade equipment, premium materials and a team that cares about the details.
              </p>
              <p>
                From prototyping to short-run production, we pair responsive service with practical engineering advice so your project keeps moving.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="marketing-section" data-variant="horizon">
        <div className="marketing-section__container">
          <div className="mx-auto max-w-5xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-white/90 px-4 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-primary/70 shadow-sm backdrop-blur">
              Values
            </span>
            <h2 className="mt-6 text-3xl font-semibold text-foreground">What we stand for</h2>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {values.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="group relative overflow-hidden rounded-3xl border border-border/30 bg-white/90 p-6 shadow-sm shadow-primary/10 transition duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl"
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-primary/10 opacity-0 blur-3xl transition duration-300 group-hover:opacity-100"
                />
                <span className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="relative mt-5 text-lg font-semibold text-foreground">{title}</h3>
                <p className="relative mt-3 text-sm text-foreground/70">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="marketing-section" data-variant="peach">
        <div className="marketing-section__container">
          <div className="mx-auto max-w-5xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-white/90 px-4 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-primary/70 shadow-sm backdrop-blur">
              Advantages
            </span>
            <h2 className="mt-6 text-3xl font-semibold text-foreground">Why teams choose us</h2>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {advantages.map((advantage) => (
              <div
                key={advantage.title}
                className="group relative overflow-hidden rounded-3xl border border-border/30 bg-white/90 p-7 text-left shadow-sm shadow-primary/10 transition duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl"
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute -right-14 top-10 h-36 w-36 rounded-full bg-primary/8 opacity-0 blur-3xl transition duration-300 group-hover:opacity-100"
                />
                <h3 className="relative text-lg font-semibold text-foreground">{advantage.title}</h3>
                <p className="relative mt-3 text-sm text-foreground/70">{advantage.description}</p>
                <p className="relative mt-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                  {advantage.bullet}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="marketing-section" data-variant="cloud">
        <div className="marketing-section__container">
          <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-border/30 bg-white/95 p-8 shadow-lg shadow-primary/10 md:p-10">
            <span className="absolute -top-10 left-6 h-28 w-28 rounded-full bg-primary/10 blur-3xl" aria-hidden />
            <span className="absolute -bottom-12 right-10 h-32 w-32 rounded-full bg-primary/5 blur-3xl" aria-hidden />
            <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
                  <Building className="h-5 w-5 text-foreground" aria-hidden />
                </span>
                <div>
                  <h3 className="text-xl font-semibold text-foreground">Visit our Elizabeth Bay facility</h3>
                  <p className="mt-1 text-sm text-foreground/70">9 Greenknowe Avenue, NSW 2011. Visits by appointment.</p>
                </div>
              </div>
              <div className="space-y-3 text-sm text-foreground/70">
                <div className="flex items-start gap-3">
                  <Printer className="h-4 w-4 text-foreground" aria-hidden />
                  <span>Commercial FDM & SLA machines with multi-material capability.</span>
                </div>
                <div className="flex items-start gap-3">
                  <Wrench className="h-4 w-4 text-foreground" aria-hidden />
                  <span>On-site finishing suite for sanding, painting and assembly.</span>
                </div>
                <div className="flex items-start gap-3">
                  <Clock3 className="h-4 w-4 text-foreground" aria-hidden />
                  <span>Standard hours Mon–Fri 9am–6pm, urgent jobs handled on request.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="marketing-section" data-variant="peach">
        <div className="marketing-section__container">
          <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-border/30 bg-white/90 px-6 py-12 text-center shadow-lg shadow-primary/10 md:px-10">
            <span className="absolute -top-16 left-1/2 h-36 w-36 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" aria-hidden />
            <span className="absolute -bottom-20 left-10 h-44 w-44 rounded-full bg-primary/5 blur-[120px]" aria-hidden />
            <div className="relative">
              <h2 className="text-3xl tracking-tight text-foreground">We&apos;d love to collaborate</h2>
              <p className="mt-4 text-base text-foreground/70">
                Share your project and we&apos;ll respond within two business hours with recommendations and next steps.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/quick-order"
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition hover:bg-primary/90 hover:shadow-lg"
                >
                  Start an instant quote
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-white/80 px-6 py-3 text-sm font-semibold text-foreground/75 transition hover:border-foreground/40 hover:text-foreground"
                >
                  Book a call
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
