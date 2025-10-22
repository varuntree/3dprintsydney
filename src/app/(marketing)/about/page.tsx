import React from "react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About Us - 3D Print Sydney | Professional 3D Printing Since 2018",
  description:
    "Meet the team behind Sydney's fastest 3D printing service. Located in Elizabeth Bay, we're passionate about making professional 3D printing accessible to everyone.",
};

export default function AboutPage() {
  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-700 py-16 md:py-24">
        <div className="mx-auto max-w-[1200px] px-4 md:px-8 text-center">
          <h1 className="font-serif text-[42px] leading-tight tracking-tight sm:text-[54px] md:text-[64px] text-white">
            About 3D Print Sydney
          </h1>
          <p className="mt-4 text-lg text-blue-100 mx-auto max-w-2xl">
            We&apos;re on a mission to make professional 3D printing accessible, affordable, and fast for Sydney&apos;s makers, innovators, and businesses.
          </p>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-16 md:py-24 bg-white">
        <div className="mx-auto max-w-[1000px] px-4 md:px-8">
          <h2 className="text-center font-serif text-[32px] md:text-[42px] text-neutral-900 mb-8">
            Our Story
          </h2>
          <div className="prose prose-lg max-w-none text-neutral-700">
            <p className="text-lg leading-relaxed mb-4">
              Founded in 2018, 3D Print Sydney was born from a simple observation: despite Sydney being a hub of innovation, accessing professional 3D printing was unnecessarily complex and expensive.
            </p>
            <p className="text-lg leading-relaxed mb-4">
              As engineers and makers ourselves, we experienced the frustration of week-long turnaround times, confusing pricing structures, and the lack of technical guidance that actually helps your project succeed.
            </p>
            <p className="text-lg leading-relaxed">
              Today, we&apos;ve printed over 1,000 projects for students, startups, engineers, and established businesses across Sydney. Our Elizabeth Bay facility houses professional-grade equipment, premium materials, and most importantly—expertise that goes beyond just pressing &ldquo;print.&rdquo;
            </p>
          </div>
        </div>
      </section>

      {/* Mission & Values */}
      <section className="py-16 md:py-24 bg-neutral-50">
        <div className="mx-auto max-w-[1000px] px-4 md:px-8">
          <h2 className="text-center font-serif text-[32px] md:text-[42px] text-neutral-900 mb-12">
            What We Stand For
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <ValueCard
              icon="⚡"
              title="Speed Without Compromise"
              description="Same-day service doesn&apos;t mean cutting corners. We&apos;ve optimized our workflow to deliver fast results without sacrificing quality."
            />
            <ValueCard
              icon="💡"
              title="Expertise Included"
              description="We don&apos;t just print your files—we help optimize them. Every project benefits from our engineering knowledge and design experience."
            />
            <ValueCard
              icon="🎓"
              title="Supporting Education"
              description="20% off for students isn&apos;t charity—it&apos;s an investment in the next generation of makers, engineers, and innovators."
            />
            <ValueCard
              icon="🔍"
              title="Transparent Pricing"
              description="No hidden fees, no surprises. Get instant quotes online and see exactly what you're paying for before you commit."
            />
            <ValueCard
              icon="🌱"
              title="Sustainability"
              description="We prioritize biodegradable materials like PLA when suitable, and our local production reduces shipping emissions."
            />
            <ValueCard
              icon="🤝"
              title="Community First"
              description="Based in Elizabeth Bay, we&apos;re part of Sydney&apos;s maker community. Your success is our success."
            />
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16 md:py-24 bg-white">
        <div className="mx-auto max-w-[1000px] px-4 md:px-8">
          <h2 className="text-center font-serif text-[32px] md:text-[42px] text-neutral-900 mb-12">
            Why Choose Us?
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-neutral-50 rounded-2xl p-8">
              <h3 className="text-2xl font-semibold text-neutral-900 mb-4">🏆 Professional Equipment</h3>
              <p className="text-neutral-700 mb-4">
                We use commercial-grade FDM and resin printers from industry leaders like Prusa, Ultimaker, and Formlabs—not consumer hobbyist machines.
              </p>
              <ul className="space-y-2 text-neutral-700">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>Multi-material capability</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>Large format printing (up to 300mm³)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>High-resolution resin printing (50-micron layers)</span>
                </li>
              </ul>
            </div>

            <div className="bg-neutral-50 rounded-2xl p-8">
              <h3 className="text-2xl font-semibold text-neutral-900 mb-4">🔬 Premium Materials</h3>
              <p className="text-neutral-700 mb-4">
                We stock professional-grade filaments and resins—not the cheap alternatives that fail under stress or UV exposure.
              </p>
              <ul className="space-y-2 text-neutral-700">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>Engineering polymers (Nylon, PC, Carbon Fiber)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>Specialty resins (Tough, Flexible, High-Detail)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>Biodegradable options for eco-conscious projects</span>
                </li>
              </ul>
            </div>

            <div className="bg-neutral-50 rounded-2xl p-8">
              <h3 className="text-2xl font-semibold text-neutral-900 mb-4">⏱️ True Same-Day Service</h3>
              <p className="text-neutral-700 mb-4">
                Located in Elizabeth Bay with optimized workflows. If your file is ready before 10 AM and the part fits our parameters, you can have it the same day.
              </p>
              <ul className="space-y-2 text-neutral-700">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>CBD delivery within hours</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>Pickup from Elizabeth Bay anytime</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>Standard 2-3 day turnaround for complex projects</span>
                </li>
              </ul>
            </div>

            <div className="bg-neutral-50 rounded-2xl p-8">
              <h3 className="text-2xl font-semibold text-neutral-900 mb-4">🛠️ Engineering Expertise</h3>
              <p className="text-neutral-700 mb-4">
                We&apos;re engineers first, print operators second. We&apos;ll help optimize your design for manufacturability, strength, and cost.
              </p>
              <ul className="space-y-2 text-neutral-700">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>Free design consultation included</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>File repair and optimization services</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>Material selection guidance</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Our Facility */}
      <section className="py-16 md:py-24 bg-blue-50">
        <div className="mx-auto max-w-[800px] px-4 md:px-8 text-center">
          <h2 className="font-serif text-[32px] md:text-[42px] text-neutral-900 mb-6">
            Our Facility
          </h2>
          <p className="text-lg text-neutral-700 mb-8">
            Located in the heart of Elizabeth Bay, our facility is equipped with professional-grade equipment and premium materials. We welcome visits by appointment—come see how we bring your designs to life.
          </p>
          <div className="bg-white rounded-2xl p-8 text-left max-w-md mx-auto">
            <h3 className="font-semibold text-neutral-900 mb-4 text-center">Visit Us</h3>
            <div className="space-y-3 text-neutral-700">
              <div className="flex items-start gap-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="mt-1 flex-shrink-0">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="10" r="3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <div>
                  <div className="font-medium">9 Greenknowe Avenue</div>
                  <div className="text-sm">Elizabeth Bay, NSW 2011</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="mt-1 flex-shrink-0">
                  <circle cx="12" cy="12" r="10" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="12 6 12 12 16 14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <div>
                  <div className="font-medium">Monday - Friday</div>
                  <div className="text-sm">9:00 AM - 6:00 PM</div>
                  <div className="text-sm mt-1">Weekends by appointment</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-700 py-16">
        <div className="mx-auto max-w-[800px] px-4 md:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Work Together?
          </h2>
          <p className="text-lg text-blue-100 mb-8">
            Whether you&apos;re prototyping your first product or need a custom replacement part, we&apos;re here to help.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/quick-order" className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-blue-600 font-medium hover:bg-blue-50 transition">
              Get Instant Quote →
            </Link>
            <Link href="/contact" className="inline-flex items-center justify-center rounded-full border-2 border-white px-6 py-3 text-white font-medium hover:bg-white/10 transition">
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function ValueCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 text-3xl mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-neutral-900 mb-3">{title}</h3>
      <p className="text-neutral-600">{description}</p>
    </div>
  );
}
