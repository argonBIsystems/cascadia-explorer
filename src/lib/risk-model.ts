/**
 * Seismic Risk Scoring Model
 *
 * Computes a composite earthquake risk score (0–100) for any location
 * using real data inputs and established seismological methods.
 *
 * Factors:
 *   1. Seismicity Rate — nearby earthquake frequency from live USGS feed
 *   2. Fault Proximity — distance to nearest plate boundary (Bird 2003)
 *   3. Subduction Coupling — inferred locking from slab depth profile
 *   4. Ground Hazard — USGS NSHM2023 PGA at 2% in 50yr
 *   5. Recurrence Gap — time since last M9 (1700 CE) vs mean interval
 *
 * References:
 *   - Gutenberg & Richter (1944), b-value seismicity statistics
 *   - Schmalzle et al. (2014), Cascadia interseismic coupling
 *   - USGS NSHM 2023, https://www.usgs.gov/programs/earthquake-hazards/nshm
 *   - Goldfinger et al. (2012), turbidite paleoseismology
 */

import type { EarthquakeFeature, RiskScore, RiskFactor } from '../types';
import type { HazardPoint } from '../hooks/useHazardData';

// Minimal GeoJSON types for fault data
interface FaultGeometry {
  type: string;
  coordinates: number[][] | number[][][];
}

interface FaultFeature {
  type: string;
  geometry: FaultGeometry;
  properties: Record<string, unknown> | null;
}

export interface FaultFeatureCollection {
  type: string;
  features: FaultFeature[];
}

// ---------------------------------------------------------------------------
// Haversine distance (km)
// ---------------------------------------------------------------------------
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ---------------------------------------------------------------------------
// 1. Seismicity Rate Score
// ---------------------------------------------------------------------------
// Counts M2.5+ earthquakes within 100km in the selected time window.
// Score is log-scaled: 0 events = 0, ~1 event = 20, ~10 = 60, ~50+ = 100.
function seismicityScore(
  lat: number, lon: number,
  earthquakes: EarthquakeFeature[],
): { score: number; detail: string } {
  const radiusKm = 100;
  const nearby = earthquakes.filter(
    eq => eq.type === 'earthquake' &&
          eq.magnitude >= 2.5 &&
          haversineKm(lat, lon, eq.latitude, eq.longitude) <= radiusKm,
  );

  const count = nearby.length;
  const maxMag = nearby.length > 0
    ? Math.max(...nearby.map(e => e.magnitude))
    : 0;

  // Log-scaled: score = 25 * ln(1 + count), capped at 100
  const raw = 25 * Math.log(1 + count);
  const score = Math.min(100, Math.round(raw));

  const detail = count === 0
    ? 'No recent M2.5+ earthquakes within 100 km'
    : `${count} earthquake${count > 1 ? 's' : ''} within 100 km (max M${maxMag.toFixed(1)})`;

  return { score, detail };
}

// ---------------------------------------------------------------------------
// 2. Fault Proximity Score
// ---------------------------------------------------------------------------
// Distance to nearest plate boundary segment. Closer = higher risk.
// Exponential decay: score = 100 * exp(-dist / 80km)
interface FaultSegment { lat: number; lon: number }

function faultProximityScore(
  lat: number, lon: number,
  faultCoords: FaultSegment[][],
): { score: number; detail: string } {
  let minDist = Infinity;

  for (const coords of faultCoords) {
    for (const pt of coords) {
      const d = haversineKm(lat, lon, pt.lat, pt.lon);
      if (d < minDist) {
        minDist = d;
      }
    }
  }

  // Exponential decay: 80km characteristic distance
  const score = Math.round(100 * Math.exp(-minDist / 80));
  const detail = minDist < 10
    ? `${minDist.toFixed(0)} km from plate boundary — directly on fault zone`
    : minDist < 50
    ? `${minDist.toFixed(0)} km from nearest plate boundary`
    : `${minDist.toFixed(0)} km from nearest plate boundary`;

  return { score, detail };
}

// ---------------------------------------------------------------------------
// 3. Subduction Coupling Score
// ---------------------------------------------------------------------------
// Based on approximate distance to the megathrust trench.
// The Cascadia megathrust is fully locked from the trench to ~20km depth
// (Schmalzle et al. 2014). Risk is highest 0-150km from the trench,
// decreasing as the plate coupling transitions from locked → creeping.
function couplingScore(
  lat: number, lon: number,
  megathrustCoords: FaultSegment[],
): { score: number; detail: string } {
  // Find distance to the megathrust trench
  let minDist = Infinity;
  for (const pt of megathrustCoords) {
    const d = haversineKm(lat, lon, pt.lat, pt.lon);
    if (d < minDist) minDist = d;
  }

  // Score: highest near the trench, decay over 200km
  // Peak coupling zone is 20-120km from trench (locked zone width)
  let score: number;
  if (minDist < 20) {
    score = 90; // On the trench itself
  } else if (minDist < 120) {
    score = 95; // Fully locked zone — highest risk
  } else if (minDist < 200) {
    // Transition zone
    score = Math.round(95 * (1 - (minDist - 120) / 80));
  } else {
    score = Math.max(5, Math.round(30 * Math.exp(-(minDist - 200) / 150)));
  }

  let detail: string;
  if (minDist < 120) {
    detail = `Within the fully locked zone (${minDist.toFixed(0)} km from trench)`;
  } else if (minDist < 200) {
    detail = `In the transition zone (${minDist.toFixed(0)} km from trench)`;
  } else {
    detail = `${minDist.toFixed(0)} km from subduction trench — creeping zone`;
  }

  return { score, detail };
}

