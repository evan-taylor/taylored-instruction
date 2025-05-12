// @ts-nocheck
// supabase/functions/new-user-admin-notification/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { Resend } from 'npm:resend'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const ADMIN_EMAIL = Deno.env.get('ADMIN_NOTIF_EMAIL')
const FROM_EMAIL = Deno.env.get('FROM_EMAIL')

interface NewUserPayload {
  record: {
    id: string;
    email: string;
  };
}

serve(async (req: Request) => {
  // Only handle POST requests; skip others without error
  if (req.method !== 'POST') {
    console.warn('new-user-admin-notification: Non-POST request, skipping');
    return new Response('OK', { status: 200 })
  }

  let payload: NewUserPayload
  try {
    payload = await req.json() as NewUserPayload
  } catch {
    console.warn('new-user-admin-notification: Invalid JSON payload');
    return new Response('OK', { status: 200 })
  }

  const newUserEmail = payload.record?.email
  const newUserId = payload.record?.id
  if (!newUserEmail || !newUserId) {
    console.warn('new-user-admin-notification: Missing email or ID', payload);
    return new Response('OK', { status: 200 })
  }

  // Send email notification if configuration is present
  if (RESEND_API_KEY && ADMIN_EMAIL && FROM_EMAIL) {
    try {
      const resend = new Resend(RESEND_API_KEY)
      const subject = 'New Instructor Signup'
      const htmlBody = `
        <h1>New Instructor Signup</h1>
        <p>A new instructor has signed up:</p>
        <ul>
          <li><strong>User ID:</strong> ${newUserId}</li>
          <li><strong>Email:</strong> ${newUserEmail}</li>
        </ul>
      `

      await resend.emails.send({
        from: `Taylored Instruction <${FROM_EMAIL}>`,
        to: [ADMIN_EMAIL],
        subject,
        html: htmlBody,
      })
    } catch (emailError) {
      console.error('new-user-admin-notification: Error sending email', emailError)
    }
  } else {
    console.warn('new-user-admin-notification: Email config not set, skipping send')
  }

  // Always return 200 OK so as not to block user signup
  return new Response('OK', { status: 200 })
})