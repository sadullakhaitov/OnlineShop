import { ClickAction } from "@/server/payments/click";
import { answerClick } from "@/server/payments/click-route";

/** Click "Complete" address: the payment went through or failed. */
export function POST(request: Request) {
  return answerClick(request, ClickAction.complete);
}