// ---------------------------------------------------------------------------
// 4. Ground Hazard Score (NSHM 2023)
// ---------------------------------------------------------------------------
// Nearest-neighbor lookup on the USGS NSHM 2023 PGA grid.
// PGA is mapped to a 0-100 score: 0.0g=0, 0.2g=50, 0.6g+=100
function groundHazardScore(
  lat: number, lon: number,
  hazardGrid: HazardPoint[],
): { score: number; detail: string } {
  let minDist = Infinity;
  let nearestPGA = 0;

  for (const pt of hazardGrid) {
    const d = haversineKm(lat, lon, pt.lat, pt.lon);
    if (d < minDist) {
      minDist = d;
      nearestPGA = pt.pga;
    }
  }

  // Linear map: 0g → 0, 0.6g → 100
  const score = Math.min(100, Math.round((nearestPGA / 0.6) * 100));

  const detail = `PGA = ${nearestPGA.toFixed(3)}g (2% chance of exceedance in 50 years)`;

  return { score, detail };
}

// ---------------------------------------------------------------------------
// 5. Recurrence Gap Score
// ---------------------------------------------------------------------------
// Last Cascadia M9: January 26, 1700.
// Mean recurrence: ~243 years (Goldfinger et al. 2012, full-margin events).
// Current gap: 325+ years — already exceeds mean.
// Score based on how far into the cycle we are.
function recurrenceScore(): { score: number; detail: string } {
  const lastEventYear = 1700;
  const currentYear = new Date().getFullYear();
  const gapYears = currentYear - lastEventYear;
  const meanRecurrence = 243; // Goldfinger et al. 2012

  // Ratio of current gap to mean recurrence
  const ratio = gapYears / meanRecurrence;

  // Score: 50 at mean, 80 at 1.3x mean, 100 at 1.5x+
  const score = Math.min(100, Math.round(50 * Math.min(2, ratio)));

  const detail = `${gapYears} years since last M9 (mean interval: ${meanRecurrence} years, ${(ratio * 100).toFixed(0)}% of cycle)`;

  return { score, detail };
}

// ---------------------------------------------------------------------------
// Composite Risk Score
// ---------------------------------------------------------------------------
export interface RiskModelInputs {
  latitude: number;
  longitude: number;
  earthquakes: EarthquakeFeature[];
  hazardGrid: HazardPoint[];
  faultFeatures: FaultFeatureCollection;
}

function coordToSegment(coord: number[]): FaultSegment {
  return { lon: coord[0]!, lat: coord[1]! };
}

function extractFaultCoords(fc: FaultFeatureCollection): FaultSegment[][] {
  const result: FaultSegment[][] = [];
  for (const feature of fc.features) {
    const geom = feature.geometry;
    if (geom.type === 'LineString') {
      result.push((geom.coordinates as number[][]).map(coordToSegment));
    } else if (geom.type === 'MultiLineString') {
      for (const line of geom.coordinates as number[][][]) {
        result.push(line.map(coordToSegment));
      }
    }
  }
  return result;
}

function findMegathrustCoords(fc: FaultFeatureCollection): FaultSegment[] {
  for (const feature of fc.features) {
    if (feature.properties?.type === 'megathrust') {
      if (feature.geometry.type === 'LineString') {
        return (feature.geometry.coordinates as number[][]).map(coordToSegment);
      }
    }
  }
  return [];
}

function riskLevel(score: number): { level: RiskScore['level']; color: string } {
  if (score < 20) return { level: 'Low', color: '#22c55e' };
  if (score < 40) return { level: 'Moderate', color: '#eab308' };
  if (score < 60) return { level: 'High', color: '#f97316' };
  if (score < 80) return { level: 'Very High', color: '#ef4444' };
  return { level: 'Extreme', color: '#991b1b' };
}

export function computeRiskScore(inputs: RiskModelInputs): RiskScore {
  const { latitude, longitude, earthquakes, hazardGrid, faultFeatures } = inputs;

  const allFaultCoords = extractFaultCoords(faultFeatures);
  const megathrustCoords = findMegathrustCoords(faultFeatures);

  // Compute individual factors
  const seismicity = seismicityScore(latitude, longitude, earthquakes);
  const faultProx = faultProximityScore(latitude, longitude, allFaultCoords);
  const coupling = couplingScore(latitude, longitude, megathrustCoords);
  const hazard = groundHazardScore(latitude, longitude, hazardGrid);
  const recurrence = recurrenceScore();

  // Weights (must sum to 1.0)
  const factors: RiskFactor[] = [
    { label: 'Seismicity Rate', score: seismicity.score, weight: 0.20, detail: seismicity.detail },
    { label: 'Fault Proximity', score: faultProx.score, weight: 0.25, detail: faultProx.detail },
    { label: 'Subduction Coupling', score: coupling.score, weight: 0.20, detail: coupling.detail },
    { label: 'Ground Hazard (NSHM)', score: hazard.score, weight: 0.25, detail: hazard.detail },
    { label: 'Recurrence Gap', score: recurrence.score, weight: 0.10, detail: recurrence.detail },
  ];

  const composite = Math.round(
    factors.reduce((sum, f) => sum + f.score * f.weight, 0),
  );

  const { level, color } = riskLevel(composite);

  return { composite, level, color, factors, latitude, longitude };
}
