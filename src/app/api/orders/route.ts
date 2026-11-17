import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { CATALOG_TAG } from "@/server/catalog";
import { getPaymentMethods, getSiteUrl, getTelegramConfig } from "@/server/config";
import { isSameOrigin, readJson } from "@/server/http";
import { createOrder } from "@/server/orders";
import { getPaymentUrl } from "@/server/payments/urls";
import { getCurrentCustomer } from "@/server/session";
import { saveTelegramUser } from "@/server/telegram/accounts";
import { parseInitData } from "@/server/telegram/init-data";
import { sendTelegramLater } from "@/server/telegram/setup";

/** Places an order from the checkout form. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

  const body = await readJson(request);
  try {
    const db = await getDb();
    const customer = await getCurrentCustomer();

    // Placed in the Telegram Mini App: the customer hears about the order there.
    const config = getTelegramConfig();
    const initData = request.headers.get("x-telegram-init-data");
    const telegramUser = config && initData ? parseInitData(initData, config.token) : null;
    if (telegramUser) await saveTelegramUser(db, telegramUser);

    const result = await createOrder(db, body, { customer, methods: getPaymentMethods(), telegramId: telegramUser?.id });
    if (!result.ok) return NextResponse.json(result, { status: 422 });
    sendTelegramLater(request.headers);
    if (result.stockChanged) {
      // Pieces left (or "sold out") show on the shop's pages at once.
      revalidateTag(CATALOG_TAG, { expire: 0 });
      revalidatePath("/[locale]", "layout");
    }

    const { order } = result;
    return NextResponse.json({
      ok: true,
      id: order.id,
      number: order.number,
      // Where to pay; null for payment on receipt.
      payUrl: getPaymentUrl(order, getSiteUrl(request.headers), order.locale),
    });
  } catch (error) {
    console.error("Order was not created", error);
    return NextResponse.json({ ok: false, error: "server" }, { status: 500 });
  }
}
