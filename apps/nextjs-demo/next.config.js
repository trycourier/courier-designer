/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@trycourier/react-editor"],
  experimental: {
    externalDir: true,
  },
  webpack: (config, { isServer }) => {
    // Add alias for the package and CSS file
    config.resolve.alias["@trycourier/react-editor/styles.css"] =
      require.resolve("../../packages/react-editor/dist/styles.css");
    config.resolve.alias["@trycourier/react-editor"] = require.resolve(
      "../../packages/react-editor"
    );

    return config;
  },
};

module.exports = nextConfig;
