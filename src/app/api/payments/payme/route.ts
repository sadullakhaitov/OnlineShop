import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { getPaymeConfig } from "@/server/config";
import { sendTelegramLater } from "@/server/telegram/setup";
import { PaymeErrorCode, handlePaymeRequest, paymeNotPostResponse } from "@/server/payments/payme";

/**
 * The address Payme calls (set it in the Payme cabinet as the endpoint URL).
 * Payme expects HTTP 200 on every answer, errors included.
 */
export async function POST(request: Request) {
  const body = (await request.text()).slice(0, 20_000);
  const config = getPaymeConfig();

  if (!config) {
    // Payme is not connected: nobody can be authorised.
    let id: unknown = null;
    try {
      id = (JSON.parse(body) as { id?: unknown })?.id ?? null;
    } catch {}
    return NextResponse.json({
      jsonrpc: "2.0",
      id,
      error: {
        code: PaymeErrorCode.accessDenied,
        message: {
          ru: "Недостаточно привилегий для выполнения метода",
          uz: "Metodni bajarish uchun huquq yetarli emas",
          en: "Insufficient privileges to perform the method",
        },
      },
    });
  }

  try {
    const db = await getDb();
    const answer = await handlePaymeRequest(db, config, request.headers.get("authorization"), body);
    sendTelegramLater(request.headers);
    return NextResponse.json(answer);
  } catch (error) {
    console.error("Payme endpoint failed", error);
    return NextResponse.json({
      jsonrpc: "2.0",
      id: null,
      error: {
        code: PaymeErrorCode.system,
        message: { ru: "Внутренняя ошибка", uz: "Ichki xatolik", en: "Internal error" },
      },
    });
  }
}

export function GET() {
  return NextResponse.json(paymeNotPostResponse());
}
