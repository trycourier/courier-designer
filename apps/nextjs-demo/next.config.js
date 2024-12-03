/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@trycourier/react-editor"],
  experimental: {
    externalDir: true,
  },
  webpack: (config, { isServer }) => {
    // Resolve local packages
    config.resolve.alias["@trycourier/react-editor"] = require.resolve(
      "../../packages/react-editor"
    );
    return config;
  },
};

module.exports = nextConfig;
