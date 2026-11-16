import { NextResponse } from "next/server";
import { hasLocale } from "next-intl";
import { getDb } from "@/db";
import { routing } from "@/i18n/routing";
import { normalizePhone } from "@/lib/phone";
import { RESEND_AFTER, requestCode } from "@/server/auth";
import { addressHash, isSameOrigin, readJson } from "@/server/http";
import { sendSms } from "@/server/sms";

// These texts must match the templates approved in the SMS provider's cabinet.
const smsText = {
  uz: (code: string) => `Multimedia internet-do'koniga kirish kodi: ${code}`,
  ru: (code: string) => `Код для входа в интернет-магазин Multimedia: ${code}`,
};

/** Sends a sign-in code to the phone. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

  const body = (await readJson(request)) as { phone?: unknown; locale?: unknown } | null;
  const phone = typeof body?.phone === "string" ? normalizePhone(body.phone) : null;
  if (!phone) return NextResponse.json({ ok: false, error: "phone" }, { status: 422 });
  const locale = hasLocale(routing.locales, body?.locale) ? body.locale : routing.defaultLocale;

  try {
    const result = await requestCode(await getDb(), phone, addressHash(request));
    if (!result.ok) return NextResponse.json(result, { status: 429 });

    const sent = await sendSms(phone, smsText[locale](result.code));
    if (!sent.ok) return NextResponse.json({ ok: false, error: "sms" }, { status: 503 });

    return NextResponse.json({
      ok: true,
      resendAfter: RESEND_AFTER,
      // Demo mode has no SMS provider: the page shows the code instead.
      demoCode: sent.demo ? result.code : undefined,
    });
  } catch (error) {
    console.error("Sign-in code was not created", error);
    return NextResponse.json({ ok: false, error: "server" }, { status: 500 });
  }
}
