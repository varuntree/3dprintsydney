import React from "react";
import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="border-t border-neutral-200 bg-neutral-50">
      <div className="mx-auto max-w-[1200px] px-4 py-12 md:px-8 md:py-16">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Company Info */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <Logo />
              <span className="font-medium text-neutral-900">3D Print Sydney</span>
            </div>
            <p className="text-sm text-neutral-600 mb-4">
              Professional 3D printing services in Sydney. Same-day service available.
            </p>
            <p className="text-sm text-neutral-600">
              <strong>Address:</strong>
              <br />
              9 Greenknowe Avenue
              <br />
              Elizabeth Bay, NSW 2011
            </p>
          </div>

          {/* Services */}
          <div>
            <h3 className="mb-4 font-medium text-neutral-900">Services</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/services#rapid-prototyping"
                  className="text-neutral-600 hover:text-neutral-900"
                >
                  Rapid Prototyping
                </Link>
              </li>
              <li>
                <Link
                  href="/services#custom-parts"
                  className="text-neutral-600 hover:text-neutral-900"
                >
                  Custom Parts
                </Link>
              </li>
              <li>
                <Link
                  href="/services#model-printing"
                  className="text-neutral-600 hover:text-neutral-900"
                >
                  Model Printing
                </Link>
              </li>
              <li>
                <Link
                  href="/services#design-services"
                  className="text-neutral-600 hover:text-neutral-900"
                >
                  Design Services
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="mb-4 font-medium text-neutral-900">Resources</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/materials" className="text-neutral-600 hover:text-neutral-900">
                  Materials Guide
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-neutral-600 hover:text-neutral-900">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/portfolio" className="text-neutral-600 hover:text-neutral-900">
                  Portfolio
                </Link>
              </li>
              <li>
                <Link href="/quick-order" className="text-neutral-600 hover:text-neutral-900">
                  Get Quote
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="mb-4 font-medium text-neutral-900">Company</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/about" className="text-neutral-600 hover:text-neutral-900">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-neutral-600 hover:text-neutral-900">
                  Contact
                </Link>
              </li>
              <li>
                <a
                  href="mailto:alan@3dprintsydney.com"
                  className="text-neutral-600 hover:text-neutral-900"
                >
                  Email Us
                </a>
              </li>
              <li>
                <a href="tel:+61458237428" className="text-neutral-600 hover:text-neutral-900">
                  (+61) 0458 237 428
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 border-t border-neutral-200 pt-8">
          <div className="flex flex-col items-center justify-between gap-4 text-sm text-neutral-600 md:flex-row">
            <p>© 2025 3D Print Sydney. All rights reserved.</p>
            <div className="flex gap-6">
              <Link href="/login" className="hover:text-neutral-900">
                Sign In
              </Link>
              <Link href="/signup" className="hover:text-neutral-900">
                Create Account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

function Logo() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden>
      <circle cx="8" cy="8" r="6" fill="#0E5FFF" />
      <circle cx="16.5" cy="16.5" r="4.5" fill="#0046FF" />
    </svg>
  );
}
