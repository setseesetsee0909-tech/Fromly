import { useEffect, useRef } from "react";

interface Point { lat: number; lng: number; city?: string | null; country?: string | null }

/**
 * Lightweight Leaflet map. Loads CSS + library on demand client-side
 * so SSR build doesn't try to import 'leaflet' (which touches `window`).
 */
export function ResponseMap({ points }: { points: Point[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !ref.current) return;
    let cancelled = false;

    (async () => {
      // inject CSS once
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }
      const L = (await import("leaflet")).default;
      if (cancelled || !ref.current) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const existing = mapRef.current as any;
      if (existing) existing.remove();

      const map = L.map(ref.current, { scrollWheelZoom: false }).setView([20, 0], 2);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 18,
      }).addTo(map);

      const valid = points.filter((p) => typeof p.lat === "number" && typeof p.lng === "number");
      const icon = L.divIcon({
        className: "",
        html: '<div style="width:14px;height:14px;border-radius:50%;background:hsl(217,91%,60%);border:2px solid white;box-shadow:0 0 0 2px hsla(217,91%,60%,0.3)"></div>',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      valid.forEach((p) => {
        L.marker([p.lat, p.lng], { icon })
          .addTo(map)
          .bindPopup(`${p.city ?? ""}${p.city && p.country ? ", " : ""}${p.country ?? ""}`);
      });
      if (valid.length) {
        const bounds = L.latLngBounds(valid.map((p) => [p.lat, p.lng]));
        map.fitBounds(bounds, { padding: [30, 30], maxZoom: 6 });
      }
      mapRef.current = map;
    })();

    return () => {
      cancelled = true;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const m = mapRef.current as any;
      if (m) {
        m.remove();
        mapRef.current = null;
      }
    };
  }, [points]);

  return <div ref={ref} className="h-80 w-full rounded-xl border" />;
}