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
import { usePaleoseismicData } from '../../hooks/usePaleoseismicData';
import { useAppStore } from '../../store/useAppStore';

const FULL_MARGIN_COLOR = Color.fromCssColorString('#ef4444').withAlpha(0.12);
const SOUTHERN_ONLY_COLOR = Color.fromCssColorString('#f97316').withAlpha(0.12);
const FULL_MARGIN_OUTLINE = Color.fromCssColorString('#ef4444').withAlpha(0.3);
const SOUTHERN_ONLY_OUTLINE = Color.fromCssColorString('#f97316').withAlpha(0.3);

interface PaleoseismicLayerProps {
  viewer: Viewer;
}

export default function PaleoseismicLayer({ viewer }: PaleoseismicLayerProps) {
  const visible = useAppStore((s) => s.layers.paleoseismic.visible);
  const { data } = usePaleoseismicData();
  const entitiesRef = useRef<Entity[]>([]);

  // Render rupture extent rectangles when data changes
  useEffect(() => {
    // Remove old entities
    for (const entity of entitiesRef.current) {
      viewer.entities.remove(entity);
    }
    entitiesRef.current = [];

    if (!data || !visible) return;

    for (const event of data.events) {
      if (!event.extent) continue;

      const isFullMargin = event.type === 'full-margin';
      const color = isFullMargin ? FULL_MARGIN_COLOR : SOUTHERN_ONLY_COLOR;
      const outlineColor = isFullMargin ? FULL_MARGIN_OUTLINE : SOUTHERN_ONLY_OUTLINE;

      const entity = viewer.entities.add({
        rectangle: new RectangleGraphics({
          coordinates: Rectangle.fromDegrees(
            -129.0,  // west (offshore)
            event.extent.south_lat,
            -123.5,  // east (coastline)
            event.extent.north_lat,
          ),
          material: new ColorMaterialProperty(color),
          outline: true,
          outlineColor,
          outlineWidth: 1,
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
