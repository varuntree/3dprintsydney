import Link from "next/link"
import type { Metadata } from "next"
import {
  ArrowRight,
  Bolt,
  Cuboid,
  Layers3,
  PenTool,
  ShieldCheck,
} from "lucide-react"

export const metadata: Metadata = {
  title: "Services - 3D Printing Services Sydney | 3D Print Sydney",
  description:
    "Professional 3D printing services: Rapid Prototyping, Custom Parts, Model Printing, and Design Services. Same-day service available in Sydney CBD.",
}

const bulletDot = <span className="mt-1 h-1.5 w-1.5 rounded-full bg-foreground/40" aria-hidden />

export default function ServicesPage() {
  return (
    <div className="bg-surface-canvas">
      <section className="border-b border-border/60 bg-surface-subtle py-20">
        <div className="mx-auto max-w-4xl px-4 text-center md:px-8">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-foreground/50">Services</span>
          <h1 className="mt-4 text-4xl tracking-tight text-foreground sm:text-5xl">
            3D printing services for teams who need parts without the wait.
          </h1>
          <p className="mt-5 text-base text-foreground/70">
            Professional machines, premium materials and engineering support from our Elizabeth Bay studio. From rapid prototyping to full production, we keep projects moving on your timeline.
          </p>
        </div>
      </section>

      <section id="rapid-prototyping" className="border-b border-border/60 bg-white py-20">
        <div className="mx-auto max-w-5xl px-4 md:px-8">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-surface-subtle text-foreground">
              <Bolt className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <h2 className="text-3xl font-semibold text-foreground">Rapid prototyping</h2>
              <p className="text-sm text-foreground/60">Concept to functional prototype in hours.</p>
            </div>
          </div>

          <p className="mt-6 text-base text-foreground/70">
            Iterate faster with low-risk, high-quality prints. Ideal for startups, engineers and product teams who need validated parts before committing to tooling.
          </p>

          <div className="mt-10 grid gap-8 md:grid-cols-2">
            <div className="rounded-2xl border border-border/60 bg-surface-subtle p-6">
              <h3 className="text-lg font-semibold text-foreground">Who it&apos;s for</h3>
              <ul className="mt-4 space-y-3 text-sm text-foreground/70">
                <li className="flex items-start gap-3">{bulletDot}Tech startups developing new products</li>
                <li className="flex items-start gap-3">{bulletDot}Manufacturing engineers validating designs</li>
                <li className="flex items-start gap-3">{bulletDot}Product developers iterating on concepts</li>
                <li className="flex items-start gap-3">{bulletDot}Innovation labs and maker spaces</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-border/60 bg-surface-subtle p-6">
              <h3 className="text-lg font-semibold text-foreground">Key benefits</h3>
              <ul className="mt-4 space-y-3 text-sm text-foreground/70">
                <li className="flex items-start gap-3">{bulletDot}Same-day turnaround available</li>
                <li className="flex items-start gap-3">{bulletDot}Advanced engineering materials</li>
                <li className="flex items-start gap-3">{bulletDot}Design consultation included</li>
                <li className="flex items-start gap-3">{bulletDot}Quality inspection on every part</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-border/60 bg-white p-6">
            <h3 className="text-lg font-semibold text-foreground">Our process</h3>
            <ul className="mt-4 space-y-4 text-sm text-foreground/70">
              <li>
                <span className="font-medium text-foreground">Consultation (15 min):</span> Review requirements, recommend materials and technology.
              </li>
              <li>
                <span className="font-medium text-foreground">File preparation (30 min):</span> Optimise existing CAD or create files from scratch.
              </li>
              <li>
                <span className="font-medium text-foreground">Production (2–8 hours):</span> Print on professional-grade equipment using premium materials.
              </li>
              <li>
                <span className="font-medium text-foreground">Quality check (30 min):</span> Inspect for dimensional accuracy and surface finish.
              </li>
              <li>
                <span className="font-medium text-foreground">Delivery:</span> Pickup from Elizabeth Bay or courier across Sydney.
              </li>
            </ul>
          </div>

          <div className="mt-8 rounded-2xl border border-border/60 bg-surface-subtle p-6">
            <h3 className="text-lg font-semibold text-foreground">Typical pricing</h3>
            <ul className="mt-4 space-y-2 text-sm text-foreground/70">
              <li><span className="font-medium text-foreground">Small parts (under 50g):</span> $50 – $150</li>
              <li><span className="font-medium text-foreground">Medium parts (50–200g):</span> $150 – $400</li>
              <li><span className="font-medium text-foreground">Large parts (200g+):</span> $400+</li>
              <li className="text-foreground/60">Students save 20% on all orders.</li>
            </ul>
          </div>

          <div className="mt-10 text-center md:text-left">
            <Link
              href="/quick-order"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              Get prototype quote
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      <section id="custom-parts" className="border-b border-border/60 bg-surface-subtle py-20">
        <div className="mx-auto max-w-5xl px-4 md:px-8">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-white text-foreground">
              <Cuboid className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <h2 className="text-3xl font-semibold text-foreground">Custom parts</h2>
              <p className="text-sm text-foreground/60">Replacement and improvement for hard-to-source components.</p>
            </div>
          </div>

          <p className="mt-6 text-base text-foreground/70">
            Recreate discontinued parts, improve existing designs or manufacture small batches with confidence. We specialise in precision components that need to fit first time.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-border/60 bg-white p-6">
              <h3 className="text-lg font-semibold text-foreground">Common use cases</h3>
              <ul className="mt-4 space-y-3 text-sm text-foreground/70">
                <li className="flex items-start gap-3">{bulletDot}Replacement parts for discontinued products</li>
                <li className="flex items-start gap-3">{bulletDot}Upgraded components with improved materials</li>
                <li className="flex items-start gap-3">{bulletDot}One-off custom pieces for unique applications</li>
                <li className="flex items-start gap-3">{bulletDot}Small batch production (1–100 units)</li>
                <li className="flex items-start gap-3">{bulletDot}Reverse engineering from physical samples</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-border/60 bg-white p-6">
              <h3 className="text-lg font-semibold text-foreground">Materials available</h3>
              <ul className="mt-4 space-y-3 text-sm text-foreground/70">
                <li><span className="font-medium text-foreground">Standard:</span> PLA, PETG, ABS</li>
                <li><span className="font-medium text-foreground">Engineering:</span> Nylon, Polycarbonate, Carbon Fibre</li>
                <li><span className="font-medium text-foreground">Specialty:</span> Flexible filaments, High-temp resins</li>
                <li>We&apos;ll recommend the best material for your application.</li>
              </ul>
            </div>
          </div>

          <div className="mt-10 text-center md:text-left">
            <Link
              href="/quick-order"
              className="inline-flex items-center gap-2 rounded-full border border-border/70 px-6 py-3 text-sm font-medium text-foreground/75 transition hover:border-foreground/40 hover:text-foreground"
            >
              Request custom part
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      <section id="model-printing" className="border-b border-border/60 bg-white py-20">
        <div className="mx-auto max-w-5xl px-4 md:px-8">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-surface-subtle text-foreground">
              <Layers3 className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <h2 className="text-3xl font-semibold text-foreground">Model printing</h2>
              <p className="text-sm text-foreground/60">Presentation-ready architectural, marketing and education pieces.</p>
            </div>
          </div>

          <p className="mt-6 text-base text-foreground/70">
            Deliver high-impact visuals with clean surfaces and crisp detail. Perfect for architectural pitches, product launches and exhibition displays.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-border/60 bg-surface-subtle p-6">
              <h3 className="text-lg font-semibold text-foreground">Perfect for</h3>
              <ul className="mt-4 space-y-3 text-sm text-foreground/70">
                <li className="flex items-start gap-3">{bulletDot}Architectural firms presenting to clients</li>
                <li className="flex items-start gap-3">{bulletDot}Product designers showcasing concepts</li>
                <li className="flex items-start gap-3">{bulletDot}Marketing teams preparing trade shows</li>
                <li className="flex items-start gap-3">{bulletDot}Educators building teaching models</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-border/60 bg-surface-subtle p-6">
              <h3 className="text-lg font-semibold text-foreground">Features</h3>
              <ul className="mt-4 space-y-3 text-sm text-foreground/70">
                <li className="flex items-start gap-3">{bulletDot}High resolution (50-micron layers)</li>
                <li className="flex items-start gap-3">{bulletDot}Smooth finish with post-processing</li>
                <li className="flex items-start gap-3">{bulletDot}Large format up to 300mm³</li>
                <li className="flex items-start gap-3">{bulletDot}Colour options and finishing services</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-border/60 bg-white p-6">
            <h3 className="text-lg font-semibold text-foreground">Finishing services</h3>
            <div className="mt-4 grid gap-6 md:grid-cols-3">
              <div className="text-sm text-foreground/70">
                <p className="font-medium text-foreground">Sanding & smoothing</p>
                <p className="mt-2">Remove layer lines for a polished finish ($30–$80 per part).</p>
              </div>
              <div className="text-sm text-foreground/70">
                <p className="font-medium text-foreground">Painting</p>
                <p className="mt-2">Professional spray painting in any colour ($50–$150 per part).</p>
              </div>
              <div className="text-sm text-foreground/70">
                <p className="font-medium text-foreground">Assembly</p>
                <p className="mt-2">Multi-part assembly and installation ($20–$50 per hour).</p>
              </div>
            </div>
          </div>

          <div className="mt-10 text-center md:text-left">
            <Link
              href="/quick-order"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              Print your model
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      <section id="design-services" className="border-b border-border/60 bg-surface-subtle py-20">
        <div className="mx-auto max-w-5xl px-4 md:px-8">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-white text-foreground">
              <PenTool className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <h2 className="text-3xl font-semibold text-foreground">Design services</h2>
              <p className="text-sm text-foreground/60">From ideas, sketches or samples to production-ready CAD.</p>
            </div>
          </div>

          <p className="mt-6 text-base text-foreground/70">
            Work with our design engineers to create or refine files before printing. Ideal when you&apos;re starting from a sketch, need DFM input or want us to reverse engineer a part.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {["Brief & requirements", "Initial concepts", "Refinement", "Final CAD files"].map((step, index) => (
              <div key={step} className="rounded-2xl border border-border/60 bg-white p-6">
                <div className="flex items-center gap-3 text-sm font-medium text-foreground/60">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-surface-subtle text-foreground">
                    {index + 1}
                  </span>
                  Step {index + 1}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">{step}</h3>
                <p className="mt-2 text-sm text-foreground/70">
                  {
                    [
                      "Discuss your vision, technical requirements and constraints.",
                      "Receive two to three design directions for feedback.",
                      "Iterate with two rounds of revisions included.",
                      "Deliver production-ready files in STL, STEP or OBJ.",
                    ][index]
                  }
                </p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-col gap-4 rounded-2xl border border-border/60 bg-white p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">What&apos;s included</h3>
              <ul className="mt-3 space-y-2 text-sm text-foreground/70">
                <li className="flex items-start gap-3">{bulletDot}Kick-off session with a design engineer</li>
                <li className="flex items-start gap-3">{bulletDot}Design for manufacturability review</li>
                <li className="flex items-start gap-3">{bulletDot}Material and tolerance recommendations</li>
              </ul>
            </div>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-full border border-border/70 px-6 py-3 text-sm font-medium text-foreground/75 transition hover:border-foreground/40 hover:text-foreground"
            >
              Start a design project
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-4xl rounded-3xl border border-border/60 bg-surface-subtle px-6 py-12 text-center shadow-sm md:px-10">
          <ShieldCheck className="mx-auto h-10 w-10 text-foreground" aria-hidden />
          <h2 className="mt-4 text-3xl tracking-tight text-foreground">Not sure where to start?</h2>
          <p className="mt-4 text-base text-foreground/70">
            Share your files or ideas and we&apos;ll guide you through the best service, material and finish for your project.
          </p>
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
              Talk to our team
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
