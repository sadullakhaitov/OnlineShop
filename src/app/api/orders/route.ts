import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { getPaymentMethods, getSiteUrl } from "@/server/config";
import { isSameOrigin, readJson } from "@/server/http";
import { createOrder } from "@/server/orders";
import { getPaymentUrl } from "@/server/payments/urls";
import { getCurrentCustomer } from "@/server/session";

/** Places an order from the checkout form. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

  const body = await readJson(request);
  try {
    const db = await getDb();
    const customer = await getCurrentCustomer();
    const result = await createOrder(db, body, { customer, methods: getPaymentMethods() });
    if (!result.ok) return NextResponse.json(result, { status: 422 });

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
