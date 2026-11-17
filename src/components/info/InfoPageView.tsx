import { Clock, Mail, MapPin, Phone, Send } from "lucide-react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { shopContacts } from "@/data/contacts";
import { deliveryZones, FREE_DELIVERY_FROM } from "@/data/delivery";
import { infoLabels as L, infoPages, type InfoSlug } from "@/data/pages";
import { formatPrice } from "@/lib/format";

const order: InfoSlug[] = ["delivery", "warranty", "faq", "about", "contacts"];

export function InfoPageView({ slug, locale }: { slug: InfoSlug; locale: Locale }) {
  const page = infoPages[slug];
  const t = (value: { uz: string; ru: string }) => value[locale];

  return (
    <div className="flex flex-col gap-5 pt-5 sm:pt-7">
      <Breadcrumbs items={[{ label: t(L.home), href: "/" }, { label: t(page.title) }]} />
      <header className="enter px-1">
        <h1 className="text-[1.75rem] font-semibold leading-tight sm:text-4xl">{t(page.title)}</h1>
        <p className="mt-3 max-w-2xl text-[0.9375rem] leading-relaxed text-muted sm:text-base">{t(page.lead)}</p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1fr_17rem]">
        <div className="flex min-w-0 flex-col gap-4">
          {slug === "delivery" && <Zones locale={locale} />}
          {slug === "contacts" && <ContactCards locale={locale} />}

          {page.sections.map((section, index) => (
            <section key={index} className="glass enter rounded-[1.5rem] p-5 sm:p-7">
              <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{t(section.heading)}</h2>
              {section.list && (
                <ul className="mt-3 space-y-2.5 text-[0.9375rem] leading-relaxed text-muted">
                  {section.list.map((item, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="mt-[0.6rem] size-1.5 shrink-0 rounded-full bg-accent" />
                      {t(item)}
                    </li>
                  ))}
                </ul>
              )}
              {section.paragraphs?.map((paragraph, i) => (
                <p key={i} className="mt-3 text-[0.9375rem] leading-relaxed text-muted">
                  {t(paragraph)}
                </p>
              ))}
            </section>
          ))}
        </div>

        <aside className="glass enter h-fit rounded-[1.5rem] p-5 lg:sticky lg:top-28">
          <h2 className="text-sm font-semibold">{t(L.seeAlso)}</h2>
          <ul className="mt-3 space-y-1">
            {order.map((other) => (
              <li key={other}>
                <Link
                  href={`/${other}`}
                  aria-current={other === slug ? "page" : undefined}
                  className="block rounded-xl px-3 py-2 text-sm text-muted transition-colors duration-300 hover:bg-hairline hover:text-ink aria-[current=page]:bg-hairline aria-[current=page]:font-medium aria-[current=page]:text-ink"
                >
                  {t(infoPages[other].title)}
                </Link>
              </li>
            ))}
          </ul>
          <a href={shopContacts.phoneHref} className="mt-4 flex items-center gap-2 border-t border-hairline pt-4 font-semibold tracking-tight">
            <Phone className="size-4 text-accent" strokeWidth={2} />
            {shopContacts.phone}
          </a>
        </aside>
      </div>
    </div>
  );
}

function Zones({ locale }: { locale: Locale }) {
  const t = (value: { uz: string; ru: string }) => value[locale];
  return (
    <section className="glass enter rounded-[1.5rem] p-5 sm:p-7">
      <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{t(L.zonesTitle)}</h2>
      <table className="mt-4 w-full text-[0.9375rem]">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-faint">
            <th className="pb-2 font-medium">{t(L.zone)}</th>
            <th className="pb-2 text-right font-medium">{t(L.fee)}</th>
            <th className="hidden pb-2 text-right font-medium sm:table-cell">{t(L.days)}</th>
          </tr>
        </thead>
        <tbody>
          {deliveryZones.map((zone) => (
            <tr key={zone.slug} className="border-t border-hairline">
              <td className="py-2.5 pr-3">{t(zone.name)}</td>
              <td className="py-2.5 text-right font-medium tabular-nums">
                {zone.fee === 0 ? <span className="text-accent">{t(L.free)}</span> : `${formatPrice(zone.fee)} ${t(L.sum)}`}
              </td>
              <td className="hidden py-2.5 text-right text-muted tabular-nums sm:table-cell">
                {zone.days} {t(L.dayUnit)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-4 text-sm text-muted">{t(L.freeFrom).replace("{sum}", formatPrice(FREE_DELIVERY_FROM))}</p>
      <p className="mt-1 text-sm text-muted">{t(L.pickup)}</p>
    </section>
  );
}

function ContactCards({ locale }: { locale: Locale }) {
  const t = (value: { uz: string; ru: string }) => value[locale];
  const rows = [
    { icon: Phone, label: L.phone, value: shopContacts.phone, href: shopContacts.phoneHref },
    { icon: Send, label: L.telegram, value: t(L.writeTelegram), href: shopContacts.telegram },
    { icon: Mail, label: L.email, value: shopContacts.email, href: `mailto:${shopContacts.email}` },
    { icon: MapPin, label: L.address, value: t(shopContacts.address) },
    { icon: Clock, label: L.hours, value: t(shopContacts.hours) },
  ];
  return (
    <section className="grid gap-3 sm:grid-cols-2">
      {rows.map(({ icon: Icon, label, value, href }) => {
        const body = (
          <>
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-hairline">
              <Icon className="size-[1.125rem] text-accent" strokeWidth={1.8} />
            </span>
            <span className="min-w-0">
              <span className="block text-xs text-faint">{t(label)}</span>
              <span className="block truncate font-medium">{value}</span>
            </span>
          </>
        );
        const cls = "glass enter flex items-center gap-3 rounded-[1.5rem] p-4";
        return href ? (
          <a key={value} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className={`${cls} lift`}>
            {body}
          </a>
        ) : (
          <div key={value} className={cls}>
            {body}
          </div>
        );
      })}
    </section>
  );
}
