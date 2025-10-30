# Supabase to Convex Migration Guide

This guide explains how to migrate your existing Supabase data and users to Convex without service interruption.

## Overview

The migration strategy uses a "just-in-time" approach where:
1. Data is exported from Supabase and imported into staging collections in Convex
2. Users log in with Google OAuth or magic link (same email as before)
3. On first login, their data is automatically attached to their new Convex account
4. No passwords are migrated - users will use Google OAuth or magic links going forward

## What Gets Migrated

- ✅ **User profiles** (email, instructor status, metadata)
- ✅ **Products** (all product data)
- ❌ **Analytics** (optional - can be skipped or aggregated)
- ❌ **Passwords** (users will use Google/magic link instead)

## Prerequisites

1. Supabase service role key (for data export)
2. Convex deployment with updated schema (already done)
3. Google OAuth configured (already done)
4. Resend API key for magic links (already done)

## Migration Steps

### Step 1: Prepare Environment Variables

Add to your `.env.local`:

```bash
# Supabase (for migration only)
SUPABASE_URL=https://zjxuulghiwqvrxdfkvrz.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here

# Convex (already set)
NEXT_PUBLIC_CONVEX_URL=https://api.tayloredinstruction.com
```

**⚠️ Security:** Never commit the service role key. Add `.env.local` to `.gitignore`.

### Step 2: Install Dependencies

```bash
npm install
```

This installs the `tsx` package needed to run the migration script.

### Step 3: Run Migration Script

```bash
npm run migrate:supabase
```

This script will:
1. Export all profiles from Supabase (with user emails from auth.users)
2. Export all products from Supabase
3. Import profiles into `staging_profiles` collection (keyed by email)
4. Import products into `products` collection
5. Show a summary of what was migrated

**Expected output:**
```
=== Supabase to Convex Migration ===
Supabase URL: https://zjxuulghiwqvrxdfkvrz.supabase.co
Convex URL: https://api.tayloredinstruction.com

=== Migrating Profiles ===
Found 50 profiles in Supabase
Found 50 users in Supabase Auth
✓ Imported profile for user1@example.com
✓ Imported profile for user2@example.com
...

Profiles migration complete:
  Imported: 50
  Skipped: 0
  Errors: 0

=== Migrating Products ===
Found 25 products in Supabase
Processing batch 1...
  Imported: 25, Skipped: 0

Products migration complete:
  Imported: 25
  Skipped: 0

=== Migration Summary ===
Profiles: 50 migrated
Products: 25 migrated

✓ Migration completed successfully!
```

### Step 4: Deploy Updated App

The app already includes the `MigrationAttachment` component that runs on every page load. When a user logs in:

1. User logs in with Google OAuth or magic link (same email as Supabase)
2. `MigrationAttachment` component automatically calls `attachUserDataOnLogin`
3. The mutation looks up their staging profile by email
4. Creates their Convex profile with the migrated data
5. Marks the staging profile as processed

**No code changes needed** - this is already integrated into `ConvexClientProvider`.

### Step 5: Communicate with Users

**Email template:**

```
Subject: Taylored Instruction - Please Log In Again

Hi,

We've upgraded our platform to improve performance and reliability. 

Please log in again at https://tayloredinstruction.com/login

You can use:
- Google Sign In (if you used Google before)
- Email Magic Link (we'll send you a login link)

Your account data and instructor status have been preserved.

Thanks,
Taylored Instruction Team
```

### Step 6: Monitor Migration Progress

Use the Convex dashboard or run this query to check progress:

```typescript
// In Convex dashboard or your app
const stats = await convex.query(api.migration.getMigrationStats);
console.log(stats);
// Output: { total: 50, processed: 45, unprocessed: 5, processedRate: "90.0" }
```

### Step 7: Verify and Clean Up

After all users have logged in at least once:

1. Check that `processedRate` is near 100%
2. Verify a few user profiles manually
3. Keep Supabase running for 1-2 weeks as backup
4. Remove Supabase environment variables from Vercel
5. Remove Supabase dependencies from package.json (optional)

## How It Works

### Staging Collections

The `staging_profiles` collection holds migrated data temporarily:

```typescript
{
  email: "user@example.com",
  supabaseUserId: "uuid-from-supabase",
  isInstructor: true,
  updatedAt: "2024-01-15T10:30:00Z",
  lastLogin: "2024-01-15T10:30:00Z",
  processedAt: undefined,  // Set when attached
  convexUserId: undefined  // Set when attached
}
```

### Attachment Process

When a user logs in:

1. `useMigrationAttachment` hook runs
2. Calls `attachUserDataOnLogin` mutation
3. Mutation checks if profile already exists (idempotent)
4. Looks up staging profile by email
5. Creates Convex profile with migrated data
6. Marks staging profile as processed

### Authentication Flow

**Before migration:**
- User logs in with email/password or Google → Supabase Auth

**After migration:**
- User logs in with Google → Convex Auth (same email, auto-attached)
- User logs in with magic link → Convex Auth (same email, auto-attached)

## Troubleshooting

### "No staging profile found"

This means the user's email wasn't in Supabase. They can create a new account.

### "Profile already exists"

The user has already logged in once and their data was attached. This is normal.

### Migration script fails

Check:
- Supabase credentials are correct
- Convex URL is correct
- Network connectivity to both services

### Users can't log in

Check:
- Google OAuth is configured correctly
- Redirect URIs match: `https://auth.tayloredinstruction.com/api/auth/callback/google`
- Resend API key is set in Convex for magic links

## Rollback Plan

If something goes wrong:

1. Keep Supabase environment variables in Vercel
2. Revert to previous deployment
3. Investigate the issue
4. Fix and retry migration

**Supabase data is never deleted** - it remains as backup until you explicitly remove it.

## Security Notes

1. **Rotate secrets** that were shared in chat:
   - Google OAuth Client Secret
   - Resend API Key
   - Stripe Secret Key
   - Notion API Key

2. **Service role key** should only be used for migration, then removed from `.env.local`

3. **Staging profiles** contain user emails - treat as PII

## Next Steps After Migration

1. Remove Supabase dependencies (optional):
   ```bash
   npm uninstall @supabase/supabase-js @supabase/auth-helpers-nextjs
   ```

2. Remove Supabase environment variables from Vercel

3. Archive Supabase project (keep as backup for 30 days)

4. Update documentation to reference Convex instead of Supabase

## Support

If you encounter issues during migration:
1. Check the migration stats query
2. Review Convex logs in the dashboard
3. Check browser console for client-side errors
4. Verify environment variables are set correctly
