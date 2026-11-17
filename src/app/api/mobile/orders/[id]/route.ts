import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { getSiteUrl } from "@/server/config";
import { localeParam, mobileOrder } from "@/server/mobile/views";
import { getOrder } from "@/server/orders";
import { getPaymentUrl } from "@/server/payments/urls";

/** One order. As on the website, the unguessable id is the key to it. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const order = await getOrder(await getDb(), id);
    if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const locale = localeParam(new URL(request.url).searchParams.get("locale"));
    const siteUrl = getSiteUrl(request.headers);
    const payUrl = getPaymentUrl(order, siteUrl, locale);
    return NextResponse.json({ order: mobileOrder(order, payUrl?.startsWith("/") ? siteUrl + payUrl : payUrl) });
  } catch (error) {
    console.error("Mobile order failed", error);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
