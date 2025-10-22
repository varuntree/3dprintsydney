import { BadgeCheck, Clock3, GraduationCap, Users } from "lucide-react";

const stats = [
  {
    icon: Users,
    value: "1,000+",
    label: "Projects completed",
  },
  {
    icon: Clock3,
    value: "Same day",
    label: "Production available",
  },
  {
    icon: GraduationCap,
    value: "20%",
    label: "Automatic student concession",
  },
  {
    icon: BadgeCheck,
    value: "4.9 / 5",
    label: "Average client rating",
  },
];

const testimonials = [
  {
    quote:
      "3D Print Sydney helped us iterate three hardware revisions in a single week. The communication and advice saved us days of rework.",
    author: "Product manager",
    company: "Hardware startup, Surry Hills",
  },
  {
    quote:
      "The team guided me through material selection and tolerances for my architecture studio project. The final model looked like it came straight from a gallery.",
    author: "Architecture student",
    company: "University of Sydney",
  },
  {
    quote:
      "They proactively adjusted our part geometry so the print would withstand repeated load. That's the kind of engineering partner we need.",
    author: "Mechanical engineer",
    company: "Manufacturing firm, Alexandria",
  },
];

export function SocialProof() {
  return (
    <section className="border-b border-border/60 bg-white py-20">
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <div className="max-w-2xl">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-foreground/50">
            Proof
          </span>
          <h2 className="mt-4 text-3xl tracking-tight text-foreground sm:text-4xl">
            Trusted by teams who need reliable parts, fast.
          </h2>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-4">
          {stats.map(({ icon: Icon, value, label }) => (
            <div key={value} className="rounded-2xl border border-border/60 bg-surface-subtle p-6">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-white">
                <Icon className="h-4 w-4 text-foreground" aria-hidden />
              </span>
              <div className="mt-4 text-2xl font-semibold text-foreground">{value}</div>
              <div className="mt-2 text-sm text-foreground/70">{label}</div>
            </div>
          ))}
        </div>

        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {testimonials.map((testimonial) => (
            <blockquote
              key={testimonial.author}
              className="flex h-full flex-col justify-between rounded-2xl border border-border/60 bg-surface-subtle p-6"
            >
              <p className="text-sm leading-relaxed text-foreground/75">“{testimonial.quote}”</p>
              <footer className="mt-6 text-sm text-foreground/60">
                <div className="font-medium text-foreground">{testimonial.author}</div>
                <div>{testimonial.company}</div>
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
