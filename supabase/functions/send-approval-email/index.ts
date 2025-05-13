import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { Resend } from 'npm:resend'
import { corsHeaders } from '../_shared/cors.ts'; // Import corsHeaders

// IMPORTANT: Set these environment variables in your Supabase project settings
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') // e.g., 'noreply@tayloredinstruction.com'
const WEBSITE_NAME = Deno.env.get('WEBSITE_NAME') || 'Taylored Instruction'

interface ApprovalEmailPayload {
  email: string;
  name?: string; // Optional name of the instructor
}

serve(async (req: Request) => {
  // Handle CORS preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!RESEND_API_KEY || !FROM_EMAIL) {
    console.error('send-approval-email: Missing RESEND_API_KEY or FROM_EMAIL environment variables.')
    return new Response(JSON.stringify({ message: 'Approval processed, but email notification could not be sent due to server config.' }), {
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, // Added corsHeaders
    });
  }

  try {
    const payload = await req.json() as ApprovalEmailPayload
    const { email, name } = payload

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, // Added corsHeaders
      })
    }

    const resend = new Resend(RESEND_API_KEY)
    const subject = `Instructor Account Approved - ${WEBSITE_NAME}`
    // Plain text email
    const textBody = `Hey ${name || 'Instructor'},\n\nCongratulations! Your instructor account for ${WEBSITE_NAME} has been approved.\n\nYou can now access instructor resources by logging into your account.\n\nIf you have any questions, please feel free to reach out to us.\n\nBest,\n${WEBSITE_NAME}`

    await resend.emails.send({
      from: `${WEBSITE_NAME} <${FROM_EMAIL}>`,
      to: [email],
      subject,
      text: textBody, // Send as plain text
    })

    return new Response(JSON.stringify({ message: 'Approval email sent successfully.' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, // Added corsHeaders
    })
  } catch (error: any) {
    console.error('send-approval-email: Error sending email:', error)
    return new Response(JSON.stringify({ error: `Failed to send approval email: ${error.message}` }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, // Added corsHeaders
    })
  }
}) 