"use client";

import { Select } from "@/components/ui/Select";
import { useLayoutEffect, useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { Check, ExternalLink, EyeOff, Plus, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { categories } from "@/data/categories";
import {
  artKinds,
  colorKeys,
  kinds,
  specKeys,
  type ArtKind,
  type ColorKey,
  type ProductBadge,
  type SpecKey,
} from "@/data/products";
import type { ProductRow } from "@/db/schema";
import { Link, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { discountPercent, formatPrice } from "@/lib/format";
import { PRODUCT_LIMITS, type KindHints, type ProductField, type ProductInput } from "@/lib/product-input";
import { saveProductAction, type ProductSaveResult } from "@/server/admin/actions";
import { ProductArt } from "@/components/product/ProductArt";

type SpecValues = Partial<Record<SpecKey, { uz: string; ru: string }>>;

type Values = {
  category: string;
  art: ArtKind | "";
  brand: string;
  model: string;
  /** Digits only; the field shows them in groups of three */
  price: string;
  oldPrice: string;
  badge: ProductBadge | "";
  color: ColorKey;
  warranty: number;
  inStock: boolean;
  active: boolean;
  specs: SpecValues;
  image: string;
};

const blank: Values = {
  category: "",
  art: "",
  brand: "",
  model: "",
  price: "",
  oldPrice: "",
  badge: "",
  color: "white",
  warranty: 1,
  inStock: true,
  active: true,
  specs: {},
  image: "",
};

function fromRow(product: ProductRow): Values {
  return {
    category: product.category,
    art: product.art,
    brand: product.brand,
    model: product.model,
    price: String(product.price),
    oldPrice: product.oldPrice ? String(product.oldPrice) : "",
    badge: product.badge ?? "",
    color: product.color,
    warranty: product.warranty,
    inStock: product.inStock,
    active: product.active,
    specs: product.specs,
    image: product.image ?? "",
  };
}

const filled = (value: SpecValues[SpecKey]) => Boolean(value && (value.uz.trim() || value.ru.trim()));

/** Rows of the specifications card: everything filled in, plus what this kind of product usually has. */
function specRows(values: Values, hints: KindHints): SpecKey[] {
  const usual = values.art ? hints[values.art].specs : [];
  return specKeys.filter((key) => filled(values.specs[key]) || usual.includes(key));
}

const card = "glass rounded-[1.5rem] p-5 sm:p-6";
const cardTitle = "text-[0.9375rem] font-semibold";
const labelClass = "mb-1.5 block text-[0.8125rem] font-medium text-muted";
const hintClass = "mt-1.5 text-xs leading-relaxed text-muted";
const errorClass = "mt-1.5 text-xs text-danger";

type Props = {
  /** The product being edited; null for a new one */
  product: ProductRow | null;
  hints: KindHints;
  /** The product has just been added */
  added?: boolean;
  /** Read-only details shown under the preview */
  children?: ReactNode;
};

export function ProductForm({ product, hints, added = false, children }: Props) {
  const t = useTranslations("admin.products.form");
  const tAll = useTranslations();
  const locale = useLocale() as Locale;
  const router = useRouter();

  const [values, setValues] = useState<Values>(() => (product ? fromRow(product) : blank));
  const [rows, setRows] = useState<SpecKey[]>(() => specRows(product ? fromRow(product) : blank, hints));
  const [version, setVersion] = useState(product?.version ?? 0);
  const [errors, setErrors] = useState<ProductField[]>([]);
  const [problem, setProblem] = useState<"stale" | "missing" | "server" | null>(null);
  const [note, setNote] = useState<"added" | "saved" | null>(added ? "added" : null);
  const [pending, startTransition] = useTransition();
  // On a new product the section and the colour follow the kind until the admin picks them.
  const chosen = useRef({ category: false, color: false });

  const set = <K extends keyof Values>(key: K, value: Values[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => current.filter((field) => field !== key));
    setNote(null);
  };

  const pickKind = (art: ArtKind) => {
    const hint = hints[art];
    const next: Values = {
      ...values,
      art,
      category: !product && !chosen.current.category && hint.category ? hint.category : values.category,
      color: !product && !chosen.current.color && hint.color ? hint.color : values.color,
    };
    setValues(next);
    setRows(specRows(next, hints));
    setErrors((current) => current.filter((field) => field !== "art" && field !== "category"));
    setNote(null);
  };

  const setSpec = (key: SpecKey, language: "uz" | "ru", text: string) => {
    const current = values.specs[key] ?? { uz: "", ru: "" };
    set("specs", { ...values.specs, [key]: { ...current, [language]: text } });
  };

  const addRow = (key: SpecKey) => {
    setRows(specKeys.filter((item) => item === key || rows.includes(item)));
    requestAnimationFrame(() => document.getElementById(`product-spec-${key}-uz`)?.focus());
  };

  const removeRow = (key: SpecKey) => {
    const specs = { ...values.specs };
    delete specs[key];
    set("specs", specs);
    setRows(rows.filter((item) => item !== key));
  };

  const price = Number(values.price);
  const oldPrice = Number(values.oldPrice);
  const discount = discountPercent(price, oldPrice || undefined);
  const title = `${values.brand} ${values.model}`.trim();

  const check = (): ProductField[] => {
    const fields: ProductField[] = [];
    if (!values.art) fields.push("art");
    if (!values.category) fields.push("category");
    if (!values.brand.trim()) fields.push("brand");
    if (!values.model.trim()) fields.push("model");
    if (price < PRODUCT_LIMITS.minPrice || price > PRODUCT_LIMITS.maxPrice) fields.push("price");
    if (values.oldPrice && (oldPrice <= price || oldPrice > PRODUCT_LIMITS.maxPrice)) fields.push("oldPrice");
    if (values.image.trim() && !/^https:\/\/\S+$/.test(values.image.trim())) fields.push("image");
    return fields;
  };

  const showErrors = (fields: ProductField[]) => {
    setErrors(fields);
    const first = fields[0] === "specs" ? document.querySelector<HTMLElement>("[id^='product-spec-']") : document.getElementById(`product-${fields[0]}`);
    first?.focus();
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (pending) return;
    setProblem(null);
    setNote(null);

    const fields = check();
    if (fields.length > 0 || !values.art) return showErrors(fields);

    const input: ProductInput = {
      ...values,
      art: values.art,
      price,
      oldPrice: values.oldPrice ? oldPrice : null,
      badge: values.badge || null,
      image: values.image.trim() || null,
      specs: Object.fromEntries(rows.flatMap((key) => (filled(values.specs[key]) ? [[key, values.specs[key]]] : []))),
    };

    startTransition(async () => {
      const result = await saveProductAction(product?.id ?? null, version, input).catch(
        (): ProductSaveResult => ({ ok: false, error: "server" }),
      );
      if (!result.ok) {
        if (result.error === "invalid") showErrors(result.fields);
        else setProblem(result.error);
        return;
      }
      if (!product) {
        // A new product continues on its own page.
        router.push({ pathname: `/admin/products/${result.product.id}`, query: { added: "1" } });
        return;
      }
      // Show the product as the shop saved it: tidied text, both languages filled in.
      const saved = fromRow(result.product);
      setValues(saved);
      setRows(specRows(saved, hints));
      setVersion(result.product.version);
      setNote("saved");
    });
  };

  const errorOf = (field: ProductField) => {
    if (!errors.includes(field)) return null;
    if (field === "price") return t("errors.price", { min: formatPrice(PRODUCT_LIMITS.minPrice) });
    if (field === "specs") return t("errors.specs", { max: PRODUCT_LIMITS.spec });
    if (field === "art" || field === "category" || field === "brand" || field === "model" || field === "oldPrice" || field === "image") {
      return t(`errors.${field}`);
    }
    return t("errors.invalid");
  };
  const invalid = (field: ProductField) => ({
    "aria-invalid": errors.includes(field) || undefined,
    "aria-describedby": errors.includes(field) ? `product-${field}-error` : undefined,
  });
  const errorText = (field: ProductField) =>
    errorOf(field) && (
      <p id={`product-${field}-error`} className={errorClass}>
        {errorOf(field)}
      </p>
    );

  const spare = specKeys.filter((key) => !rows.includes(key));
  const previewBadge = values.badge ? tAll(`product.${values.badge}`) : discount ? `−${discount}%` : null;

  return (
    <form onSubmit={submit} noValidate className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start">
      <div className="flex min-w-0 flex-col gap-5">
        <section className={card}>
          <h2 className={cardTitle}>{t("main")}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="product-art" className={labelClass}>
                {t("art")}
              </label>
              <div className="relative">
                <Select
                  id="product-art"
                  className="field"
                  value={values.art}
                  onValueChange={(value) => pickKind(value as ArtKind)}
                  {...invalid("art")}
                >
                  <option value="" disabled>
                    {t("choose")}
                  </option>
                  {artKinds.map((art) => (
                    <option key={art} value={art}>
                      {kinds[art].name[locale]}
                    </option>
                  ))}
                </Select>
              </div>
              {errorText("art") ?? <p className={hintClass}>{t("artHint")}</p>}
            </div>
            <div>
              <label htmlFor="product-category" className={labelClass}>
                {tAll("admin.products.category")}
              </label>
              <div className="relative">
                <Select
                  id="product-category"
                  className="field"
                  value={values.category}
                  onValueChange={(value) => {
                    chosen.current.category = true;
                    set("category", value);
                  }}
                  {...invalid("category")}
                >
                  <option value="" disabled>
                    {t("choose")}
                  </option>
                  {categories.map((category) => (
                    <option key={category.slug} value={category.slug}>
                      {category.name[locale]}
                    </option>
                  ))}
                </Select>
              </div>
              {errorText("category")}
            </div>
            <div>
              <label htmlFor="product-brand" className={labelClass}>
                {t("brand")}
              </label>
              <input
                id="product-brand"
                className="field"
                value={values.brand}
                onChange={(event) => set("brand", event.target.value)}
                maxLength={PRODUCT_LIMITS.brand}
                placeholder={t("brandPlaceholder")}
                autoComplete="off"
                {...invalid("brand")}
              />
              {errorText("brand")}
            </div>
            <div>
              <label htmlFor="product-model" className={labelClass}>
                {t("model")}
              </label>
              <input
                id="product-model"
                className="field"
                value={values.model}
                onChange={(event) => set("model", event.target.value)}
                maxLength={PRODUCT_LIMITS.model}
                placeholder={t("modelPlaceholder")}
                autoComplete="off"
                {...invalid("model")}
              />
              {errorText("model")}
            </div>
          </div>
        </section>

        <section className={card}>
          <div className="flex items-center justify-between gap-3">
            <h2 className={cardTitle}>{t("priceSection")}</h2>
            {discount > 0 && (
              <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent">
                {t("discount", { percent: discount })}
              </span>
            )}
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="product-price" className={labelClass}>
                {t("price")}
              </label>
              <PriceField id="product-price" value={values.price} onChange={(digits) => set("price", digits)} {...invalid("price")} />
              {errorText("price")}
            </div>
            <div>
              <label htmlFor="product-oldPrice" className={labelClass}>
                {t("oldPrice")}
              </label>
              <PriceField
                id="product-oldPrice"
                value={values.oldPrice}
                onChange={(digits) => set("oldPrice", digits)}
                {...invalid("oldPrice")}
              />
              {errorText("oldPrice") ?? <p className={hintClass}>{t("oldPriceHint")}</p>}
            </div>
          </div>
        </section>

        <section className={card}>
          <h2 className={cardTitle}>{t("stateSection")}</h2>
          <div className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2">
            {(["inStock", "active"] as const).map((flag) => (
              <label key={flag} className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  role="switch"
                  className="switch mt-0.5"
                  checked={values[flag]}
                  onChange={(event) => set(flag, event.target.checked)}
                  aria-describedby={`product-${flag}-hint`}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{tAll(`admin.products.${flag}`)}</span>
                  <span id={`product-${flag}-hint`} className="mt-0.5 block text-xs leading-relaxed text-muted">
                    {t(`${flag}Hint`)}
                  </span>
                </span>
              </label>
            ))}
          </div>
          <div className="mt-5 border-t border-hairline pt-5">
            <label htmlFor="product-badge" className={labelClass}>
              {t("badge")}
            </label>
            <div className="relative sm:max-w-[calc(50%-0.5rem)]">
              <Select
                id="product-badge"
                className="field"
                value={values.badge}
                onValueChange={(value) => set("badge", value as ProductBadge | "")}
                aria-describedby="product-badge-hint"
              >
                <option value="">{t("badgeNone")}</option>
                <option value="hit">{tAll("product.hit")}</option>
                <option value="new">{tAll("product.new")}</option>
              </Select>
            </div>
            <p id="product-badge-hint" className={hintClass}>
              {t("badgeHint")}
            </p>
          </div>
        </section>

        <section className={card}>
          <h2 className={cardTitle}>{t("specs")}</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">{t("specsHint")}</p>
          {errors.includes("specs") && (
            <p role="alert" className={errorClass}>
              {errorOf("specs")}
            </p>
          )}

          {rows.length > 0 && (
            <ul className="mt-4 flex flex-col gap-3.5">
              {rows.map((key) => {
                const name = tAll(`spec.${key}`);
                const value = values.specs[key] ?? { uz: "", ru: "" };
                return (
                  <li key={key} className="grid grid-cols-[minmax(0,1fr)_2.5rem] items-center gap-x-2 gap-y-1.5 sm:grid-cols-[9.5rem_minmax(0,1fr)_minmax(0,1fr)_2.5rem]">
                    <span className="text-[0.8125rem] font-medium sm:text-sm">{name}</span>
                    <input
                      id={`product-spec-${key}-uz`}
                      className="field col-span-2 sm:col-span-1"
                      value={value.uz}
                      onChange={(event) => setSpec(key, "uz", event.target.value)}
                      maxLength={PRODUCT_LIMITS.spec}
                      placeholder={t("langUz")}
                      aria-label={t("specUz", { name })}
                      autoComplete="off"
                      lang="uz"
                    />
                    <input
                      id={`product-spec-${key}-ru`}
                      className="field col-span-2 sm:col-span-1"
                      value={value.ru}
                      onChange={(event) => setSpec(key, "ru", event.target.value)}
                      maxLength={PRODUCT_LIMITS.spec}
                      placeholder={t("langRu")}
                      aria-label={t("specRu", { name })}
                      autoComplete="off"
                      lang="ru"
                    />
                    <button
                      type="button"
                      onClick={() => removeRow(key)}
                      aria-label={t("removeSpec", { name })}
                      className="icon-btn col-start-2 row-start-1 text-muted sm:col-start-4"
                    >
                      <X className="size-4" strokeWidth={1.8} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {spare.length > 0 && (
            <div className="relative mt-4 sm:max-w-64">
              <Select
                icon={<Plus className="size-4" strokeWidth={1.8} />}
                className="field text-muted"
                value=""
                onValueChange={(value) => addRow(value as SpecKey)}
                aria-label={t("addSpec")}
              >
                <option value="" disabled>
                  {t("addSpec")}
                </option>
                {spare.map((key) => (
                  <option key={key} value={key}>
                    {tAll(`spec.${key}`)}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </section>

        <section className={card}>
          <h2 className={cardTitle}>{t("photo")}</h2>
          <div className="mt-4">
            <label htmlFor="product-image" className={labelClass}>
              {t("image")}
            </label>
            <input
              id="product-image"
              type="url"
              inputMode="url"
              className="field"
              placeholder="https://…"
              value={values.image}
              maxLength={PRODUCT_LIMITS.image}
              onChange={(event) => set("image", event.target.value)}
              {...invalid("image")}
            />
            {errorText("image") ?? <p className={hintClass}>{t("imageHint")}</p>}
          </div>
        </section>

        <section className={card}>
          <h2 className={cardTitle}>{t("extra")}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="product-color" className={labelClass}>
                {t("color")}
              </label>
              <div className="relative">
                <Select
                  id="product-color"
                  className="field"
                  value={values.color}
                  onValueChange={(value) => {
                    chosen.current.color = true;
                    set("color", value as ColorKey);
                  }}
                >
                  {colorKeys.map((color) => (
                    <option key={color} value={color}>
                      {tAll(`colors.${color}`)}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div>
              <label htmlFor="product-warranty" className={labelClass}>
                {t("warranty")}
              </label>
              <div className="relative">
                <Select
                  id="product-warranty"
                  className="field"
                  value={values.warranty}
                  onValueChange={(value) => set("warranty", Number(value))}
                >
                  {Array.from(
                    { length: PRODUCT_LIMITS.maxWarranty - PRODUCT_LIMITS.minWarranty + 1 },
                    (_, index) => PRODUCT_LIMITS.minWarranty + index,
                  ).map((years) => (
                    <option key={years} value={years}>
                      {tAll("productPage.warrantyValue", { years })}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <button type="submit" disabled={pending} className="btn btn-primary h-12 min-w-44 px-6 disabled:opacity-60">
            {pending ? t("saving") : product ? t("save") : t("create")}
          </button>

          {note && product && (
            <p role="status" className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span className="flex items-center gap-1.5 font-medium text-success">
                <Check className="size-4" strokeWidth={2.2} />
                {t(note)}
              </span>
              {values.active && (
                <Link
                  href={`/product/${product.slug}`}
                  target="_blank"
                  className="flex items-center gap-1.5 text-muted transition-colors duration-300 hover:text-ink"
                >
                  {t("view")}
                  <ExternalLink className="size-3.5" strokeWidth={1.8} />
                </Link>
              )}
              {note === "added" && (
                <Link href="/admin/products/new" className="text-muted transition-colors duration-300 hover:text-ink">
                  {t("addAnother")}
                </Link>
              )}
            </p>
          )}

          {errors.length > 0 && (
            <p role="alert" className="text-sm text-danger">
              {t("errors.invalid")}
            </p>
          )}
          {problem && (
            <p role="alert" className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-danger">
              {t(`errors.${problem}`)}
              {problem === "stale" && (
                <button type="button" onClick={() => window.location.reload()} className="font-medium underline underline-offset-4">
                  {t("errors.reload")}
                </button>
              )}
            </p>
          )}
        </div>
      </div>

      <aside className="flex flex-col gap-5 lg:sticky lg:top-8">
        <section className={card} aria-label={t("preview")}>
          <h2 className={`${cardTitle} mb-4`}>{t("preview")}</h2>
          <div className="tile relative aspect-square overflow-hidden rounded-[1.125rem]">
            {previewBadge && (
              <span className="absolute left-2.5 top-2.5 z-10 rounded-full bg-accent-soft px-2.5 py-1 text-[0.6875rem] font-semibold text-accent backdrop-blur-md">
                {previewBadge}
              </span>
            )}
            {values.art && (
              <ProductArt
                kind={values.art}
                image={/^https:\/\//.test(values.image.trim()) ? values.image.trim() : null}
                className={`absolute inset-[11%] size-[78%] drop-shadow-lg ${values.inStock ? "" : "opacity-50 grayscale"}`}
              />
            )}
          </div>
          <p className="mt-3.5 text-xs text-muted">{values.art ? kinds[values.art].name[locale] : " "}</p>
          <p className={`mt-0.5 text-[0.9375rem] font-medium leading-snug ${title ? "" : "text-faint"}`}>
            {title || `${t("brand")} ${t("model")}`}
          </p>
          <div className="mt-3">
            {!values.inStock ? (
              <p className="text-xs text-faint">{tAll("product.outOfStock")}</p>
            ) : (
              discount > 0 && <p className="text-xs tabular-nums text-faint line-through">{formatPrice(oldPrice)}</p>
            )}
            <p className="text-[1.0625rem] font-semibold tabular-nums tracking-tight">
              {formatPrice(price)} <span className="text-xs font-medium text-muted">{tAll("product.currency")}</span>
            </p>
          </div>
          {!values.active && (
            <p className="mt-3.5 flex items-start gap-2 border-t border-hairline pt-3.5 text-xs leading-relaxed text-muted">
              <EyeOff className="mt-px size-3.5 shrink-0" strokeWidth={1.8} />
              {t("hiddenNote")}
            </p>
          )}
        </section>
        {children}
      </aside>
    </form>
  );
}

type PriceProps = {
  id: string;
  /** Digits only */
  value: string;
  onChange: (digits: string) => void;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

/** A money field: digits are shown in groups of three while typing. */
function PriceField({ id, value, onChange, ...aria }: PriceProps) {
  const t = useTranslations("product");
  const input = useRef<HTMLInputElement>(null);
  // How many digits stood before the caret after the last keystroke.
  const caret = useRef<number | null>(null);

  // Regrouping moves the text under the caret; put the caret back after the same digit.
  useLayoutEffect(() => {
    const field = input.current;
    if (!field || caret.current === null) return;
    let position = 0;
    for (let seen = 0; position < field.value.length && seen < caret.current; position += 1) {
      if (/\d/.test(field.value[position])) seen += 1;
    }
    field.setSelectionRange(position, position);
    caret.current = null;
  });

  return (
    <div className="field-group" data-invalid={aria["aria-invalid"] || undefined}>
      <input
        ref={input}
        id={id}
        inputMode="numeric"
        autoComplete="off"
        placeholder="0"
        className="tabular-nums"
        value={value ? formatPrice(Number(value)) : ""}
        onChange={(event) => {
          const field = event.target;
          const before = field.value.slice(0, field.selectionStart ?? field.value.length);
          caret.current = before.replace(/\D/g, "").length;
          onChange(field.value.replace(/\D/g, "").replace(/^0+/, "").slice(0, 10));
        }}
        {...aria}
      />
      <span className="select-none text-muted" aria-hidden="true">
        {t("currency")}
      </span>
    </div>
  );
}
