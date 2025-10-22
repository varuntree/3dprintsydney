import Link from "next/link"
import type { Metadata } from "next"
import { ArrowRight, Building2, Cog, Layers3, Rocket } from "lucide-react"

export const metadata: Metadata = {
  title: "Portfolio - 3D Printing Projects | 3D Print Sydney",
  description:
    "See our 3D printing work: prototypes, custom parts, architectural models, and engineering components. Over 1,000 projects completed.",
}

const stats = [
  { value: "1,000+", label: "Projects completed" },
  { value: "150+", label: "Business clients" },
  { value: "500+", label: "Student projects" },
  { value: "50+", label: "Materials in library" },
]

const categories = [
  {
    title: "Rapid prototyping",
    icon: Rocket,
    description: "Fast-turnaround functional prototypes for product development and testing.",
    projects: [
      {
        title: "Consumer electronics enclosure",
        client: "Tech startup",
        material: "PETG",
        turnaround: "Same day",
        summary: "Multiple design iterations for a smart home device enclosure delivered in under 48 hours before tooling.",
        highlights: ["3 design revisions in 2 days", "Snap-fit assembly testing", "Final design sent to injection moulding"],
      },
      {
        title: "Medical device component",
        client: "Healthcare",
        material: "Nylon PA12",
        turnaround: "2 days",
        summary: "Functional prototype requiring strength testing and biocompatibility considerations.",
        highlights: ["Strength testing validated", "Material optimisation reduced weight by 30%", "Submitted for regulatory review"],
      },
      {
        title: "Drone frame prototype",
        client: "Aerospace",
        material: "Carbon fibre PETG",
        turnaround: "3 days",
        summary: "Lightweight frame optimised for strength-to-weight ratio for a commercial drone programme.",
        highlights: ["40% lighter than aluminium equivalent", "Flight tested successfully", "Informed final carbon fibre layup"],
      },
    ],
  },
  {
    title: "Custom parts & replacements",
    icon: Layers3,
    description: "One-off parts and replacements for discontinued or hard-to-source components.",
    projects: [
      {
        title: "Vintage car dashboard knobs",
        client: "Automotive restoration",
        material: "ABS",
        turnaround: "5 days",
        summary: "Reverse-engineered knobs for a 1970s classic car where originals were no longer manufactured.",
        highlights: ["3D scanned from damaged originals", "Exact colour match achieved", "Set of eight knobs delivered"],
      },
      {
        title: "Industrial machine bracket",
        client: "Manufacturing",
        material: "Polycarbonate",
        turnaround: "1 day",
        summary: "Emergency replacement bracket that avoided six weeks of production downtime.",
        highlights: ["Operational loads validated", "Kept production line running", "Client commissioned metal spare in parallel"],
      },
      {
        title: "Custom cable management clips",
        client: "Office fitout",
        material: "PLA",
        turnaround: "2 days",
        summary: "Designed bespoke clips to match interior finishes where off-the-shelf parts didn't align with the aesthetic.",
        highlights: ["Designed from scratch to spec", "Batch of 50 units produced", "Perfect colour match to interior"],
      },
    ],
  },
  {
    title: "Architectural & display models",
    icon: Building2,
    description: "High-detail presentation models for architecture, real estate and marketing teams.",
    projects: [
      {
        title: "Mixed-use development model",
        client: "Architecture firm",
        material: "Standard resin + PLA",
        turnaround: "1 week",
        summary: "1:200 scale model of a proposed Sydney development for client presentations.",
        highlights: ["Multi-material model for distinct elements", "Hand finished and painted", "Client secured approval"],
      },
      {
        title: "Product display stand",
        client: "Retail",
        material: "Transparent PETG",
        turnaround: "3 days",
        summary: "Custom display stands for a jewellery boutique creating a floating product effect.",
        highlights: ["Transparent PETG polished to clarity", "Set of 12 stands", "Delivered with protective packaging"],
      },
      {
        title: "Topographic campus model",
        client: "University",
        material: "PLA multi-colour",
        turnaround: "2 weeks",
        summary: "Large-format topographic model for visitor centre display featuring removable building modules.",
        highlights: ["300mm x 300mm build volume utilised", "Multi-colour terrain representation", "Modular buildings for future updates"],
      },
    ],
  },
  {
    title: "Engineering & functional parts",
    icon: Cog,
    description: "Production-grade parts for testing, tooling and end-use applications.",
    projects: [
      {
        title: "Custom jigs & fixtures",
        client: "Manufacturing",
        material: "Carbon fibre nylon",
        turnaround: "4 days",
        summary: "Assembly-line jigs requiring tight tolerances and durability across thousands of cycles.",
        highlights: ["±0.1mm tolerance achieved", "Withstands 10,000+ cycles", "90% cost reduction vs machined aluminium"],
      },
      {
        title: "Prosthetic hand components",
        client: "Healthcare",
        material: "Tough resin",
        turnaround: "5 days",
        summary: "Set of prototype finger assemblies balancing strength, flexibility and comfort.",
        highlights: ["Material testing under repeated load", "Iterated with occupational therapists", "Enabled pilot programme for patients"],
      },
      {
        title: "Robotics gripper housing",
        client: "Automation",
        material: "PETG + TPU inserts",
        turnaround: "6 days",
        summary: "Hybrid assembly combining rigid and flexible elements for automated pick-and-place tooling.",
        highlights: ["Integrated flexible pads for grip", "Reduced assembly time by 40%", "Deployed across two production cells"],
      },
    ],
  },
]

