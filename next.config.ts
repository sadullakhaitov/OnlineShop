import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  // The embedded local database ships WebAssembly files that must be loaded
  // from node_modules rather than bundled.
  serverExternalPackages: ["@electric-sql/pglite"],
  // Pages with products are prepared ahead and refreshed every five minutes
  // (`revalidate = 300` in those pages) or at once when the admin changes a
  // product. By default browsers and CDNs would be told they may keep showing
  // an old copy for up to a year while they fetch a new one; with this they
  // are told to ask the shop again, so nobody is shown yesterday's price.
  expireTime: 300,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
