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
import { useScenarioData } from '../../hooks/useScenarios';
import { useAppStore } from '../../store/useAppStore';

interface ScenarioOverlayProps {
  viewer: Viewer;
}

// MMI -> Color (USGS ShakeMap palette)
function mmiColor(mmi: number): Color {
  if (mmi < 2) return Color.TRANSPARENT;
  if (mmi < 3) return Color.fromCssColorString('#bfccff').withAlpha(0.3);  // I-II light blue
  if (mmi < 4) return Color.fromCssColorString('#a0e6ff').withAlpha(0.35); // III cyan
  if (mmi < 5) return Color.fromCssColorString('#80ffb4').withAlpha(0.4);  // IV green
  if (mmi < 6) return Color.fromCssColorString('#ffff00').withAlpha(0.45); // V yellow
  if (mmi < 7) return Color.fromCssColorString('#ffc800').withAlpha(0.5);  // VI gold
  if (mmi < 8) return Color.fromCssColorString('#ff9100').withAlpha(0.55); // VII orange
  if (mmi < 9) return Color.fromCssColorString('#ff0000').withAlpha(0.55); // VIII red
  if (mmi < 10) return Color.fromCssColorString('#c80000').withAlpha(0.6); // IX dark red
  return Color.fromCssColorString('#800000').withAlpha(0.65);               // X+ maroon
}

const CELL_SIZE = 0.25; // degrees — matches grid spacing

export default function ScenarioOverlay({ viewer }: ScenarioOverlayProps) {
  const selectedScenario = useAppStore((s) => s.selectedScenario);
  const visible = useAppStore((s) => s.layers.scenarios.visible);
  const { data: scenarioData } = useScenarioData(selectedScenario);

  const entitiesRef = useRef<Entity[]>([]);

  // Render grid cells when scenario data changes
  useEffect(() => {
    // Remove old entities
    for (const entity of entitiesRef.current) {
      viewer.entities.remove(entity);
    }
    entitiesRef.current = [];

    if (!scenarioData || !visible || !selectedScenario) return;

    const half = CELL_SIZE / 2;

    for (const point of scenarioData.grid) {
      if (point.mmi < 3) continue; // Don't render very low intensities

      const color = mmiColor(point.mmi);

      const entity = viewer.entities.add({
        rectangle: new RectangleGraphics({
          coordinates: Rectangle.fromDegrees(
            point.longitude - half,
            point.latitude - half,
            point.longitude + half,
            point.latitude + half,
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
  }, [viewer, scenarioData, visible, selectedScenario]);

  // Toggle visibility
  useEffect(() => {
    for (const entity of entitiesRef.current) {
      entity.show = visible;
    }
  }, [visible]);

  return null;
}
