# SEO Developer Guide - Taylored Instruction

Quick reference for adding SEO to new pages.

---

## 📋 Checklist for New Pages

- [ ] Page metadata with title, description, keywords
- [ ] Open Graph tags
- [ ] Twitter Card tags
- [ ] Canonical URL
- [ ] Structured data (if applicable)
- [ ] Breadcrumb schema (if not homepage)
- [ ] Location-specific keywords
- [ ] Add to sitemap configuration

---

## 🎯 Standard Page Template

```typescript
import type { Metadata } from "next";
import { generateJSONLD, getBreadcrumbSchema } from "@/lib/structuredData";

// If page has FAQs, also import:
// import { getFAQSchema, [specificFAQs] } from "@/lib/faqSchema";

export const metadata: Metadata = {
  title: "Page Title | Vancouver WA & San Luis Obispo CA - Taylored Instruction",
  description:
    "Compelling description mentioning both Vancouver WA, Clark County, and San Luis Obispo CA with key services. 150-160 characters ideal.",
  keywords: [
    "primary keyword Vancouver WA",
    "primary keyword San Luis Obispo",
    "secondary keyword Clark County",
    "related keyword 1",
    "related keyword 2",
    "location-specific term",
    // Add 10-20+ relevant keywords
  ],
  openGraph: {
    title: "Page Title | Vancouver WA & San Luis Obispo CA",
    description: "Shorter OG description focusing on value proposition.",
    url: "https://tayloredinstruction.com/page-path",
    siteName: "Taylored Instruction",
    type: "website", // or "article" for blog posts
    images: [
      {
        url: "/og-image.png", // Or page-specific image
        width: 1200,
        height: 630,
        alt: "Descriptive alt text for social sharing",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Page Title | Vancouver WA & San Luis Obispo CA",
    description: "Twitter-specific description if different from OG.",
    images: ["/twitter-image.png"],
  },
  alternates: {
    canonical: "https://tayloredinstruction.com/page-path",
  },
};

export default function NewPage() {
  // Generate breadcrumb schema
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: "Home", url: "https://tayloredinstruction.com" },
    { name: "Page Name", url: "https://tayloredinstruction.com/page-path" },
  ]);

  // If page has FAQs:
  // const faqSchema = getFAQSchema(specificFAQs);

  return (
    <>
      {/* Breadcrumb Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={generateJSONLD(breadcrumbSchema)}
      />
      
      {/* FAQ Schema (if applicable) */}
      {/* <script
        type="application/ld+json"
        dangerouslySetInnerHTML={generateJSONLD(faqSchema)}
      /> */}
      
      <YourPageContent />
    </>
  );
}
```

---

## 📝 Title Best Practices

### Format:
```
Primary Keyword | Secondary Keyword | Location - Brand
```

### Examples:
```typescript
// Service page
"CPR Certification | Vancouver WA & San Luis Obispo CA - Expert Training"

// About page
"About Taylored Instruction | Expert CPR Training in Vancouver WA & SLO CA"

// Product page
"AED Sales Vancouver WA | Buy Defibrillators San Luis Obispo - Taylored Instruction"
```

### Guidelines:
- Keep under 60 characters (displays fully in Google)
- Include primary keyword first
- Mention both locations when relevant
- Include brand name at end
- Make it compelling and clickable

---

## 📄 Description Best Practices

### Format:
```
Value proposition + Services + Locations + Call to action. 150-160 chars.
```

### Examples:
```typescript
// Good description
"Professional CPR & BLS training in Vancouver WA, Clark County & San Luis Obispo CA. American Red Cross & AHA certified. Flexible scheduling. Book your class today!"

// Service-specific
"Get AHA BLS certification for healthcare providers in Vancouver WA & San Luis Obispo CA. In-person & blended learning. Same-day eCard available. Register now!"
```

### Guidelines:
- 150-160 characters ideal
- Include both locations
- Mention certifications (AHA/Red Cross)
- Include call to action
- Make it enticing to click

---

## 🏷️ Keywords Strategy

### Location Keywords (Include These):

**Primary Locations:**
- Vancouver WA
- San Luis Obispo CA
- San Luis Obispo
- SLO CA

**Secondary Locations:**
- Clark County
- Portland OR (for Vancouver pages)
- SLO County

**Surrounding Cities (Vancouver):**
- Camas WA
- Battle Ground WA
- Ridgefield WA
- Washougal WA
- La Center WA

**Surrounding Cities (SLO):**
- Pismo Beach
- Arroyo Grande
- Morro Bay
- Atascadero

### Service Keywords:

Combine services with locations:
- [Service] training Vancouver WA
- [Service] certification San Luis Obispo
- [Service] classes Clark County
- [Service] course SLO CA

Examples:
- "CPR training Vancouver WA"
- "BLS certification San Luis Obispo"
- "Lifeguard training Clark County"

---

## 🗺️ Structured Data Guide

### When to Use Each Schema:

#### Course Schema
Use for any training/certification page:
- BLS, CPR, First Aid, Lifeguarding
- Instructor training courses
- Specialized certifications

```typescript
import { getBLSCourseSchema } from "@/lib/structuredData";

const courseSchema = getBLSCourseSchema();
```

#### Breadcrumb Schema
Use on ALL pages except homepage:

