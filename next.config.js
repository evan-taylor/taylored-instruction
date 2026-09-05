/** @type {import('next').NextConfig} */
const nextConfig = {
  cacheComponents: true, // Enable Cache Components (PPR) for Next.js 16
  compress: true, // Enable gzip compression
  experimental: {
    webpackMemoryOptimizations: true,
  },
  // Headers for better SEO and security
  async headers() {
    const contentSecurityPolicy = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.vercel-insights.com https://*.posthog.com https://us.i.posthog.com https://us-assets.i.posthog.com https://*.sentry.io https://*.ingest.sentry.io https://*.convex.cloud https://*.sanity.io https://*.apicdn.sanity.io https://core.sanity-cdn.com https://assets.apollo.io https://cdn.visitors.now https://assets.onedollarstats.com https://embed.typeform.com https://vancouverusa.chambermaster.com https://*.cal.com",
      "connect-src 'self' https://*.vercel-insights.com https://*.posthog.com https://us.i.posthog.com https://*.sentry.io https://*.ingest.sentry.io https://*.convex.cloud https://*.sanity.io https://*.apicdn.sanity.io https://*.api.sanity.io wss://*.api.sanity.io https://cdn.sanity.io https://sanity-cdn.com https://assets.apollo.io https://cdn.visitors.now https://assets.onedollarstats.com",
      "img-src 'self' data: blob: https:",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "frame-src 'self' https://cap.so https://www.loom.com https://embed.typeform.com https://*.cal.com",
      "worker-src 'self' blob:",
    ];
    const sharedSecurityHeaders = [
      {
        key: "X-DNS-Prefetch-Control",
        value: "on",
      },
      {
        key: "X-Content-Type-Options",
        value: "nosniff",
      },
      {
        key: "Referrer-Policy",
        value: "origin-when-cross-origin",
      },
      {
        key: "Strict-Transport-Security",
        value: "max-age=31536000; includeSubDomains",
      },
      {
        key: "Cross-Origin-Opener-Policy",
        value: "same-origin",
      },
    ];
    const securityHeaders = [
      ...sharedSecurityHeaders,
      {
        key: "Content-Security-Policy",
        value: "frame-ancestors 'self'",
      },
      {
        key: "X-Frame-Options",
        value: "SAMEORIGIN",
      },
      {
        key: "Content-Security-Policy-Report-Only",
        value: contentSecurityPolicy.join("; "),
      },
    ];
    const studioSecurityHeaders = [
      ...sharedSecurityHeaders,
      {
        key: "Content-Security-Policy",
        value:
          "frame-ancestors 'self' https://www.sanity.io https://sanity.io https://*.sanity.io",
      },
      {
        key: "Content-Security-Policy-Report-Only",
        value: contentSecurityPolicy.join("; "),
      },
    ];

    return [
      {
        headers: studioSecurityHeaders,
        source: "/admin/studio/:path*",
      },
      {
        headers: securityHeaders,
        source: "/((?!admin/studio).*)",
      },
    ];
  },
  images: {
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840], // Responsive breakpoints
    formats: ["image/avif", "image/webp"], // Modern image formats
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384], // Image size options
    minimumCacheTTL: 60, // Cache images for 60 seconds minimum
    // domains: ['tayloredinstruction.com', 'www.tayloredinstruction.com'], // Deprecated
    remotePatterns: [
      {
        hostname: "tayloredinstruction.com",
        protocol: "https",
      },
      {
        hostname: "www.tayloredinstruction.com",
        protocol: "https",
      },
    ],
  },
  poweredByHeader: false, // Remove X-Powered-By header for security
  // Avoid browser source map requests (404s). Sentry receives maps via build upload.
  productionBrowserSourceMaps: false,
  reactStrictMode: true,
  async redirects() {
    return [
      // Canonical host redirect: www -> apex.
      {
        destination: "https://tayloredinstruction.com/:path*",
        has: [
          {
            type: "host",
            value: "www.tayloredinstruction.com",
          },
        ],
        permanent: true,
        source: "/:path*",
      },

      // Legacy WordPress feed/admin URLs.
      {
        destination: "/",
        permanent: true,
        source: "/feed/:path*",
      },
      {
        destination: "/",
        permanent: true,
        source: "/comments/feed/:path*",
      },
      {
        destination: "/about",
        permanent: true,
        source: "/author/admin/:path*",
      },
      {
        destination: "/terms",
        permanent: true,
        source: "/refund_returns/:path*",
      },
      {
        destination: "/",
        permanent: true,
        source: "/wp-json/:path*",
      },

      // Legacy commerce URLs from the previous site.
      {
        destination: "/aeds",
        permanent: true,
        source: "/shop/cardiac-science-powerheart-g5/:path*",
      },
      {
        destination: "/heartsaver",
        permanent: true,
        source: "/shop/heartsaver-total-online/:path*",
      },
      {
        destination: "/bls",
        permanent: true,
        source:
          "/product-category/american-heart-association/bls-provider/:path*",
      },
      {
        destination: "/heartsaver",
        permanent: true,
        source:
          "/product-category/american-heart-association/heartsaver/:path*",
      },
      {
        destination: "/aeds",
        permanent: true,
        source: "/product-category/aed/zoll/:path*",
      },
      {
        destination: "/aha-instructor-training",
        permanent: true,
        source: "/product-tag/instructors/:path*",
      },
      {
        destination: "/aeds",
        permanent: true,
        source: "/product-tag/heartsine/:path*",
      },

      // Legacy document URLs now handled via contact flow.
      {
        destination: "/contact",
        permanent: true,
        source: "/BLS-Fact-Sheet.pdf",
      },
      {
        destination: "/contact",
        permanent: true,
        source: "/BLS-Participant-Manual.pdf",
      },
      {
        destination: "/contact",
        permanent: true,
        source: "/First-Aid-CPR-AED-Fact-Sheet.pdf",
      },
      {
        destination: "/contact",
        permanent: true,
        source: "/First-Aid-CPR-AED-Manual.pdf",
      },
      {
        destination: "/contact",
        permanent: true,
        source: "/First-Aid-CPR-AED-Instructor-Fact-Sheet.pdf",
      },
      {
        destination: "/contact",
        permanent: true,
        source: "/First-Aid-CPR-AED-Instructor-Manual-Dec-2021.pdf",
      },
      {
        destination: "/contact",
        permanent: true,
        source: "/Practice-Teaching-Workbook.pdf",
      },
      {
        destination: "/contact",
        permanent: true,
        source: "/Lifeguarding-Fact-Sheet.pdf",
      },
      {
        destination: "/contact",
        permanent: true,
        source: "/LG-Ebook-Link-r.24.pdf",
      },
      {
        destination: "/contact",
        permanent: true,
        source: "/Instructor-Candidate-Application.pdf",
      },
      {
        destination: "/contact",
        permanent: true,
        source:
          "/wp-content/uploads/2024/12/Instructor-Candidate-Application.pdf",
      },
      {
        destination: "/contact",
        permanent: true,
        source:
          "/wp-content/uploads/2024/11/Instructor-Candidate-Application.pdf",
      },
      {
        destination: "/contact",
        permanent: true,
        source: "/wp-content/uploads/2024/09/First-Aid-CPR-AED-Fact-Sheet.pdf",
      },
    ];
  },
};

