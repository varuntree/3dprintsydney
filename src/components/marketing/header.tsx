"use client";

import React from "react";
import Link from "next/link";
import { useState } from "react";

export function MarketingHeader() {
  const [isProductsOpen, setIsProductsOpen] = useState(false);
  const [isServicesOpen, setIsServicesOpen] = useState(false);

  return (
    <>
      <style jsx global>{`
        :root {
          --brand-from: #0e5fff;
          --brand-to: #0046ff;
          --ink-900: #0a0a0a;
          --ink-800: #111827;
          --ink-700: #374151;
          --ink-500: #6b7280;
          --ink-200: #e5e7eb;
          --ink-100: #f3f4f6;
        }
        .btn-brand {
          background-image: linear-gradient(90deg, var(--brand-from), var(--brand-to));
          color: white;
          box-shadow: 0 8px 16px rgba(14, 95, 255, 0.18);
        }
        .btn-ghost {
          background: white;
          border: 1px solid var(--ink-200);
          color: var(--ink-800);
        }
      `}</style>

      <header className="sticky top-0 z-30 border-b border-neutral-100 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-4 md:px-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Logo />
            <span className="font-medium tracking-tight text-neutral-900">
              3D Print Sydney
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-6 text-[15px] text-neutral-700 md:flex">
            {/* Services Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setIsServicesOpen(true)}
              onMouseLeave={() => setIsServicesOpen(false)}
            >
              <button className="inline-flex items-center gap-1 transition hover:text-neutral-900">
                Services <ChevronDown />
              </button>
              {isServicesOpen && (
                <div className="absolute left-0 mt-3 w-[420px] rounded-2xl border border-neutral-200 bg-white p-3 shadow-xl">
                  <div className="grid grid-cols-2 gap-2">
                    <MenuLink
                      title="Rapid Prototyping"
                      href="/services#rapid-prototyping"
                      desc="Fast concept to prototype"
                    />
                    <MenuLink
                      title="Custom Parts"
                      href="/services#custom-parts"
                      desc="Replacement & recreation"
                    />
                    <MenuLink
                      title="Model Printing"
                      href="/services#model-printing"
                      desc="Display & presentations"
                    />
                    <MenuLink
                      title="Design Services"
                      href="/services#design-services"
                      desc="CAD & optimization"
                    />
                  </div>
                </div>
              )}
            </div>

            <Link href="/pricing" className="transition hover:text-neutral-900">
              Pricing
            </Link>
            <Link href="/materials" className="transition hover:text-neutral-900">
              Materials
            </Link>
            <Link href="/portfolio" className="transition hover:text-neutral-900">
              Portfolio
            </Link>
            <Link href="/about" className="transition hover:text-neutral-900">
              About
            </Link>
            <Link href="/contact" className="transition hover:text-neutral-900">
              Contact
            </Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="btn-ghost hidden items-center gap-2 rounded-full px-4 py-2 text-[15px] hover:bg-neutral-50 md:inline-flex"
            >
              Sign In
            </Link>
            <Link
              href="/quick-order"
              className="btn-brand active:translate-y-[1px] rounded-full px-4 py-2 text-[15px] font-medium"
            >
              Get Quote <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </header>
    </>
  );
}

function Logo() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden className="-ml-1">
      <circle cx="8" cy="8" r="6" fill="var(--brand-from)" />
      <circle cx="16.5" cy="16.5" r="4.5" fill="var(--brand-to)" />
    </svg>
  );
}

function ChevronDown() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M5 7.5l5 5 5-5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MenuLink({ title, desc, href }: { title: string; desc: string; href: string }) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-neutral-200 p-3 hover:bg-neutral-50 focus:bg-neutral-50 focus:outline-none"
    >
      <div className="font-medium text-neutral-900">{title}</div>
      <div className="text-sm text-neutral-600">{desc}</div>
    </Link>
  );
}
