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
  if (depth < 30) return Color.fromCssColorString('#c084fc').withAlpha(0.8); // purple-400
  if (depth < 35) return Color.fromCssColorString('#a855f7').withAlpha(0.8); // purple-500
  if (depth < 40) return Color.fromCssColorString('#7c3aed').withAlpha(0.8); // violet-600
  return Color.fromCssColorString('#6d28d9').withAlpha(0.8); // violet-700
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

    // Also show fading trail of previous 3 days
    for (let d = Math.max(0, tremorDay - 3); d <= tremorDay; d++) {
      const trailFrame = episode.frames.find((f) => f.day === d);
      if (!trailFrame) continue;

      const age = tremorDay - d;
      const alphaMultiplier = age === 0 ? 1.0 : 0.6 - age * 0.15;

      for (const evt of trailFrame.events) {
        const color = tremorColor(evt.depth);
        points.add({
          position: Cartesian3.fromDegrees(evt.lon, evt.lat, 0),
          pixelSize: age === 0 ? 6 + evt.amplitude : 4,
          color: new Color(color.red, color.green, color.blue, Math.max(0.1, alphaMultiplier)),
          outlineColor: Color.fromCssColorString('#a855f7').withAlpha(age === 0 ? 0.5 : 0.1),
          outlineWidth: age === 0 ? 2 : 0,
          scaleByDistance: new NearFarScalar(1.0e5, 1.5, 5.0e6, 0.3),
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
