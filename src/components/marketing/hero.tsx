import Link from "next/link";
import { ArrowRight, Clock3, GraduationCap, Layers } from "lucide-react";

const highlights = [
  {
    icon: Clock3,
    label: "Same-day production available",
  },
  {
    icon: GraduationCap,
    label: "20% student pricing",
  },
  {
    icon: Layers,
    label: "Engineering-grade materials",
  },
];

export function Hero() {
  return (
    <section className="marketing-section" data-variant="hero">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-[#dceaff] opacity-80 blur-3xl mix-blend-screen"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-[-10rem] top-[-6rem] h-64 w-64 rounded-full bg-[#ffe6b5] opacity-70 blur-[110px] mix-blend-screen"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 bottom-[-5rem] h-80 w-80 rounded-full bg-[#ffd9c2] opacity-70 blur-3xl mix-blend-screen"
      />
      <div className="marketing-section__container relative pb-14 pt-4 md:pb-18 md:pt-10">
        <div className="grid items-start gap-8 sm:gap-12 xl:gap-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-white/80 px-4 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-primary/70 shadow-sm backdrop-blur">
              Sydney additive manufacturing studio
            </span>
            <h1 className="mt-4 text-4xl leading-[1.05] text-foreground sm:mt-5 sm:text-5xl md:mt-6 md:text-[3.65rem]">
              Precision
              <span className="relative mx-2 inline-block">
                <span
                  aria-hidden
                  className="absolute inset-x-[-0.25rem] top-1/2 h-11 -translate-y-1/2 -skew-y-3 rounded-full bg-gradient-to-r from-[#d8ecff] via-[#bfe2ff] to-[#d8ecff] opacity-95 blur-sm md:h-14"
                />
                <span
                  aria-hidden
                  className="absolute inset-x-[-0.35rem] bottom-[-0.3rem] h-5 -rotate-1 rounded-full bg-gradient-to-r from-[#c0ddff] via-[#a6d4ff] to-[#b6ddff] opacity-80 blur-[2px] md:h-6"
                />
                <span className="relative px-2 text-primary">
                  3D printing
                </span>
              </span>
              with guidance from engineers who build every day.
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-foreground/75">
              Prototype, iterate, and ship with confidence. We combine professional machines, premium materials, and hands-on advice to get your parts in hand within hours.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3 text-sm text-foreground/70 sm:gap-4">
              {highlights.map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-white/80 px-3 py-2 shadow-sm backdrop-blur"
                >
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  <span className="font-medium text-foreground/80">{label}</span>
                </span>
              ))}
            </div>

            <div className="mt-8 flex flex-col items-start gap-3 sm:mt-10 sm:flex-row sm:items-center">
              <Link
                href="/quick-order"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition hover:bg-primary/90 hover:shadow-lg"
              >
                Start an instant quote
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href="/materials"
                className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-white/80 px-7 py-3.5 text-sm font-semibold text-foreground/75 shadow-sm transition hover:border-foreground/40 hover:text-foreground"
              >
                Browse the materials guide
              </Link>
            </div>

            <p className="mt-6 max-w-xl text-sm text-foreground/60 sm:mt-8">
              Located in Elizabeth Bay with courier delivery across Sydney. Every project receives a quality review before it leaves the studio.
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-[420px] sm:max-w-[460px]">
            <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/70 shadow-[0_25px_45px_rgba(15,60,130,0.12)] backdrop-blur">
              <span className="pointer-events-none absolute -left-10 top-12 h-32 w-32 rounded-full bg-primary/20 blur-3xl" aria-hidden />
              <span className="pointer-events-none absolute -right-16 bottom-0 h-36 w-36 rounded-full bg-[#ffe3b0]/70 blur-3xl" aria-hidden />
              <video
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                poster="/hero.png"
                className="relative z-[1] aspect-[4/5] w-full object-cover"
              >
                <source src="/hero.webm" type="video/webm" />
                <source src="/hero.mp4" type="video/mp4" />
                <source src="/hero.mov" type="video/quicktime" />
                Your browser does not support the background video.
              </video>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
