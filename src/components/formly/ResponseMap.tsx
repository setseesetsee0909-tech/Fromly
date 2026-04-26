import { useEffect, useMemo, useRef } from "react";
import { Globe2, MapPin, Users } from "lucide-react";

interface Point { lat: number; lng: number; city?: string | null; country?: string | null }

/**
 * Lightweight Leaflet map. Loads CSS + library on demand client-side
 * so SSR build doesn't try to import 'leaflet' (which touches `window`).
 */
export function ResponseMap({ points }: { points: Point[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);

  const stats = useMemo(() => {
    const countries = new Map<string, number>();
    const cities = new Set<string>();
    points.forEach((p) => {
      if (p.country) countries.set(p.country, (countries.get(p.country) ?? 0) + 1);
      if (p.city) cities.add(`${p.city}|${p.country ?? ""}`);
    });
    const top = [...countries.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    return { countries: countries.size, cities: cities.size, top };
  }, [points]);

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

      const map = L.map(ref.current, { scrollWheelZoom: false, zoomControl: true }).setView([20, 0], 2);
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        attribution: "© OpenStreetMap, © CARTO",
        maxZoom: 18,
      }).addTo(map);

      const valid = points.filter((p) => typeof p.lat === "number" && typeof p.lng === "number");
      // Group nearby points (rounded to 1 decimal ~ 11km) into clusters
      const clusters = new Map<string, { lat: number; lng: number; count: number; labels: string[] }>();
      valid.forEach((p) => {
        const key = `${p.lat.toFixed(1)},${p.lng.toFixed(1)}`;
        const c = clusters.get(key);
        const label = `${p.city ?? ""}${p.city && p.country ? ", " : ""}${p.country ?? ""}`.trim() || "—";
        if (c) {
          c.count++;
          c.lat = (c.lat * (c.count - 1) + p.lat) / c.count;
          c.lng = (c.lng * (c.count - 1) + p.lng) / c.count;
          if (c.labels.length < 4) c.labels.push(label);
        } else {
          clusters.set(key, { lat: p.lat, lng: p.lng, count: 1, labels: [label] });
        }
      });
      clusters.forEach((c) => {
        const size = Math.min(46, 22 + Math.log2(c.count + 1) * 6);
        const html = `<div style="display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:9999px;background:hsl(217,91%,60%);color:white;font-weight:700;font-size:12px;border:3px solid white;box-shadow:0 4px 12px hsla(217,91%,60%,0.45)">${c.count}</div>`;
        const icon = L.divIcon({ className: "", html, iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
        L.marker([c.lat, c.lng], { icon })
          .addTo(map)
          .bindPopup(`<strong>${c.count} хариулт</strong><br/>${c.labels.join("<br/>")}`);
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

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border bg-muted/30 p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" /> Цэгүүд
          </div>
          <p className="mt-1 text-xl font-bold">{points.length}</p>
        </div>
        <div className="rounded-xl border bg-muted/30 p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Globe2 className="h-3.5 w-3.5" /> Улс
          </div>
          <p className="mt-1 text-xl font-bold">{stats.countries}</p>
        </div>
        <div className="rounded-xl border bg-muted/30 p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" /> Хот
          </div>
          <p className="mt-1 text-xl font-bold">{stats.cities}</p>
        </div>
        <div className="rounded-xl border bg-muted/30 p-3">
          <div className="text-xs text-muted-foreground">Тэргүүлэгч</div>
          <p className="mt-1 truncate text-sm font-semibold">
            {stats.top[0] ? `${stats.top[0][0]} · ${stats.top[0][1]}` : "—"}
          </p>
        </div>
      </div>
      <div ref={ref} className="h-[420px] w-full overflow-hidden rounded-xl border shadow-sm" />
      {stats.top.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {stats.top.map(([country, count]) => (
            <div
              key={country}
              className="flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs"
            >
              <span className="font-medium">{country}</span>
              <span className="text-muted-foreground">{count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}