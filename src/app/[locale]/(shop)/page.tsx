import { setRequestLocale } from "next-intl/server";
import { Hero } from "@/components/home/Hero";
import { PromoCards } from "@/components/home/PromoCards";
import { CategoryChips } from "@/components/home/CategoryChips";
import { PopularProducts } from "@/components/home/PopularProducts";
import { Collections } from "@/components/home/Collections";
import { Benefits } from "@/components/home/Benefits";
import { ExtendedWarranty } from "@/components/home/ExtendedWarranty";

// With PostgreSQL this page is prepared ahead of time. The admin panel
// refreshes it when a product changes; this is the fallback for changes made
// elsewhere, in seconds.
export const revalidate = 300;

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="flex flex-col gap-10 pt-4 sm:gap-14 sm:pt-6">
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Hero />
        <PromoCards />
      </section>
      <CategoryChips />
      <PopularProducts />
      <Collections />
      <Benefits />
      <ExtendedWarranty />
    </div>
  );
}
