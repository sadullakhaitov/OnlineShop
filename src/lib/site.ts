/**
 * The shop's public address for things made without a request: the sitemap,
 * links shared in messengers and search engines. SITE_URL wins; on Vercel the
 * production address is known by itself.
 */
export function publicSiteUrl(): string {
  const configured = process.env.SITE_URL;
  if (configured) return configured.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}
