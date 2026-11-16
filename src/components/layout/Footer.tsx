import { Clock, Mail, MapPin, Phone, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Logo } from "./Logo";

type FooterLink = {
  key: string;
  /** Missing while the page does not exist yet; the item then shows as plain text. */
  href?: React.ComponentProps<typeof Link>["href"];
};

const columns: { key: "customers" | "company" | "support"; links: FooterLink[] }[] = [
  {
    key: "customers",
    links: [
      { key: "catalog", href: "/catalog" },
      { key: "deals", href: { pathname: "/catalog", query: { sale: "1" } } },
      { key: "delivery", href: "/#delivery" },
      { key: "returns" },
      { key: "faq" },
    ],
  },
  {
    key: "company",
    links: [{ key: "about" }, { key: "news" }, { key: "brands", href: "/catalog" }, { key: "careers" }, { key: "contacts" }],
  },
  {
    key: "support",
    links: [
      { key: "support247" },
      { key: "feedback" },
      { key: "service" },
      { key: "manuals" },
      { key: "orderStatus" },
    ],
  },
];

// Placeholder contacts until the shop's real details are provided.
const contact = {
  phone: "+998 65 000-00-00",
  phoneHref: "tel:+998650000000",
  email: "info@multimedia.uz",
};

export function Footer() {
  const t = useTranslations("footer");
  const year = new Date().getFullYear();

  return (
    <footer id="support" className="mx-auto w-full max-w-[1280px] scroll-mt-28 px-3 pb-28 sm:px-6 md:pb-8 lg:px-8">
      <div className="glass rounded-[1.75rem] px-6 py-10 sm:px-10">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_repeat(3,1fr)_1.2fr]">
          <div>
            <Logo />
            <p className="mt-5 max-w-[16rem] text-sm leading-relaxed text-muted">{t("about")}</p>
            <a
              href="https://t.me/"
              target="_blank"
              rel="noreferrer"
              aria-label="Telegram"
              className="icon-btn mt-5 border border-hairline"
            >
              <Send className="size-4" strokeWidth={1.7} />
            </a>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:contents">
            {columns.map((column) => (
              <div key={column.key}>
                <h3 className="text-sm font-semibold">{t(column.key)}</h3>
                <ul className="mt-4 space-y-2.5">
                  {column.links.map((link) => (
                    <li key={link.key} className="text-sm text-muted">
                      {link.href ? (
                        <Link href={link.href} className="transition-colors duration-300 hover:text-ink">
                          {t(`links.${link.key}`)}
                        </Link>
                      ) : (
                        t(`links.${link.key}`)
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div>
            <h3 className="text-sm font-semibold">{t("contacts")}</h3>
            <a href={contact.phoneHref} className="mt-4 flex items-center gap-2 text-lg font-semibold tracking-tight">
              <Phone className="size-4 text-accent" strokeWidth={2} />
              {contact.phone}
            </a>
            <ul className="mt-3 space-y-2.5 text-sm text-muted">
              <li className="flex items-center gap-2">
                <Clock className="size-4 shrink-0" strokeWidth={1.7} />
                {t("hours")}
              </li>
              <li className="flex items-center gap-2">
                <Mail className="size-4 shrink-0" strokeWidth={1.7} />
                <a href={`mailto:${contact.email}`} className="transition-colors hover:text-ink">
                  {contact.email}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="size-4 shrink-0" strokeWidth={1.7} />
                {t("address")}
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-hairline pt-6 sm:flex-row sm:items-center">
          <p className="text-xs text-faint">
            © {year} Multimedia. {t("rights")}
          </p>
          <ul className="flex items-center gap-2">
            {["Click", "Payme"].map((name) => (
              <li
                key={name}
                className="rounded-lg border border-hairline px-3 py-1.5 text-xs font-semibold tracking-tight text-muted"
              >
                {name}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