module.exports = nextConfig;

// Injected content via Sentry wizard below

const { withSentryConfig } = require("@sentry/nextjs");

const sentryOrg = process.env.SENTRY_ORG;
const sentryProject = process.env.SENTRY_PROJECT;
const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN;
const sentryUploadEnabled = Boolean(
  sentryOrg && sentryProject && sentryAuthToken
);

module.exports = sentryUploadEnabled
  ? withSentryConfig(module.exports, {
      authToken: sentryAuthToken,

      // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
      // See the following for more information:
      // https://docs.sentry.io/product/crons/
      // https://vercel.com/docs/cron-jobs
      automaticVercelMonitors: true,

      // Automatically tree-shake Sentry logger statements to reduce bundle size
      disableLogger: true,
      // For all available options, see:
      // https://www.npmjs.com/package/@sentry/webpack-plugin#options
      org: sentryOrg,
      project: sentryProject,

      // Only print logs for uploading source maps in CI
      silent: !process.env.CI,

      // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
      // This can increase your server load as well as your hosting bill.
      // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
      // side errors will fail.
      tunnelRoute: "/monitoring",

      // For all available options, see:
      // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

      // Upload a larger set of source maps for prettier stack traces (increases build time)
      widenClientFileUpload: true,
    })
  : module.exports;
