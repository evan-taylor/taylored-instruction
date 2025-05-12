import { Resend } from 'resend';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod'; // Assuming zod is needed for the schema
import AlignmentInterestEmail from '@/emails/AlignmentInterestEmail'; // Reverted import
import AlignmentConfirmationEmail from '@/emails/AlignmentConfirmationEmail'; // Reverted import

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);
const adminEmail = 'info@tayloredinstruction.com'; // Your admin email
const fromEmail = 'info@tayloredinstruction.com'; // Use verified domain and desired from address

// Define schema for form validation - RESTORED
const AlignmentInterestSchema = z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Invalid email address'),
    phone: z.string().min(1, 'Phone number is required'), // Assuming phone is required based on form UI
    hasCertification: z.enum(['Yes', 'No'], { required_error: 'Certification status is required' }),
    agencies: z.array(z.string()).optional(), // Optional array of strings
    message: z.string().optional(),
    smsOptIn: z.boolean().optional(),
}).refine(data => {
    // If hasCertification is 'Yes', agencies array must not be empty (or null/undefined)
    if (data.hasCertification === 'Yes') {
        return Array.isArray(data.agencies) && data.agencies.length > 0;
    }
    return true; // If 'No', agencies are not required
}, {
    message: 'Please select at least one agency if you have a certification.',
    path: ['agencies'], // Path of the error
});

export async function POST(req: NextRequest) {
    try { // RESTORED try block start
        const body = await req.json();

        // Validate the request body against the schema - RESTORED
        const validatedFields = AlignmentInterestSchema.safeParse(body);

        if (!validatedFields.success) {
            console.error("Validation Errors:", validatedFields.error.flatten().fieldErrors);
            // Combine errors into a single message or return structured errors
            const errors = Object.entries(validatedFields.error.flatten().fieldErrors)
                .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
                .join('; ');
            return NextResponse.json({ success: false, error: `Invalid form data. ${errors}` }, { status: 400 });
        }

        const { 
            firstName, 
            lastName, 
            email, 
            phone, 
            hasCertification, 
            agencies, 
            message, 
            smsOptIn 
        } = validatedFields.data; // RESTORED destructuring

        // Send email to admin
        const adminEmailData = await resend.emails.send({
            from: `Alignment Form <${fromEmail}>`, // Updated sender name
            to: [adminEmail],
            replyTo: email,
            subject: `New Alignment Interest Submission from ${firstName} ${lastName}`,
            react: AlignmentInterestEmail({ ...validatedFields.data }), // Pass validated data
        });

        if (adminEmailData.error) {
            console.error("Resend Admin Error:", adminEmailData.error);
            return NextResponse.json({ success: false, error: 'Failed to send notification email.' }, { status: 500 });
        }

        // Send confirmation email to user
        const userEmailData = await resend.emails.send({
            from: `Taylored Instruction <${fromEmail}>`, // Updated sender name
            to: [email],
            subject: 'Alignment Interest Received - Taylored Instruction',
            react: AlignmentConfirmationEmail({ firstName }), // Pass necessary data
        });

        if (userEmailData.error) {
            // Log this error but don't fail the request if admin email succeeded
            console.error("Resend User Confirmation Error:", userEmailData.error);
        }

        return NextResponse.json({ success: true }, { status: 200 });

    } catch (error) {
        console.error('API route error:', error);
        if (error instanceof Error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }
        return NextResponse.json({ success: false, error: 'An unexpected error occurred.' }, { status: 500 });
    }
}