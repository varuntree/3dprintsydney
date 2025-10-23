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
    <section className="marketing-section" data-variant="peach">
      <div
        aria-hidden
        className="pointer-events-none absolute right-0 top-10 h-64 w-64 translate-x-1/3 rounded-full bg-primary/12 blur-3xl"
      />
      <div className="marketing-section__container relative">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-white/90 px-4 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-primary/70 shadow-sm backdrop-blur">
            Proof
          </span>
          <h2 className="mt-6 text-3xl tracking-tight text-foreground sm:text-4xl">
            Trusted by teams who need reliable parts, fast.
          </h2>
          <p className="mt-4 max-w-xl text-base text-foreground/70">
            Metrics and testimonials from founders, students, and engineers who rely on us when deadlines are real.
          </p>
        </div>

        <div className="mt-16 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {stats.map(({ icon: Icon, value, label }) => (
            <div
              key={value}
              className="group relative overflow-hidden rounded-3xl border border-border/50 bg-white/90 p-6 shadow-sm shadow-primary/5 transition duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-2xl"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/12 via-transparent to-transparent opacity-0 transition duration-300 group-hover:opacity-100"
              />
              <span className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <div className="relative mt-5 text-2xl font-semibold text-foreground">{value}</div>
              <div className="relative mt-2 text-sm text-foreground/70">{label}</div>
            </div>
          ))}
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {testimonials.map((testimonial) => (
            <blockquote
              key={testimonial.author}
              className="group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-border/50 bg-white/90 p-6 shadow-sm shadow-primary/5 transition duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-2xl"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary/12 via-primary/5 to-transparent opacity-0 transition duration-300 group-hover:opacity-100"
              />
              <p className="relative text-sm leading-relaxed text-foreground/75">“{testimonial.quote}”</p>
              <footer className="relative mt-6 text-sm text-foreground/60">
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
