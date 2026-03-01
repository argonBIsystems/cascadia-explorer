import { useEffect, useRef } from 'react';
import {
  Viewer,
  Color,
  Entity,
  RectangleGraphics,
  Rectangle,
  ColorMaterialProperty,
  HeightReference,
} from 'cesium';
import { useHazardData } from '../../hooks/useHazardData';
import { useAppStore } from '../../store/useAppStore';

function pgaColor(pga: number): Color {
  if (pga < 0.05) return Color.TRANSPARENT;
  if (pga < 0.1) return Color.fromCssColorString('#22c55e').withAlpha(0.25);  // green
  if (pga < 0.2) return Color.fromCssColorString('#eab308').withAlpha(0.3);   // yellow
  if (pga < 0.4) return Color.fromCssColorString('#f97316').withAlpha(0.35);  // orange
  if (pga < 0.8) return Color.fromCssColorString('#ef4444').withAlpha(0.4);   // red
  return Color.fromCssColorString('#7f1d1d').withAlpha(0.45);                  // dark red
}

const CELL_SIZE = 0.5;

interface HazardLayerProps {
  viewer: Viewer;
}

export default function HazardLayer({ viewer }: HazardLayerProps) {
  const visible = useAppStore((s) => s.layers.hazard.visible);
  const { data } = useHazardData();
  const entitiesRef = useRef<Entity[]>([]);

  useEffect(() => {
    for (const entity of entitiesRef.current) {
      viewer.entities.remove(entity);
    }
    entitiesRef.current = [];

    if (!data || !visible) return;

    const half = CELL_SIZE / 2;

    for (const point of data.grid) {
      const color = pgaColor(point.pga);
      if (color.equals(Color.TRANSPARENT)) continue;

      const entity = viewer.entities.add({
        rectangle: new RectangleGraphics({
          coordinates: Rectangle.fromDegrees(
            point.lon - half,
            point.lat - half,
            point.lon + half,
            point.lat + half,
          ),
          material: new ColorMaterialProperty(color),
          heightReference: HeightReference.CLAMP_TO_GROUND,
        }),
      });

      entitiesRef.current.push(entity);
    }

    return () => {
      for (const entity of entitiesRef.current) {
        viewer.entities.remove(entity);
      }
      entitiesRef.current = [];
    };
  }, [viewer, data, visible]);

  useEffect(() => {
    for (const entity of entitiesRef.current) {
      entity.show = visible;
    }
  }, [visible]);

  return null;
}
