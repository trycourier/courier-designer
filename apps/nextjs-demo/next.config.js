/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@trycourier/react-editor"],
  experimental: {
    externalDir: true,
  },
  webpack: (config, { isServer }) => {
    // Add alias for the CSS file
    config.resolve.alias["@trycourier/react-editor/styles.css"] =
      require.resolve("../../packages/react-editor/dist/styles.css");
    return config;
  },
};

module.exports = nextConfig;
