import { getEskizConfig, isDemoMode, type EskizConfig } from "./config";

/**
 * Sends SMS through Eskiz.uz when its account is set up in the environment.
 * Without it, demo mode pretends the message was sent (the sign-in page then
 * shows the code on screen); otherwise sending fails.
 *
 * Eskiz only delivers texts that match a template approved in its cabinet.
 */
export type SmsResult = { ok: true; demo: boolean } | { ok: false };

const ESKIZ_API = "https://notify.eskiz.uz/api";

let token: string | null = null;

async function eskizLogin(config: EskizConfig): Promise<string> {
  const form = new FormData();
  form.set("email", config.email);
  form.set("password", config.password);
  const response = await fetch(`${ESKIZ_API}/auth/login`, { method: "POST", body: form });
  const data = (await response.json().catch(() => null)) as { data?: { token?: string } } | null;
  const value = data?.data?.token;
  if (!response.ok || !value) throw new Error(`Eskiz sign-in failed with status ${response.status}`);
  return value;
}

async function eskizSend(config: EskizConfig, phone: string, text: string): Promise<Response> {
  token ??= await eskizLogin(config);
  const form = new FormData();
  form.set("mobile_phone", phone.replace(/\D/g, ""));
  form.set("message", text);
  form.set("from", config.from);
  return fetch(`${ESKIZ_API}/message/sms/send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
}

export async function sendSms(phone: string, text: string): Promise<SmsResult> {
  const eskiz = getEskizConfig();
  if (!eskiz) return isDemoMode() ? { ok: true, demo: true } : { ok: false };

  try {
    let response = await eskizSend(eskiz, phone, text);
    if (response.status === 401) {
      // The saved token has expired: sign in again and retry once.
      token = null;
      response = await eskizSend(eskiz, phone, text);
    }
    if (!response.ok) throw new Error(`Eskiz answered with status ${response.status}`);
    return { ok: true, demo: false };
  } catch (error) {
    console.error("SMS was not sent", error);
    return { ok: false };
  }
}
