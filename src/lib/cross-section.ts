import type { SlabContourFeature } from '../hooks/useSlabData';
import type { EarthquakeFeature } from '../types';

// --- Types ---

export interface SlabProfilePoint {
  lon: number;
  depth: number;
}

export interface ProjectedQuake {
  lon: number;
  depth: number;
  mag: number;
}

export interface GeologicalLabel {
  lon: number;
  depth: number;
  text: string;
}

export interface CrossSectionData {
  slabProfile: SlabProfilePoint[];
  projectedQuakes: ProjectedQuake[];
  labels: GeologicalLabel[];
}

// --- Constants ---

const LON_MIN = -130;
const LON_MAX = -121;
const LAT_HALF_WIDTH = 0.5;

// --- Helpers ---

/**
 * For a given LineString or MultiLineString, find the depth at the target
 * latitude by linearly interpolating between consecutive coordinate pairs.
 * Returns an array of {lon, depth} intersections.
 */
function intersectContourAtLatitude(
  geometry: SlabContourFeature['geometry'],
  depthKm: number,
  targetLat: number,
): SlabProfilePoint[] {
  const results: SlabProfilePoint[] = [];

  const rings: number[][] =
    geometry.type === 'LineString'
      ? (geometry.coordinates as number[][])
      : [];

  const multiRings: number[][][] =
    geometry.type === 'MultiLineString'
      ? (geometry.coordinates as number[][][])
      : [];

  const allRings =
    geometry.type === 'LineString' ? [rings] : multiRings;

  for (const ring of allRings) {
    for (let i = 0; i < ring.length - 1; i++) {
      const [lon0, lat0] = ring[i]!;
      const [lon1, lat1] = ring[i + 1]!;

      // Check if the target latitude lies between these two points
      if (
        (lat0! <= targetLat && lat1! >= targetLat) ||
        (lat1! <= targetLat && lat0! >= targetLat)
      ) {
        const latRange = lat1! - lat0!;
        if (Math.abs(latRange) < 1e-10) {
          // Degenerate segment at exactly targetLat - take midpoint lon
          results.push({ lon: (lon0! + lon1!) / 2, depth: depthKm });
        } else {
          const t = (targetLat - lat0!) / latRange;
          const lon = lon0! + t * (lon1! - lon0!);
          if (lon >= LON_MIN && lon <= LON_MAX) {
            results.push({ lon, depth: depthKm });
          }
        }
      }
    }
  }

  return results;
}

/**
 * Compute a cross-section at the given latitude.
 */
export function computeCrossSection(
  latitude: number,
  slabContours: SlabContourFeature[],
  earthquakes: EarthquakeFeature[],
): CrossSectionData {
  // --- Slab profile ---
  const rawPoints: SlabProfilePoint[] = [];

  for (const feature of slabContours) {
    const depthKm = feature.properties.depth;
    const hits = intersectContourAtLatitude(feature.geometry, depthKm, latitude);
    rawPoints.push(...hits);
  }

  // Sort west to east, then deduplicate close points
  rawPoints.sort((a, b) => a.lon - b.lon);

  const slabProfile: SlabProfilePoint[] = [];
  for (const pt of rawPoints) {
    const prev = slabProfile[slabProfile.length - 1];
    if (!prev || Math.abs(pt.lon - prev.lon) > 0.01) {
      slabProfile.push(pt);
    }
  }

  // --- Projected earthquakes ---
  const projectedQuakes: ProjectedQuake[] = earthquakes
    .filter(
      (eq) =>
        Math.abs(eq.latitude - latitude) <= LAT_HALF_WIDTH &&
        eq.longitude >= LON_MIN &&
        eq.longitude <= LON_MAX,
    )
    .map((eq) => ({
      lon: eq.longitude,
      depth: Math.max(0, eq.depth),
      mag: eq.magnitude,
    }));

  // --- Geological labels ---
  // Position labels relative to the slab profile and known geological context.
  // We estimate positions based on typical Cascadia geometry.
  const slabAtCoast = slabProfile.find((p) => p.lon >= -124.5 && p.lon <= -123.5);
  const coastDepth = slabAtCoast?.depth ?? 25;

  const labels: GeologicalLabel[] = [
    {
      lon: -128.5,
      depth: 15,
      text: 'Oceanic Crust',
    },
    {
      lon: -123.0,
      depth: 8,
      text: 'Continental Crust',
    },
    {
      lon: -125.5,
      depth: Math.min(coastDepth + 40, 80),
      text: 'Mantle Wedge',
    },
    {
      lon: -125.0,
      depth: Math.max(coastDepth - 5, 15),
      text: 'Locked Zone',
    },
    {
      lon: -124.0,
      depth: coastDepth + 10,
      text: 'Transition Zone',
    },
    {
      lon: -123.0,
      depth: coastDepth + 40,
      text: 'Stable Sliding',
    },
  ];

  return { slabProfile, projectedQuakes, labels };
}
