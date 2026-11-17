import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { getClickConfig } from "@/server/config";
import { sendTelegramLater } from "@/server/telegram/setup";
import { ClickAction, ClickError, handleClickRequest, type ClickActionValue, type ClickParams } from "./click";

/** Click sends its fields as a form; a JSON body is accepted as well. */
async function readParams(request: Request): Promise<ClickParams> {
  const params: ClickParams = {};
  try {
    if ((request.headers.get("content-type") ?? "").includes("application/json")) {
      const data: unknown = await request.json();
      if (typeof data === "object" && data !== null) {
        for (const [key, value] of Object.entries(data)) {
          if (typeof value === "string" || typeof value === "number") params[key] = String(value);
        }
      }
    } else {
      for (const [key, value] of await request.formData()) {
        if (typeof value === "string") params[key] = value;
      }
    }
  } catch {
    // An unreadable body is answered as a request with missing fields.
  }
  return params;
}

/** Shared body of the Prepare and Complete endpoints. */
export async function answerClick(request: Request, action: ClickActionValue) {
  const params = await readParams(request);
  const config = getClickConfig();
  if (!config) {
    // Click is not connected: no signature can be valid.
    return NextResponse.json({ error: ClickError.signFailed, error_note: "SIGN CHECK FAILED!" });
  }

  try {
    const answer = await handleClickRequest(await getDb(), config, action, params);
    // A completed payment may have messages to send.
    if (action === ClickAction.complete) sendTelegramLater(request.headers);
    return NextResponse.json(answer);
  } catch (error) {
    console.error("Click endpoint failed", error);
    return NextResponse.json({ error: ClickError.updateFailed, error_note: "Failed to update user" });
  }
}
