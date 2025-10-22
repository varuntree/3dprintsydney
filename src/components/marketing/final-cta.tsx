import React from "react";
import Link from "next/link";

export function FinalCTA() {
  return (
    <section className="bg-gradient-to-br from-blue-600 to-blue-700 py-16 md:py-24">
      <div className="mx-auto max-w-[1200px] px-4 md:px-8 text-center">
        <h2 className="font-serif text-[36px] leading-tight tracking-tight sm:text-[48px] md:text-[54px] text-white">
          Ready to Get Started?
        </h2>
        <p className="mt-4 text-lg text-blue-100 mx-auto max-w-2xl">
          Get an instant quote or speak with our team about your project. Same-day service
          available in Sydney CBD.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/quick-order"
            className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-[16px] font-medium text-blue-600 hover:bg-blue-50 transition"
          >
            Get Instant Quote <span aria-hidden className="ml-2">→</span>
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center rounded-full border-2 border-white px-6 py-3 text-[16px] font-medium text-white hover:bg-white/10 transition"
          >
            Contact Us
          </Link>
        </div>

        {/* Contact Info */}
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6 text-blue-100">
          <a href="tel:+61458237428" className="flex items-center gap-2 hover:text-white transition">
            <PhoneIcon />
            <span>(+61) 0458 237 428</span>
          </a>
          <span className="hidden sm:inline text-blue-300">•</span>
          <a
            href="mailto:alan@3dprintsydney.com"
            className="flex items-center gap-2 hover:text-white transition"
          >
            <EmailIcon />
            <span>alan@3dprintsydney.com</span>
          </a>
        </div>
      </div>
    </section>
  );
}

function PhoneIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path
        d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path
        d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline points="22,6 12,13 2,6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
