import { setRequestLocale } from "next-intl/server";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { TelegramBridge } from "@/components/telegram/TelegramBridge";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

/** Everything a customer sees: the shop's header, footer and the phone tab bar. */
export default async function ShopLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-[1280px] px-3 pb-10 sm:px-6 sm:pb-14 lg:px-8">
        {children}
      </main>
      <Footer />
      <MobileTabBar />
      <TelegramBridge />
    </>
  );
}
