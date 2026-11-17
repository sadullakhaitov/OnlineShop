import { NextResponse, type NextRequest } from "next/server";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { getCatalog } from "@/server/catalog";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const q = (params.get("q") ?? "").slice(0, 80);
  const requested = params.get("locale");
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  try {
    return NextResponse.json({ hits: (await getCatalog()).search(q, locale) });
  } catch (error) {
    console.error("Search failed", error);
    return NextResponse.json({ hits: [] }, { status: 500 });
  }
}
