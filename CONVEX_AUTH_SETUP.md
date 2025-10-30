# Convex Auth Setup Guide

This guide explains how to configure environment variables for Convex Auth with email magic links and Google OAuth.

## Environment Variables Setup

### 1. Generate JWT Keys

First, generate the JWT keys required for Convex Auth:

```bash
node generateKeys.mjs
```

This will output two environment variables: `JWT_PRIVATE_KEY` and `JWKS`. Copy the entire output.

### 2. Configure Convex Environment Variables

Go to your Convex Dashboard at https://dashboard.convex.dev/t/taylor-labs/taylored-instruction-7992e/settings/environment-variables

Add the following environment variables:

#### Required for All Authentication:
- **JWT_PRIVATE_KEY**: (from generateKeys.mjs output)
- **JWKS**: (from generateKeys.mjs output)
- **SITE_URL**: 
  - Development: `http://localhost:3000`
  - Production: `https://tayloredinstruction.com`

#### Required for Email Magic Links:
- **RESEND_API_KEY**: Your Resend API key (get from https://resend.com/api-keys)
- **AUTH_EMAIL_FROM**: The email address to send magic links from (e.g., `noreply@tayloredinstruction.com`)
  - Note: This email must be verified in your Resend account

#### Optional for Google OAuth:
- **AUTH_GOOGLE_ID**: Your Google OAuth Client ID
- **AUTH_GOOGLE_SECRET**: Your Google OAuth Client Secret

### 3. Configure Next.js Environment Variables

In your `.env.local` file (already configured):

```env
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
```

## Google OAuth Setup (Optional)

If you want to enable Google OAuth sign-in:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to "Credentials" and create an OAuth 2.0 Client ID
5. Add authorized redirect URIs:
   - For development: Check Convex Auth docs for the exact callback URL format
   - For production: Check Convex Auth docs for the exact callback URL format
   - The callback URL is handled by Convex HTTP routes (not Next.js)
6. Copy the Client ID and Client Secret to your Convex Dashboard environment variables

**Important**: The OAuth callback is handled by Convex's HTTP routes (via `convex/http.ts`), not by Next.js API routes. Refer to the [Convex Auth OAuth documentation](https://labs.convex.dev/auth/config/oauth) for the exact redirect URI format.

## Testing Authentication

### Email Magic Links:
1. Start your development server: `npm run dev`
2. Start Convex: `npx convex dev`
3. Go to http://localhost:3000/login
4. Enter your email address
5. Check your email for the magic link
6. Click the link to sign in

### Google OAuth:
1. Click "Continue with Google" on the login page
2. Complete the Google OAuth flow
3. You'll be redirected back to your site

## Troubleshooting

### Magic links not sending:
- Verify `RESEND_API_KEY` is set correctly in Convex Dashboard
- Verify `AUTH_EMAIL_FROM` is a verified sender in your Resend account
- Check Convex function logs for errors

### Google OAuth not working:
- Verify `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` are set in Convex Dashboard
- Verify redirect URIs are configured correctly in Google Cloud Console
- Check that the redirect URI matches the Convex Auth documentation

### "Missing NEXT_PUBLIC_CONVEX_URL" error:
- Verify the environment variable is set in `.env.local`
- Restart your Next.js development server

## Architecture Notes

- **Authentication is handled by Convex**: All auth logic runs in Convex functions, not Next.js API routes
- **HTTP routes**: The `convex/http.ts` file exposes HTTP endpoints for OAuth callbacks and magic link verification
- **Conditional providers**: Providers only load if their required environment variables are present
- **Email provider**: Uses Resend to send magic link emails
- **Google provider**: Uses Auth.js Google provider for OAuth
