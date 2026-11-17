import { ChevronRight, CircleHelp, FileText, Info, Lock, MessageCircle, Phone, ShieldCheck, Truck } from "lucide-react";
import { useTranslations } from "next-intl";
import { shopContacts } from "@/data/contacts";
import { Link } from "@/i18n/navigation";

const pages = [
  { key: "delivery", href: "/delivery", icon: Truck },
  { key: "returns", href: "/warranty", icon: ShieldCheck },
  { key: "faq", href: "/faq", icon: CircleHelp },
  { key: "about", href: "/about", icon: Info },
  { key: "contacts", href: "/contacts", icon: MessageCircle },
  { key: "offer", href: "/offer", icon: FileText },
  { key: "privacy", href: "/privacy", icon: Lock },
] as const;

const row = "flex items-center gap-3.5 px-4 py-3.5 transition-colors duration-300 hover:bg-hairline";

/**
 * The shop's help pages as one short list. On phones and in the Mini App it
 * stands in for the footer, which is left out there.
 */
export function InfoLinks({ className = "" }: { className?: string }) {
  const t = useTranslations();

  return (
    <section className={className}>
      <h2 className="mb-3 px-1 text-lg font-semibold">{t("account.help")}</h2>
      <ul className="glass divide-y divide-[var(--hairline)] overflow-hidden rounded-[1.5rem]">
        {pages.map(({ key, href, icon: Icon }) => (
          <li key={key}>
            <Link href={href} className={row}>
              <Icon className="size-5 shrink-0 text-accent" strokeWidth={1.7} />
              <span className="flex-1 text-[0.9375rem]">{t(`footer.links.${key}`)}</span>
              <ChevronRight className="size-4 text-faint" strokeWidth={1.8} />
            </Link>
          </li>
        ))}
        <li>
          <a href={shopContacts.phoneHref} className={row}>
            <Phone className="size-5 shrink-0 text-accent" strokeWidth={1.7} />
            <span className="flex-1 text-[0.9375rem]">{t("account.call")}</span>
            <span className="text-sm tabular-nums text-muted">{shopContacts.phone}</span>
          </a>
        </li>
      </ul>
    </section>
  );
}
