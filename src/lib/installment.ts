/** Paying in parts, as the browser and the server both count it. */

export type InstallmentTerms = { months: number; markup: number };

export const INSTALLMENT_LIMITS = { minMonths: 2, maxMonths: 36, maxMarkup: 100 } as const;

/** The monthly sum for goods worth `total`, rounded up to whole thousands of so'm. */
export function monthlyPayment(total: number, plan: InstallmentTerms): number {
  const withMarkup = (total * (100 + plan.markup)) / 100;
  return Math.ceil(withMarkup / plan.months / 1000) * 1000;
}

/** The plan with the smallest monthly sum: what "from X a month" shows. */
export function lowestMonthly(total: number, plans: InstallmentTerms[]): { plan: InstallmentTerms; monthly: number } | null {
  let best: { plan: InstallmentTerms; monthly: number } | null = null;
  for (const plan of plans) {
    const monthly = monthlyPayment(total, plan);
    if (!best || monthly < best.monthly) best = { plan, monthly };
  }
  return best;
}
