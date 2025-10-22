import React from "react";
import Link from "next/link";

export function Hero() {
  return (
    <section className="relative bg-white">
      <div className="mx-auto max-w-[1200px] px-4 pt-16 md:px-8 md:pt-24 pb-12">
        <h1 className="font-serif text-[38px] leading-none tracking-tight sm:text-[56px] md:text-[76px] lg:text-[86px] text-neutral-900">
          Professional 3D Printing
          <br className="hidden md:block" /> in Sydney
        </h1>

        <p className="mt-6 text-lg md:text-xl text-neutral-700 max-w-2xl">
          From concept to reality in hours, not weeks. Same-day service available in Sydney CBD.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-[15px] text-neutral-700">
          <Badge icon={<CheckIcon />}>Same-day service available</Badge>
          <Badge icon={<DiscountIcon />}>20% student discount</Badge>
          <Badge icon={<MaterialIcon />}>Professional materials</Badge>
        </div>

        <div className="mt-10 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Link
            href="/quick-order"
            className="btn-brand active:translate-y-[1px] inline-flex items-center justify-center rounded-full px-6 py-3 text-[16px] font-medium"
          >
            Get Instant Quote <span aria-hidden className="ml-2">→</span>
          </Link>
          <Link
            href="/materials"
            className="btn-ghost inline-flex items-center justify-center rounded-full px-6 py-3 text-[16px] hover:bg-neutral-50"
          >
            Browse Materials
          </Link>
        </div>

        {/* Supporting Text */}
        <p className="mt-8 text-sm text-neutral-600 max-w-2xl">
          Whether you&apos;re a startup prototyping your next product, an engineer testing a design, or
          a maker bringing an idea to life—we make 3D printing fast, affordable, and professional.
        </p>
      </div>

      {/* Decorative Element */}
      <div className="absolute inset-0 -z-10 mx-auto max-w-5xl">
        <div className="absolute right-0 top-20 h-96 w-96 rounded-full bg-blue-50 opacity-30 blur-3xl" />
      </div>
    </section>
  );
}

function Badge({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 text-neutral-800">
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-neutral-200 bg-white">
        {icon}
      </span>
      {children}
    </span>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path
        d="M2 6l2.5 2.5L10 3"
        stroke="#111"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DiscountIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="#111">
      <path d="M6 1l1.5 3 3.5.5-2.5 2.5.5 3.5L6 9l-3 1.5.5-3.5L1 4.5l3.5-.5L6 1z" />
    </svg>
  );
}

function MaterialIcon() {
  return <span className="block h-1.5 w-1.5 rounded-full bg-neutral-800" />;
}
