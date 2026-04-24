export interface GeoInfo {
  country: string | null;
  region: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
}

/**
 * IP-based geolocation via ipapi.co (no API key needed, ~1k req/day).
 * Falls back to nulls on error so survey submission never fails.
 */
export async function fetchGeo(): Promise<GeoInfo> {
  try {
    const res = await fetch("https://ipapi.co/json/", { cache: "no-store" });
    if (!res.ok) throw new Error("geo fetch failed");
    const j = await res.json();
    return {
      country: j.country_name ?? null,
      region: j.region ?? null,
      city: j.city ?? null,
      lat: typeof j.latitude === "number" ? j.latitude : null,
      lng: typeof j.longitude === "number" ? j.longitude : null,
    };
  } catch {
    return { country: null, region: null, city: null, lat: null, lng: null };
  }
}