"use client";

import React, { useState } from "react";
import Link from "next/link";

export function ContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus("idle");
    setErrorMessage("");

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      subject: formData.get("subject") as string,
      message: formData.get("message") as string,
      student: formData.get("student") === "on",
    };

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || "Failed to submit form");
      }

      setSubmitStatus("success");
      // Reset form
      (e.target as HTMLFormElement).reset();
    } catch (error) {
      setSubmitStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <form className="space-y-6" onSubmit={handleSubmit}>
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
              disabled={isSubmitting}
              className="w-full px-4 py-3 rounded-lg border border-neutral-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
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
              disabled={isSubmitting}
              className="w-full px-4 py-3 rounded-lg border border-neutral-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
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
              disabled={isSubmitting}
              className="w-full px-4 py-3 rounded-lg border border-neutral-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
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
              disabled={isSubmitting}
              className="w-full px-4 py-3 rounded-lg border border-neutral-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
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
            disabled={isSubmitting}
            className="w-full px-4 py-3 rounded-lg border border-neutral-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="Tell us about your project..."
          />
        </div>

        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="student"
            name="student"
            disabled={isSubmitting}
            className="mt-1 h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <label htmlFor="student" className="text-sm text-neutral-600">
            I&apos;m a student (eligible for 20% discount)
          </label>
        </div>

        {/* Success Message */}
        {submitStatus === "success" && (
          <div className="rounded-lg bg-green-50 border border-green-200 p-4">
            <div className="flex items-start gap-3">
              <span className="text-green-600 text-xl">✓</span>
              <div>
                <h3 className="font-semibold text-green-900 mb-1">Message Sent Successfully!</h3>
                <p className="text-sm text-green-700">
                  Thank you for your inquiry. We&apos;ll respond within 2 hours during business hours
                  (Mon-Fri 9AM-6PM).
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {submitStatus === "error" && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4">
            <div className="flex items-start gap-3">
              <span className="text-red-600 text-xl">✕</span>
              <div>
                <h3 className="font-semibold text-red-900 mb-1">Failed to Send Message</h3>
                <p className="text-sm text-red-700">{errorMessage}</p>
                <p className="text-sm text-red-700 mt-2">
                  Please try again or email us directly at{" "}
                  <a
                    href="mailto:alan@3dprintsydney.com"
                    className="underline font-medium"
                  >
                    alan@3dprintsydney.com
                  </a>
                </p>
              </div>
            </div>
          </div>
        )}

        <div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-4 text-white font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Sending..." : "Send Message →"}
          </button>
          <p className="mt-3 text-sm text-neutral-500 text-center">
            For instant quotes, use our{" "}
            <Link href="/quick-order" className="text-blue-600 hover:underline">
              Quick Order
            </Link>{" "}
            tool
          </p>
        </div>
      </form>
    </>
  );
}
