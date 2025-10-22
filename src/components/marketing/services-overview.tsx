import React from "react";
import Link from "next/link";

export function ServicesOverview() {
  return (
    <section className="bg-neutral-50 py-16 md:py-24">
      <div className="mx-auto max-w-[1200px] px-4 md:px-8">
        <div className="text-center">
          <h2 className="font-serif text-[36px] leading-tight tracking-tight sm:text-[48px] md:text-[54px] text-neutral-900">
            Everything You Need to
            <br />
            Bring Ideas to Life
          </h2>
          <p className="mt-4 text-lg text-neutral-600 mx-auto max-w-2xl">
            From rapid prototyping to custom parts, we offer the full spectrum of 3D printing
            services for businesses, students, and makers across Sydney.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <ServiceCard
            icon={<LightningIcon />}
            title="Rapid Prototyping"
            description="Turn your concept into a functional prototype in hours. Perfect for startups and engineers who need to iterate quickly."
            href="/services#rapid-prototyping"
          />
          <ServiceCard
            icon={<WrenchIcon />}
            title="Custom Parts"
            description="Need a replacement part or custom component? We can recreate, improve, and manufacture parts."
            href="/services#custom-parts"
          />
          <ServiceCard
            icon={<BuildingIcon />}
            title="Model Printing"
            description="Create stunning presentation models and architectural displays with high-resolution 3D printing."
            href="/services#model-printing"
          />
          <ServiceCard
            icon={<PencilIcon />}
            title="Design Services"
            description="Don't have a CAD file? Our experienced designers can bring your sketch or idea to life."
            href="/services#design-services"
          />
        </div>
      </div>
    </section>
  );
}

function ServiceCard({
  icon,
  title,
  description,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-neutral-200 bg-white p-6 transition hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
        {icon}
      </div>
      <h3 className="mb-2 text-xl font-semibold text-neutral-900">{title}</h3>
      <p className="mb-4 text-sm text-neutral-600">{description}</p>
      <span className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 group-hover:gap-2 transition-all">
        Learn more <ArrowRight />
      </span>
    </Link>
  );
}

function LightningIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path
        d="M13 2L3 14h8l-1 8 10-12h-8l1-8z"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WrenchIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path
        d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M3 21h18" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 8h1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 12h1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 16h1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 8h1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 12h1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 16h1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path
        d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path
        d="M5 12h14M13 5l7 7-7 7"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
