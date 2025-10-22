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
    <div className="bg-surface-canvas">
      <section className="border-b border-border/60 bg-surface-subtle py-20">
        <div className="mx-auto max-w-4xl px-4 text-center md:px-8">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-foreground/50">About</span>
          <h1 className="mt-4 text-4xl tracking-tight text-foreground sm:text-5xl">Sydney&apos;s on-demand 3D printing studio.</h1>
          <p className="mt-5 text-base text-foreground/70">
            Founded in 2018, 3D Print Sydney brings together engineers, designers and makers to deliver professional results without the red tape.
          </p>
        </div>
      </section>

      <section className="border-b border-border/60 bg-white py-20">
        <div className="mx-auto max-w-4xl px-4 md:px-8">
          <h2 className="text-3xl font-semibold text-foreground">Our story</h2>
          <div className="mt-6 space-y-6 text-base text-foreground/70">
            <p>We started 3D Print Sydney after experiencing week-long turnaround times, opaque pricing and limited technical guidance from traditional providers.</p>
            <p>Today we&apos;ve supported more than a thousand projects across startups, universities and established manufacturers. Our Elizabeth Bay facility houses professional-grade equipment, premium materials and a team that cares about the details.</p>
            <p>From prototyping to short-run production, we pair responsive service with practical engineering advice so your project keeps moving.</p>
          </div>
        </div>
      </section>

      <section className="border-b border-border/60 bg-surface-subtle py-20">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <h2 className="text-3xl font-semibold text-foreground">What we stand for</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {values.map(({ icon: Icon, title, description }) => (
              <div key={title} className="rounded-2xl border border-border/60 bg-white p-6">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-surface-subtle">
                  <Icon className="h-4 w-4 text-foreground" aria-hidden />
                </span>
                <h3 className="mt-4 text-lg font-semibold text-foreground">{title}</h3>
                <p className="mt-2 text-sm text-foreground/70">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border/60 bg-white py-20">
        <div className="mx-auto max-w-5xl px-4 md:px-8">
          <h2 className="text-3xl font-semibold text-foreground">Why teams choose us</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {advantages.map((advantage) => (
              <div key={advantage.title} className="rounded-2xl border border-border/60 bg-surface-subtle p-6">
                <h3 className="text-lg font-semibold text-foreground">{advantage.title}</h3>
                <p className="mt-2 text-sm text-foreground/70">{advantage.description}</p>
                <p className="mt-4 text-sm font-medium text-foreground">{advantage.bullet}</p>
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

      <section className="bg-white py-20">
        <div className="mx-auto max-w-4xl rounded-3xl border border-border/60 bg-surface-subtle px-6 py-12 text-center shadow-sm md:px-10">
          <h2 className="text-3xl tracking-tight text-foreground">We&apos;d love to collaborate</h2>
          <p className="mt-4 text-base text-foreground/70">Share your project and we&apos;ll respond within two business hours with recommendations and next steps.</p>
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
              Book a call
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
