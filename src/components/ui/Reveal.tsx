"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  /** Element to render. The fade is applied to this element itself. */
  as?: "div" | "article" | "section" | "ul" | "li" | "nav";
  children: React.ReactNode;
  className?: string;
  id?: string;
  /** Delay in ms, used to stagger items in a row */
  delay?: number;
};

/**
 * Fades and slides an element in once it scrolls into view.
 *
 * It renders the element instead of wrapping it: glass surfaces lose their
 * backdrop blur while an ancestor is semi-transparent, so the fade has to sit
 * on the glass element itself.
 */
export function Reveal({ as = "div", children, className, id, delay = 0 }: Props) {
  // Every allowed tag accepts the same props, so one element type covers them.
  const Tag = as as "div";
  const ref = useRef<HTMLDivElement>(null);
  // "idle" until the page runs: the element is plainly visible, so a slow
  // phone never waits for JavaScript to see what is already on screen.
  const [state, setState] = useState<"idle" | "out" | "in">("idle");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Already on screen when the page woke up: leave it as it is.
    if (el.getBoundingClientRect().top < window.innerHeight) return;
    setState("out");
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setState("in");
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      id={id}
      data-reveal={state === "idle" ? undefined : state}
      className={className}
      style={{ "--reveal-delay": `${delay}ms` } as React.CSSProperties}
    >
      {children}
    </Tag>
  );
}
