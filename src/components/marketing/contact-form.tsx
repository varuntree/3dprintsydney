"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, Check, Loader2 } from "lucide-react";

const inputClasses =
  "w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-foreground/80 transition focus:border-foreground/40 focus:outline-none focus:ring-2 focus:ring-[color:var(--color-blue-accent)] disabled:cursor-not-allowed disabled:opacity-60";

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
      (e.target as HTMLFormElement).reset();
    } catch (error) {
      setSubmitStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <label htmlFor="name" className="mb-2 block text-sm font-medium text-foreground/70">
            Name *
          </label>
          <input type="text" id="name" name="name" required disabled={isSubmitting} className={inputClasses} placeholder="Your name" />
        </div>
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-medium text-foreground/70">
            Email *
          </label>
          <input type="email" id="email" name="email" required disabled={isSubmitting} className={inputClasses} placeholder="your@email.com" />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <label htmlFor="phone" className="mb-2 block text-sm font-medium text-foreground/70">
            Phone
          </label>
          <input type="tel" id="phone" name="phone" disabled={isSubmitting} className={inputClasses} placeholder="0412 345 678" />
        </div>
        <div>
          <label htmlFor="subject" className="mb-2 block text-sm font-medium text-foreground/70">
            Subject *
          </label>
          <select id="subject" name="subject" required disabled={isSubmitting} className={inputClasses}>
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
        <label htmlFor="message" className="mb-2 block text-sm font-medium text-foreground/70">
          Message *
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={6}
          disabled={isSubmitting}
          className={`${inputClasses} resize-none`}
          placeholder="Tell us about your project..."
        />
      </div>

      <label className="flex items-start gap-3 text-sm text-foreground/70">
        <input
          type="checkbox"
          id="student"
          name="student"
          disabled={isSubmitting}
          className="mt-1 h-4 w-4 rounded border border-border text-primary focus:ring-[color:var(--color-blue-accent)] disabled:cursor-not-allowed disabled:opacity-60"
        />
        I&apos;m a student (eligible for 20% discount)
      </label>

      {submitStatus === "success" && (
        <div className="flex items-start gap-3 rounded-2xl border border-[color:var(--color-success-border)] bg-[color:var(--color-success-bg)] p-4 text-sm text-[color:var(--color-success-foreground)]">
          <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white">
            <Check className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <p className="font-medium text-foreground">Message sent successfully</p>
            <p className="mt-1 text-foreground/70">
              Thank you for your enquiry. We&apos;ll respond within two business hours (Mon–Fri 9am–6pm).
            </p>
          </div>
        </div>
      )}

      {submitStatus === "error" && (
        <div className="flex items-start gap-3 rounded-2xl border border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-bg)] p-4 text-sm text-[color:var(--color-danger-foreground)]">
          <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white">
            <AlertCircle className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <p className="font-medium text-foreground">We couldn&apos;t send your message</p>
            <p className="mt-1 text-foreground/70">{errorMessage}</p>
            <p className="mt-2 text-foreground/70">
              Please try again or email us directly at <a href="mailto:alan@3dprintsydney.com" className="font-medium underline">alan@3dprintsydney.com</a>.
            </p>
          </div>
        </div>
      )}

      <div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Sending…
            </>
          ) : (
            "Send message"
          )}
        </button>
        <p className="mt-3 text-center text-xs text-foreground/60">
          For instant pricing try our
          {" "}
          <Link href="/quick-order" className="font-medium text-foreground">
            Quick Order tool
          </Link>
          .
        </p>
      </div>
    </form>
  );
}
