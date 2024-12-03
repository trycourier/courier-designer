/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@trycourier/react-editor"],
  experimental: {
    externalDir: true,
  },
};

module.exports = nextConfig;
