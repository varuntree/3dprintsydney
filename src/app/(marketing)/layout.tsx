import React from "react";
import { MarketingHeader } from "@/components/marketing/header";
import { MarketingFooter } from "@/components/marketing/footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "3D Print Sydney - Professional 3D Printing Services",
  description:
    "Professional 3D printing services in Sydney. Same-day service available. From rapid prototyping to custom parts. 20% student discount.",
  keywords: [
    "3D printing Sydney",
    "rapid prototyping",
    "custom parts",
    "3D printing services",
    "Sydney CBD",
    "student discount",
  ],
  openGraph: {
    title: "3D Print Sydney - Professional 3D Printing Services",
    description:
      "Professional 3D printing services in Sydney. Same-day service available. From rapid prototyping to custom parts.",
    type: "website",
    locale: "en_AU",
    siteName: "3D Print Sydney",
  },
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
