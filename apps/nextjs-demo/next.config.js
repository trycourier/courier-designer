/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@trycourier/react-editor"],
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ".js": [".js", ".ts", ".tsx"],
    };
    return config;
  },
};

module.exports = nextConfig;
