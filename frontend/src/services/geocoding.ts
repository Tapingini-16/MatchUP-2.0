// Geocoding service — Free OpenStreetMap Nominatim (via backend proxy).
// Backend proxy handles: proper User-Agent, response caching, rate limiting.
import { api as apiClient } from "@/src/api/client";

export type GeoResult = {
  place_id: string;
  primary: string;
  secondary: string;
  display_name: string;
  formatted_address: string;
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
  type?: string | null;
  class?: string | null;
  importance?: number;
};

// Very small in-memory cache (dedupes rapid keystrokes)
const _searchCache = new Map<string, GeoResult[]>();
const _reverseCache = new Map<string, GeoResult>();
const MAX_CACHE = 128;

function cachePut<K, V>(map: Map<K, V>, key: K, value: V) {
  if (map.size >= MAX_CACHE) {
    const firstKey = map.keys().next().value;
    if (firstKey !== undefined) map.delete(firstKey);
  }
  map.set(key, value);
}

export async function searchAddress(q: string, limit = 6): Promise<GeoResult[]> {
  const query = (q || "").trim();
  if (query.length < 2) return [];
  const key = `${query.toLowerCase()}|${limit}`;
  const cached = _searchCache.get(key);
  if (cached) return cached;
  try {
    const res = await apiClient.geocodeSearch(query, limit);
    const safe = Array.isArray(res) ? (res as GeoResult[]) : [];
    cachePut(_searchCache, key, safe);
    return safe;
  } catch {
    return [];
  }
}

export async function reverseGeocode(lat: number, lng: number): Promise<GeoResult | null> {
  const latR = Math.round(lat * 1e5) / 1e5;
  const lngR = Math.round(lng * 1e5) / 1e5;
  const key = `${latR},${lngR}`;
  const cached = _reverseCache.get(key);
  if (cached) return cached;
  try {
    const res = await apiClient.geocodeReverse(latR, lngR);
    if (res) cachePut(_reverseCache, key, res);
    return res || null;
  } catch {
    return null;
  }
}

export type PickedLocation = {
  formatted_address: string;
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
};
