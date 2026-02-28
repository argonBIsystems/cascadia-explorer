import { Color as CesiumColor } from 'cesium';

// --- Depth color scale ---

interface RGBColor {
  r: number;
  g: number;
  b: number;
  css: string;
}

interface DepthStop {
  depth: number;
  r: number;
  g: number;
  b: number;
}

const DEPTH_STOPS: DepthStop[] = [
  { depth: 0, r: 255, g: 68, b: 68 },     // #ff4444 red
  { depth: 10, r: 255, g: 140, b: 0 },     // #ff8c00 orange
  { depth: 30, r: 255, g: 215, b: 0 },     // #ffd700 gold
  { depth: 70, r: 0, g: 191, b: 255 },     // #00bfff cyan
  { depth: 150, r: 65, g: 105, b: 225 },   // #4169e1 blue
  { depth: 300, r: 138, g: 43, b: 226 },   // #8a2be2 violet
];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function toHex(n: number): string {
  const clamped = Math.round(Math.max(0, Math.min(255, n)));
  return clamped.toString(16).padStart(2, '0');
}

export function getDepthColor(depthKm: number): RGBColor {
  const d = Math.max(0, depthKm);

  // Below last stop
  const last = DEPTH_STOPS[DEPTH_STOPS.length - 1]!;
  if (d >= last.depth) {
    return { r: last.r, g: last.g, b: last.b, css: `#${toHex(last.r)}${toHex(last.g)}${toHex(last.b)}` };
  }

  // Find surrounding stops and interpolate
  for (let i = 0; i < DEPTH_STOPS.length - 1; i++) {
    const lo = DEPTH_STOPS[i]!;
    const hi = DEPTH_STOPS[i + 1]!;

    if (d >= lo.depth && d < hi.depth) {
      const t = (d - lo.depth) / (hi.depth - lo.depth);
      const r = lerp(lo.r, hi.r, t);
      const g = lerp(lo.g, hi.g, t);
      const b = lerp(lo.b, hi.b, t);
      return { r, g, b, css: `#${toHex(r)}${toHex(g)}${toHex(b)}` };
    }
  }

  // Fallback (should not reach here)
  const first = DEPTH_STOPS[0]!;
  return { r: first.r, g: first.g, b: first.b, css: `#${toHex(first.r)}${toHex(first.g)}${toHex(first.b)}` };
}

// --- Magnitude size ---

export function getMagnitudeSize(magnitude: number): number {
  if (magnitude < 2) return 6;
  if (magnitude < 3) return 8;
  if (magnitude < 4) return 12;
  if (magnitude < 5) return 18;
  if (magnitude < 6) return 26;
  return 36;
}

// --- Magnitude opacity ---

export function getMagnitudeOpacity(magnitude: number): number {
  if (magnitude < 2) return 0.6;
  if (magnitude < 3) return 0.7;
  if (magnitude < 4) return 0.8;
  if (magnitude < 5) return 0.9;
  return 1.0;
}

// --- Cesium Color helper ---

export function depthColorToCesium(depthKm: number, magnitude: number): CesiumColor {
  const { r, g, b } = getDepthColor(depthKm);
  const alpha = getMagnitudeOpacity(magnitude);
  return new CesiumColor(r / 255, g / 255, b / 255, alpha);
}
