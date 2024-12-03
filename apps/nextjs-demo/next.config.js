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
    // Add alias for CSS file
    config.resolve.alias["@trycourier/react-editor/styles.css"] =
      require.resolve("../../packages/react-editor/dist/styles.css");
    return config;
  },
};

module.exports = nextConfig;
