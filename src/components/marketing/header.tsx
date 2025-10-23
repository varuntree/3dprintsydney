"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronDown } from "lucide-react";

import { AnimatedCubeLogo } from "@/components/branding/animated-cube-logo";

const services = [
  {
    title: "Rapid Prototyping",
    href: "/services#rapid-prototyping",
    description: "Fast concept to prototype",
  },
  {
    title: "Custom Parts",
    href: "/services#custom-parts",
    description: "Replacement & small runs",
  },
  {
    title: "Model Printing",
    href: "/services#model-printing",
    description: "Presentation-ready models",
  },
  {
    title: "Design Services",
    href: "/services#design-services",
    description: "CAD support & optimisation",
  },
];

const navigation = [
  { label: "Pricing", href: "/pricing" },
  { label: "Materials", href: "/materials" },
  { label: "Portfolio", href: "/portfolio" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export function MarketingHeader() {
  const [isServicesOpen, setIsServicesOpen] = useState(false);
  const closeMenuTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCloseTimeout = useCallback(() => {
    if (closeMenuTimeoutRef.current) {
      clearTimeout(closeMenuTimeoutRef.current);
      closeMenuTimeoutRef.current = null;
    }
  }, []);

  const handleServicesOpen = useCallback(() => {
    clearCloseTimeout();
    setIsServicesOpen(true);
  }, [clearCloseTimeout]);

  const handleServicesClose = useCallback(() => {
    clearCloseTimeout();
    closeMenuTimeoutRef.current = setTimeout(() => {
      setIsServicesOpen(false);
      closeMenuTimeoutRef.current = null;
    }, 180);
  }, [clearCloseTimeout]);

  useEffect(() => {
    return () => {
      clearCloseTimeout();
    };
  }, [clearCloseTimeout]);

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-surface-overlay/90 backdrop-blur supports-[backdrop-filter]:bg-surface-overlay/75">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-8">
        <Link href="/" className="flex items-center gap-2 text-sm font-medium text-foreground">
          <AnimatedCubeLogo />
          <span className="tracking-tight">3D Print Sydney</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-foreground/80 md:flex">
          <div
            className="relative"
            onMouseEnter={handleServicesOpen}
            onMouseLeave={handleServicesClose}
          >
            <button className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-foreground/80 transition-colors hover:bg-surface-subtle hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2">
              Services
              <ChevronDown className="h-3.5 w-3.5" aria-hidden />
            </button>
            {isServicesOpen && (
              <div
                className="absolute left-0 top-full z-20 w-72 pt-3"
                onMouseEnter={handleServicesOpen}
                onMouseLeave={handleServicesClose}
              >
                <div className="rounded-xl border border-border/60 bg-surface-elevated p-3 shadow-lg">
                  <div className="flex flex-col">
                    {services.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="rounded-lg px-3 py-2 text-left text-foreground/80 transition-colors hover:bg-surface-subtle hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
                      >
                        <div className="text-sm font-medium text-foreground">{item.title}</div>
                        <div className="text-xs text-foreground/60">{item.description}</div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-foreground/80 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="inline-flex items-center gap-1 rounded-full border border-border/70 px-3 py-2 text-sm font-medium text-foreground/70 transition hover:border-foreground/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
          >
            Sign in
          </Link>
          <Link
            href="/quick-order"
            className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
          >
            Get quote
            <ArrowUpRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </header>
  );
}
