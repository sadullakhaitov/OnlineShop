import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { getTelegramConfig } from "@/server/config";
import { isSameOrigin, readJson } from "@/server/http";
import { setSessionCookies } from "@/server/session";
import { linkTelegramPhone, saveTelegramUser, signInTelegramUser } from "@/server/telegram/accounts";
import { parseInitData, parseSharedContact } from "@/server/telegram/init-data";

/**
 * Signing in inside the Telegram Mini App. The page sends the launch data
 * Telegram signed for it; a user whose phone number the shop knows is signed
 * in at once. `contact` is the signed phone number the user has just shared
 * from the page; without it the number arrives through the bot.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  const config = getTelegramConfig();
  if (!config) return NextResponse.json({ ok: false, error: "disabled" }, { status: 404 });

  const body = (await readJson(request)) as { initData?: unknown; contact?: unknown } | null;
  const user = typeof body?.initData === "string" ? parseInitData(body.initData, config.token) : null;
  if (!user) return NextResponse.json({ ok: false, error: "invalid" }, { status: 401 });

  try {
    const db = await getDb();
    await saveTelegramUser(db, user);

    if (typeof body?.contact === "string") {
      const contact = parseSharedContact(body.contact, config.token);
      if (contact && contact.userId === user.id) {
        const linked = await linkTelegramPhone(db, user, contact.phone);
        if (!linked.ok) return NextResponse.json({ ok: false, error: "phone" }, { status: 422 });
      }
    }

    const session = await signInTelegramUser(db, user.id);
    if (!session) return NextResponse.json({ ok: true, signedIn: false });
    const response = NextResponse.json({ ok: true, signedIn: true });
    setSessionCookies(response, session.token, { telegram: true });
    return response;
  } catch (error) {
    console.error("Telegram sign-in failed", error);
    return NextResponse.json({ ok: false, error: "server" }, { status: 500 });
  }
}
