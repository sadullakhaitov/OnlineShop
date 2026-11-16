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
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
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
      data-reveal={shown ? "in" : "out"}
      className={className}
      style={{ "--reveal-delay": `${delay}ms` } as React.CSSProperties}
    >
      {children}
    </Tag>
  );
}
