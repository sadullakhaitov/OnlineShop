/**
 * A small client for the Telegram Bot API: https://core.telegram.org/bots/api
 * Every method is a POST with a JSON body to /bot<token>/<method>.
 */

export class TelegramError extends Error {
  constructor(
    readonly method: string,
    /** Telegram's error_code (400, 403, 429…); 0 when Telegram could not be reached. */
    readonly code: number,
    readonly description: string,
  ) {
    super(`Telegram ${method} failed: ${code} ${description}`);
    this.name = "TelegramError";
  }

  /** Telegram will never accept this request: retrying it is useless. */
  get permanent(): boolean {
    return this.code === 400 || this.code === 403 || this.code === 404;
  }
}

/** A self-hosted Bot API server can stand in for Telegram's own. */
const api = () => (process.env.TELEGRAM_API_URL || "https://api.telegram.org").replace(/\/+$/, "");

export async function callTelegram<T = unknown>(token: string, method: string, params: object = {}): Promise<T> {
  let data: { ok?: boolean; result?: T; error_code?: number; description?: string } | null = null;
  try {
    const response = await fetch(`${api()}/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    data = await response.json().catch(() => null);
    if (!data) throw new TelegramError(method, response.status >= 500 ? response.status : 0, `HTTP ${response.status}`);
  } catch (error) {
    if (error instanceof TelegramError) throw error;
    throw new TelegramError(method, 0, error instanceof Error ? error.message : "network error");
  }
  if (!data.ok) throw new TelegramError(method, data.error_code ?? 0, data.description ?? "unknown error");
  return data.result as T;
}

/** Text for messages sent with parse_mode "HTML". */
export function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Telegram only opens Mini Apps and button links from public https addresses. */
export function isPublicUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === "https:" && hostname !== "localhost" && !hostname.endsWith(".local") && hostname.includes(".");
  } catch {
    return false;
  }
}
