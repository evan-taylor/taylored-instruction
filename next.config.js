/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    images: {
        // domains: ['tayloredinstruction.com', 'www.tayloredinstruction.com'], // Deprecated
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'tayloredinstruction.com',
            },
            {
                protocol: 'https',
                hostname: 'www.tayloredinstruction.com',
            },
        ],
    },
};

module.exports = nextConfig; 