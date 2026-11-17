import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { getSiteUrl, getTelegramConfig } from "@/server/config";
import { readJson } from "@/server/http";
import { TelegramBot } from "@/server/telegram/bot";
import { sendTelegramLater } from "@/server/telegram/setup";

/**
 * Telegram sends the bot's updates here (registered from the admin panel's
 * Telegram page). Each request carries the secret given at registration.
 */
export async function POST(request: Request) {
  const config = getTelegramConfig();
  if (!config) return new NextResponse(null, { status: 404 });

  const given = Buffer.from(request.headers.get("x-telegram-bot-api-secret-token") ?? "");
  const expected = Buffer.from(config.webhookSecret);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return new NextResponse(null, { status: 401 });
  }

  const update = await readJson(request, 100_000);
  try {
    await new TelegramBot(await getDb(), config, getSiteUrl(request.headers)).handle(update);
  } catch (error) {
    // Telegram would send the same update again and again: answer it anyway.
    console.error("Telegram update was not handled", error);
  }
  // A good moment to retry order messages that failed before.
  sendTelegramLater(request.headers);
  return NextResponse.json({ ok: true });
}
