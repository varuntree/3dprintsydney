import Link from "next/link"
import type { Metadata } from "next"
import { ContactForm } from "@/components/marketing/contact-form"
import { ArrowRight, Mail, MapPin, Phone } from "lucide-react"

export const metadata: Metadata = {
  title: "Contact Us - 3D Print Sydney | Get in Touch",
  description:
    "Contact 3D Print Sydney for quotes, technical questions, or project consultations. Located in Elizabeth Bay. Phone: (+61) 0458 237 428",
}

const contactMethods = [
  {
    icon: Phone,
    title: "Call us",
    details: "(+61) 0458 237 428",
    description: "Mon–Fri 9am–6pm",
    href: "tel:+61458237428",
  },
  {
    icon: Mail,
    title: "Email",
    details: "alan@3dprintsydney.com",
    description: "Responses within two business hours",
    href: "mailto:alan@3dprintsydney.com",
  },
  {
    icon: MapPin,
    title: "Visit",
    details: "9 Greenknowe Avenue",
    description: "Elizabeth Bay, NSW 2011",
    href: "https://maps.google.com/?q=9+Greenknowe+Avenue+Elizabeth+Bay+NSW+2011",
  },
]

const serviceAreas = [
  {
    title: "Same-day delivery",
    items: ["Sydney CBD", "Eastern Suburbs", "Inner West", "North Shore (selected areas)"],
  },
  {
    title: "Standard delivery (1–2 days)",
    items: ["Greater Sydney Metro", "NSW regional (quote based)", "Interstate (quote based)", "Pickup from Elizabeth Bay (free)"],
  },
]

const faqs = [
  {
    question: "How do I get a quote?",
    answer: "Use our Quick Order tool to upload your file and receive an instant quote. No account required.",
  },
  {
    question: "What file formats do you accept?",
    answer: "We accept STL, OBJ, STEP and most common 3D file formats. If you're unsure, share what you have.",
  },
  {
    question: "Do you offer design services?",
    answer: "Yes. Our team can create or repair CAD files from sketches, photos or physical samples.",
  },
  {
    question: "How does the student discount work?",
    answer: "Create an account with your .edu email and the 20% concession is applied automatically at checkout.",
  },
]

