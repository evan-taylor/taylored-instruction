# SEO Quick Reference Guide - Taylored Instruction

## 🎯 Primary Target Keywords

### Must Rank #1 For:
1. **CPR training Vancouver WA**
2. **BLS certification Vancouver WA**
3. **First Aid training Vancouver WA**
4. **Lifeguard certification Vancouver WA**

### Secondary Priority (#1-3):
- AHA BLS Vancouver WA
- Red Cross training Vancouver
- Corporate CPR training Vancouver
- Heartsaver certification Vancouver

---

## 📍 Geographic Targets

### Primary Markets
- **Vancouver, WA** (Year-round)
- **San Luis Obispo, CA** (Seasonal)

### Service Areas
**Washington:** Battle Ground, Camas, Washougal, Ridgefield, La Center, Woodland, Portland (OR)
**California:** Pismo Beach, Morro Bay, Arroyo Grande, Atascadero

---

## 🔧 Key Files Modified

```
/workspace/
├── lib/seo/schemas.ts          # JSON-LD schema utilities
├── app/layout.tsx               # Global meta tags & schemas
├── app/sitemap.ts              # Dynamic sitemap
├── app/robots.ts               # Robots.txt rules
├── app/page.tsx                # Homepage
├── app/bls/page.tsx            # BLS page
├── app/first-aid-cpr-aed/page.tsx
├── app/lifeguarding/page.tsx
├── app/heartsaver/page.tsx
├── app/corporate-training/page.tsx
├── app/about/page.tsx
├── app/contact/page.tsx
├── app/aeds/page.tsx
├── app/aha-instructor-training/page.tsx
├── app/fa-cpr-aed-instructor/page.tsx
├── app/lifeguarding-instructor/page.tsx
├── app/basic-life-support/page.tsx
└── app/alignment/page.tsx
```

---

## 📊 Schema Types Implemented

### Global (Root Layout)
- Organization Schema
- LocalBusiness Schema (Vancouver)
- LocalBusiness Schema (San Luis Obispo)

### Page-Specific
- **Course Schema**: BLS, First Aid, Lifeguarding, Heartsaver
- **Breadcrumb Schema**: All course pages
- **FAQ Schema**: Homepage, BLS, First Aid, Lifeguarding, Heartsaver

---

## 🚀 Post-Deployment Actions

### Critical (Do First)
1. Submit sitemap to Google Search Console
2. Verify Google Business Profiles (both locations)
3. Set up Google Analytics 4
4. Check all pages indexed
5. Validate structured data

### Important (Week 1)
1. Build local citations
2. Request initial reviews
3. Monitor Search Console for errors
4. Check mobile usability
5. Verify Core Web Vitals

---

## 📈 Success Metrics

### Month 1 Targets
- All pages indexed
- Rich snippets appearing
- 10+ local citations
- 5+ Google reviews

### Month 3 Targets
- Top 10 for primary keywords
- 50% increase in organic traffic
- Local pack appearance
- Featured snippets

### Month 6 Targets
- Top 3 for primary keywords
- 100% increase in organic traffic
- Consistent lead generation
- Market leader status

---

## 🔍 Quick SEO Audit Commands

```bash
# Check sitemap
curl https://tayloredinstruction.com/sitemap.xml

# Check robots.txt
curl https://tayloredinstruction.com/robots.txt

# Validate structured data
# Use: https://search.google.com/test/rich-results

# Check page speed
# Use: https://pagespeed.web.dev/
```

---

## 💡 Content Guidelines

### Every Page Must Have:
- Location in title (Vancouver WA or San Luis Obispo CA)
- 150-160 char meta description
- 10+ relevant keywords
- Canonical URL
- Open Graph tags
- At least one schema

### Title Formula
`[Service] Vancouver WA | [Benefit/Organization] - Taylored Instruction`

### Description Formula
`[Service] in Vancouver WA [+ surrounding cities]. [Benefit]. [Credentials]. Serving [service areas].`

---

## 📞 NAP (Name, Address, Phone)

**Keep Consistent Everywhere:**

```
Taylored Instruction
Vancouver, WA
(360) 207-1844
evan@tayloredinstruction.com
https://tayloredinstruction.com
```

---

## 🎨 Schema Code Snippets

### Adding Course Schema
```typescript
const courseSchema = getCourseSchema(
  "Course Name",
  "Course description",
  "Certification Name",
  "PT4H", // Duration
  "Organization Name"
);
```

### Adding Breadcrumb Schema
```typescript
const breadcrumbSchema = getBreadcrumbSchema([
  { name: "Home", url: "https://tayloredinstruction.com" },
  { name: "Page Name", url: "https://tayloredinstruction.com/page" },
]);
```

### Adding FAQ Schema
```typescript
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Question?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Answer text."
      }
    }
  ]
};
```

---

## 🛠️ Common Tasks

### Add New Page
1. Copy metadata from similar page
2. Update title with location
3. Update description (150-160 chars)
4. Update keywords array
5. Add relevant schema
6. Update sitemap priority if needed

### Update Existing Page
1. Keep title format consistent
2. Maintain keyword focus
3. Don't change canonical URL
4. Update lastModified in sitemap
5. Preserve schema structure

### Fix SEO Issue
1. Check Search Console
2. Validate structured data
3. Check meta tags
4. Verify canonical URLs
5. Test mobile experience

---

## ⚠️ Common Mistakes to Avoid

❌ Don't change URLs without redirects
❌ Don't duplicate title tags
❌ Don't stuff keywords
❌ Don't forget alt text on images
❌ Don't skip meta descriptions
❌ Don't use generic titles
❌ Don't ignore mobile optimization
❌ Don't forget to update sitemap

✅ Do use location keywords naturally
✅ Do write for users first
✅ Do optimize images
✅ Do maintain NAP consistency
✅ Do monitor Search Console
✅ Do build quality backlinks
✅ Do encourage reviews
✅ Do create quality content

---

## 📚 Resources

### SEO Tools
- Google Search Console: https://search.google.com/search-console
- Rich Results Test: https://search.google.com/test/rich-results
- PageSpeed Insights: https://pagespeed.web.dev/
- Schema Validator: https://validator.schema.org/

### Documentation
- Next.js Metadata: https://nextjs.org/docs/app/building-your-application/optimizing/metadata
- Schema.org: https://schema.org/
- Open Graph: https://ogp.me/

---

## 📞 Support

For SEO questions or issues:
1. Check this documentation
2. Review SEO_OPTIMIZATION_SUMMARY.md
3. Consult SEO_CHECKLIST.md
4. Test with validation tools
5. Monitor Search Console

---

**Last Updated**: [Current Date]
**Version**: 1.0
**Maintained By**: Development Team

---

## 🎉 Optimization Complete!

Your site is now fully optimized for:
✅ Search engines (Google, Bing)
✅ Local search (Vancouver WA, San Luis Obispo CA)
✅ Rich snippets and featured snippets
✅ Voice search
✅ Mobile search
✅ Social media sharing

**Next**: Submit to search engines and start monitoring!
