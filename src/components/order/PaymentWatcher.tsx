"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Rendered while an online payment is awaited: reloads the order every few
 * seconds, so the page shows "paid" by itself when the customer returns from
 * Payme or Click. It stops after two minutes or once the order is paid.
 */
export function PaymentWatcher() {
  const router = useRouter();

  useEffect(() => {
    let runs = 0;
    const timer = setInterval(() => {
      if (document.hidden) return;
      runs += 1;
      if (runs > 30) clearInterval(timer);
      else router.refresh();
    }, 4000);
    return () => clearInterval(timer);
  }, [router]);

  return null;
}
