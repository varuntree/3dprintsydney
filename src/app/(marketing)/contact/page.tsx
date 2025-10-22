import React from "react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contact Us - 3D Print Sydney | Get in Touch",
  description:
    "Contact 3D Print Sydney for quotes, technical questions, or project consultations. Located in Elizabeth Bay. Phone: (+61) 0458 237 428",
};

export default function ContactPage() {
  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-700 py-16 md:py-24">
        <div className="mx-auto max-w-[1200px] px-4 md:px-8 text-center">
          <h1 className="font-serif text-[42px] leading-tight tracking-tight sm:text-[54px] md:text-[64px] text-white">
            Get in Touch
          </h1>
          <p className="mt-4 text-lg text-blue-100 mx-auto max-w-2xl">
            Have a question about your project? Need a custom quote? We&apos;re here to help. Same-day responses guaranteed.
          </p>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-[1000px] px-4 md:px-8">
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <ContactMethod
              icon={<PhoneIcon />}
              title="Call Us"
              details="(+61) 0458 237 428"
              description="Mon-Fri 9AM-6PM"
              href="tel:+61458237428"
            />
            <ContactMethod
              icon={<EmailIcon />}
              title="Email Us"
              details="alan@3dprintsydney.com"
              description="Response within 2 hours"
              href="mailto:alan@3dprintsydney.com"
            />
            <ContactMethod
              icon={<LocationIcon />}
              title="Visit Us"
              details="9 Greenknowe Avenue"
              description="Elizabeth Bay, NSW 2011"
              href="https://maps.google.com/?q=9+Greenknowe+Avenue+Elizabeth+Bay+NSW+2011"
            />
          </div>

          {/* Contact Form */}
          <div className="bg-neutral-50 rounded-2xl p-8 md:p-12">
            <h2 className="text-2xl font-bold text-neutral-900 mb-6 text-center">Send Us a Message</h2>
            <form className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-neutral-700 mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    className="w-full px-4 py-3 rounded-lg border border-neutral-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    className="w-full px-4 py-3 rounded-lg border border-neutral-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="your@email.com"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-neutral-700 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    className="w-full px-4 py-3 rounded-lg border border-neutral-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0412 345 678"
                  />
                </div>
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-neutral-700 mb-2">
                    Subject *
                  </label>
                  <select
                    id="subject"
                    name="subject"
                    required
                    className="w-full px-4 py-3 rounded-lg border border-neutral-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a topic</option>
                    <option value="quote">Request a Quote</option>
                    <option value="technical">Technical Question</option>
                    <option value="design">Design Services</option>
                    <option value="materials">Material Selection</option>
                    <option value="student">Student Discount</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-neutral-700 mb-2">
                  Message *
                </label>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={6}
                  className="w-full px-4 py-3 rounded-lg border border-neutral-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Tell us about your project..."
                />
              </div>

              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="student"
                  name="student"
                  className="mt-1 h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="student" className="text-sm text-neutral-600">
                  I&apos;m a student (eligible for 20% discount)
                </label>
              </div>

              <div>
                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-4 text-white font-medium hover:bg-blue-700 transition"
                >
                  Send Message →
                </button>
                <p className="mt-3 text-sm text-neutral-500 text-center">
                  For instant quotes, use our <Link href="/quick-order" className="text-blue-600 hover:underline">Quick Order</Link> tool
                </p>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Business Hours */}
      <section className="py-16 bg-neutral-50">
        <div className="mx-auto max-w-[800px] px-4 md:px-8">
          <h2 className="text-center font-serif text-[32px] md:text-[42px] text-neutral-900 mb-12">
            Business Hours
          </h2>
          <div className="bg-white rounded-2xl p-8 border border-neutral-200">
            <div className="space-y-4">
              <HoursRow day="Monday - Friday" hours="9:00 AM - 6:00 PM" />
              <HoursRow day="Saturday" hours="By appointment only" />
              <HoursRow day="Sunday" hours="Closed" />
            </div>
            <div className="mt-6 pt-6 border-t border-neutral-200">
              <p className="text-neutral-700 text-center">
                <strong>Same-day service:</strong> Files received before 10 AM can be delivered the same day (subject to complexity and availability)
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Service Areas */}
      <section className="py-16">
        <div className="mx-auto max-w-[1000px] px-4 md:px-8">
          <h2 className="text-center font-serif text-[32px] md:text-[42px] text-neutral-900 mb-12">
            Delivery & Service Areas
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-neutral-50 rounded-2xl p-8">
              <h3 className="text-xl font-semibold text-neutral-900 mb-4">Same-Day Delivery</h3>
              <ul className="space-y-2 text-neutral-700">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>Sydney CBD</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>Eastern Suburbs</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>Inner West</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>North Shore (selected areas)</span>
                </li>
              </ul>
            </div>
            <div className="bg-neutral-50 rounded-2xl p-8">
              <h3 className="text-xl font-semibold text-neutral-900 mb-4">Standard Delivery (1-2 days)</h3>
              <ul className="space-y-2 text-neutral-700">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>Greater Sydney Metro</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>NSW Regional (quote based)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>Interstate (quote based)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>Pickup from Elizabeth Bay (free)</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Preview */}
      <section className="py-16 bg-blue-50">
        <div className="mx-auto max-w-[800px] px-4 md:px-8">
          <h2 className="text-center font-serif text-[32px] md:text-[42px] text-neutral-900 mb-12">
            Quick Questions?
          </h2>
          <div className="space-y-4">
            <FAQItem
              question="How do I get a quote?"
              answer="Use our Quick Order tool to upload your file and get an instant quote. No account required."
            />
            <FAQItem
              question="What file formats do you accept?"
              answer="We accept STL, OBJ, STEP, and most common 3D file formats. If you're unsure, contact us."
            />
            <FAQItem
              question="Do you offer design services?"
              answer="Yes! We can create CAD files from sketches, photos, or physical samples. Contact us for pricing."
            />
            <FAQItem
              question="How does the student discount work?"
              answer="Create an account with your .edu email address and the 20% discount is applied automatically at checkout."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-700 py-16">
        <div className="mx-auto max-w-[800px] px-4 md:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Prefer to Get a Quote First?
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

function ContactMethod({
  icon,
  title,
  details,
  description,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  details: string;
  description: string;
  href: string;
}) {
  return (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
      className="text-center group"
    >
      <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 text-blue-600 mb-4 group-hover:bg-blue-600 group-hover:text-white transition">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-neutral-900 mb-2">{title}</h3>
      <div className="text-blue-600 font-medium group-hover:underline">{details}</div>
      <div className="text-sm text-neutral-600 mt-1">{description}</div>
    </a>
  );
}

function PhoneIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path
        d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path
        d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline points="22,6 12,13 2,6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path
        d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HoursRow({ day, hours }: { day: string; hours: string }) {
  return (
    <div className="flex justify-between items-center py-3 border-b border-neutral-100 last:border-0">
      <span className="font-medium text-neutral-900">{day}</span>
      <span className="text-neutral-700">{hours}</span>
    </div>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="bg-white rounded-xl p-6 border border-neutral-200">
      <h3 className="font-semibold text-neutral-900 mb-2">{question}</h3>
      <p className="text-neutral-700">{answer}</p>
    </div>
  );
}
