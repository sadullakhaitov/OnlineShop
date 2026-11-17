"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { connectTelegramAction, testTelegramAction, type TelegramActionState } from "@/server/admin/actions";

function Result({ state }: { state: TelegramActionState }) {
  const t = useTranslations("admin.telegram");
  if (!state) return null;
  if (state.ok) {
    return (
      <p role="status" className="text-sm text-success">
        {t(`done.${state.done}`)}
      </p>
    );
  }
  const known = ["token", "site", "chat"].includes(state.error);
  return (
    <p role="alert" className="text-sm text-danger">
      {known ? t(`errors.${state.error as "token" | "site" | "chat"}`) : t("errors.other", { error: state.error })}
    </p>
  );
}

/** "Connect the bot" and "Send a test message". */
export function TelegramActions({ connected, canTest }: { connected: boolean; canTest: boolean }) {
  const t = useTranslations("admin.telegram");
  const [connectState, connect, connecting] = useActionState(connectTelegramAction, null);
  const [testState, test, testing] = useActionState(testTelegramAction, null);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2.5">
        <form action={connect}>
          <button type="submit" disabled={connecting} className="btn btn-primary h-11 px-5 disabled:opacity-60">
            {connecting ? t("working") : t(connected ? "reconnect" : "connect")}
          </button>
        </form>
        {canTest && (
          <form action={test}>
            <button type="submit" disabled={testing} className="btn btn-ghost h-11 px-5 disabled:opacity-60">
              {testing ? t("working") : t("test")}
            </button>
          </form>
        )}
      </div>
      <Result state={connectState} />
      <Result state={testState} />
    </div>
  );
}
