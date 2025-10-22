import React from "react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Portfolio - 3D Printing Projects | 3D Print Sydney",
  description:
    "See our 3D printing work: prototypes, custom parts, architectural models, and engineering components. Over 1,000 projects completed.",
};

export default function PortfolioPage() {
  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-700 py-16 md:py-24">
        <div className="mx-auto max-w-[1200px] px-4 md:px-8 text-center">
          <h1 className="font-serif text-[42px] leading-tight tracking-tight sm:text-[54px] md:text-[64px] text-white">
            Our Work
          </h1>
          <p className="mt-4 text-lg text-blue-100 mx-auto max-w-2xl">
            From rapid prototypes to production parts, explore the diverse projects we&apos;ve brought to life for Sydney&apos;s makers and innovators.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 bg-neutral-50 border-b border-neutral-200">
        <div className="mx-auto max-w-[1000px] px-4 md:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <StatBox number="1,000+" label="Projects Completed" />
            <StatBox number="150+" label="Business Clients" />
            <StatBox number="500+" label="Student Projects" />
            <StatBox number="50+" label="Materials Used" />
          </div>
        </div>
      </section>

      {/* Project Categories */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-[1200px] px-4 md:px-8">
          <h2 className="text-center font-serif text-[32px] md:text-[42px] text-neutral-900 mb-4">
            Project Showcase
          </h2>
          <p className="text-center text-neutral-600 mb-12 max-w-2xl mx-auto">
            Due to client confidentiality, we can&apos;t show all projects, but here are representative examples of the work we do.
          </p>

          <div className="space-y-16">
            {/* Category: Rapid Prototyping */}
            <CategorySection
              title="Rapid Prototyping"
              icon="⚡"
              description="Fast-turnaround functional prototypes for product development and testing"
            >
              <ProjectCard
                title="Consumer Electronics Enclosure"
                category="Tech Startup"
                material="PETG"
                turnaround="Same Day"
                description="Prototype enclosure for a smart home device. Multiple iterations printed in 48 hours to refine the design before tooling."
                highlights={[
                  "3 design iterations in 2 days",
                  "Snap-fit assembly testing",
                  "Final design sent to injection molding",
                ]}
              />
              <ProjectCard
                title="Medical Device Component"
                category="Healthcare"
                material="Nylon PA12"
                turnaround="2 Days"
                description="Functional prototype for a medical device component requiring strength testing and biocompatibility considerations."
                highlights={[
                  "Strength testing validated",
                  "Design optimization reduced material by 30%",
                  "Submitted for regulatory approval",
                ]}
              />
              <ProjectCard
                title="Drone Frame Prototype"
                category="Aerospace"
                material="Carbon Fiber PETG"
                turnaround="3 Days"
                description="Lightweight frame prototype for a commercial drone project, optimized for strength-to-weight ratio."
                highlights={[
                  "40% lighter than aluminum equivalent",
                  "Flight tested successfully",
                  "Informed final carbon fiber layup design",
                ]}
              />
            </CategorySection>

            {/* Category: Custom Parts */}
            <CategorySection
              title="Custom Parts & Replacement Components"
              icon="🔧"
              description="One-off parts and replacements for discontinued or hard-to-find components"
            >
              <ProjectCard
                title="Vintage Car Dashboard Knobs"
                category="Automotive Restoration"
                material="ABS"
                turnaround="5 Days"
                description="Reverse-engineered replacement knobs for a 1970s classic car. Original parts no longer manufactured."
                highlights={[
                  "3D scanned from damaged originals",
                  "Exact color match achieved",
                  "Set of 8 knobs delivered",
                ]}
              />
              <ProjectCard
                title="Industrial Machine Bracket"
                category="Manufacturing"
                material="Polycarbonate"
                turnaround="1 Day"
                description="Emergency replacement bracket for production equipment. Original lead time was 6 weeks."
                highlights={[
                  "Production downtime avoided",
                  "Withstanding operational loads",
                  "Client ordered metal replacement while using our part",
                ]}
              />
              <ProjectCard
                title="Custom Cable Management Clips"
                category="Office Fitout"
                material="PLA"
                turnaround="2 Days"
                description="Custom-designed cable clips for a modern office installation. Standard parts didn't fit the aesthetic."
                highlights={[
                  "Designed from scratch to spec",
                  "Batch of 50 units produced",
                  "Perfect color match to interior",
                ]}
              />
            </CategorySection>

            {/* Category: Architectural Models */}
            <CategorySection
              title="Architectural & Display Models"
              icon="🏗️"
              description="High-detail presentation models for architecture, real estate, and marketing"
            >
              <ProjectCard
                title="Mixed-Use Development Model"
                category="Architecture Firm"
                material="Standard Resin + PLA"
                turnaround="1 Week"
                description="1:200 scale model of a proposed Sydney mixed-use development for client presentation."
                highlights={[
                  "Multiple materials for different elements",
                  "Hand-finished and painted",
                  "Client won the project",
                ]}
              />
              <ProjectCard
                title="Product Display Stand"
                category="Retail"
                material="PETG (Transparent)"
                turnaround="3 Days"
                description="Custom display stands for a jewelry boutique's window display."
                highlights={[
                  "Transparent PETG for floating effect",
                  "Set of 12 stands in various heights",
                  "Polished to optical clarity",
                ]}
              />
              <ProjectCard
                title="Topographic Campus Model"
                category="University"
                material="PLA Multi-color"
                turnaround="2 Weeks"
                description="Large-format topographic model of university campus for visitor center display."
                highlights={[
                  "300mm x 300mm print bed utilized",
                  "Multi-color terrain representation",
                  "Buildings printed separately and assembled",
                ]}
              />
            </CategorySection>

            {/* Category: Engineering */}
            <CategorySection
              title="Engineering & Functional Parts"
              icon="⚙️"
              description="Production-grade functional parts for testing, tooling, and end-use applications"
            >
              <ProjectCard
                title="Custom Jigs & Fixtures"
                category="Manufacturing"
                material="Carbon Fiber Nylon"
                turnaround="4 Days"
                description="Production jigs for assembly line quality control. Required precise tolerances and durability."
                highlights={[
                  "±0.1mm tolerance achieved",
                  "Withstanding 10,000+ cycles",
                  "Cost 90% less than machined aluminum",
                ]}
              />
              <ProjectCard
                title="Prosthetic Hand Components"
                category="Non-Profit / Student"
                material="PETG + Flexible Resin"
                turnaround="1 Week"
                description="Collaborated with university students on an e-NABLE prosthetic hand project."
                highlights={[
                  "20% student discount applied",
                  "Multiple iterations for fit",
                  "Successfully delivered to recipient",
                ]}
              />
              <ProjectCard
                title="Heat Exchanger Prototype"
                category="Industrial Engineering"
                material="High-Temp Resin"
                turnaround="5 Days"
                description="Prototype heat exchanger with complex internal geometry for fluid dynamics testing."
                highlights={[
                  "Internal channels tested with water flow",
                  "Design validated before metal fabrication",
                  "Saved $15k in tooling costs",
                ]}
              />
            </CategorySection>

            {/* Category: Student Projects */}
            <CategorySection
              title="Student Projects"
              icon="🎓"
              description="Supporting the next generation of makers and innovators with 20% off all prints"
            >
              <ProjectCard
                title="UNSW Mechanical Engineering Thesis"
                category="University Student"
                material="PETG + PLA"
                turnaround="1 Week"
                description="Complex mechanical assembly for thesis project. Multiple iterations and design consultations included with student discount."
                highlights={[
                  "20% student discount applied",
                  "Free design consultation provided",
                  "Successfully defended thesis",
                ]}
              />
              <ProjectCard
                title="Architecture Studio Final Model"
                category="Architecture Student"
                material="Standard Resin"
                turnaround="3 Days"
                description="High-detail architectural model for final presentation. Precision and surface finish critical for grading."
                highlights={[
                  "50-micron layer resolution",
                  "Hand-finished and assembled",
                  "Achieved High Distinction",
                ]}
              />
              <ProjectCard
                title="Robotics Competition Components"
                category="High School / STEM"
                material="Carbon Fiber PETG"
                turnaround="2 Days"
                description="Custom robot chassis and mechanical parts for FIRST Robotics competition. Strength-to-weight ratio optimized."
                highlights={[
                  "Rapid iteration for competition deadline",
                  "Lightweight yet strong design",
                  "Team advanced to nationals",
                ]}
              />
            </CategorySection>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 md:py-24 bg-neutral-50">
        <div className="mx-auto max-w-[1000px] px-4 md:px-8">
          <h2 className="text-center font-serif text-[32px] md:text-[42px] text-neutral-900 mb-12">
            What Our Clients Say
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <TestimonialCard
              quote="The same-day service literally saved our product launch. We had a last-minute design change and they delivered the updated prototype in 8 hours."
              author="Sarah M."
              role="Product Manager"
              company="Tech Startup, Surry Hills"
            />
            <TestimonialCard
              quote="As a student, the 20% discount made professional printing actually affordable. The quality blew away anything I could do at home."
              author="James T."
              role="Architecture Student"
              company="University of Sydney"
            />
            <TestimonialCard
              quote="They didn't just print our part—they redesigned it to be stronger and use less material. That's engineering expertise, not just a print service."
              author="Michael P."
              role="Mechanical Engineer"
              company="Manufacturing Company"
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-700 py-16">
        <div className="mx-auto max-w-[800px] px-4 md:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Start Your Project?
          </h2>
          <p className="text-lg text-blue-100 mb-8">
            From concept to completion, we&apos;ll help bring your ideas to life with professional 3D printing.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/quick-order" className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-blue-600 font-medium hover:bg-blue-50 transition">
              Get Instant Quote →
            </Link>
            <Link href="/contact" className="inline-flex items-center justify-center rounded-full border-2 border-white px-6 py-3 text-white font-medium hover:bg-white/10 transition">
              Discuss Your Project
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function StatBox({ number, label }: { number: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-3xl md:text-4xl font-bold text-blue-600 mb-2">{number}</div>
      <div className="text-sm text-neutral-600">{label}</div>
    </div>
  );
}

function CategorySection({
  title,
  icon,
  description,
  children,
}: {
  title: string;
  icon: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-2xl">
          {icon}
        </div>
        <div>
          <h3 className="font-serif text-[28px] md:text-[36px] text-neutral-900">{title}</h3>
          <p className="text-neutral-600">{description}</p>
        </div>
      </div>
      <div className="grid md:grid-cols-3 gap-6 mt-8">
        {children}
      </div>
    </div>
  );
}

function ProjectCard({
  title,
  category,
  material,
  turnaround,
  description,
  highlights,
}: {
  title: string;
  category: string;
  material: string;
  turnaround: string;
  description: string;
  highlights: string[];
}) {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-6 hover:shadow-lg transition">
      <div className="mb-4">
        <div className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">
          {category}
        </div>
        <h4 className="text-lg font-semibold text-neutral-900 mb-3">{title}</h4>
        <div className="flex gap-4 text-sm text-neutral-600 mb-3">
          <div>
            <span className="font-medium">Material:</span> {material}
          </div>
          <div>
            <span className="font-medium">Time:</span> {turnaround}
          </div>
        </div>
        <p className="text-sm text-neutral-700 mb-4">{description}</p>
      </div>
      <div>
        <div className="text-xs font-semibold text-neutral-900 uppercase tracking-wide mb-2">
          Key Outcomes
        </div>
        <ul className="space-y-1">
          {highlights.map((highlight, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-neutral-700">
              <span className="text-green-600 mt-0.5">✓</span>
              <span>{highlight}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function TestimonialCard({
  quote,
  author,
  role,
  company,
}: {
  quote: string;
  author: string;
  role: string;
  company: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-6">
      <div className="flex gap-0.5 mb-3">
        {[...Array(5)].map((_, i) => (
          <svg
            key={i}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="#FFA500"
          >
            <path d="M12 2l2.9 6.1L22 9.3l-5 4.7 1.2 6.7L12 17.8 5.8 20.7 7 14 2 9.3l7.1-1.2L12 2z" />
          </svg>
        ))}
      </div>
      <p className="text-neutral-700 italic mb-4">&ldquo;{quote}&rdquo;</p>
      <div>
        <div className="font-medium text-neutral-900">{author}</div>
        <div className="text-sm text-neutral-600">{role}</div>
        <div className="text-sm text-neutral-600">{company}</div>
      </div>
    </div>
  );
}
