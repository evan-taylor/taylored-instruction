'use server'

import { Resend } from 'resend';
import ContactFormEmail from '@/emails/ContactFormEmail';
import ContactConfirmationEmail from '@/emails/ContactConfirmationEmail';
import { z } from 'zod';

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);
const adminEmail = 'info@tayloredinstruction.com'; // Your admin email
const fromEmail = 'info@tayloredinstruction.com'; // Use verified domain and desired from address

// Define schema for form validation
const ContactFormSchema = z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Invalid email address'),
    phone: z.string().optional(),
    location: z.string().optional(),
    otherLocation: z.string().optional(),
    message: z.string().min(5, 'Message must be at least 5 characters'),
    smsOptIn: z.preprocess((val) => val === 'on', z.boolean()).optional(),
    contactMethod: z.preprocess((val) => {
        if (typeof val === 'string') return [val];
        if (Array.isArray(val)) return val;
        return [];
    }, z.array(z.string()).min(1, 'At least one contact method must be selected')),
});

interface SendEmailResult {
    success: boolean;
    error?: string | null;
}

export async function sendContactEmail(formData: FormData): Promise<SendEmailResult> {
    const rawFormDataEntries = Object.fromEntries(formData.entries());

    // Manually handle multiple checkboxes for contactMethod
    const contactMethods = formData.getAll('contactMethod') as string[];
    // rawFormData.contactMethod = contactMethods; // Remove this line

    // Validate using the original entries + the correctly typed contactMethods array
    const validatedFields = ContactFormSchema.safeParse({
        ...rawFormDataEntries,
        contactMethod: contactMethods // Pass the array here
    });

    if (!validatedFields.success) {
        console.error("Validation Errors:", validatedFields.error.flatten().fieldErrors);
        // Combine multiple errors into a single message
        const errors = Object.entries(validatedFields.error.flatten().fieldErrors)
            .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
            .join('; ');
        return { success: false, error: `Invalid form data. ${errors}` };
    }

    const {
        firstName,
        lastName,
        email,
        phone,
        location,
        otherLocation,
        message,
        smsOptIn,
        // contactMethod is already destructured via validatedFields.data
    } = validatedFields.data;
    
    const contactMethodList = validatedFields.data.contactMethod;

    try {
        // Send email to admin
        const adminEmailData = await resend.emails.send({
            from: `Contact Form <${fromEmail}>`,
            to: [adminEmail],
            replyTo: email,
            subject: `New Contact Form Submission from ${firstName} ${lastName}`,
            react: ContactFormEmail({ 
                firstName,
                lastName,
                email,
                phone,
                location,
                otherLocation,
                message,
                smsOptIn,
                contactMethods: contactMethodList
             }),
        });

        if (adminEmailData.error) {
            console.error("Resend Admin Error:", adminEmailData.error);
            return { success: false, error: 'Failed to send notification email.' };
        }

        // Send confirmation email to user
        const userEmailData = await resend.emails.send({
            from: `Taylored Instruction <${fromEmail}>`,
            to: [email],
            subject: 'Message Received - Taylored Instruction',
            react: ContactConfirmationEmail({ firstName }),
        });

        if (userEmailData.error) {
            // Log this error but don't necessarily tell the user it failed if the admin email went through
            console.error("Resend User Confirmation Error:", userEmailData.error);
            // Decide if this constitutes a full failure for the user
            // return { success: false, error: 'Failed to send confirmation email.' };
        }

        return { success: true };

    } catch (error) {
        console.error('Email sending error:', error);
        if (error instanceof Error) {
            return { success: false, error: error.message };
        }
        return { success: false, error: 'An unexpected error occurred while sending the email.' };
    }
} 