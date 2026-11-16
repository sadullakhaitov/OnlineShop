import { ClickAction } from "@/server/payments/click";
import { answerClick } from "@/server/payments/click-route";

/** Click "Prepare" address: may this order be paid? */
export function POST(request: Request) {
  return answerClick(request, ClickAction.prepare);
}
