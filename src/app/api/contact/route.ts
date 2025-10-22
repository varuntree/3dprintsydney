import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

/**
 * Contact Form Submission API
 * Handles contact form submissions from the marketing site
 */

const ContactFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  subject: z.enum([
    "quote",
    "technical",
    "design",
    "materials",
    "student",
    "other",
  ]),
  message: z.string().min(10, "Message must be at least 10 characters").max(2000),
  student: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validationResult = ContactFormSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid form data",
            details: validationResult.error.issues,
          },
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    const supabase = await getServerSupabase();

    // Store contact inquiry in database
    const { error: dbError } = await supabase.from("contact_inquiries").insert({
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      subject: data.subject,
      message: data.message,
      is_student: data.student,
      submitted_at: new Date().toISOString(),
      status: "new",
    });

    if (dbError) {
      logger.error({
        scope: "api/contact",
        message: "Failed to store contact inquiry",
        error: dbError,
        data: { email: data.email },
      });

      return NextResponse.json(
        {
          error: {
            code: "DATABASE_ERROR",
            message: "Failed to submit contact form. Please try again or email us directly.",
          },
        },
        { status: 500 }
      );
    }

    // TODO: Send notification email to admin
    // This could integrate with your existing messaging system
    // For now, just log the inquiry

    logger.info({
      scope: "api/contact",
      message: "Contact form submitted successfully",
      data: {
        name: data.name,
        email: data.email,
        subject: data.subject,
        is_student: data.student,
      },
    });

    // Return success
    return NextResponse.json({
      data: {
        message: "Thank you for your inquiry! We'll respond within 2 hours during business hours.",
        reference_id: `INQ-${Date.now()}`,
      },
    });
  } catch (error) {
    logger.error({
      scope: "api/contact",
      message: "Unexpected error in contact form API",
      error,
    });

    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred. Please try again.",
        },
      },
      { status: 500 }
    );
  }
}
