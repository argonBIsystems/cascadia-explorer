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
