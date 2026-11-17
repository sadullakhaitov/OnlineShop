import type { Metadata } from "next";
import { Check, Star, Trash2, X } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getDb } from "@/db";
import type { ReviewStatus } from "@/db/schema";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatDateTime } from "@/lib/format";
import { moderateReviewAction } from "@/server/admin/actions";
import { requireAdmin } from "@/server/admin/session";
import { getCatalog } from "@/server/catalog";
import { listReviews } from "@/server/reviews";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.reviews" });
  return { title: `${t("title")} — Multimedia admin` };
}

const tabs: ReviewStatus[] = ["pending", "approved", "rejected"];

export default async function AdminReviewsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin();
  const t = await getTranslations("admin.reviews");
  const requested = (await searchParams).status as ReviewStatus;
  const status = tabs.includes(requested) ? requested : "pending";
  const [list, catalog] = await Promise.all([listReviews(await getDb(), status), getCatalog()]);

  // What the admin can do from each tab.
  const actions = (["approve", "reject", "delete"] as const).filter(
    (action) => !(action === "approve" && status === "approved") && !(action === "reject" && status === "rejected"),
  );
  const icons = { approve: Check, reject: X, delete: Trash2 };

  return (
    <div className="flex flex-col gap-5">
      <header className="enter">
        <h1 className="text-[1.75rem] font-semibold sm:text-[2rem]">{t("title")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">{t("subtitle")}</p>
      </header>

      <nav className="enter flex gap-2 overflow-x-auto" aria-label={t("title")}>
        {tabs.map((tab) => (
          <Link
            key={tab}
            href={{ pathname: "/admin/reviews", query: tab === "pending" ? {} : { status: tab } }}
            aria-current={tab === status ? "page" : undefined}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-300 ${
              tab === status ? "bg-btn text-btn-text" : "glass text-muted hover:text-ink"
            }`}
          >
            {t(`tabs.${tab}`)}
          </Link>
        ))}
      </nav>

      <section className="glass enter rounded-[1.5rem] p-5 sm:p-6">
        {list.length === 0 ? (
          <p className="text-sm text-muted">{t("empty")}</p>
        ) : (
          <ul className="divide-y divide-hairline">
            {list.map((review) => {
              const product = catalog.byId(review.productId);
              return (
                <li key={review.id} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                    <p className="flex items-center gap-2 text-sm font-semibold">
                      {review.name}
                      <span className="flex gap-0.5" aria-label={`${review.rating}/5`}>
                        {[1, 2, 3, 4, 5].map((value) => (
                          <Star
                            key={value}
                            aria-hidden="true"
                            className={`size-3.5 ${value <= review.rating ? "fill-accent text-accent" : "fill-hairline text-hairline"}`}
                            strokeWidth={0}
                          />
                        ))}
                      </span>
                    </p>
                    <span className="text-xs tabular-nums text-faint">{formatDateTime(review.createdAt, locale as Locale)}</span>
                  </div>
                  <p className="text-xs text-muted">
                    {product ? (
                      <Link href={`/admin/products/${product.id}`} className="hover:text-accent">
                        {t("product", { title: product.title })}
                      </Link>
                    ) : (
                      t("gone")
                    )}
                  </p>
                  <p className="whitespace-pre-line break-words text-[0.9375rem] leading-relaxed">{review.text}</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {actions.map((action) => {
                      const Icon = icons[action];
                      return (
                        <form key={action} action={moderateReviewAction}>
                          <input type="hidden" name="id" value={review.id} />
                          <input type="hidden" name="action" value={action} />
                          <button
                            type="submit"
                            className={`btn h-9 px-3.5 text-[0.8125rem] ${
                              action === "approve" ? "btn-primary" : action === "delete" ? "btn-ghost text-danger" : "btn-ghost"
                            }`}
                          >
                            <Icon className="size-4" strokeWidth={1.8} />
                            {t(action)}
                          </button>
                        </form>
                      );
                    })}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
