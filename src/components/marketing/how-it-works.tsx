import React from "react";

export function HowItWorks() {
  return (
    <section className="bg-white py-16 md:py-24">
      <div className="mx-auto max-w-[1200px] px-4 md:px-8">
        <div className="text-center">
          <h2 className="font-serif text-[36px] leading-tight tracking-tight sm:text-[48px] md:text-[54px] text-neutral-900">
            From Idea to Reality in
            <br />4 Simple Steps
          </h2>
        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <Step
            number="1"
            title="Upload or Design"
            description="Upload your 3D file or work with our designers to create one. We support all major file formats (STL, OBJ, STEP)."
            icon={<UploadIcon />}
          />
          <Step
            number="2"
            title="Choose Materials"
            description="Select from our range of professional materials—from basic PLA to advanced engineering polymers and resins."
            icon={<PaletteIcon />}
          />
          <Step
            number="3"
            title="Get Quote"
            description="Receive an instant quote with transparent pricing. No hidden fees, no surprises. Students get 20% off automatically."
            icon={<DollarIcon />}
          />
          <Step
            number="4"
            title="Print & Deliver"
            description="We print with precision, inspect for quality, and deliver to your door. Same-day pickup available in Sydney CBD."
            icon={<RocketIcon />}
          />
        </div>
      </div>
    </section>
  );
}

function Step({
  number,
  title,
  description,
  icon,
}: {
  number: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="relative">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
          {number}
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          {icon}
        </div>
      </div>
      <h3 className="mb-2 text-xl font-semibold text-neutral-900">{title}</h3>
      <p className="text-sm text-neutral-600">{description}</p>
    </div>
  );
}

function UploadIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path
        d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PaletteIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path
        d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="6.5" cy="11.5" r="1.5" fill="currentColor" />
      <circle cx="9.5" cy="7.5" r="1.5" fill="currentColor" />
      <circle cx="14.5" cy="7.5" r="1.5" fill="currentColor" />
      <circle cx="17.5" cy="11.5" r="1.5" fill="currentColor" />
    </svg>
  );
}

function DollarIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <line x1="12" y1="2" x2="12" y2="22" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RocketIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path
        d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09zM12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