const testimonials = [
  {
    quote: "Iterating with 3D Print Sydney let us accelerate hardware development by weeks. They flagged design improvements before we hit print.",
    author: "Hardware startup founder",
  },
  {
    quote: "The team produced architectural models that helped us secure key client approvals. Finish quality is consistently excellent.",
    author: "Associate, architecture firm",
  },
  {
    quote: "We rely on them for urgent production tooling. Parts arrive on time and are production-ready.",
    author: "Operations manager, manufacturing company",
  },
]

export default function PortfolioPage() {
  return (
    <div className="bg-surface-canvas">
      <section className="border-b border-border/60 bg-surface-subtle py-20">
        <div className="mx-auto max-w-4xl px-4 text-center md:px-8">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-foreground/50">Portfolio</span>
          <h1 className="mt-4 text-4xl tracking-tight text-foreground sm:text-5xl">Projects delivered across Sydney.</h1>
          <p className="mt-5 text-base text-foreground/70">From idea-stage prototypes to production tooling, explore representative projects from the 1,000+ builds we&apos;ve completed.</p>
        </div>
      </section>

      <section className="border-b border-border/60 bg-white py-16">
        <div className="mx-auto max-w-5xl px-4 md:px-8">
          <div className="grid gap-4 text-center sm:grid-cols-2 md:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-border/60 bg-surface-subtle p-6">
                <p className="text-2xl font-semibold text-foreground">{stat.value}</p>
                <p className="mt-2 text-sm text-foreground/70">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {categories.map((category) => {
        const Icon = category.icon;
        return (
          <section key={category.title} className="border-b border-border/60 bg-surface-subtle py-20">
            <div className="mx-auto max-w-6xl px-4 md:px-8">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-white">
                  <Icon className="h-4 w-4 text-foreground" aria-hidden />
                </span>
                <div>
                  <h2 className="text-3xl font-semibold text-foreground">{category.title}</h2>
                  <p className="text-sm text-foreground/60">{category.description}</p>
                </div>
              </div>

              <div className="mt-10 grid gap-4 md:grid-cols-3">
                {category.projects.map((project) => (
                  <article key={project.title} className="rounded-2xl border border-border/60 bg-white p-6">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-foreground/50">{project.client}</p>
                  <h3 className="mt-3 text-lg font-semibold text-foreground">{project.title}</h3>
                  <p className="mt-2 text-sm text-foreground/70">{project.summary}</p>
                  <dl className="mt-4 grid gap-2 text-xs text-foreground/60">
                    <div className="flex items-center justify-between">
                      <dt>Material</dt>
                      <dd className="font-medium text-foreground">{project.material}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt>Turnaround</dt>
                      <dd className="font-medium text-foreground">{project.turnaround}</dd>
                    </div>
                  </dl>
                  <ul className="mt-4 space-y-2 text-sm text-foreground/70">
                    {project.highlights.map((highlight) => (
                      <li key={highlight} className="flex items-start gap-3">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-foreground/40" aria-hidden />
                        {highlight}
                      </li>
                    ))}
                  </ul>
                  </article>
                ))}
              </div>
            </div>
          </section>
        );
      })}

      <section className="border-b border-border/60 bg-white py-20">
        <div className="mx-auto max-w-5xl px-4 md:px-8">
          <h2 className="text-3xl font-semibold text-foreground">What clients say</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {testimonials.map((testimonial) => (
              <blockquote key={testimonial.author} className="rounded-2xl border border-border/60 bg-surface-subtle p-6">
                <p className="text-sm text-foreground/75">“{testimonial.quote}”</p>
                <footer className="mt-4 text-xs font-medium uppercase tracking-[0.2em] text-foreground/50">{testimonial.author}</footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-surface-subtle py-20">
        <div className="mx-auto max-w-4xl rounded-3xl border border-border/60 bg-white px-6 py-12 text-center shadow-sm md:px-10">
          <h2 className="text-3xl tracking-tight text-foreground">Have a project in mind?</h2>
          <p className="mt-4 text-base text-foreground/70">Tell us about your goals and we&apos;ll recommend the right process, materials and timeline.</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/quick-order"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              Start a brief
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
