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
import { useCouplingData } from '../../hooks/useCouplingData';
import { useAppStore } from '../../store/useAppStore';

function couplingColor(c: number): Color {
  if (c < 0.2) return Color.fromCssColorString('#3b82f6').withAlpha(0.3);
  if (c < 0.5) return Color.fromCssColorString('#a78bfa').withAlpha(0.35);
  if (c < 0.8) return Color.fromCssColorString('#f59e0b').withAlpha(0.45);
  return Color.fromCssColorString('#ef4444').withAlpha(0.55);
}

const CELL_SIZE = 0.2;

interface CouplingLayerProps {
  viewer: Viewer;
}

export default function CouplingLayer({ viewer }: CouplingLayerProps) {
  const visible = useAppStore((s) => s.layers.coupling.visible);
  const { data } = useCouplingData();
  const entitiesRef = useRef<Entity[]>([]);

  // Render grid cells when coupling data changes
  useEffect(() => {
    // Remove old entities
    for (const entity of entitiesRef.current) {
      viewer.entities.remove(entity);
    }
    entitiesRef.current = [];

    if (!data || !visible) return;

    const half = CELL_SIZE / 2;

    for (const point of data.grid) {
      if (point.coupling < 0.05) continue; // Don't render negligible coupling

      const color = couplingColor(point.coupling);

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

  // Toggle visibility
  useEffect(() => {
    for (const entity of entitiesRef.current) {
      entity.show = visible;
    }
  }, [visible]);

  return null;
}
