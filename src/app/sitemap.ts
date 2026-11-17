import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { publicSiteUrl } from "@/lib/site";
import { readCatalog } from "@/server/catalog";

/** Rebuilt with the catalogue: a saved product refreshes it like the pages. */
export const revalidate = 3600;

const pages = ["", "/catalog", "/delivery", "/warranty", "/faq", "/about", "/contacts", "/offer", "/privacy"];

/** Every public page in both languages, each pointing at its other-language twin. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = publicSiteUrl();
  const products = (await readCatalog()).all().map((product) => `/product/${product.slug}`);
  return [...pages, ...products].flatMap((path) =>
    routing.locales.map((locale) => ({
      url: `${site}/${locale}${path}`,
      changeFrequency: path.startsWith("/product") || path === "/catalog" ? ("daily" as const) : ("monthly" as const),
      priority: path === "" ? 1 : path.startsWith("/product") ? 0.8 : 0.5,
      alternates: { languages: Object.fromEntries(routing.locales.map((other) => [other, `${site}/${other}${path}`])) },
    })),
  );
}
