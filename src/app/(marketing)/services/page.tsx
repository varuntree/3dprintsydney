import React from "react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Services - 3D Printing Services Sydney | 3D Print Sydney",
  description:
    "Professional 3D printing services: Rapid Prototyping, Custom Parts, Model Printing, and Design Services. Same-day service available in Sydney CBD.",
};

export default function ServicesPage() {
  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-700 py-16 md:py-24">
        <div className="mx-auto max-w-[1200px] px-4 md:px-8 text-center">
          <h1 className="font-serif text-[42px] leading-tight tracking-tight sm:text-[54px] md:text-[64px] text-white">
            3D Printing Services Sydney
          </h1>
          <p className="mt-4 text-lg text-blue-100 mx-auto max-w-2xl">
            Professional 3D printing services for businesses, students, and makers. From rapid prototyping to custom parts, we deliver quality results with Sydney&apos;s fastest turnaround times.
          </p>
        </div>
      </section>

      {/* Service 1: Rapid Prototyping */}
      <section id="rapid-prototyping" className="py-16 md:py-24">
        <div className="mx-auto max-w-[1000px] px-4 md:px-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              ⚡
            </div>
            <h2 className="font-serif text-[32px] md:text-[42px] text-neutral-900">Rapid Prototyping</h2>
          </div>
          <p className="text-lg text-neutral-700 mb-6">
            Turn your concept into a functional prototype in hours. Perfect for startups, engineers, and innovators who need to iterate quickly without the cost of traditional manufacturing.
          </p>

          <div className="grid md:grid-cols-2 gap-8 my-8">
            <div>
              <h3 className="text-xl font-semibold text-neutral-900 mb-3">Who It&apos;s For</h3>
              <ul className="space-y-2 text-neutral-700">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">✓</span>
                  <span>Tech startups developing new products</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">✓</span>
                  <span>Manufacturing engineers testing designs</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">✓</span>
                  <span>Product developers iterating on concepts</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">✓</span>
                  <span>Innovation labs and maker spaces</span>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-neutral-900 mb-3">Key Benefits</h3>
              <ul className="space-y-2 text-neutral-700">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">●</span>
                  <span>Same-day turnaround available</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">●</span>
                  <span>Advanced engineering materials</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">●</span>
                  <span>Design consultation included</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">●</span>
                  <span>Quality inspection guaranteed</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="bg-neutral-50 rounded-2xl p-6 my-8">
            <h3 className="text-xl font-semibold text-neutral-900 mb-4">Our Process</h3>
            <ol className="space-y-3 text-neutral-700">
              <li><strong>1. Consultation (15 min)</strong> - Review your requirements, recommend optimal materials and printing technology</li>
              <li><strong>2. File Preparation (30 min)</strong> - Optimize your CAD files for printing or create new files from your specifications</li>
              <li><strong>3. Production (2-8 hours)</strong> - Print using professional-grade equipment with premium materials</li>
              <li><strong>4. Quality Check (30 min)</strong> - Rigorous inspection for dimensional accuracy and surface quality</li>
              <li><strong>5. Delivery (Same day)</strong> - Pick up from our Elizabeth Bay facility or delivery to your Sydney location</li>
            </ol>
          </div>

          <div className="text-center">
            <Link href="/quick-order" className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700 transition">
              Get Prototype Quote →
            </Link>
          </div>
        </div>
      </section>

      {/* Service 2: Custom Parts */}
      <section id="custom-parts" className="bg-neutral-50 py-16 md:py-24">
        <div className="mx-auto max-w-[1000px] px-4 md:px-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              🔧
            </div>
            <h2 className="font-serif text-[32px] md:text-[42px] text-neutral-900">Custom Parts</h2>
          </div>
          <p className="text-lg text-neutral-700 mb-6">
            Need a replacement part that&apos;s no longer manufactured? Want to improve an existing component? We specialize in custom part creation using advanced 3D printing technology.
          </p>

          <div className="grid md:grid-cols-2 gap-6 my-8">
            <div className="bg-white rounded-xl p-6 border border-neutral-200">
              <h3 className="text-lg font-semibold text-neutral-900 mb-3">Common Use Cases</h3>
              <ul className="space-y-2 text-sm text-neutral-700">
                <li>• Replacement parts for discontinued products</li>
                <li>• Upgraded components with improved materials</li>
                <li>• One-off custom pieces for unique applications</li>
                <li>• Small batch production (1-100 units)</li>
                <li>• Reverse engineering from physical samples</li>
              </ul>
            </div>
            <div className="bg-white rounded-xl p-6 border border-neutral-200">
              <h3 className="text-lg font-semibold text-neutral-900 mb-3">Our Capabilities</h3>
              <ul className="space-y-2 text-sm text-neutral-700">
                <li>• Reverse engineering available</li>
                <li>• Material upgrades possible</li>
                <li>• Design optimization</li>
                <li>• Quality matching to original specs</li>
                <li>• One-off or small batches</li>
              </ul>
            </div>
          </div>

          <div className="text-center">
            <Link href="/quick-order" className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700 transition">
              Request Custom Part →
            </Link>
          </div>
        </div>
      </section>

      {/* Service 3: Model Printing */}
      <section id="model-printing" className="py-16 md:py-24">
        <div className="mx-auto max-w-[1000px] px-4 md:px-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              🏗️
            </div>
            <h2 className="font-serif text-[32px] md:text-[42px] text-neutral-900">Model Printing</h2>
          </div>
          <p className="text-lg text-neutral-700 mb-6">
            Create impressive architectural models, product displays, and demonstration pieces with high-resolution 3D printing.
          </p>

          <div className="grid md:grid-cols-2 gap-6 my-8">
            <div>
              <h3 className="text-xl font-semibold text-neutral-900 mb-3">Perfect For</h3>
              <ul className="space-y-2 text-neutral-700">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">●</span>
                  <span>Architectural firms presenting to clients</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">●</span>
                  <span>Product designers showcasing concepts</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">●</span>
                  <span>Marketing teams creating trade show displays</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">●</span>
                  <span>Educators building teaching models</span>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-neutral-900 mb-3">Features</h3>
              <ul className="space-y-2 text-neutral-700">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">●</span>
                  <span>High resolution (50-micron layers)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">●</span>
                  <span>Smooth finish with post-processing</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">●</span>
                  <span>Large format up to 300mm³</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">●</span>
                  <span>Color options available</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="text-center">
            <Link href="/quick-order" className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700 transition">
              Print Your Model →
            </Link>
          </div>
        </div>
      </section>

      {/* Service 4: Design Services */}
      <section id="design-services" className="bg-neutral-50 py-16 md:py-24">
        <div className="mx-auto max-w-[1000px] px-4 md:px-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              ✏️
            </div>
            <h2 className="font-serif text-[32px] md:text-[42px] text-neutral-900">Design Services</h2>
          </div>
          <p className="text-lg text-neutral-700 mb-6">
            Don&apos;t have a 3D CAD file? No problem. Our experienced designers can turn your idea, sketch, or physical sample into a production-ready 3D model.
          </p>

          <div className="bg-white rounded-2xl p-6 border border-neutral-200 my-8">
            <h3 className="text-xl font-semibold text-neutral-900 mb-4">Our Design Process</h3>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white font-bold flex-shrink-0">1</div>
                <div>
                  <h4 className="font-semibold text-neutral-900">Brief & Requirements</h4>
                  <p className="text-sm text-neutral-600">Discuss your vision, technical requirements, and constraints</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white font-bold flex-shrink-0">2</div>
                <div>
                  <h4 className="font-semibold text-neutral-900">Initial Concepts</h4>
                  <p className="text-sm text-neutral-600">Present 2-3 design directions for your feedback</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white font-bold flex-shrink-0">3</div>
                <div>
                  <h4 className="font-semibold text-neutral-900">Refinement</h4>
                  <p className="text-sm text-neutral-600">Iterate based on your input (2 rounds of revisions included)</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white font-bold flex-shrink-0">4</div>
                <div>
                  <h4 className="font-semibold text-neutral-900">Final CAD Files</h4>
                  <p className="text-sm text-neutral-600">Deliver production-ready files in your preferred format (STL, STEP, OBJ)</p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center">
            <Link href="/contact" className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700 transition">
              Start Design Project →
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-700 py-16 md:py-20">
        <div className="mx-auto max-w-[800px] px-4 md:px-8 text-center">
          <h2 className="font-serif text-[32px] md:text-[42px] text-white mb-4">
            Ready to Start Your Project?
          </h2>
          <p className="text-lg text-blue-100 mb-8">
            Get an instant quote or contact us to discuss your specific requirements.
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
