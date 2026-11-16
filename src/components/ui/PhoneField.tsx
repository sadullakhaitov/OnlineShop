"use client";

import { formatLocalPhone, localPhoneDigits } from "@/lib/phone";

type Props = {
  id: string;
  /** The nine digits after +998 */
  value: string;
  onChange: (digits: string) => void;
  invalid?: boolean;
  describedBy?: string;
  autoFocus?: boolean;
  disabled?: boolean;
};

/** Phone input with a fixed +998 in front; the number is spaced while typing. */
export function PhoneField({ id, value, onChange, invalid, describedBy, autoFocus, disabled }: Props) {
  return (
    <div className="field-group" data-invalid={invalid || undefined}>
      <span className="select-none text-muted" aria-hidden="true">
        +998
      </span>
      <input
        id={id}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        placeholder="90 123 45 67"
        value={formatLocalPhone(value)}
        onChange={(event) => onChange(localPhoneDigits(event.target.value))}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        autoFocus={autoFocus}
        disabled={disabled}
      />
    </div>
  );
}
