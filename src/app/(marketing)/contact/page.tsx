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
    <div className="bg-surface-canvas">
      <section className="border-b border-border/60 bg-surface-subtle py-20">
        <div className="mx-auto max-w-4xl px-4 text-center md:px-8">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-foreground/50">Contact</span>
          <h1 className="mt-4 text-4xl tracking-tight text-foreground sm:text-5xl">Let’s discuss your project.</h1>
          <p className="mt-5 text-base text-foreground/70">Send files for quoting, ask technical questions or schedule a consultation. We respond within two business hours.</p>
        </div>
      </section>

      <section className="border-b border-border/60 bg-white py-20">
        <div className="mx-auto max-w-5xl px-4 md:px-8">
          <div className="grid gap-4 md:grid-cols-3">
            {contactMethods.map((method) => {
              const Icon = method.icon;
              return (
                <a
                  key={method.title}
                  href={method.href}
                  target={method.href.startsWith("http") ? "_blank" : undefined}
                  rel={method.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="group rounded-2xl border border-border/60 bg-surface-subtle p-6 transition hover:border-foreground/40"
                >
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-white">
                    <Icon className="h-4 w-4 text-foreground" aria-hidden />
                  </span>
                <h2 className="mt-4 text-lg font-semibold text-foreground">{method.title}</h2>
                <p className="mt-2 text-sm font-medium text-foreground">{method.details}</p>
                <p className="mt-1 text-sm text-foreground/70">{method.description}</p>
                </a>
              );
            })}
          </div>

          <div className="mt-12 rounded-3xl border border-border/60 bg-surface-subtle p-8 md:p-12">
            <h2 className="text-2xl font-semibold text-foreground text-center">Send us a message</h2>
            <p className="mt-2 text-sm text-foreground/70 text-center">We&apos;ll review and get back to you with recommendations and next steps.</p>
            <div className="mt-8">
              <ContactForm />
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border/60 bg-surface-subtle py-20">
        <div className="mx-auto max-w-4xl px-4 md:px-8">
          <div className="rounded-3xl border border-border/60 bg-white p-8 md:p-10">
            <h2 className="text-2xl font-semibold text-foreground text-center">Business hours</h2>
            <div className="mt-6 space-y-3 text-sm text-foreground/70">
              <HoursRow day="Monday – Friday" hours="9:00am – 6:00pm" />
              <HoursRow day="Saturday" hours="By appointment" />
              <HoursRow day="Sunday" hours="Closed" />
            </div>
            <div className="mt-6 rounded-2xl bg-surface-subtle p-4 text-sm text-foreground/70">
              <p><strong>Same-day service:</strong> Files received before 10am can be delivered the same day (subject to complexity and availability).</p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border/60 bg-white py-20">
        <div className="mx-auto max-w-5xl px-4 md:px-8">
          <h2 className="text-3xl font-semibold text-foreground">Delivery & service areas</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {serviceAreas.map((area) => (
              <div key={area.title} className="rounded-2xl border border-border/60 bg-surface-subtle p-6">
                <h3 className="text-lg font-semibold text-foreground">{area.title}</h3>
                <ul className="mt-3 space-y-2 text-sm text-foreground/70">
                  {area.items.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-foreground/40" aria-hidden />
                      {item}
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
          <h2 className="text-3xl font-semibold text-foreground text-center">Quick questions</h2>
          <div className="mt-8 space-y-4">
            {faqs.map((faq) => (
              <details key={faq.question} className="rounded-2xl border border-border/60 bg-white p-6 text-sm text-foreground/70">
                <summary className="cursor-pointer list-none text-base font-semibold text-foreground">{faq.question}</summary>
                <p className="mt-2 text-sm text-foreground/70">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-4xl rounded-3xl border border-border/60 bg-surface-subtle px-6 py-12 text-center shadow-sm md:px-10">
          <h2 className="text-3xl tracking-tight text-foreground">Prefer to start with a quote?</h2>
          <p className="mt-4 text-base text-foreground/70">Upload your files for instant pricing or share a brief and we&apos;ll respond with tailored recommendations.</p>
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
              Book a consultation
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

function HoursRow({ day, hours }: { day: string; hours: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border/60 bg-surface-subtle px-4 py-3">
      <span className="text-sm font-medium text-foreground">{day}</span>
      <span className="text-sm text-foreground/70">{hours}</span>
    </div>
  )
}
