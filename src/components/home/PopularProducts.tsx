import { getTranslations } from "next-intl/server";
import { getCatalog } from "@/server/catalog";
import { ProductCard } from "@/components/product/ProductCard";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "./SectionHeading";

export async function PopularProducts() {
  const t = await getTranslations("popular");
  const products = (await getCatalog()).popular(10);

  return (
    <section id="popular" className="scroll-mt-28">
      <Reveal>
        <SectionHeading title={t("title")} linkLabel={t("all")} href="/catalog" />
      </Reveal>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {products.map((product, i) => (
          <ProductCard key={product.id} product={product} reveal={(i % 5) * 70} />
        ))}
      </div>
    </section>
  );
}
