import React from "react";

export function SocialProof() {
  return (
    <section className="bg-white py-16 md:py-24">
      <div className="mx-auto max-w-[1200px] px-4 md:px-8">
        <div className="text-center">
          <h2 className="font-serif text-[36px] leading-tight tracking-tight sm:text-[48px] md:text-[54px] text-neutral-900">
            Trusted by Sydney&apos;s
            <br />
            Makers and Innovators
          </h2>
        </div>

        {/* Stats */}
        <div className="mt-12 grid gap-8 md:grid-cols-4">
          <StatCard icon="🎯" number="1000+" label="Projects Completed" />
          <StatCard icon="⚡" number="Same Day" label="Service Available" />
          <StatCard icon="🎓" number="20%" label="Student Discount" />
          <StatCard icon="⭐" number="4.9/5" label="Average Rating" />
        </div>

        {/* Testimonials */}
        <div className="mt-16 grid gap-6 md:grid-cols-3">
          <Testimonial
            quote="3D Print Sydney helped us prototype our hardware startup in record time. Same-day service was a game-changer for our launch timeline."
            author="Product Manager"
            company="Tech Startup, Surry Hills"
          />
          <Testimonial
            quote="As a student, the 20% discount made professional 3D printing actually affordable. Quality was outstanding for my architecture model."
            author="Architecture Student"
            company="University of Sydney"
          />
          <Testimonial
            quote="They didn't just print my part—they helped redesign it for better performance. True engineering expertise, not just a print service."
            author="Mechanical Engineer"
            company="Manufacturing Company"
          />
        </div>
      </div>
    </section>
  );
}

function StatCard({ icon, number, label }: { icon: string; number: string; label: string }) {
  return (
    <div className="text-center">
      <div className="mb-2 text-4xl">{icon}</div>
      <div className="text-3xl font-bold text-neutral-900">{number}</div>
      <div className="mt-1 text-sm text-neutral-600">{label}</div>
    </div>
  );
}

function Testimonial({
  quote,
  author,
  company,
}: {
  quote: string;
  author: string;
  company: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-6">
      {/* Stars */}
      <div className="mb-3 flex gap-0.5">
        {[...Array(5)].map((_, i) => (
          <svg
            key={i}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="#FFA500"
            className="text-yellow-500"
          >
            <path d="M12 2l2.9 6.1L22 9.3l-5 4.7 1.2 6.7L12 17.8 5.8 20.7 7 14 2 9.3l7.1-1.2L12 2z" />
          </svg>
        ))}
      </div>
      <p className="mb-4 text-neutral-700 italic">&ldquo;{quote}&rdquo;</p>
      <div>
        <div className="font-medium text-neutral-900">{author}</div>
        <div className="text-sm text-neutral-600">{company}</div>
      </div>
    </div>
  );
}
