// Distance between two Australian postcodes, straight line, between each postcode's centre.
// Locations: GeoNames (CC BY 4.0), see lib/data/postcodeCentroids.json.
import centroids from "@/lib/data/postcodeCentroids.json";

const C = centroids as unknown as Record<string, [number, number]>;
const clean = (p?: string | null) => (p ?? "").trim();

export function distanceKm(a?: string | null, b?: string | null): number | null {
  const pa = C[clean(a)];
  const pb = C[clean(b)];
  if (!pa || !pb) return null;
  const rad = Math.PI / 180;
  const dLat = (pb[0] - pa[0]) * rad;
  const dLng = (pb[1] - pa[1]) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(pa[0] * rad) * Math.cos(pb[0] * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

// 0 to 1. Full marks within 10 km, about 0.8 at 25 km, 0.5 at 50 km, 0.2 at 100 km, nothing from 150 km.
const CURVE: [number, number][] = [[10, 1], [25, 0.8], [50, 0.5], [100, 0.2], [150, 0]];
export function distanceScore(km: number): number {
  if (km <= CURVE[0][0]) return 1;
  for (let i = 1; i < CURVE.length; i++) {
    const [x1, y1] = CURVE[i];
    if (km <= x1) {
      const [x0, y0] = CURVE[i - 1];
      return y0 + ((y1 - y0) * (km - x0)) / (x1 - x0);
    }
  }
  return 0;
}
