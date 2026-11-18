/**
 * Tells the shop what a customer searched for. The counts decide which
 * products lead the home page. Each search is told once per visit, so
 * reloading a results page does not count it again. Failures are ignored.
 */
export function reportSearch(report: { q: string } | { slug: string }): void {
  const key = `searched:${"q" in report ? `q:${report.q.trim().toLowerCase()}` : `p:${report.slug}`}`;
  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
  } catch {
    // No storage (private window): count it anyway.
  }
  fetch("/api/search/track", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(report),
    keepalive: true,
  }).catch(() => {});
}
