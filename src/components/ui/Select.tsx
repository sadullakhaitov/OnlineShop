"use client";

import { Children, isValidElement, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

type OptionProps = { value?: string | number; disabled?: boolean; children?: React.ReactNode };

type Props = {
  id?: string;
  /** Sent with the form, like a normal select. */
  name?: string;
  value?: string | number;
  defaultValue?: string | number;
  onValueChange?: (value: string) => void;
  /** Sends the form as soon as another option is picked. */
  submitOnChange?: boolean;
  /** Classes for the visible button, e.g. "field" or "btn btn-ghost". */
  className?: string;
  /** Classes for the wrapper, which holds the list too. */
  wrapperClassName?: string;
  style?: React.CSSProperties;
  /** Drawn on the left inside the button. */
  icon?: React.ReactNode;
  "aria-label"?: string;
  "aria-invalid"?: boolean | "true" | "false";
  "aria-describedby"?: string;
  /** `<option>` elements, as in a normal select. */
  children: React.ReactNode;
};

type Item = { value: string; label: React.ReactNode; text: string; disabled: boolean };

function textOf(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  return "";
}

/**
 * A dropdown in the shop's own glass style, in place of the browser's select,
 * whose open list cannot be styled. It reads `<option>` children, sends its
 * value with forms and works from the keyboard like a select.
 */
export function Select({
  id,
  name,
  value,
  defaultValue,
  onValueChange,
  submitOnChange,
  className = "field",
  wrapperClassName = "",
  style,
  icon,
  children,
  ...aria
}: Props) {
  const items: Item[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement<OptionProps>(child)) return;
    const { value: optionValue, disabled, children: label } = child.props;
    items.push({ value: String(optionValue ?? textOf(label)), label, text: textOf(label), disabled: Boolean(disabled) });
  });

  const [own, setOwn] = useState(String(defaultValue ?? ""));
  const current = value !== undefined ? String(value) : own;
  const selected = items.find((item) => item.value === current);
  const placeholder = !selected || selected.disabled;

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [place, setPlace] = useState<{ left: number; width: number; top?: number; bottom?: number }>({ left: 0, width: 0 });
  const wrapper = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const hidden = useRef<HTMLInputElement>(null);
  const submit = useRef(false);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!wrapper.current?.contains(target) && !list.current?.contains(target)) setOpen(false);
    };
    // The list lies over the page, so it follows the button when the page moves.
    const follow = () => measure();
    document.addEventListener("pointerdown", close);
    window.addEventListener("scroll", follow, true);
    window.addEventListener("resize", follow);
    return () => {
      document.removeEventListener("pointerdown", close);
      window.removeEventListener("scroll", follow, true);
      window.removeEventListener("resize", follow);
    };
  }, [open]);

  useEffect(() => {
    if (open) list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  useEffect(() => {
    if (!submit.current) return;
    submit.current = false;
    hidden.current?.form?.requestSubmit();
  }, [current]);

  function measure() {
    const rect = button.current?.getBoundingClientRect();
    if (!rect) return;
    const below = window.innerHeight - rect.bottom;
    // Opens upwards when there is no room below, as near the phone tab bar.
    const up = below < 300 && rect.top > below;
    setPlace({
      left: rect.left,
      width: rect.width,
      ...(up ? { bottom: window.innerHeight - rect.top + 8 } : { top: rect.bottom + 8 }),
    });
  }

  function show() {
    measure();
    const index = items.findIndex((item) => item.value === current && !item.disabled);
    setActive(index >= 0 ? index : items.findIndex((item) => !item.disabled));
    setOpen(true);
  }

  function pick(item: Item) {
    if (item.disabled) return;
    setOpen(false);
    button.current?.focus();
    if (item.value === current) return;
    if (value === undefined) setOwn(item.value);
    if (submitOnChange) submit.current = true;
    onValueChange?.(item.value);
  }

  function move(step: number) {
    if (!items.length) return;
    let index = active;
    for (let tries = 0; tries < items.length; tries++) {
      index = (index + step + items.length) % items.length;
      if (!items[index].disabled) break;
    }
    setActive(index);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        show();
      }
      return;
    }
    if (event.key === "ArrowDown") move(1);
    else if (event.key === "ArrowUp") move(-1);
    else if (event.key === "Home") setActive(items.findIndex((item) => !item.disabled));
    else if (event.key === "End") setActive(items.findLastIndex((item) => !item.disabled));
    else if (event.key === "Enter" || event.key === " ") {
      if (items[active]) pick(items[active]);
    }
    else if (event.key === "Escape" || event.key === "Tab") {
      setOpen(false);
      if (event.key === "Tab") return;
    } else if (event.key.length === 1) {
      // Typing a letter jumps to the next option that starts with it.
      const letter = event.key.toLowerCase();
      const start = active + 1;
      for (let i = 0; i < items.length; i++) {
        const item = items[(start + i) % items.length];
        if (!item.disabled && item.text.toLowerCase().startsWith(letter)) {
          setActive((start + i) % items.length);
          break;
        }
      }
    } else return;
    event.preventDefault();
  }

  return (
    <div ref={wrapper} className={`relative ${wrapperClassName}`}>
      {name && <input ref={hidden} type="hidden" name={name} value={current} />}
      {!name && submitOnChange && <input ref={hidden} type="hidden" />}
      {icon && <span className="pointer-events-none absolute left-3.5 top-1/2 z-[1] -translate-y-1/2 text-muted">{icon}</span>}
      <button
        ref={button}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && items[active] ? `${listId}-${active}` : undefined}
        aria-label={aria["aria-label"]}
        aria-invalid={aria["aria-invalid"]}
        aria-describedby={aria["aria-describedby"]}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onKeyDown}
        style={style}
        className={`${className} flex w-full cursor-pointer items-center justify-start gap-2 pr-10 text-left ${icon ? "pl-10" : ""}`}
      >
        <span className={`min-w-0 flex-1 truncate ${placeholder ? "text-muted" : ""}`}>{selected?.label ?? items[0]?.label}</span>
      </button>
      <ChevronDown
        className={`pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        strokeWidth={1.8}
      />
      {open &&
        createPortal(
        <ul
          ref={list}
          id={listId}
          role="listbox"
          aria-label={aria["aria-label"]}
          aria-labelledby={id && !aria["aria-label"] ? id : undefined}
          style={{ left: place.left, minWidth: place.width, top: place.top, bottom: place.bottom }}
          className={`glass glass-strong select-pop fixed z-[60] max-h-72 max-w-[calc(100vw-1.5rem)] overflow-y-auto rounded-2xl p-1.5 ${
            place.bottom !== undefined ? "origin-bottom" : "origin-top"
          }`}
        >
          {items.map((item, index) => {
            // A "Choose…" line is only a hint on the button, not a choice in the list.
            if (item.disabled && item.value === "") return null;
            const isSelected = item.value === current && !item.disabled;
            return (
              <li
                key={item.value + index}
                id={`${listId}-${index}`}
                data-index={index}
                role="option"
                aria-selected={isSelected}
                aria-disabled={item.disabled || undefined}
                onPointerEnter={() => !item.disabled && setActive(index)}
                onClick={() => pick(item)}
                className={`flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition-colors duration-200 ${
                  item.disabled ? "cursor-default text-faint" : index === active ? "bg-hairline text-ink" : "text-ink"
                } ${isSelected ? "font-semibold" : ""}`}
              >
                <span className="flex-1">{item.label}</span>
                {isSelected && <Check className="size-4 text-accent" strokeWidth={2} />}
              </li>
            );
          })}
        </ul>,
          document.body,
        )}
    </div>
  );
}
