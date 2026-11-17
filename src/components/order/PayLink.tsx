"use client";

import { openExternal } from "@/lib/telegram";

/** The "Pay" button: Payme and Click open in the browser when the shop runs inside Telegram. */
export function PayLink({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className={className}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
        event.preventDefault();
        openExternal(href);
      }}
    >
      {children}
    </a>
  );
}
