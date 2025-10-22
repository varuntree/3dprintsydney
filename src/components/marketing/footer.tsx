import Link from "next/link";
import { ArrowUpRight, Mail, MapPin, Phone } from "lucide-react";

const primaryLinks = [
  { label: "Rapid Prototyping", href: "/services#rapid-prototyping" },
  { label: "Custom Parts", href: "/services#custom-parts" },
  { label: "Model Printing", href: "/services#model-printing" },
  { label: "Design Services", href: "/services#design-services" },
];

const resourceLinks = [
  { label: "Pricing", href: "/pricing" },
  { label: "Materials", href: "/materials" },
  { label: "Portfolio", href: "/portfolio" },
  { label: "Contact", href: "/contact" },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-border/70 bg-surface-subtle">
      <div className="mx-auto max-w-6xl px-4 py-16 md:px-8">
        <div className="grid gap-10 md:grid-cols-[2fr,1fr,1fr]">
          <div>
            <div className="flex items-center gap-3 text-sm font-medium text-foreground">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 bg-white shadow-sm">
                <span className="text-xs font-semibold">3D</span>
              </span>
              <span className="tracking-tight">3D Print Sydney</span>
            </div>
            <p className="mt-4 max-w-sm text-sm text-foreground/70">
              Professional 3D printing studio in Elizabeth Bay. Same-day service, engineering expertise, and thoughtful guidance on every project.
            </p>

            <div className="mt-6 space-y-3 text-sm text-foreground/70">
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4" aria-hidden />
                <span>
                  9 Greenknowe Avenue
                  <br /> Elizabeth Bay, NSW 2011
                </span>
              </div>
              <a href="tel:+61458237428" className="flex items-center gap-2 transition hover:text-foreground">
                <Phone className="h-4 w-4" aria-hidden /> (+61) 0458 237 428
              </a>
              <a href="mailto:alan@3dprintsydney.com" className="flex items-center gap-2 transition hover:text-foreground">
                <Mail className="h-4 w-4" aria-hidden /> alan@3dprintsydney.com
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-foreground/60">Services</h3>
            <ul className="mt-4 space-y-3 text-sm text-foreground/70">
              {primaryLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="transition hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-foreground/60">Explore</h3>
            <ul className="mt-4 space-y-3 text-sm text-foreground/70">
              {resourceLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="transition hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-6 border-t border-border/60 pt-8 text-sm text-foreground/60 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} 3D Print Sydney. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/login" className="transition hover:text-foreground">
              Sign in
            </Link>
            <Link href="/quick-order" className="inline-flex items-center gap-1 transition hover:text-foreground">
              Start a project <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
