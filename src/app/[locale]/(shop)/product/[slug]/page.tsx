import { ViewTransition } from "react";
import type { Metadata } from "next";
import { CreditCard, RotateCcw, ShieldCheck, Star, Truck } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { kinds, type SpecKey } from "@/data/products";
import { routing, type Locale } from "@/i18n/routing";
import { getCategory } from "@/lib/catalog";
import { publicSiteUrl } from "@/lib/site";
import { discountPercent, formatDay, formatPrice } from "@/lib/format";
import { enterDelay, productArtName } from "@/lib/motion";
import { getBuildSlugs, readCatalog } from "@/server/catalog";
import { readProductReviews } from "@/server/reviews";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { FavoriteButton } from "@/components/favorites/FavoriteButton";
import { ProductArt } from "@/components/product/ProductArt";
import { ProductCard } from "@/components/product/ProductCard";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Reveal } from "@/components/ui/Reveal";

// A product page is made once and kept ready: while building for the products
// known then, on the first visit for the others. The admin panel refreshes it
// when a product changes; this is the fallback for changes made elsewhere, in
// seconds. A page that is kept ready cannot ask for the request, which is why
// it reads the catalogue with `readCatalog`.
export const revalidate = 300;

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateStaticParams() {
  const slugs = await getBuildSlugs();
  return routing.locales.flatMap((locale) => slugs.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const product = (await readCatalog()).bySlug(slug);
  if (!product) return {};
  const kind = kinds[product.art];
  const title = `${kind.name[locale as Locale]} ${product.title} — Multimedia`;
  return {
    title,
    description: kind.about[locale as Locale],
    alternates: { languages: { uz: `/uz/product/${slug}`, ru: `/ru/product/${slug}` } },
    // Shared in Telegram or elsewhere, the link shows the product's photo.
    openGraph: { title, description: kind.about[locale as Locale], images: product.image ? [product.image] : undefined },
  };
}

export default async function ProductPage({ params }: Props) {
  const { locale: rawLocale, slug } = await params;
  const locale = rawLocale as Locale;
  setRequestLocale(locale);

  const catalog = await readCatalog();
  const product = catalog.bySlug(slug);
  if (!product) notFound();

  const t = await getTranslations();
  const kind = kinds[product.art];
  const category = getCategory(product.category);
  const discount = discountPercent(product.price, product.oldPrice);
  const related = catalog.related(product, 5);
  const reviews = product.reviews > 0 ? await readProductReviews(product.id) : [];

  const specs: [string, string][] = [
    [t("productPage.brand"), product.brand],
    ...(Object.entries(product.specs) as [SpecKey, Record<Locale, string>][]).map(
      ([key, value]): [string, string] => [t(`spec.${key}`), value[locale]],
    ),
    [t("productPage.color"), t(`colors.${product.color}`)],
    [t("productPage.warranty"), t("productPage.warrantyValue", { years: product.warranty })],
  ];

  const perks = [
    { icon: Truck, text: t("productPage.perks.delivery") },
    { icon: ShieldCheck, text: t("productPage.perks.warranty", { years: product.warranty }) },
    { icon: CreditCard, text: t("productPage.perks.payment") },
    { icon: RotateCcw, text: t("productPage.perks.returns") },
  ];

  // What search engines show beside the link: price, stock and rating.
  const structured = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    brand: { "@type": "Brand", name: product.brand },
    category: kind.name[locale],
    description: kind.about[locale],
    ...(product.image ? { image: product.image } : {}),
    ...(reviews.length > 0
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: product.rating, reviewCount: product.reviews } }
      : {}),
    offers: {
      "@type": "Offer",
      priceCurrency: "UZS",
      price: product.price,
      availability: product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `${publicSiteUrl()}/${locale}/product/${product.slug}`,
    },
  };

  return (
    <div className="flex flex-col gap-5 pt-5 sm:pt-7">
      <script
        type="application/ld+json"
        // The values are the shop's own data; "<" is escaped so no text can close the tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structured).replace(/</g, "\\u003c") }}
      />
      <Breadcrumbs
        items={[
          { label: t("productPage.home"), href: "/" },
          { label: t("catalog.title"), href: "/catalog" },
          ...(category
            ? [{ label: category.name[locale], href: { pathname: "/catalog", query: { category: category.slug } } }]
            : []),
          { label: product.title },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-5">
        <div className="glass glass-sheen enter relative overflow-hidden rounded-[1.75rem] p-3 lg:sticky lg:top-24 lg:self-start">
          <div className="tile relative grid aspect-square place-items-center rounded-[1.375rem] sm:aspect-[4/3] lg:aspect-square">
            <div className="absolute left-4 top-4 z-10 flex gap-2">
              {product.badge && (
                <span className="rounded-full bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent backdrop-blur-md">
                  {t(`product.${product.badge}`)}
                </span>
              )}
              {discount > 0 && (
                <span className="rounded-full bg-btn px-3 py-1.5 text-xs font-semibold text-btn-text">−{discount}%</span>
              )}
            </div>
            <ViewTransition name={productArtName(product.id)} share="morph" default="none">
              <ProductArt
                kind={product.art}
                image={product.image}
                alt={product.title}
                eager
                className={`float h-[72%] w-[72%] drop-shadow-2xl ${product.inStock ? "" : "opacity-50 grayscale"}`}
              />
            </ViewTransition>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <section style={enterDelay(80)} className="glass enter rounded-[1.75rem] p-6 sm:p-8">
            <p className="text-sm text-muted">{kind.name[locale]}</p>
            <h1 className="mt-1 text-[1.75rem] font-semibold leading-tight sm:text-4xl">{product.title}</h1>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
              {product.reviews > 0 && (
                <span className="flex items-center gap-1.5">
                  <Star className="size-4 fill-accent text-accent" strokeWidth={0} />
                  <span className="font-semibold text-ink">{product.rating.toFixed(1)}</span>
                  {t("product.reviews", { count: product.reviews })}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <span className={`size-2 rounded-full ${product.inStock ? "bg-emerald-500" : "bg-faint"}`} />
                {!product.inStock
                  ? t("productPage.outOfStock")
                  : product.stock !== undefined && product.stock <= 5
                    ? t("productPage.fewLeft", { count: product.stock })
                    : t("productPage.inStock")}
              </span>
              <span className="text-faint">{t("productPage.sku", { id: product.id.toUpperCase() })}</span>
            </div>

            <div className="mt-6 border-t border-hairline pt-6">
              {product.oldPrice && (
                <p className="text-sm tabular-nums text-faint line-through">
                  {formatPrice(product.oldPrice)} {t("product.currency")}
                </p>
              )}
              <p className="text-[2rem] font-semibold tabular-nums leading-tight tracking-tight sm:text-[2.5rem]">
                {formatPrice(product.price)}{" "}
                <span className="text-base font-medium text-muted">{t("product.currency")}</span>
              </p>
              {product.oldPrice && (
                <p className="mt-1 text-sm font-medium text-accent">
                  {t("productPage.economy", { amount: formatPrice(product.oldPrice - product.price) })}
                </p>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <AddToCartButton productId={product.id} inStock={product.inStock} variant="full" />
              <FavoriteButton productId={product.id} variant="full" />
            </div>

            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {perks.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-[0.8125rem] leading-snug text-muted">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
                    <Icon className="size-[1.125rem]" strokeWidth={1.7} />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </section>

          <section style={enterDelay(160)} className="glass enter rounded-[1.75rem] p-6 sm:p-8">
            <h2 className="text-lg font-semibold">{t("productPage.about")}</h2>
            <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted">{kind.about[locale]}</p>
          </section>

          <section style={enterDelay(240)} className="glass enter rounded-[1.75rem] p-6 sm:p-8">
            <h2 className="text-lg font-semibold">{t("productPage.specs")}</h2>
            <dl className="mt-3 divide-y divide-hairline">
              {specs.map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-6 py-3 text-sm">
                  <dt className="text-muted">{label}</dt>
                  <dd className="text-right font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {reviews.length > 0 && (
            <section id="reviews" style={enterDelay(320)} className="glass enter rounded-[1.75rem] p-6 sm:p-8">
              <h2 className="flex items-baseline justify-between gap-4 text-lg font-semibold">
                {t("productPage.reviewsTitle")}
                <span className="flex items-center gap-1.5 text-sm font-medium text-muted">
                  <Star className="size-4 fill-accent text-accent" strokeWidth={0} />
                  <span className="font-semibold text-ink">{product.rating.toFixed(1)}</span>
                  {t("product.reviews", { count: product.reviews })}
                </span>
              </h2>
              <ul className="mt-3 divide-y divide-hairline">
                {reviews.map((review) => (
                  <li key={review.id} className="py-4">
                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                      <p className="text-sm font-semibold">
                        {review.name}
                        <span className="ml-2 text-xs font-normal text-muted">{t("productPage.reviewsBought")}</span>
                      </p>
                      <time dateTime={review.date} className="text-xs tabular-nums text-faint">
                        {formatDay(new Date(review.date), locale)}
                      </time>
                    </div>
                    <p className="mt-1 flex gap-0.5" aria-label={t("review.starLabel", { count: review.rating })}>
                      {[1, 2, 3, 4, 5].map((value) => (
                        <Star
                          key={value}
                          aria-hidden="true"
                          className={`size-3.5 ${value <= review.rating ? "fill-accent text-accent" : "fill-hairline text-hairline"}`}
                          strokeWidth={0}
                        />
                      ))}
                    </p>
                    <p className="mt-2 whitespace-pre-line break-words text-[0.9375rem] leading-relaxed text-muted">{review.text}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-6 sm:mt-10">
          <Reveal>
            <h2 className="mb-5 px-1 text-2xl font-semibold sm:text-[1.75rem]">{t("productPage.related")}</h2>
          </Reveal>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {related.map((product, i) => (
              <ProductCard key={product.id} product={product} reveal={i * 70} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
