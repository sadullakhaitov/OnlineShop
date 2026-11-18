"use client";

import { useEffect, useRef, useState } from "react";
import { formatPrice } from "@/lib/format";

type Props = {
  /** The cheapest and the dearest product in view */
  bounds: { min: number; max: number };
  /** The chosen range from the address, or null for an open end */
  min: number | null;
  max: number | null;
  labels: { from: string; to: string; currency: string; slider: string };
  onCommit: (min: number | null, max: number | null) => void;
};

const STEPS = 1000;

// Most goods are cheap and a few are dear, so the track is stretched at the
// cheap end: the first half of it covers the first quarter of the prices.
const toPrice = (position: number, { min, max }: Props["bounds"]) => {
  const raw = min + (max - min) * (position / STEPS) ** 2;
  const unit = raw < 1_000_000 ? 10_000 : raw < 10_000_000 ? 50_000 : 100_000;
  return Math.min(max, Math.max(min, Math.round(raw / unit) * unit));
};
const toPosition = (price: number, { min, max }: Props["bounds"]) =>
  max <= min ? 0 : Math.round(Math.sqrt(Math.min(1, Math.max(0, (price - min) / (max - min)))) * STEPS);

const digits = (value: string) => {
  const number = Number(value.replace(/\D/g, ""));
  return value.replace(/\D/g, "") ? number : null;
};

/** Two handles on one track, with the sums beside them; the list follows as they move. */
export function PriceRange({ bounds, min, max, labels, onCommit }: Props) {
  const [low, setLow] = useState(min ?? bounds.min);
  const [high, setHigh] = useState(max ?? bounds.max);
  const [lowText, setLowText] = useState(min !== null ? formatPrice(min) : "");
  const [highText, setHighText] = useState(max !== null ? formatPrice(max) : "");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // The address changed elsewhere (reset, another category): follow it. Its own
  // changes come back here too and change nothing, since they match already.
  const outside = `${min}:${max}:${bounds.min}:${bounds.max}`;
  const [seen, setSeen] = useState(outside);
  if (seen !== outside) {
    setSeen(outside);
    setLow(min ?? bounds.min);
    setHigh(max ?? bounds.max);
    setLowText(min !== null ? formatPrice(min) : "");
    setHighText(max !== null ? formatPrice(max) : "");
  }

  useEffect(() => () => clearTimeout(timer.current), []);

  // An end pulled back to the edge means "no limit" on that side.
  function commit(nextLow: number, nextHigh: number, wait = 250) {
    clearTimeout(timer.current);
    timer.current = setTimeout(
      () => onCommit(nextLow > bounds.min ? nextLow : null, nextHigh < bounds.max ? nextHigh : null),
      wait,
    );
  }

  function slide(which: "low" | "high", position: number) {
    const price = toPrice(position, bounds);
    if (which === "low") {
      const next = Math.min(price, high);
      setLow(next);
      setLowText(next > bounds.min ? formatPrice(next) : "");
      commit(next, high);
    } else {
      const next = Math.max(price, low);
      setHigh(next);
      setHighText(next < bounds.max ? formatPrice(next) : "");
      commit(low, next);
    }
  }

  function typed(which: "low" | "high") {
    const value = digits(which === "low" ? lowText : highText);
    let nextLow = low;
    let nextHigh = high;
    if (which === "low") nextLow = value === null ? bounds.min : Math.min(Math.max(value, bounds.min), high);
    else nextHigh = value === null ? bounds.max : Math.max(Math.min(value, bounds.max), low);
    setLow(nextLow);
    setHigh(nextHigh);
    setLowText(nextLow > bounds.min ? formatPrice(nextLow) : "");
    setHighText(nextHigh < bounds.max ? formatPrice(nextHigh) : "");
    commit(nextLow, nextHigh, 0);
  }

  const lowPosition = toPosition(low, bounds);
  const highPosition = toPosition(high, bounds);
  const disabled = bounds.max <= bounds.min;

  const field = (which: "low" | "high") => (
    // The word sits above the sum, so a long sum fits even in the narrow sidebar.
    <label className="field flex min-w-0 flex-1 flex-col justify-center gap-0.5 px-2.5 focus-within:border-accent">
      <span className="text-[0.6875rem] leading-none text-faint">{which === "low" ? labels.from : labels.to}</span>
      <input
        inputMode="numeric"
        value={which === "low" ? lowText : highText}
        placeholder={formatPrice(which === "low" ? bounds.min : bounds.max)}
        onChange={(event) => {
          const value = digits(event.target.value);
          const text = value === null ? "" : formatPrice(value);
          if (which === "low") setLowText(text);
          else setHighText(text);
        }}
        onBlur={() => typed(which)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            typed(which);
          }
        }}
        aria-label={`${which === "low" ? labels.from : labels.to}, ${labels.currency}`}
        className="w-full min-w-0 bg-transparent text-[0.8125rem] font-medium tabular-nums outline-none placeholder:font-normal placeholder:text-faint"
      />
    </label>
  );

  return (
    <div>
      <div className="price-range relative h-8" aria-label={labels.slider} role="group">
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-hairline" />
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-accent"
          style={{ left: `${(lowPosition / STEPS) * 100}%`, right: `${100 - (highPosition / STEPS) * 100}%` }}
        />
        {(["low", "high"] as const).map((which) => (
          <input
            key={which}
            type="range"
            min={0}
            max={STEPS}
            disabled={disabled}
            value={which === "low" ? lowPosition : highPosition}
            onChange={(event) => slide(which, Number(event.target.value))}
            aria-label={which === "low" ? labels.from : labels.to}
            aria-valuetext={`${formatPrice(which === "low" ? low : high)} ${labels.currency}`}
            // The upper handle sits on top, unless both are pushed to the right end.
            style={{ zIndex: which === "low" && lowPosition > STEPS - 10 ? 3 : which === "high" ? 2 : 1 }}
          />
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2">
        {field("low")}
        {field("high")}
      </div>
    </div>
  );
}
