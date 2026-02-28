import { useEffect, useRef } from 'react';
import {
  Viewer,
  Cartesian3,
  PolylineCollection,
  Color,
  Material,
  Math as CesiumMath,
} from 'cesium';
import { useGPSData } from '../../hooks/useGPSData';
import { useAppStore } from '../../store/useAppStore';

interface GPSVectorLayerProps {
  viewer: Viewer;
}

// Scale factor: 1 mm/yr = this many meters on the globe
const VELOCITY_SCALE = 3000;
const ARROW_HEAD_LENGTH = 8000;
const ARROW_HEAD_ANGLE = 25; // degrees

// Velocity → color mapping (mm/yr)
function velocityColor(speed: number): Color {
  if (speed < 5) return Color.fromCssColorString('#60a5fa').withAlpha(0.7);   // blue - slow
  if (speed < 15) return Color.fromCssColorString('#34d399').withAlpha(0.8);  // emerald
  if (speed < 30) return Color.fromCssColorString('#fbbf24').withAlpha(0.9);  // amber
  return Color.fromCssColorString('#f87171').withAlpha(1.0);                   // red - fast
}

export default function GPSVectorLayer({ viewer }: GPSVectorLayerProps) {
  const referenceFrame = useAppStore((s) => s.referenceFrame);
  const { data: stations } = useGPSData(referenceFrame);
  const visible = useAppStore((s) => s.layers.gps.visible);

  const collectionRef = useRef<PolylineCollection | null>(null);

  // Create polyline collection once
  useEffect(() => {
    const collection = new PolylineCollection();
    viewer.scene.primitives.add(collection);
    collectionRef.current = collection;

    return () => {
      if (collectionRef.current) {
        viewer.scene.primitives.remove(collectionRef.current);
        collectionRef.current = null;
      }
    };
  }, [viewer]);

  // Rebuild arrows when data or reference frame changes
  useEffect(() => {
    const collection = collectionRef.current;
    if (!collection) return;

    collection.removeAll();

    if (!stations) return;

    for (const station of stations) {
      const speed = station.speed;
      if (speed < 1) continue; // Skip nearly-stationary stations

      // Convert velocity to bearing and distance
      const bearingRad = Math.atan2(station.velocityEast, station.velocityNorth);
      const distMeters = speed * VELOCITY_SCALE;

      // Compute endpoint
      const startLon = station.longitude;
      const startLat = station.latitude;

      // Approximate end position (good enough at this scale)
      const earthRadius = 6371000;
      const dLat = (distMeters * Math.cos(bearingRad)) / earthRadius;
      const dLon = (distMeters * Math.sin(bearingRad)) / (earthRadius * Math.cos(CesiumMath.toRadians(startLat)));

      const endLat = startLat + CesiumMath.toDegrees(dLat);
      const endLon = startLon + CesiumMath.toDegrees(dLon);

      const start = Cartesian3.fromDegrees(startLon, startLat, 100);
      const end = Cartesian3.fromDegrees(endLon, endLat, 100);

      const color = velocityColor(speed);

      // Main arrow shaft
      collection.add({
        positions: [start, end],
        width: Math.max(1.5, Math.min(4, speed / 10)),
        material: Material.fromType('Color', { color }),
      });

      // Arrowhead — two short lines
      const headAngleRad = CesiumMath.toRadians(ARROW_HEAD_ANGLE);
      const headLen = ARROW_HEAD_LENGTH;

      for (const sign of [-1, 1]) {
        const angle = bearingRad + Math.PI + sign * headAngleRad;
        const hdLat = (headLen * Math.cos(angle)) / earthRadius;
        const hdLon = (headLen * Math.sin(angle)) / (earthRadius * Math.cos(CesiumMath.toRadians(endLat)));
        const headLat = endLat + CesiumMath.toDegrees(hdLat);
        const headLon = endLon + CesiumMath.toDegrees(hdLon);

        const headPoint = Cartesian3.fromDegrees(headLon, headLat, 100);

        collection.add({
          positions: [end, headPoint],
          width: Math.max(1.5, Math.min(3, speed / 12)),
          material: Material.fromType('Color', { color }),
        });
      }
    }
  }, [stations, referenceFrame]);

  // Toggle visibility
  useEffect(() => {
    const collection = collectionRef.current;
    if (collection) {
      collection.show = visible;
    }
  }, [visible]);

  return null;
}
