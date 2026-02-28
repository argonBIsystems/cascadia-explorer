import type { ScenarioGridPoint } from '../types';

// --- Haversine distance (km) between two lat/lon points ---

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// --- MMI description ---

export function mmiDescription(mmi: number): string {
  if (mmi < 4) return 'Not felt to weak shaking';
  if (mmi < 5)
    return 'Light shaking \u2014 felt by many, slight damage unlikely';
  if (mmi < 6)
    return 'Moderate shaking \u2014 felt by all, some objects fall';
  if (mmi < 7)
    return 'Strong shaking \u2014 slight to moderate damage to buildings';
  if (mmi < 8)
    return 'Very strong \u2014 moderate to severe damage';
  if (mmi < 9)
    return 'Severe \u2014 heavy damage, collapse of unreinforced masonry';
  if (mmi < 10)
    return 'Violent \u2014 general damage, structures shifted off foundations';
  return 'Extreme \u2014 massive destruction';
}

// --- Historical comparison ---

export function historicalComparison(mmi: number): string {
  if (mmi <= 5)
    return 'Similar to the 2001 Nisqually earthquake felt in Seattle';
  if (mmi <= 7)
    return 'More intense than the 2001 Nisqually earthquake';
  if (mmi <= 8)
    return 'Comparable to the 1994 Northridge earthquake in LA';
  return 'Among the most intense shaking ever recorded';
}

// --- MMI to color (for the color indicator) ---

export function mmiColor(mmi: number): string {
  if (mmi < 4) return '#a3e635';   // lime-400
  if (mmi < 5) return '#facc15';   // yellow-400
  if (mmi < 6) return '#fb923c';   // orange-400
  if (mmi < 7) return '#f97316';   // orange-500
  if (mmi < 8) return '#ef4444';   // red-500
  if (mmi < 9) return '#dc2626';   // red-600
  return '#991b1b';                 // red-900
}

// --- Approximate coastal distance ---
// Simple heuristic: points within ~5 km of the Pacific coast in the
// Cascadia region. We check proximity to a set of reference coastal
// longitudes that vary with latitude. For the PNW coast, the shoreline
// roughly follows these longitudes.

interface CoastalSegment {
  latMin: number;
  latMax: number;
  lonCoast: number;
}

const COASTAL_SEGMENTS: CoastalSegment[] = [
  { latMin: 40.0, latMax: 42.0, lonCoast: -124.2 },
  { latMin: 42.0, latMax: 43.5, lonCoast: -124.4 },
  { latMin: 43.5, latMax: 45.0, lonCoast: -124.0 },
  { latMin: 45.0, latMax: 46.5, lonCoast: -124.0 },
  { latMin: 46.5, latMax: 47.5, lonCoast: -124.3 },
  { latMin: 47.5, latMax: 48.5, lonCoast: -124.6 },
  { latMin: 48.5, latMax: 50.0, lonCoast: -125.0 },
];

function estimateCoastalDistanceKm(lat: number, lon: number): number | null {
  for (const seg of COASTAL_SEGMENTS) {
    if (lat >= seg.latMin && lat < seg.latMax) {
      return haversineKm(lat, lon, lat, seg.lonCoast);
    }
  }
  return null;
}

// --- Tsunami risk estimation ---

export interface TsunamiRisk {
  isCoastal: boolean;
  distanceToCoastKm: number;
  estimatedArrivalMinutes: number | null;
  estimatedHeightMeters: number | null;
}

function estimateTsunamiRisk(lat: number, lon: number): TsunamiRisk {
  const distKm = estimateCoastalDistanceKm(lat, lon);

  if (distKm === null || distKm > 5) {
    return {
      isCoastal: false,
      distanceToCoastKm: distKm ?? Infinity,
      estimatedArrivalMinutes: null,
      estimatedHeightMeters: null,
    };
  }

  // For an M9.0 Cascadia event, near-field tsunami arrives in ~15-30 min.
  // Closer to the coast = sooner arrival. Height varies 5-15 m depending
  // on local bathymetry; we give a rough estimate.
  const arrivalMinutes = Math.round(15 + distKm * 3);
  const heightMeters = Math.round((12 - distKm * 1.2) * 10) / 10;

  return {
    isCoastal: true,
    distanceToCoastKm: distKm,
    estimatedArrivalMinutes: arrivalMinutes,
    estimatedHeightMeters: Math.max(1, heightMeters),
  };
}

// --- Impact result ---

export interface ImpactResult {
  mmi: number;
  pga: number;
  description: string;
  historicalComparison: string;
  shakingDuration: { minSeconds: number; maxSeconds: number };
  tsunamiRisk: TsunamiRisk;
  nearestDistanceKm: number;
  mmiColor: string;
}

// --- Main impact calculation ---

export function calculateImpact(
  lat: number,
  lon: number,
  scenarioData: ScenarioGridPoint[],
): ImpactResult {
  // Find nearest grid point
  let bestDist = Infinity;
  let bestPoint: ScenarioGridPoint | null = null;

  for (const point of scenarioData) {
    const d = haversineKm(lat, lon, point.latitude, point.longitude);
    if (d < bestDist) {
      bestDist = d;
      bestPoint = point;
    }
  }

  // Fallback if no grid data (should not happen with real data)
  const pointMmi = bestPoint?.mmi ?? 0;
  const pointPga = bestPoint?.pga ?? 0;

  // M9.0 Cascadia: shaking lasts roughly 3-5 minutes (180-300 seconds).
  // Closer to the fault = longer duration. We model a slight variation
  // based on MMI as a proxy for proximity.
  const baseDuration = 180; // 3 minutes minimum
  const durationRange = 120; // up to 5 minutes
  const durationFraction = Math.min(1, pointMmi / 10);
  const minSeconds = baseDuration + Math.round(durationFraction * durationRange * 0.7);
  const maxSeconds = baseDuration + Math.round(durationFraction * durationRange);

  return {
    mmi: Math.round(pointMmi * 10) / 10,
    pga: Math.round(pointPga * 1000) / 1000,
    description: mmiDescription(pointMmi),
    historicalComparison: historicalComparison(pointMmi),
    shakingDuration: { minSeconds, maxSeconds },
    tsunamiRisk: estimateTsunamiRisk(lat, lon),
    nearestDistanceKm: Math.round(bestDist * 10) / 10,
    mmiColor: mmiColor(pointMmi),
  };
}
