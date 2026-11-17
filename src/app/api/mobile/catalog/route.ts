import { NextResponse, type NextRequest } from "next/server";
import { getCatalog } from "@/server/catalog";
import { localeParam, mobileCatalog } from "@/server/mobile/views";

/** The whole catalogue for the mobile app: it fits in one small answer. */
export async function GET(request: NextRequest) {
  const locale = localeParam(request.nextUrl.searchParams.get("locale"));
  try {
    return NextResponse.json(mobileCatalog(await getCatalog(), locale));
  } catch (error) {
    console.error("Mobile catalogue failed", error);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
