import React from "react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pricing - Transparent 3D Printing Pricing | 3D Print Sydney",
  description:
    "Transparent 3D printing pricing with no hidden fees. Get instant quotes online. Students save 20%.",
};

export default function PricingPage() {
  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-700 py-16 md:py-24">
        <div className="mx-auto max-w-[1200px] px-4 md:px-8 text-center">
          <h1 className="font-serif text-[42px] leading-tight tracking-tight sm:text-[54px] md:text-[64px] text-white">
            Transparent 3D Printing Pricing
          </h1>
          <p className="mt-4 text-lg text-blue-100 mx-auto max-w-2xl">
            No hidden fees, no surprises. Get instant quotes or view our transparent pricing structure below. Students automatically save 20%.
          </p>
        </div>
      </section>

      {/* Instant Quote CTA */}
      <section className="py-16 bg-white">
        <div className="mx-auto max-w-[800px] px-4 md:px-8 text-center">
          <div className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-8">
            <h2 className="text-3xl font-bold text-neutral-900 mb-3">Get an Instant Quote</h2>
            <p className="text-neutral-700 mb-6">
              Upload your 3D file and select your material to get an instant, accurate quote. No account required.
            </p>
            <ul className="inline-block text-left mb-6 space-y-2 text-neutral-700">
              <li className="flex items-center gap-2"><span className="text-green-600">✓</span> Real-time pricing</li>
              <li className="flex items-center gap-2"><span className="text-green-600">✓</span> Material comparison</li>
              <li className="flex items-center gap-2"><span className="text-green-600">✓</span> Delivery options</li>
              <li className="flex items-center gap-2"><span className="text-green-600">✓</span> Student discount applied automatically</li>
            </ul>
            <div>
              <Link href="/quick-order" className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700 transition">
                Calculate Your Price →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Factors */}
      <section className="py-16 bg-neutral-50">
        <div className="mx-auto max-w-[1000px] px-4 md:px-8">
          <h2 className="text-center font-serif text-[32px] md:text-[42px] text-neutral-900 mb-12">
            What Affects Pricing?
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Factor 1 */}
            <div className="bg-white rounded-xl p-6 border border-neutral-200">
              <h3 className="text-xl font-semibold text-neutral-900 mb-3">1. Material</h3>
              <p className="text-neutral-600 mb-4">Different materials have different costs. PLA is most affordable, engineering polymers cost more.</p>
              <ul className="space-y-2 text-sm text-neutral-700">
                <li><strong>PLA:</strong> $0.15-$0.25 per gram</li>
                <li><strong>PETG:</strong> $0.20-$0.30 per gram</li>
                <li><strong>ABS:</strong> $0.25-$0.35 per gram</li>
                <li><strong>Nylon:</strong> $0.40-$0.60 per gram</li>
                <li><strong>Resins:</strong> $0.50-$1.00 per gram</li>
              </ul>
            </div>

            {/* Factor 2 */}
            <div className="bg-white rounded-xl p-6 border border-neutral-200">
              <h3 className="text-xl font-semibold text-neutral-900 mb-3">2. Size & Complexity</h3>
              <p className="text-neutral-600 mb-4">Larger parts use more material and take longer to print. Complex geometries may require supports.</p>
              <ul className="space-y-2 text-sm text-neutral-700">
                <li>• Material usage (grams)</li>
                <li>• Print time (hours)</li>
                <li>• Support structure requirements</li>
                <li>• Post-processing needs</li>
              </ul>
            </div>

            {/* Factor 3 */}
            <div className="bg-white rounded-xl p-6 border border-neutral-200">
              <h3 className="text-xl font-semibold text-neutral-900 mb-3">3. Quantity</h3>
              <p className="text-neutral-600 mb-4">Printing multiple copies? We offer volume discounts starting at 5 units.</p>
              <ul className="space-y-2 text-sm text-neutral-700">
                <li><strong>5-10 units:</strong> 10% off</li>
                <li><strong>11-25 units:</strong> 15% off</li>
                <li><strong>26+ units:</strong> 20% off (custom quote)</li>
              </ul>
            </div>

            {/* Factor 4 */}
            <div className="bg-white rounded-xl p-6 border border-neutral-200">
              <h3 className="text-xl font-semibold text-neutral-900 mb-3">4. Speed</h3>
              <p className="text-neutral-600 mb-4">Need it fast? Same-day service available for an additional fee.</p>
              <ul className="space-y-2 text-sm text-neutral-700">
                <li><strong>Standard:</strong> 2-3 business days (free)</li>
                <li><strong>Express:</strong> Next business day (+30%)</li>
                <li><strong>Same Day:</strong> Sydney CBD only (+50%)</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Service Pricing */}
      <section className="py-16 bg-white">
        <div className="mx-auto max-w-[1000px] px-4 md:px-8">
          <h2 className="text-center font-serif text-[32px] md:text-[42px] text-neutral-900 mb-12">
            Additional Services
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="border border-neutral-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-neutral-900 mb-3">Design Services</h3>
              <ul className="space-y-2 text-sm text-neutral-700">
                <li>File Repair: $50-$100</li>
                <li>Simple Design: $150-$300</li>
                <li>Complex Design: $300-$600</li>
                <li>Reverse Engineering: $200-$400</li>
              </ul>
            </div>
            <div className="border border-neutral-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-neutral-900 mb-3">Finishing Services</h3>
              <ul className="space-y-2 text-sm text-neutral-700">
                <li>Sanding & Smoothing: $30-$80 per part</li>
                <li>Painting: $50-$150 per part</li>
                <li>Assembly: $20-$50 per hour</li>
              </ul>
            </div>
            <div className="border border-neutral-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-neutral-900 mb-3">Delivery</h3>
              <ul className="space-y-2 text-sm text-neutral-700">
                <li>Pickup (Elizabeth Bay): Free</li>
                <li>Sydney Metro: $15-$25</li>
                <li>NSW Regional: $25-$45</li>
                <li>Interstate: Quote based</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Student Discount */}
      <section className="py-16 bg-blue-50">
        <div className="mx-auto max-w-[800px] px-4 md:px-8 text-center">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-blue-600 text-white text-2xl mb-4">
            🎓
          </div>
          <h2 className="text-3xl font-bold text-neutral-900 mb-3">20% Off for Students</h2>
          <p className="text-neutral-700 mb-6 max-w-xl mx-auto">
            We believe in supporting the next generation of makers and innovators. All students receive an automatic 20% discount on all printing services.
          </p>
          <div className="bg-white rounded-xl p-6 text-left max-w-md mx-auto border border-neutral-200">
            <h3 className="font-semibold text-neutral-900 mb-3">How to Claim:</h3>
            <ol className="space-y-2 text-sm text-neutral-700">
              <li>1. Create an account with your .edu email</li>
              <li>2. Discount applied automatically at checkout</li>
              <li>3. Valid student ID may be requested</li>
            </ol>
          </div>
        </div>
      </section>

      {/* Guarantee */}
      <section className="py-16 bg-white">
        <div className="mx-auto max-w-[800px] px-4 md:px-8 text-center">
          <h2 className="text-3xl font-bold text-neutral-900 mb-3">Our Quality Guarantee</h2>
          <p className="text-neutral-700 mb-6 max-w-xl mx-auto">
            If you&apos;re not satisfied with the quality of your print, we&apos;ll reprint it for free or issue a full refund. No questions asked.
          </p>
          <div className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            <div className="bg-neutral-50 rounded-xl p-4 text-left">
              <div className="flex items-start gap-2">
                <span className="text-green-600 mt-1">✓</span>
                <div>
                  <h3 className="font-semibold text-neutral-900">Dimensional Accuracy</h3>
                  <p className="text-sm text-neutral-600">To specification</p>
                </div>
              </div>
            </div>
            <div className="bg-neutral-50 rounded-xl p-4 text-left">
              <div className="flex items-start gap-2">
                <span className="text-green-600 mt-1">✓</span>
                <div>
                  <h3 className="font-semibold text-neutral-900">Surface Quality</h3>
                  <p className="text-sm text-neutral-600">As agreed</p>
                </div>
              </div>
            </div>
            <div className="bg-neutral-50 rounded-xl p-4 text-left">
              <div className="flex items-start gap-2">
                <span className="text-green-600 mt-1">✓</span>
                <div>
                  <h3 className="font-semibold text-neutral-900">Material Properties</h3>
                  <p className="text-sm text-neutral-600">As specified</p>
                </div>
              </div>
            </div>
            <div className="bg-neutral-50 rounded-xl p-4 text-left">
              <div className="flex items-start gap-2">
                <span className="text-green-600 mt-1">✓</span>
                <div>
                  <h3 className="font-semibold text-neutral-900">On-Time Delivery</h3>
                  <p className="text-sm text-neutral-600">Or discount applied</p>
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
            Ready to Get Your Quote?
          </h2>
          <p className="text-lg text-blue-100 mb-8">
            Upload your file and get instant pricing in seconds.
          </p>
          <Link href="/quick-order" className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-blue-600 font-medium hover:bg-blue-50 transition">
            Get Instant Quote →
          </Link>
        </div>
      </section>
    </div>
  );
}
