/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false, // Remove X-Powered-By header for security
  compress: true, // Enable gzip compression
  cacheComponents: true, // Enable Cache Components (PPR) for Next.js 16
  images: {
    // domains: ['tayloredinstruction.com', 'www.tayloredinstruction.com'], // Deprecated
    remotePatterns: [
      {
        protocol: "https",
        hostname: "tayloredinstruction.com",
      },
      {
        protocol: "https",
        hostname: "www.tayloredinstruction.com",
      },
    ],
    formats: ["image/avif", "image/webp"], // Modern image formats
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840], // Responsive breakpoints
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384], // Image size options
    minimumCacheTTL: 60, // Cache images for 60 seconds minimum
  },
  // Headers for better SEO and security
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // Canonical host redirect: www -> apex.
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "www.tayloredinstruction.com",
          },
        ],
        destination: "https://tayloredinstruction.com/:path*",
        permanent: true,
      },

      // Legacy WordPress feed/admin URLs.
      {
        source: "/feed/:path*",
        destination: "/",
        permanent: true,
      },
      {
        source: "/comments/feed/:path*",
        destination: "/",
        permanent: true,
      },
      {
        source: "/author/admin/:path*",
        destination: "/about",
        permanent: true,
      },
      {
        source: "/refund_returns/:path*",
        destination: "/terms",
        permanent: true,
      },
      {
        source: "/wp-json/:path*",
        destination: "/",
        permanent: true,
      },

      // Legacy commerce URLs from the previous site.
      {
        source: "/shop/cardiac-science-powerheart-g5/:path*",
        destination: "/aeds",
        permanent: true,
      },
      {
        source: "/shop/heartsaver-total-online/:path*",
        destination: "/heartsaver",
        permanent: true,
      },
      {
        source:
          "/product-category/american-heart-association/bls-provider/:path*",
        destination: "/bls",
        permanent: true,
      },
      {
        source:
          "/product-category/american-heart-association/heartsaver/:path*",
        destination: "/heartsaver",
        permanent: true,
      },
      {
        source: "/product-category/aed/zoll/:path*",
        destination: "/aeds",
        permanent: true,
      },
      {
        source: "/product-tag/instructors/:path*",
        destination: "/aha-instructor-training",
        permanent: true,
      },
      {
        source: "/product-tag/heartsine/:path*",
        destination: "/aeds",
        permanent: true,
      },

      // Legacy document URLs now handled via contact flow.
      {
        source: "/BLS-Fact-Sheet.pdf",
        destination: "/contact",
        permanent: true,
      },
      {
        source: "/BLS-Participant-Manual.pdf",
        destination: "/contact",
        permanent: true,
      },
      {
        source: "/First-Aid-CPR-AED-Fact-Sheet.pdf",
        destination: "/contact",
        permanent: true,
      },
      {
        source: "/First-Aid-CPR-AED-Manual.pdf",
        destination: "/contact",
        permanent: true,
      },
      {
        source: "/First-Aid-CPR-AED-Instructor-Fact-Sheet.pdf",
        destination: "/contact",
        permanent: true,
      },
      {
        source: "/First-Aid-CPR-AED-Instructor-Manual-Dec-2021.pdf",
        destination: "/contact",
        permanent: true,
      },
      {
        source: "/Practice-Teaching-Workbook.pdf",
        destination: "/contact",
        permanent: true,
      },
      {
        source: "/Lifeguarding-Fact-Sheet.pdf",
        destination: "/contact",
        permanent: true,
      },
      {
        source: "/LG-Ebook-Link-r.24.pdf",
        destination: "/contact",
        permanent: true,
      },
      {
        source: "/Instructor-Candidate-Application.pdf",
        destination: "/contact",
        permanent: true,
      },
      {
        source:
          "/wp-content/uploads/2024/12/Instructor-Candidate-Application.pdf",
        destination: "/contact",
        permanent: true,
      },
      {
        source:
          "/wp-content/uploads/2024/11/Instructor-Candidate-Application.pdf",
        destination: "/contact",
        permanent: true,
      },
      {
        source: "/wp-content/uploads/2024/09/First-Aid-CPR-AED-Fact-Sheet.pdf",
        destination: "/contact",
        permanent: true,
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
      // For all available options, see:
      // https://www.npmjs.com/package/@sentry/webpack-plugin#options
      org: sentryOrg,
      project: sentryProject,
      authToken: sentryAuthToken,

      // Only print logs for uploading source maps in CI
      silent: !process.env.CI,

      // For all available options, see:
      // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

      // Upload a larger set of source maps for prettier stack traces (increases build time)
      widenClientFileUpload: true,

      // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
      // This can increase your server load as well as your hosting bill.
      // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
      // side errors will fail.
      tunnelRoute: "/monitoring",

      // Automatically tree-shake Sentry logger statements to reduce bundle size
      disableLogger: true,

      // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
      // See the following for more information:
      // https://docs.sentry.io/product/crons/
      // https://vercel.com/docs/cron-jobs
      automaticVercelMonitors: true,
    })
  : module.exports;
