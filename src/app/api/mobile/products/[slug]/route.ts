import { NextResponse, type NextRequest } from "next/server";
import { getTranslations } from "next-intl/server";
import { kinds } from "@/data/products";
import { getCatalog } from "@/server/catalog";
import { localeParam, toMobileProduct } from "@/server/mobile/views";

/** One product with its specifications and similar products. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = localeParam(request.nextUrl.searchParams.get("locale"));
  try {
    const catalog = await getCatalog();
    const product = catalog.bySlug(slug);
    if (!product) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const t = await getTranslations({ locale });
    return NextResponse.json({
      product: {
        ...toMobileProduct(product, locale),
        about: kinds[product.art].about[locale],
        color: t(`colors.${product.color}`),
        warranty: product.warranty,
        specs: Object.entries(product.specs).map(([key, value]) => ({ label: t(`spec.${key}`), value: value![locale] })),
      },
      related: catalog.related(product, 8).map((item) => toMobileProduct(item, locale)),
    });
  } catch (error) {
    console.error("Mobile product failed", error);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
