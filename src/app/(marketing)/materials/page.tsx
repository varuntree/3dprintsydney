import React from "react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Materials Guide - 3D Printing Materials | 3D Print Sydney",
  description:
    "Complete guide to 3D printing materials: PLA, PETG, ABS, Nylon, Carbon Fiber, and Resins. Learn properties, applications, and pricing.",
};

export default function MaterialsPage() {
  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-700 py-16 md:py-24">
        <div className="mx-auto max-w-[1200px] px-4 md:px-8 text-center">
          <h1 className="font-serif text-[42px] leading-tight tracking-tight sm:text-[54px] md:text-[64px] text-white">
            Materials Guide
          </h1>
          <p className="mt-4 text-lg text-blue-100 mx-auto max-w-2xl">
            From biodegradable PLA to engineering-grade polymers and specialty resins—choose the right material for your project.
          </p>
        </div>
      </section>

      {/* Material Categories */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-[1200px] px-4 md:px-8">
          <h2 className="text-center font-serif text-[32px] md:text-[42px] text-neutral-900 mb-12">
            Standard Materials (FDM)
          </h2>

          <div className="space-y-8">
            <MaterialCard
              name="PLA (Polylactic Acid)"
              pricing="$0.15 - $0.25 per gram"
              icon="🌱"
              color="bg-green-50"
              properties={[
                { label: "Strength", value: "Medium", rating: 3 },
                { label: "Flexibility", value: "Low", rating: 2 },
                { label: "Heat Resistance", value: "Low (60°C)", rating: 2 },
                { label: "Ease of Printing", value: "Excellent", rating: 5 },
              ]}
              benefits={[
                "Biodegradable and eco-friendly",
                "Low warping, excellent surface finish",
                "Wide color range available",
                "Food-safe options available",
              ]}
              applications={[
                "Prototypes and concept models",
                "Display pieces and figurines",
                "Educational models",
                "Low-stress mechanical parts",
              ]}
              limitations={[
                "Not suitable for high temperatures",
                "Lower impact strength than ABS",
                "UV sensitive (will degrade outdoors)",
              ]}
            />

            <MaterialCard
              name="PETG (Polyethylene Terephthalate Glycol)"
              pricing="$0.20 - $0.30 per gram"
              icon="💪"
              color="bg-blue-50"
              properties={[
                { label: "Strength", value: "High", rating: 4 },
                { label: "Flexibility", value: "Medium", rating: 3 },
                { label: "Heat Resistance", value: "Medium (80°C)", rating: 3 },
                { label: "Ease of Printing", value: "Good", rating: 4 },
              ]}
              benefits={[
                "Excellent layer adhesion and strength",
                "Chemical and moisture resistant",
                "Food-safe (check specific brand)",
                "Good impact resistance",
              ]}
              applications={[
                "Functional mechanical parts",
                "Outdoor applications",
                "Protective cases and enclosures",
                "Food containers and kitchen tools",
              ]}
              limitations={[
                "Slightly more difficult to print than PLA",
                "Can string between features",
                "Moderate UV resistance",
              ]}
            />

            <MaterialCard
              name="ABS (Acrylonitrile Butadiene Styrene)"
              pricing="$0.25 - $0.35 per gram"
              icon="🔥"
              color="bg-orange-50"
              properties={[
                { label: "Strength", value: "High", rating: 4 },
                { label: "Flexibility", value: "Medium", rating: 3 },
                { label: "Heat Resistance", value: "High (95°C)", rating: 4 },
                { label: "Ease of Printing", value: "Moderate", rating: 3 },
              ]}
              benefits={[
                "High heat resistance",
                "Excellent impact strength",
                "Can be smoothed with acetone",
                "Good electrical insulation",
              ]}
              applications={[
                "Automotive parts",
                "Electronics enclosures",
                "Functional prototypes",
                "Tooling and jigs",
              ]}
              limitations={[
                "Requires enclosed printer (warping issues)",
                "Emits fumes during printing",
                "Not biodegradable",
              ]}
            />
          </div>
        </div>
      </section>

      {/* Engineering Materials */}
      <section className="py-16 md:py-24 bg-neutral-50">
        <div className="mx-auto max-w-[1200px] px-4 md:px-8">
          <h2 className="text-center font-serif text-[32px] md:text-[42px] text-neutral-900 mb-12">
            Engineering-Grade Materials
          </h2>

          <div className="space-y-8">
            <MaterialCard
              name="Nylon (PA12)"
              pricing="$0.40 - $0.60 per gram"
              icon="⚙️"
              color="bg-purple-50"
              properties={[
                { label: "Strength", value: "Very High", rating: 5 },
                { label: "Flexibility", value: "High", rating: 4 },
                { label: "Heat Resistance", value: "High (100°C)", rating: 4 },
                { label: "Ease of Printing", value: "Challenging", rating: 2 },
              ]}
              benefits={[
                "Exceptional strength and durability",
                "High flexibility and impact resistance",
                "Excellent wear and abrasion resistance",
                "Chemical resistant",
              ]}
              applications={[
                "Functional mechanical parts",
                "Gears, bearings, and hinges",
                "Snap-fit assemblies",
                "Wear parts and bushings",
              ]}
              limitations={[
                "Absorbs moisture (requires dry storage)",
                "Challenging to print (requires experience)",
                "Higher cost than standard materials",
              ]}
            />

            <MaterialCard
              name="Carbon Fiber Composite"
              pricing="$0.50 - $0.80 per gram"
              icon="🏎️"
              color="bg-gray-50"
              properties={[
                { label: "Strength", value: "Excellent", rating: 5 },
                { label: "Flexibility", value: "Low", rating: 2 },
                { label: "Heat Resistance", value: "High (100°C)", rating: 4 },
                { label: "Ease of Printing", value: "Moderate", rating: 3 },
              ]}
              benefits={[
                "Maximum strength-to-weight ratio",
                "Excellent stiffness and rigidity",
                "Professional finish",
                "Heat and chemical resistant",
              ]}
              applications={[
                "Aerospace and drone components",
                "Performance automotive parts",
                "High-strength structural components",
                "Professional tooling",
              ]}
              limitations={[
                "Requires hardened nozzle",
                "Higher cost",
                "Cannot be smoothed post-print",
              ]}
            />

            <MaterialCard
              name="Polycarbonate (PC)"
              pricing="$0.45 - $0.65 per gram"
              icon="🛡️"
              color="bg-cyan-50"
              properties={[
                { label: "Strength", value: "Excellent", rating: 5 },
                { label: "Flexibility", value: "Medium", rating: 3 },
                { label: "Heat Resistance", value: "Very High (135°C)", rating: 5 },
                { label: "Ease of Printing", value: "Difficult", rating: 2 },
              ]}
              benefits={[
                "Exceptional impact resistance",
                "Very high heat resistance",
                "Transparent options available",
                "Excellent dimensional stability",
              ]}
              applications={[
                "Protective equipment",
                "Automotive components",
                "High-temperature applications",
                "Safety shields and guards",
              ]}
              limitations={[
                "Requires heated chamber",
                "Prone to warping",
                "Expensive compared to standard materials",
              ]}
            />
          </div>
        </div>
      </section>

      {/* Resin Materials */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-[1200px] px-4 md:px-8">
          <h2 className="text-center font-serif text-[32px] md:text-[42px] text-neutral-900 mb-12">
            Specialty Resins (SLA/DLP)
          </h2>

          <div className="space-y-8">
            <MaterialCard
              name="Standard Resin"
              pricing="$0.50 - $0.80 per gram"
              icon="✨"
              color="bg-amber-50"
              properties={[
                { label: "Detail Level", value: "Excellent", rating: 5 },
                { label: "Surface Finish", value: "Smooth", rating: 5 },
                { label: "Strength", value: "Medium", rating: 3 },
                { label: "Ease of Use", value: "Good", rating: 4 },
              ]}
              benefits={[
                "Ultra-high resolution (50-micron layers)",
                "Smooth, glossy surface finish",
                "Excellent detail reproduction",
                "Wide color range",
              ]}
              applications={[
                "Highly detailed models",
                "Jewelry and miniatures",
                "Product presentation models",
                "Dental and medical models",
              ]}
              limitations={[
                "Brittle compared to engineering materials",
                "UV sensitive (will yellow over time)",
                "Requires post-processing (cleaning and curing)",
              ]}
            />

            <MaterialCard
              name="Tough Resin"
              pricing="$0.70 - $1.00 per gram"
              icon="🔨"
              color="bg-red-50"
              properties={[
                { label: "Detail Level", value: "Very Good", rating: 4 },
                { label: "Surface Finish", value: "Smooth", rating: 4 },
                { label: "Strength", value: "High", rating: 4 },
                { label: "Ease of Use", value: "Good", rating: 4 },
              ]}
              benefits={[
                "High impact resistance",
                "Improved durability over standard resin",
                "Good surface finish",
                "Suitable for functional testing",
              ]}
              applications={[
                "Functional prototypes",
                "Snap-fit assemblies",
                "Jigs and fixtures",
                "Durable display models",
              ]}
              limitations={[
                "Higher cost than standard resin",
                "Slightly less detail than standard",
                "Requires careful post-curing",
              ]}
            />

            <MaterialCard
              name="Flexible Resin"
              pricing="$0.80 - $1.20 per gram"
              icon="🤸"
              color="bg-pink-50"
              properties={[
                { label: "Detail Level", value: "Good", rating: 4 },
                { label: "Surface Finish", value: "Smooth", rating: 4 },
                { label: "Flexibility", value: "Rubber-like", rating: 5 },
                { label: "Ease of Use", value: "Moderate", rating: 3 },
              ]}
              benefits={[
                "Rubber-like flexibility",
                "Good tear resistance",
                "Smooth surface finish",
                "Suitable for gaskets and seals",
              ]}
              applications={[
                "Gaskets and seals",
                "Soft-touch grips",
                "Wearables and straps",
                "Flexible prototypes",
              ]}
              limitations={[
                "Highest cost option",
                "Limited color selection",
                "Requires specific post-processing",
              ]}
            />
          </div>
        </div>
      </section>

      {/* Selection Guide */}
      <section className="py-16 md:py-24 bg-blue-50">
        <div className="mx-auto max-w-[1000px] px-4 md:px-8">
          <h2 className="text-center font-serif text-[32px] md:text-[42px] text-neutral-900 mb-12">
            How to Choose the Right Material
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <UseCaseCard
              title="For Prototypes & Concept Models"
              recommendation="PLA or Standard Resin"
              reasoning="Low cost, easy to print, excellent detail. PLA for larger parts, resin for high-detail small parts."
            />
            <UseCaseCard
              title="For Functional Parts"
              recommendation="PETG, Nylon, or Tough Resin"
              reasoning="Good strength, durability, and impact resistance for parts that need to perform under stress."
            />
            <UseCaseCard
              title="For Outdoor Use"
              recommendation="PETG or ABS"
              reasoning="UV and weather resistance. PETG offers better moisture resistance, ABS handles heat better."
            />
            <UseCaseCard
              title="For High-Detail Models"
              recommendation="Standard Resin"
              reasoning="Best surface finish and detail reproduction. Perfect for jewelry, miniatures, and presentation models."
            />
            <UseCaseCard
              title="For High Temperatures"
              recommendation="ABS, PC, or Nylon"
              reasoning="PC offers the highest heat resistance (135°C), followed by ABS and Nylon."
            />
            <UseCaseCard
              title="For Maximum Strength"
              recommendation="Carbon Fiber or Polycarbonate"
              reasoning="Engineering-grade materials for demanding applications requiring high strength-to-weight ratio."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-700 py-16">
        <div className="mx-auto max-w-[800px] px-4 md:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Still Not Sure Which Material to Choose?
          </h2>
          <p className="text-lg text-blue-100 mb-8">
            Our team can help you select the perfect material for your specific application.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/quick-order" className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-blue-600 font-medium hover:bg-blue-50 transition">
              Get Quote with Material Options →
            </Link>
            <Link href="/contact" className="inline-flex items-center justify-center rounded-full border-2 border-white px-6 py-3 text-white font-medium hover:bg-white/10 transition">
              Contact for Advice
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function MaterialCard({
  name,
  pricing,
  icon,
  color,
  properties,
  benefits,
  applications,
  limitations,
}: {
  name: string;
  pricing: string;
  icon: string;
  color: string;
  properties: { label: string; value: string; rating: number }[];
  benefits: string[];
  applications: string[];
  limitations: string[];
}) {
  return (
    <div className="bg-white rounded-2xl border-2 border-neutral-200 overflow-hidden">
      <div className={`${color} p-6 border-b border-neutral-200`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="text-4xl">{icon}</div>
            <div>
              <h3 className="text-2xl font-bold text-neutral-900">{name}</h3>
              <div className="text-lg font-medium text-blue-600 mt-1">{pricing}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-6">
            <div>
              <h4 className="font-semibold text-neutral-900 mb-3">Properties</h4>
              <div className="space-y-3">
                {properties.map((prop) => (
                  <div key={prop.label}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-neutral-700">{prop.label}</span>
                      <span className="text-sm font-medium text-neutral-900">{prop.value}</span>
                    </div>
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className={`h-2 flex-1 rounded ${i < prop.rating ? "bg-blue-600" : "bg-neutral-200"}`}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-neutral-900 mb-3">Key Benefits</h4>
              <ul className="space-y-2">
                {benefits.map((benefit, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-neutral-700">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <div>
              <h4 className="font-semibold text-neutral-900 mb-3">Best For</h4>
              <ul className="space-y-2">
                {applications.map((app, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-neutral-700">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>{app}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-neutral-900 mb-3">Limitations</h4>
              <ul className="space-y-2">
                {limitations.map((limit, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-neutral-700">
                    <span className="text-orange-600 mt-0.5">!</span>
                    <span>{limit}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function UseCaseCard({
  title,
  recommendation,
  reasoning,
}: {
  title: string;
  recommendation: string;
  reasoning: string;
}) {
  return (
    <div className="bg-white rounded-xl p-6 border border-neutral-200">
      <h3 className="text-lg font-semibold text-neutral-900 mb-2">{title}</h3>
      <div className="text-blue-600 font-medium mb-3">→ {recommendation}</div>
      <p className="text-sm text-neutral-600">{reasoning}</p>
    </div>
  );
}
