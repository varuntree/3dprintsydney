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
    <section className="border-b border-border/60 bg-white py-20">
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <div className="max-w-2xl">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-foreground/50">
            Process
          </span>
          <h2 className="mt-4 text-3xl tracking-tight text-foreground sm:text-4xl">
            A structured workflow built for speed and certainty.
          </h2>
        </div>

        <ol className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {steps.map(({ number, title, description, icon: Icon }) => (
            <li
              key={number}
              className="relative flex h-full flex-col gap-4 rounded-2xl border border-border/60 bg-surface-subtle p-6"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-foreground/50">{number}</span>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-white">
                  <Icon className="h-4 w-4 text-foreground" aria-hidden />
                </span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">{title}</h3>
                <p className="mt-3 text-sm text-foreground/70">{description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
