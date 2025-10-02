/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false, // Remove X-Powered-By header for security
  compress: true, // Enable gzip compression
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
    // biome-ignore lint/style/useNamingConvention: Next.js config uses this naming
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
};

module.exports = nextConfig;
