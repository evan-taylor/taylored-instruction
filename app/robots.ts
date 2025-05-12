import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/api/', // Example: Disallow crawling of API routes
    },
    sitemap: 'https://tayloredinstruction.com/sitemap.xml',
  }
} 