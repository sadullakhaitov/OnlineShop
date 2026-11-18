import { NextResponse, type NextRequest } from "next/server";
import { databaseKind, getDb } from "@/db";
import { getCatalog } from "@/server/catalog";
import { addressHash, isSameOrigin, readJson } from "@/server/http";
import { allowAttempt } from "@/server/rate-limit";
import { recordOpened, recordSearch } from "@/server/search-interest";

/**
 * The shop's pages report what customers search for: `{ q }` for a search,
 * `{ slug }` for a product opened from the results. The counts decide which
 * products lead the home page.
 */
export async function POST(request: NextRequest) {
  // Without a database there is nowhere to count.
  if (databaseKind() === "none") return NextResponse.json({ ok: false });
  if (!isSameOrigin(request)) return NextResponse.json({ ok: false }, { status: 403 });
  // One visitor counts a limited number of times, so nobody can push a product up alone.
  if (!allowAttempt(`search:${addressHash(request) ?? "unknown"}`, 30, 3_600_000)) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }
  const body = (await readJson(request, 1_000)) as { q?: unknown; slug?: unknown } | null;
  try {
    const db = await getDb();
    const catalog = await getCatalog();
    if (typeof body?.slug === "string") await recordOpened(db, catalog, body.slug.slice(0, 120));
    else if (typeof body?.q === "string") await recordSearch(db, catalog, body.q);
    else return NextResponse.json({ ok: false }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Search count failed", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
