import { ClipboardList, FileUp, Layers3, Package } from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Share your files",
    description:
      "Upload a print-ready file or book a quick call with our team. We support STL, STEP, OBJ and native CAD formats.",
    icon: FileUp,
  },
  {
    number: "02",
    title: "Select materials",
    description:
      "We recommend the right filament or resin for your application, balancing surface finish, strength and budget.",
    icon: Layers3,
  },
  {
    number: "03",
    title: "Approve your quote",
    description:
      "Receive transparent pricing and lead time. Students automatically receive the 20% concession.",
    icon: ClipboardList,
  },
  {
    number: "04",
    title: "Print & handover",
    description:
      "Your parts are produced, inspected and prepared for pickup or courier delivery from Elizabeth Bay.",
    icon: Package,
  },
];

export function HowItWorks() {
  return (
    <section className="marketing-section" data-variant="cloud">
      <div
        aria-hidden
        className="pointer-events-none absolute left-0 top-12 h-40 w-40 rounded-full bg-primary/10 blur-2xl"
      />
      <div className="marketing-section__container relative">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-white/90 px-4 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-primary/70 shadow-sm backdrop-blur">
            Process
          </span>
          <h2 className="mt-6 text-3xl tracking-tight text-foreground sm:text-4xl">
            A structured workflow built for speed and certainty.
          </h2>
        </div>

        <ol className="relative mt-16 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-4 top-1/2 hidden h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-primary/30 to-transparent md:block"
          />
          {steps.map(({ number, title, description, icon: Icon }, index) => (
            <li
              key={number}
              className="group relative flex h-full flex-col gap-4 rounded-3xl border border-border/50 bg-white/90 p-6 shadow-sm shadow-primary/5 transition duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium uppercase tracking-[0.25em] text-primary/70">
                  {number}
                </span>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-primary/25 bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-foreground/70">{description}</p>
              </div>
              <span
                aria-hidden
                className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-primary/10 opacity-0 blur-3xl transition duration-300 group-hover:opacity-100"
              />
              {index < steps.length - 1 && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 right-0 hidden h-px w-20 translate-x-10 -translate-y-1/2 bg-gradient-to-r from-primary/20 to-transparent xl:block"
                />
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
