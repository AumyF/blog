// @ts-check

const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = async () => {
  const remarkGfm = await import("remark-gfm");
  return {
    reactStrictMode: true,
    experimental: { esmExternals: true },
    pageExtensions: ["mdx", "tsx"],
    /** @param {import("webpack").Configuration} config */
    webpack(config, options) {
      config.module?.rules?.push({
        test: /\.mdx$/,
        use: [
          options.defaultLoaders.babel,
          {
            loader: "@mdx-js/loader",
            /** @type {import("@mdx-js/loader").Options} */
            options: {
              providerImportSource: "@mdx-js/react",
              remarkPlugins: [remarkGfm.default],
            },
          },
          path.join(__dirname, "./loaders/mdx-loader.js"),
        ],
      });

      return config;
    },
  };
};

module.exports = nextConfig;
