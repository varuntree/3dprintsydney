import React from "react";
import type { Metadata } from "next";
import { Hero } from "@/components/marketing/hero";
import { ServicesOverview } from "@/components/marketing/services-overview";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { MaterialsPreview } from "@/components/marketing/materials-preview";
import { SocialProof } from "@/components/marketing/social-proof";
import { FinalCTA } from "@/components/marketing/final-cta";

export const metadata: Metadata = {
  title: "3D Print Sydney | Professional 3D Printing Services in Sydney",
  description:
    "From concept to reality in hours, not weeks. Same-day 3D printing service available in Sydney CBD. Professional materials, expert consultation, 20% student discount.",
};

export default function LandingPage() {
  return (
    <>
      <Hero />
      <ServicesOverview />
      <HowItWorks />
      <MaterialsPreview />
      <SocialProof />
      <FinalCTA />
    </>
  );
}
