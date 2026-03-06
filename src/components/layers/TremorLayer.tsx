import { useEffect, useRef } from 'react';
import {
  Viewer,
  Cartesian3,
  Color,
  PointPrimitiveCollection,
  NearFarScalar,
} from 'cesium';
import { useTremorEpisodes } from '../../hooks/useTremorData';
import { useAppStore } from '../../store/useAppStore';

interface TremorLayerProps {
  viewer: Viewer;
}

function tremorColor(depth: number): Color {
  // Purple-tinted depth scale for ETS tremor
  if (depth < 30) return Color.fromCssColorString('#c084fc').withAlpha(0.9); // purple-400
  if (depth < 35) return Color.fromCssColorString('#a855f7').withAlpha(0.9); // purple-500
  if (depth < 40) return Color.fromCssColorString('#7c3aed').withAlpha(0.9); // violet-600
  return Color.fromCssColorString('#6d28d9').withAlpha(0.9); // violet-700
}

export default function TremorLayer({ viewer }: TremorLayerProps) {
  const visible = useAppStore((s) => s.layers.tremor.visible);
  const selectedEpisode = useAppStore((s) => s.selectedEtsEpisode);
  const tremorDay = useAppStore((s) => s.tremorAnimationDay);
  const { data } = useTremorEpisodes();
  const pointsRef = useRef<PointPrimitiveCollection | null>(null);

  useEffect(() => {
    if (pointsRef.current) {
      viewer.scene.primitives.remove(pointsRef.current);
      pointsRef.current = null;
    }

    if (!data || !visible || !selectedEpisode) return;

    const episode = data.episodes.find((e) => e.id === selectedEpisode);
    if (!episode) return;

    const frame = episode.frames.find((f) => f.day === tremorDay);
    if (!frame) return;

    const points = new PointPrimitiveCollection();

    // Show fading trail of previous 5 days for clearer migration visualization
    for (let d = Math.max(0, tremorDay - 5); d <= tremorDay; d++) {
      const trailFrame = episode.frames.find((f) => f.day === d);
      if (!trailFrame) continue;

      const age = tremorDay - d;
      const alphaMultiplier = age === 0 ? 1.0 : Math.max(0.15, 0.7 - age * 0.11);
      const isCurrent = age === 0;

      for (const evt of trailFrame.events) {
        const color = tremorColor(evt.depth);
        const baseSize = isCurrent ? 7 + evt.amplitude * 0.8 : 4 + evt.amplitude * 0.3;

        // Glow halo for current-day events
        if (isCurrent) {
          points.add({
            position: Cartesian3.fromDegrees(evt.lon, evt.lat, 0),
            pixelSize: baseSize * 2.5,
            color: new Color(color.red, color.green, color.blue, 0.15),
            scaleByDistance: new NearFarScalar(1.0e5, 1.5, 5.0e6, 0.4),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          });
        }

        // Core dot
        points.add({
          position: Cartesian3.fromDegrees(evt.lon, evt.lat, 0),
          pixelSize: baseSize,
          color: new Color(color.red, color.green, color.blue, Math.max(0.1, alphaMultiplier)),
          outlineColor: Color.fromCssColorString('#a855f7').withAlpha(isCurrent ? 0.6 : 0.1),
          outlineWidth: isCurrent ? 2 : 0,
          scaleByDistance: new NearFarScalar(1.0e5, 1.5, 5.0e6, 0.4),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        });
      }
    }

    viewer.scene.primitives.add(points);
    pointsRef.current = points;

    return () => {
      if (pointsRef.current) {
        viewer.scene.primitives.remove(pointsRef.current);
        pointsRef.current = null;
      }
    };
  }, [viewer, data, visible, selectedEpisode, tremorDay]);

  useEffect(() => {
    if (pointsRef.current) {
      pointsRef.current.show = visible;
    }
  }, [visible]);

  return null;
}
