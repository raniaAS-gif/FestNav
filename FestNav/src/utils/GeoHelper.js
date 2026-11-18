/**
 * Helper konversi koordinat antara Google Maps JS API ({ lat, lng })
 * dan PostGIS / GeoJSON ([lng, lat]).
 */

// 1. FRONTEND -> BACKEND: Array titik klik peta menjadi GeoJSON Polygon (untuk fasilitas.bentuk)
export function toGeoJsonPolygon(points) {
  if (!Array.isArray(points) || points.length < 3) return null;

  const ring = points.map((p) => [Number(p.lng), Number(p.lat)]);

  // PostGIS wajib memiliki titik awal dan akhir yang sama persis (closed ring) agar ST_IsValid = true
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    ring.push([first[0], first[1]]);
  }

  return {
    type: "Polygon",
    coordinates: [ring],
  };
}

// 2. BACKEND -> FRONTEND: GeoJSON Polygon dari API menjadi array [{ lat, lng }] untuk Google Maps
export function fromGeoJsonPolygon(geoJson) {
  if (!geoJson) return [];
  const parsed = typeof geoJson === "string" ? JSON.parse(geoJson) : geoJson;

  if (parsed.type !== "Polygon" || !Array.isArray(parsed.coordinates?.[0])) {
    return [];
  }

  const ring = [...parsed.coordinates[0]];

  // Hapus titik penutup terakhir yang duplikat agar tidak menumpuk saat diedit di peta
  if (ring.length > 3) {
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first[0] === last[0] && first[1] === last[1]) {
      ring.pop();
    }
  }

  return ring.map(([lng, lat]) => ({
    lat: Number(lat),
    lng: Number(lng),
  }));
}

// 3. FRONTEND -> BACKEND: Array titik jalur menjadi GeoJSON LineString (untuk rute navigasi)
export function toGeoJsonLineString(points) {
  if (!Array.isArray(points) || points.length < 2) return null;

  return {
    type: "LineString",
    coordinates: points.map((p) => [Number(p.lng), Number(p.lat)]),
  };
}

// 4. BACKEND -> FRONTEND: GeoJSON LineString dari API menjadi array [{ lat, lng }]
export function fromGeoJsonLineString(geoJson) {
  if (!geoJson) return [];
  const parsed = typeof geoJson === "string" ? JSON.parse(geoJson) : geoJson;

  if (parsed.type !== "LineString" || !Array.isArray(parsed.coordinates)) {
    return [];
  }

  return parsed.coordinates.map(([lng, lat]) => ({
    lat: Number(lat),
    lng: Number(lng),
  }));
}

// 5. DENAH OVERLAY: Konversi batas { north, south, east, west } ke GeoJSON Polygon (jika disimpan sebagai Geometry)
export function boundsToGeoJsonPolygon(bounds) {
  if (!bounds) return null;
  const { north, south, east, west } = bounds;

  return {
    type: "Polygon",
    coordinates: [
      [
        [Number(west), Number(south)],
        [Number(east), Number(south)],
        [Number(east), Number(north)],
        [Number(west), Number(north)],
        [Number(west), Number(south)],
      ],
    ],
  };
}

// 6. DENAH OVERLAY: Konversi GeoJSON Polygon kembali ke { north, south, east, west } untuk GroundOverlay
export function geoJsonPolygonToBounds(geoJson) {
  const points = fromGeoJsonPolygon(geoJson);
  if (points.length === 0) return null;

  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);

  return {
    north: Math.max(...lats),
    south: Math.min(...lats),
    east: Math.max(...lngs),
    west: Math.min(...lngs),
  };
}

// 7. UTILITY: Hitung titik tengah poligon (untuk posisi label nama fasilitas/tenant)
export function getPolygonCenter(points) {
  if (!Array.isArray(points) || points.length === 0) return null;

  const sum = points.reduce(
    (acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }),
    { lat: 0, lng: 0 }
  );

  return {
    lat: sum.lat / points.length,
    lng: sum.lng / points.length,
  };
}