```typescript
const breadcrumbSchema = getBreadcrumbSchema([
  { name: "Home", url: "https://tayloredinstruction.com" },
  { name: "Services" }, // No URL if current page
]);
```

#### FAQ Schema
Use when page has 3+ FAQs:

```typescript
import { getFAQSchema } from "@/lib/faqSchema";

const faqSchema = getFAQSchema([
  {
    question: "Your question here?",
    answer: "Detailed answer here."
  },
  // Add more FAQs...
]);
```

---

## 🎨 Image Optimization

### Next.js Image Component:
```typescript
import Image from "next/image";

<Image
  src="/image-path.jpg"
  alt="Descriptive alt text with location if relevant"
  width={1200}
  height={630}
  priority={false} // true only for above-fold images
  quality={85} // 75-85 is good balance
/>
```

### Alt Text Guidelines:
- Describe what's in the image
- Include location if relevant: "CPR training session in Vancouver WA"
- Keep under 125 characters
- Don't stuff keywords unnaturally
- Don't use "image of" or "picture of"

---

## 📊 Sitemap Configuration

When adding a new page, update `/app/sitemap.ts`:

```typescript
const routeConfig: Record<string, { priority: number; changeFrequency: ... }> = {
  // ... existing routes
  "/your-new-page": { priority: 0.8, changeFrequency: "monthly" },
};
```

### Priority Guide:
- `1.0` - Homepage only
- `0.95` - Main service pages
- `0.9` - About, Contact, Corporate
- `0.85` - Secondary services
- `0.8` - Instructor training
- `0.7` - Resources
- `0.3` - Legal pages

### Change Frequency Guide:
- `weekly` - Service pages with class schedules
- `monthly` - Informational pages
- `yearly` - Legal pages

---

## 🔒 Pages to Exclude

Add to robots.ts disallow list if page should NOT be indexed:

```typescript
disallow: [
  "/api/",
  "/admin/",
  "/my-account/",
  "/auth/",
  "/login/",
  "/private/",
  "/your-private-page/", // Add new exclusions
],
```

---

## ✅ Pre-Launch Checklist

Before deploying a new page:

1. **Metadata Complete**
   - [ ] Title under 60 characters
   - [ ] Description 150-160 characters
   - [ ] 10+ relevant keywords
   - [ ] Both locations mentioned

2. **Social Media**
   - [ ] Open Graph tags
   - [ ] Twitter Card tags
   - [ ] OG image exists (1200x630px)

3. **Technical**
   - [ ] Canonical URL set
   - [ ] H1 tag present and unique
   - [ ] Images have alt text
   - [ ] Internal links work

4. **Structured Data**
   - [ ] Breadcrumb schema added
   - [ ] Course/FAQ schema if applicable
   - [ ] Test with Google Rich Results Test

5. **Sitemap**
   - [ ] Page added to sitemap config
   - [ ] Priority set appropriately
   - [ ] Change frequency set

---

## 🧪 Testing

### Before Deployment:

1. **Google Rich Results Test**
   ```
   https://search.google.com/test/rich-results
   ```
   Paste your page URL to test structured data

2. **Mobile-Friendly Test**
   ```
   https://search.google.com/test/mobile-friendly
   ```

3. **Lighthouse SEO Audit**
   - Open Chrome DevTools
   - Go to Lighthouse tab
   - Run SEO audit
   - Aim for 90+ score

### After Deployment:

1. Check in Google Search Console (if set up)
2. Verify sitemap includes new page
3. Check robots.txt isn't blocking
4. Test social media sharing (LinkedIn, Facebook)

---

## 🚨 Common Mistakes to Avoid

1. ❌ **Duplicate Titles** - Every page needs unique title
2. ❌ **Duplicate Descriptions** - Every page needs unique description
3. ❌ **Missing Locations** - Always mention Vancouver WA & San Luis Obispo
4. ❌ **Keyword Stuffing** - Keep it natural and readable
5. ❌ **Missing Canonical** - Always set canonical URL
6. ❌ **No Alt Text** - Every image needs descriptive alt text
7. ❌ **Broken Internal Links** - Test all links before deploying
8. ❌ **Missing Breadcrumbs** - Add breadcrumb schema to all pages
9. ❌ **Forgetting Sitemap** - Update sitemap config for new pages
10. ❌ **Not Testing** - Always test with Google tools

---

## 📚 Quick Reference Links

- **Structured Data Library:** `/lib/structuredData.ts`
- **FAQ Schema Library:** `/lib/faqSchema.ts`
- **Sitemap Config:** `/app/sitemap.ts`
- **Robots Config:** `/app/robots.ts`
- **Root Layout:** `/app/layout.tsx`

---

## 💡 Pro Tips

1. **Location Mentions:** Aim for 3-5 location mentions per page naturally in content
2. **Keyword Density:** 1-2% keyword density (don't overdo it)
3. **First Paragraph:** Include primary keyword in first 100 words
4. **Headers:** Use H2/H3 tags with keywords when natural
5. **Mobile First:** Always check mobile display
6. **Loading Speed:** Keep pages under 3 seconds load time
7. **Internal Linking:** Link to 2-3 related pages per page

---

## 🤝 Need Help?

- Review existing pages for examples
- Check SEO-OPTIMIZATION-SUMMARY.md for overall strategy
- Test with Google tools before asking
- Follow this guide exactly for consistency

---

**Last Updated:** October 2025