export default function ContactPage() {
  return (
    <div className="bg-gradient-to-b from-[#edf4ff] via-white to-[#fff5ea]">
      <section className="marketing-section" data-variant="hero">
        <div className="marketing-section__container">
          <div className="mx-auto max-w-4xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-white/80 px-4 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-primary/70 shadow-sm backdrop-blur">
              Contact
            </span>
            <h1 className="mt-6 text-4xl tracking-tight text-foreground sm:text-5xl">Let’s discuss your project.</h1>
            <p className="mt-5 text-base text-foreground/70">
              Send files for quoting, ask technical questions or schedule a consultation. We respond within two business hours.
            </p>
          </div>
        </div>
      </section>

      <section className="marketing-section" data-variant="cloud">
        <div className="marketing-section__container">
          <div className="grid gap-5 md:grid-cols-3">
            {contactMethods.map((method) => {
              const Icon = method.icon;
              const external = method.href.startsWith("http");
              return (
                <a
                  key={method.title}
                  href={method.href}
                  target={external ? "_blank" : undefined}
                  rel={external ? "noopener noreferrer" : undefined}
                  className="group relative overflow-hidden rounded-3xl border border-border/30 bg-white/90 p-6 shadow-sm shadow-primary/10 transition duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl"
                >
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary/10 opacity-0 blur-3xl transition duration-300 group-hover:opacity-100"
                  />
                  <span className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <h2 className="relative mt-5 text-lg font-semibold text-foreground">{method.title}</h2>
                  <p className="relative mt-2 text-sm font-medium text-foreground">{method.details}</p>
                  <p className="relative mt-1 text-sm text-foreground/70">{method.description}</p>
                </a>
              );
            })}
          </div>

          <div className="mt-12 overflow-hidden rounded-3xl border border-border/30 bg-white/95 p-8 shadow-lg shadow-primary/10 backdrop-blur md:p-12">
            <span className="pointer-events-none absolute inset-x-10 -top-20 h-36 rounded-full bg-primary/10 blur-3xl" aria-hidden />
            <div className="relative mx-auto max-w-3xl text-center">
              <h2 className="text-2xl font-semibold text-foreground">Send us a message</h2>
              <p className="mt-2 text-sm text-foreground/70">
                We&apos;ll review and get back to you with recommendations and next steps.
              </p>
            </div>
            <div className="relative mt-8">
              <ContactForm />
            </div>
          </div>
        </div>
      </section>

      <section className="marketing-section" data-variant="horizon">
        <div className="marketing-section__container">
          <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-border/30 bg-white/95 p-8 shadow-lg shadow-primary/10 md:p-10">
            <span className="absolute -top-16 right-8 h-40 w-40 rounded-full bg-primary/10 blur-3xl" aria-hidden />
            <span className="absolute -bottom-16 left-8 h-44 w-44 rounded-full bg-primary/5 blur-[120px]" aria-hidden />
            <div className="relative text-center">
              <h2 className="text-2xl font-semibold text-foreground">Business hours</h2>
              <p className="mt-3 text-sm text-foreground/65">
                Need us outside these times? Call and we&apos;ll confirm availability.
              </p>
            </div>
            <div className="relative mt-8 space-y-3 text-sm text-foreground/70">
              <HoursRow day="Monday – Friday" hours="9:00am – 6:00pm" />
              <HoursRow day="Saturday" hours="By appointment" />
              <HoursRow day="Sunday" hours="Closed" />
            </div>
            <div className="relative mt-8 rounded-2xl border border-primary/20 bg-primary/5 p-5 text-sm text-foreground/70">
              <p>
                <strong className="font-semibold text-foreground">Same-day service:</strong> Files received before 10am can be delivered the same day (subject to complexity and availability).
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="marketing-section" data-variant="peach">
        <div className="marketing-section__container">
          <div className="mx-auto max-w-5xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-white/90 px-4 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-primary/70 shadow-sm backdrop-blur">
              Delivery
            </span>
            <h2 className="mt-6 text-3xl font-semibold text-foreground">Delivery & service areas</h2>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {serviceAreas.map((area) => (
              <div
                key={area.title}
                className="group relative overflow-hidden rounded-3xl border border-border/30 bg-white/90 p-7 shadow-sm shadow-primary/10 transition duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl"
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute -right-14 top-12 h-36 w-36 rounded-full bg-primary/10 opacity-0 blur-3xl transition duration-300 group-hover:opacity-100"
                />
                <h3 className="relative text-lg font-semibold text-foreground">{area.title}</h3>
                <ul className="relative mt-4 space-y-3 text-sm text-foreground/70">
                  {area.items.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary/40" aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="marketing-section" data-variant="cloud">
        <div className="marketing-section__container">
          <div className="mx-auto max-w-4xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-white/90 px-4 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-primary/70 shadow-sm backdrop-blur">
              Quick questions
            </span>
            <h2 className="mt-6 text-3xl font-semibold text-foreground">Need answers fast?</h2>
          </div>
          <div className="mt-10 space-y-4">
            {faqs.map((faq) => (
              <details
                key={faq.question}
                className="group overflow-hidden rounded-3xl border border-border/30 bg-white/90 p-6 text-sm text-foreground/70 shadow-sm shadow-primary/10 transition duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl"
              >
                <summary className="cursor-pointer list-none text-base font-semibold text-foreground">
                  {faq.question}
                </summary>
                <p className="mt-2 text-sm text-foreground/70">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="marketing-section" data-variant="peach">
        <div className="marketing-section__container">
          <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-border/30 bg-white/90 px-6 py-12 text-center shadow-lg shadow-primary/10 md:px-10">
            <span className="absolute -top-16 left-1/2 h-36 w-36 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" aria-hidden />
            <span className="absolute -bottom-20 left-10 h-44 w-44 rounded-full bg-primary/5 blur-[120px]" aria-hidden />
            <div className="relative">
              <h2 className="text-3xl tracking-tight text-foreground">Prefer to start with a quote?</h2>
              <p className="mt-4 text-base text-foreground/70">
                Upload your files for instant pricing or share a brief and we&apos;ll respond with tailored recommendations.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/quick-order"
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition hover:bg-primary/90 hover:shadow-lg"
                >
                  Get instant quote
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-white/80 px-6 py-3 text-sm font-semibold text-foreground/75 transition hover:border-foreground/40 hover:text-foreground"
                >
                  Book a consultation
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function HoursRow({ day, hours }: { day: string; hours: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border/30 bg-white/90 px-4 py-3 shadow-sm shadow-primary/5">
      <span className="text-sm font-semibold text-foreground/80">{day}</span>
      <span className="text-sm text-foreground/60">{hours}</span>
    </div>
  )
}
