"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import { Crosshair, LoaderCircle, MapPin, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { locate, type Spot } from "@/lib/locate";
import { BUKHARA_CENTER } from "@/lib/maps";

type Props = {
  value: Spot | null;
  onChange: (spot: Spot | null) => void;
};

/**
 * The delivery spot on a map. The phone's location puts the map in place;
 * the pin stays in the middle and the customer moves the map under it to
 * the right door.
 */
export function LocationPicker({ value, onChange }: Props) {
  const t = useTranslations("checkout.location");
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const [open, setOpen] = useState(value !== null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<"denied" | "unavailable" | null>(null);
  const first = useRef(value ?? BUKHARA_CENTER);
  const report = useRef(onChange);
  useEffect(() => {
    report.current = onChange;
  }, [onChange]);

  // The map is made once the box is on the page and removed with it.
  useEffect(() => {
    if (!open || !box.current) return;
    let gone = false;
    void import("leaflet").then(({ default: L }) => {
      if (gone || !box.current) return;
      const made = L.map(box.current, { zoomControl: false, attributionControl: true }).setView(
        [first.current.lat, first.current.lng],
        value ? 17 : 13,
      );
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
      }).addTo(made);
      made.attributionControl.setPrefix(false);
      L.control.zoom({ position: "bottomright" }).addTo(made);
      made.on("moveend", () => {
        const center = made.getCenter();
        report.current({ lat: center.lat, lng: center.lng });
      });
      map.current = made;
    });
    return () => {
      gone = true;
      map.current?.remove();
      map.current = null;
    };
    // `value` only sets the first view; later moves come from the map itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function findMe() {
    setBusy(true);
    setNote(null);
    const result = await locate();
    setBusy(false);
    if (result.ok) {
      first.current = result.spot;
      map.current?.setView([result.spot.lat, result.spot.lng], 17);
      onChange(result.spot);
    } else {
      setNote(result.reason);
      // The customer can still find the house on the map by hand.
      if (!map.current) onChange(BUKHARA_CENTER);
    }
    setOpen(true);
  }

  if (!open) {
    return (
      <button type="button" onClick={findMe} disabled={busy} className="btn btn-ghost h-11 w-full justify-center">
        {busy ? <LoaderCircle className="size-4 animate-spin" strokeWidth={1.8} /> : <MapPin className="size-4" strokeWidth={1.8} />}
        {busy ? t("finding") : t("mark")}
      </button>
    );
  }

  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl border border-hairline">
        <div ref={box} className="h-64 w-full bg-hairline" aria-label={t("map")} role="application" />
        {/* The pin is drawn over the map's middle; moving the map moves the spot. */}
        <MapPin
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 z-[500] size-9 -translate-x-1/2 -translate-y-full fill-accent text-white drop-shadow-lg"
          strokeWidth={1.5}
        />
        <div className="absolute left-2 top-2 z-[500] flex gap-2">
          <button type="button" onClick={findMe} disabled={busy} className="btn btn-ghost glass-strong h-9 px-3 text-[0.8125rem]">
            {busy ? <LoaderCircle className="size-4 animate-spin" strokeWidth={1.8} /> : <Crosshair className="size-4" strokeWidth={1.8} />}
            {t("findMe")}
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setNote(null);
            onChange(null);
          }}
          aria-label={t("remove")}
          className="icon-btn glass-strong absolute right-2 top-2 z-[500]"
        >
          <X className="size-4" strokeWidth={1.8} />
        </button>
      </div>
      <p className={`mt-1.5 text-xs ${note ? "text-danger" : "text-muted"}`}>{note ? t(note) : t("hint")}</p>
    </div>
  );
}
