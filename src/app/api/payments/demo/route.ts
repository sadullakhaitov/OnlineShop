import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { getPaymentModes } from "@/server/config";
import { isSameOrigin, readJson } from "@/server/http";
import { getOrder, isPayable } from "@/server/orders";
import { simulatePayment } from "@/server/payments/demo";
import { sendTelegramLater } from "@/server/telegram/setup";

/**
 * The test payment page calls this. It only exists while a payment method
 * runs in demo mode; once Payme or Click is connected, it answers 404.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ ok: false }, { status: 403 });

  const body = (await readJson(request)) as { orderId?: unknown; action?: unknown } | null;
  const action = body?.action === "pay" || body?.action === "decline" ? body.action : null;
  if (typeof body?.orderId !== "string" || !action) return NextResponse.json({ ok: false }, { status: 422 });

  try {
    const db = await getDb();
    const order = await getOrder(db, body.orderId);
    const demo = order && order.paymentMethod !== "cash" && getPaymentModes()[order.paymentMethod] === "demo";
    if (!order || !demo) return NextResponse.json({ ok: false }, { status: 404 });
    if (!isPayable(order)) return NextResponse.json({ ok: false, error: "state" }, { status: 409 });

    const ok = await simulatePayment(db, order, action);
    sendTelegramLater(request.headers);
    return NextResponse.json({ ok }, { status: ok ? 200 : 409 });
  } catch (error) {
    console.error("Test payment failed", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
