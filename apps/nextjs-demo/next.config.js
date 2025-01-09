/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@trycourier/courier-editor"],
  env: {
    NEXT_PUBLIC_IMAGE_PLACEHOLDER_URL:
      process.env.NEXT_PUBLIC_IMAGE_PLACEHOLDER_URL,
  },
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ".js": [".js", ".ts", ".tsx"],
    };
    return config;
  },
  optimizeFonts: false
};

module.exports = nextConfig;
