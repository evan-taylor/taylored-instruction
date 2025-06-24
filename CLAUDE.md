# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Taylored Instruction is a Next.js 14 website for a CPR/BLS training company in Vancouver, WA. The site handles course information, instructor resources, e-commerce functionality, and user authentication using App Router architecture.

## Development Commands

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production  
npm run start           # Start production server
npm run lint            # Run ESLint
npm run type-check      # Run TypeScript compiler check
npm run test            # Run both lint and type-check (no separate test suite)
```

## Architecture

### App Router Structure
- **Fully migrated to App Router** (Next.js 14)
- Routes in `/app` directory with file-based routing
- Server Components by default, Client Components marked with 'use client'
- Server Actions for form handling in `/app/actions/`

### Key Technologies
- **Database**: Supabase (PostgreSQL with RLS)
- **Authentication**: Supabase Auth + NextAuth.js
- **Payments**: Stripe integration 
- **Styling**: Tailwind CSS + Shadcn/ui components
- **Email**: React Email + Resend
- **Content**: Notion API for instructor resources
- **Monitoring**: Vercel Analytics + Sentry

### Route Protection
- Authentication middleware in `middleware.ts`
- Protected routes: `/my-account`, `/ecards`, `/instructor-resources`
- Admin routes: `/admin/*`

## Database Schema (Supabase)

### Key Tables
- `products` - Course offerings and eCards (types: digital, AED, ecard)
- `user_profiles` - Extended user data with instructor permissions
- Authentication handled by Supabase Auth

### Important Fields
- `products.type` - Determines product category and handling
- `user_profiles.is_instructor` - Controls access to instructor resources
- Row Level Security (RLS) enabled for data protection

## Component Architecture

```
/components/
├── ui/                    # Shadcn/ui base components (Button, Input, etc.)
├── layout/                # Header, Footer, Navigation
├── home/                  # Homepage-specific sections
└── [Feature]PageContent.tsx # Page-specific content components
```

### Styling Patterns
- Tailwind classes with custom design system
- CSS variables for theming (HSL color system)
- Component variants using `class-variance-authority`
- Responsive design with mobile-first approach

## API Routes

### Structure
- RESTful endpoints in `/app/api/`
- Server Actions for form submissions
- Type validation with Zod schemas

### Key Endpoints
- `/api/stripe/*` - Payment processing
- `/api/notion/*` - Content fetching
- `/api/send-email` - Contact form handling
- `/api/auth/callback` - Authentication flow

## E-commerce Flow

### Products
1. **Digital courses** - Instant access after payment
2. **AED equipment** - Physical products with shipping
3. **eCards** - Digital certifications with custom recipient info

### Payment Process
1. Stripe Checkout Session creation
2. Success page with conditional content
3. Email notifications via React Email templates

## Development Patterns

### Form Handling
- React Hook Form + Zod validation
- Server Actions for processing
- Type-safe form schemas in `/lib/schemas.ts`

### Data Fetching
- Server Components for initial data
- Supabase client for database queries
- Error boundaries for graceful failures

### Authentication Flow
1. Supabase Auth for registration/login
2. Middleware for route protection
3. User profiles for additional permissions

## Environment Variables Required

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=

# Email
RESEND_API_KEY=

# Notion
NOTION_API_TOKEN=
NOTION_DATABASE_ID=

# Sentry
SENTRY_DSN=
```

## Common Tasks

### Adding New Course Pages
1. Create route in `/app/[course-name]/page.tsx`
2. Add course data to products table
3. Update navigation in Header component
4. Add Stripe product integration if paid

### Adding New UI Components
1. Use Shadcn/ui CLI: `npx shadcn@latest add [component]`
2. Customize in `/components/ui/`
3. Follow existing Tailwind patterns

### Modifying Email Templates
- Templates in `/app/emails/`
- Use React Email components
- Test with development endpoint

### Database Changes
- Use Supabase dashboard for schema changes
- Update TypeScript types in `/types.ts`
- Ensure RLS policies are updated

## Build and Deployment

- **Platform**: Vercel
- **Automatic deployments** from Git
- **Image optimization** configured for external domains
- **Analytics** via Vercel Analytics and Speed Insights
- **Error tracking** via Sentry integration in `next.config.js`

## Testing Strategy

- TypeScript compiler for type checking
- ESLint for code quality
- No unit testing framework currently configured
- Manual testing for UI/UX flows

## Key Files

- `/middleware.ts` - Route protection and authentication
- `/app/layout.tsx` - Root layout with analytics and fonts
- `/lib/utils.ts` - Utility functions and cn() helper
- `/types.ts` - TypeScript definitions
- `/tailwind.config.js` - Design system configuration