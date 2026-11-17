import type { MetadataRoute } from "next";
import { publicSiteUrl } from "@/lib/site";

/** Search engines read the shop's pages, not personal or admin ones. */
export default function robots(): MetadataRoute.Robots {
  const site = publicSiteUrl();
  const personal = ["admin", "account", "checkout", "order", "login", "pay"].flatMap((page) => [`/uz/${page}`, `/ru/${page}`]);
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", ...personal] },
    sitemap: `${site}/sitemap.xml`,
  };
}
