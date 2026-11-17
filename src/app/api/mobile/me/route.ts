import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { getSiteUrl } from "@/server/config";
import { localeParam, mobileOrder } from "@/server/mobile/views";
import { listOrders } from "@/server/orders";
import { getPaymentUrl } from "@/server/payments/urls";
import { getCurrentCustomer } from "@/server/session";

/** The signed-in customer and their orders. */
export async function GET(request: Request) {
  try {
    const customer = await getCurrentCustomer();
    if (!customer) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const locale = localeParam(new URL(request.url).searchParams.get("locale"));
    const siteUrl = getSiteUrl(request.headers);
    const orders = await listOrders(await getDb(), customer);
    return NextResponse.json({
      customer: { name: customer.name, phone: customer.phone },
      orders: orders.map((order) => mobileOrder(order, absolute(getPaymentUrl(order, siteUrl, locale), siteUrl))),
    });
  } catch (error) {
    console.error("Mobile account failed", error);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}

function absolute(url: string | null, siteUrl: string): string | null {
  return url && url.startsWith("/") ? siteUrl + url : url;
}
