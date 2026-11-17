import type { Metadata } from "next";
import { headers } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getDb } from "@/db";
import { formatDateTime } from "@/lib/format";
import { requireAdmin } from "@/server/admin/session";
import { getSiteUrl, getTelegramConfig, telegramTokenState } from "@/server/config";
import { isPublicUrl } from "@/server/telegram/api";
import { getBotStatus, messageCounts } from "@/server/telegram/setup";
import { TelegramActions } from "@/components/admin/TelegramActions";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.telegram" });
  return { title: `${t("title")} — Multimedia admin` };
}

const card = "glass rounded-[1.5rem] p-5 sm:p-6";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-t border-hairline py-3.5 first:border-t-0 first:pt-0 sm:flex-row sm:gap-6">
      <dt className="w-44 shrink-0 text-sm text-muted">{label}</dt>
      <dd className="min-w-0 break-words text-sm">{children}</dd>
    </div>
  );
}

export default async function AdminTelegramPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin();

  const t = await getTranslations("admin.telegram");
  const tokenState = telegramTokenState();
  const config = getTelegramConfig();
  const siteUrl = getSiteUrl(await headers());
  const publicSite = isPublicUrl(siteUrl);
  const [status, counts] = config
    ? await Promise.all([getBotStatus(config, siteUrl), messageCounts(await getDb())])
    : [null, null];
  const connected = Boolean(status?.webhook && status.webhook.url === status.webhook.expected);

  return (
    <div className="flex flex-col gap-5">
      <header className="enter">
        <h1 className="text-[1.75rem] font-semibold sm:text-[2rem]">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>
      </header>

      {!config && (
        <section className={`${card} enter`}>
          <h2 className="text-[0.9375rem] font-semibold">{t("setupTitle")}</h2>
          <p className={`mt-2 text-sm ${tokenState === "invalid" ? "text-danger" : "text-muted"}`}>
            {t(tokenState === "invalid" ? "tokenInvalid" : "tokenMissing")}
          </p>
          <ol className="mt-4 flex list-decimal flex-col gap-2.5 pl-5 text-sm leading-relaxed">
            {(["token", "deploy", "connect", "chat"] as const).map((step) => (
              <li key={step}>{t(`steps.${step}`)}</li>
            ))}
          </ol>
          <p className="mt-5 border-t border-hairline pt-4 text-sm leading-relaxed text-muted">{t("about")}</p>
        </section>
      )}

      {config && status && (
        <>
          <section className={`${card} enter`}>
            <dl>
              <Row label={t("bot")}>
                {status.error ? (
                  <span className="text-danger">{t("botError", { error: status.error })}</span>
                ) : (
                  <a href={`https://t.me/${status.username}`} target="_blank" rel="noreferrer" className="font-medium text-accent">
                    {status.name} · @{status.username}
                  </a>
                )}
              </Row>
              <Row label={t("webhook")}>
                {status.webhook && (
                  <div className="flex flex-col gap-1">
                    <span className={`font-medium ${connected ? "text-success" : "text-danger"}`}>
                      {connected
                        ? t("connected")
                        : status.webhook.url
                          ? t("elsewhere", { url: status.webhook.url })
                          : t("notConnected")}
                    </span>
                    {status.webhook.pending > 0 && <span className="text-muted">{t("pending", { count: status.webhook.pending })}</span>}
                    {status.webhook.lastError && status.webhook.lastErrorAt && (
                      <span className="text-muted">
                        {t("lastError", { date: formatDateTime(status.webhook.lastErrorAt, locale), error: status.webhook.lastError })}
                      </span>
                    )}
                  </div>
                )}
              </Row>
              <Row label={t("site")}>
                <span className="font-medium">{siteUrl}</span>
                {!publicSite && <p className="mt-1 text-danger">{t("siteBad")}</p>}
              </Row>
              <Row label={t("chat")}>
                {config.adminChatId ? (
                  <>
                    <span className="font-medium">{config.adminChatId}</span>
                    <p className="mt-1 text-muted">{t("language", { language: config.adminLocale === "ru" ? "Русский" : "O'zbekcha" })}</p>
                  </>
                ) : (
                  <>
                    <span>{t("chatMissing")}</span>
                    <p className="mt-1 text-muted">{t("chatHint")}</p>
                  </>
                )}
              </Row>
              {counts && (
                <Row label={t("messages")}>
                  <span className="flex flex-wrap gap-x-4 gap-y-1">
                    <span>{t("sent", { count: counts.sent })}</span>
                    <span>{t("waiting", { count: counts.waiting })}</span>
                    <span className={counts.failed > 0 ? "text-danger" : undefined}>{t("failed", { count: counts.failed })}</span>
                  </span>
                  {counts.lastError && <p className="mt-1 text-muted">{counts.lastError}</p>}
                </Row>
              )}
            </dl>
          </section>

          {!status.error && (
            <section className={`${card} enter`}>
              <TelegramActions connected={connected} canTest={Boolean(config.adminChatId)} />
            </section>
          )}

          <p className="px-1 text-sm leading-relaxed text-muted">{t("about")}</p>
        </>
      )}
    </div>
  );
}
