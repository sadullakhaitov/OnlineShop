import { NextResponse, type NextRequest } from "next/server";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { getCartProducts } from "@/lib/catalog";
import { MAX_LINES } from "@/lib/limits";

/** Current names, prices and availability of the products in a cart. */
export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const requested = params.get("locale");
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const ids = (params.get("ids") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, MAX_LINES * 2);

  return NextResponse.json({ products: getCartProducts(ids, locale) });
}
