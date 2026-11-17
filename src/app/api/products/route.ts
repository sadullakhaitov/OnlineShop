import { NextResponse, type NextRequest } from "next/server";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { MAX_LINES } from "@/lib/limits";
import { getCatalog } from "@/server/catalog";

/** Current names, prices and availability of the products in a cart. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const requested = params.get("locale");
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const ids = (params.get("ids") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, MAX_LINES * 2);

  try {
    return NextResponse.json({ products: (await getCatalog()).cartProducts(ids, locale) });
  } catch (error) {
    // The cart shows "could not load" with a retry button.
    console.error("Cart products were not loaded", error);
    return NextResponse.json({ products: [] }, { status: 500 });
  }
}
