/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core", "puppeteer"],
};

export default nextConfig;

