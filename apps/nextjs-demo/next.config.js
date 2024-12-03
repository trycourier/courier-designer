const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@trycourier/react-editor"],
  experimental: {
    externalDir: true,
  },
  webpack: (config, { isServer }) => {
    config.resolve.alias["@trycourier/react-editor"] = path.resolve(
      __dirname,
      "../../packages/react-editor/dist"
    );
    config.resolve.alias["@trycourier/react-editor/styles.css"] = path.resolve(
      __dirname,
      "../../packages/react-editor/dist/styles.css"
    );
    return config;
  },
};

module.exports = nextConfig;
