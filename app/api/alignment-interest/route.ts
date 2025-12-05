import { type NextRequest, NextResponse } from "next/server";
import React from "react";
import { z } from "zod"; // Assuming zod is needed for the schema
import AlignmentConfirmationEmail from "@/emails/AlignmentConfirmationEmail"; // Reverted import
import AlignmentInterestEmail from "@/emails/AlignmentInterestEmail"; // Reverted import
import { getResendClient } from "@/lib/resend";

const adminEmail = "info@tayloredinstruction.com"; // Your admin email
const fromEmail = "info@mail.tayloredinstruction.com"; // Use verified Resend domain

// Define schema for form validation - RESTORED
const AlignmentInterestSchema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Invalid email address"),
    phone: z.string().min(1, "Phone number is required"), // Assuming phone is required based on form UI
    hasCertification: z.enum(["Yes", "No"], {
      required_error: "Certification status is required",
    }),
    agencies: z.array(z.string()).optional(), // Optional array of strings
    message: z.string().optional(),
    smsOptIn: z.boolean().optional(),
    smsOptOut: z.boolean().optional(),
  })
  .refine(
    (data) => {
      // If hasCertification is 'Yes', agencies array must not be empty (or null/undefined)
      if (data.hasCertification === "Yes") {
        return Array.isArray(data.agencies) && data.agencies.length > 0;
      }
      return true; // If 'No', agencies are not required
    },
    {
      message: "Please select at least one agency if you have a certification.",
      path: ["agencies"], // Path of the error
    }
  );

export async function POST(req: NextRequest) {
  try {
    // RESTORED try block start
    const body = await req.json();

    // Validate the request body against the schema - RESTORED
    const validatedFields = AlignmentInterestSchema.safeParse(body);

    if (!validatedFields.success) {
      // Combine errors into a single message or return structured errors
      const errors = Object.entries(validatedFields.error.flatten().fieldErrors)
        .map(([field, messages]) => `${field}: ${messages.join(", ")}`)
        .join("; ");
      return NextResponse.json(
        { success: false, error: `Invalid form data. ${errors}` },
        { status: 400 }
      );
    }

    const { firstName, lastName, email } = validatedFields.data;

    // Send email to admin
    const adminEmailData = await getResendClient().emails.send({
      from: `Alignment Form <${fromEmail}>`, // Updated sender name
      to: [adminEmail],
      replyTo: email,
      subject: `New Alignment Interest Submission from ${firstName} ${lastName}`,
      react: React.createElement(AlignmentInterestEmail, {
        ...validatedFields.data,
      }), // Pass validated data
    });

    if (adminEmailData.error) {
      return NextResponse.json(
        { success: false, error: "Failed to send notification email." },
        { status: 500 }
      );
    }

    // Send confirmation email to user
    const userEmailData = await getResendClient().emails.send({
      from: `Taylored Instruction <${fromEmail}>`, // Updated sender name
      to: [email],
      subject: "Alignment Interest Received - Taylored Instruction",
      react: React.createElement(AlignmentConfirmationEmail, { firstName }), // Pass necessary data
    });

    if (userEmailData.error) {
      // Intentionally ignoring user email failure to avoid masking success
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
