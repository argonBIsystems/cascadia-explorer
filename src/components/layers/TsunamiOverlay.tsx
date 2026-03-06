import { useEffect, useRef } from 'react';
import {
  Viewer,
  Cartesian3,
  Color,
  PointPrimitiveCollection,
} from 'cesium';
import { useTsunamiPropagation } from '../../hooks/useTsunamiData';
import { useAppStore } from '../../store/useAppStore';

interface TsunamiOverlayProps {
  viewer: Viewer;
}

// Wave height -> color (bright and visible)
function waveColor(height: number): Color {
  const h = Math.abs(height);
  if (h < 0.05) return Color.TRANSPARENT;
  if (h < 0.5) return Color.fromCssColorString('#60a5fa').withAlpha(0.5);   // light blue
  if (h < 1.0) return Color.fromCssColorString('#38bdf8').withAlpha(0.6);   // sky
  if (h < 2.0) return Color.fromCssColorString('#22d3ee').withAlpha(0.7);   // cyan
  if (h < 4.0) return Color.fromCssColorString('#fbbf24').withAlpha(0.85);  // amber
  if (h < 8.0) return Color.fromCssColorString('#f97316').withAlpha(0.9);   // orange
  return Color.fromCssColorString('#ef4444').withAlpha(1.0);                 // red
}

// Glow halo color (dimmer version for halo effect)
function waveGlowColor(height: number): Color {
  const h = Math.abs(height);
  if (h < 0.05) return Color.TRANSPARENT;
  if (h < 0.5) return Color.fromCssColorString('#60a5fa').withAlpha(0.15);
  if (h < 1.0) return Color.fromCssColorString('#38bdf8').withAlpha(0.18);
  if (h < 2.0) return Color.fromCssColorString('#22d3ee').withAlpha(0.2);
  if (h < 4.0) return Color.fromCssColorString('#fbbf24').withAlpha(0.25);
  if (h < 8.0) return Color.fromCssColorString('#f97316').withAlpha(0.28);
  return Color.fromCssColorString('#ef4444').withAlpha(0.3);
}

function waveSize(height: number): number {
  const h = Math.abs(height);
  if (h < 0.05) return 0;
  return Math.max(6, Math.min(20, h * 6 + 4));
}

/**
 * Approximate Pacific NW coastline longitude by latitude.
 * Returns true if the point is clearly on land (east of coast + small buffer).
 * Allows ~0.2° (~20km) inland for realistic coastal inundation.
 */
function isOnLand(lat: number, lon: number): boolean {
  let coastLon: number;
  if (lat > 50) coastLon = -127.5;       // BC coast (complex fjords)
  else if (lat > 48.5) coastLon = -124.7; // Strait of Juan de Fuca
  else if (lat > 47.0) coastLon = -124.3; // Washington coast
  else if (lat > 46.2) coastLon = -124.0; // Southern WA
  else if (lat > 46.0) coastLon = -123.9; // Columbia River mouth
  else if (lat > 43.5) coastLon = -124.2; // Central Oregon coast
  else if (lat > 42.0) coastLon = -124.4; // Southern Oregon coast
  else if (lat > 40.5) coastLon = -124.3; // Northern California
  else coastLon = -124.0;

  // Allow 0.3° (~25km) east of coastline for inundation visualization
  return lon > coastLon + 0.3;
}

export default function TsunamiOverlay({ viewer }: TsunamiOverlayProps) {
  const visible = useAppStore((s) => s.layers.tsunami.visible);
  const animationTime = useAppStore((s) => s.animationTime);
  const { data: propagation } = useTsunamiPropagation();

  const pointsRef = useRef<PointPrimitiveCollection | null>(null);

  // Create point collection once
  useEffect(() => {
    const collection = new PointPrimitiveCollection();
    viewer.scene.primitives.add(collection);
    pointsRef.current = collection;

    return () => {
      if (pointsRef.current) {
        viewer.scene.primitives.remove(pointsRef.current);
        pointsRef.current = null;
      }
    };
  }, [viewer]);

  // Update points when animation time changes
  useEffect(() => {
    const collection = pointsRef.current;
    if (!collection || !propagation) return;

    collection.removeAll();

    if (!visible) return;

    // Find the frame closest to the current animation time
    const { frames, metadata } = propagation;
    const frameIndex = Math.min(
      Math.floor(animationTime / metadata.frameIntervalMinutes),
      frames.length - 1,
    );

    if (frameIndex < 0 || !frames[frameIndex]) return;

    const frame = frames[frameIndex];

    // First pass: glow halos (larger, dimmer)
    for (const point of frame.points) {
      if (Math.abs(point.height) < 0.05) continue;
      if (isOnLand(point.latitude, point.longitude)) continue;

      const size = waveSize(point.height);
      const pos = Cartesian3.fromDegrees(point.longitude, point.latitude, 0);

      collection.add({
        position: pos,
        pixelSize: size * 2,
        color: waveGlowColor(point.height),
      });
    }

    // Second pass: core dots (bright and solid)
    for (const point of frame.points) {
      if (Math.abs(point.height) < 0.05) continue;
      if (isOnLand(point.latitude, point.longitude)) continue;

      collection.add({
        position: Cartesian3.fromDegrees(point.longitude, point.latitude, 0),
        pixelSize: waveSize(point.height),
        color: waveColor(point.height),
      });
    }
  }, [propagation, animationTime, visible]);

  // Toggle visibility
  useEffect(() => {
    const collection = pointsRef.current;
    if (collection) {
      collection.show = visible;
    }
  }, [visible]);

  return null;
}
