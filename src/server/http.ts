import { hashAddress } from "./auth";

/**
 * Browsers attach an Origin header to requests that change something. When it
 * names another site, the request did not come from our pages: refuse it.
 * Requests without the header (apps, scripts) carry no browser cookies.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** Fingerprint of the caller's address for rate limits; null when it is unknown. */
export function addressHash(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = forwarded || request.headers.get("x-real-ip");
  return address ? hashAddress(address) : null;
}

/** Reads a JSON body of a sensible size; null when it is missing or broken. */
export async function readJson(request: Request, limit = 20_000): Promise<unknown> {
  try {
    const text = await request.text();
    if (text.length > limit) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}
