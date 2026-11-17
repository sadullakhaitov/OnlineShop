import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { cleanName, updateCustomerName } from "@/server/account";
import { isSameOrigin, readJson } from "@/server/http";
import { getCurrentCustomer } from "@/server/session";

/** Changes the signed-in customer's name (website and mobile app). */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  try {
    const customer = await getCurrentCustomer();
    if (!customer) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const body = (await readJson(request, 2_000)) as { name?: unknown } | null;
    const name = cleanName(body?.name);
    if (!name) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });

    await updateCustomerName(await getDb(), customer.id, name);
    return NextResponse.json({ ok: true, name });
  } catch (error) {
    console.error("Profile was not saved", error);
    return NextResponse.json({ ok: false, error: "server" }, { status: 500 });
  }
}
