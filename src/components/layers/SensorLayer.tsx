import { useEffect, useRef } from 'react';
import {
  Viewer,
  Cartesian3,
  Cartesian2,
  Color,
  Entity,
  NearFarScalar,
  VerticalOrigin,
  HorizontalOrigin,
  LabelStyle,
} from 'cesium';
import { useSensorData } from '../../hooks/useSensorData';
import { useAppStore } from '../../store/useAppStore';

interface SensorLayerProps {
  viewer: Viewer;
}

/**
 * Create a circle billboard for cabled-observatory stations.
 * Filled circle with inner ring when solid; dashed outline when planned.
 */
function createCircleCanvas(color: string, isDashed: boolean): HTMLCanvasElement {
  const size = 40;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = isDashed ? 2 : 3;
  if (isDashed) ctx.setLineDash([4, 4]);
  ctx.stroke();

  if (!isDashed) {
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.3;
    ctx.fill();
    ctx.globalAlpha = 1.0;

    // Inner dot
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 4, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  return canvas;
}

/**
 * Create a diamond billboard for DART buoy stations.
 */
function createDiamondCanvas(color: string): HTMLCanvasElement {
  const size = 40;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 4;

  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + r, cy);
  ctx.lineTo(cx, cy + r);
  ctx.lineTo(cx - r, cy);
  ctx.closePath();

  ctx.fillStyle = color;
  ctx.globalAlpha = 0.3;
  ctx.fill();
  ctx.globalAlpha = 1.0;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();

  return canvas;
}

export default function SensorLayer({ viewer }: SensorLayerProps) {
  const visible = useAppStore((s) => s.layers.sensors.visible);
  const { data } = useSensorData();
  const entitiesRef = useRef<Entity[]>([]);
  const canvasCacheRef = useRef<Map<string, HTMLCanvasElement>>(new Map());

  // Create / recreate entities when data or visibility changes
  useEffect(() => {
    // Clean up previous entities
    for (const entity of entitiesRef.current) {
      viewer.entities.remove(entity);
    }
    entitiesRef.current = [];

    if (!data || !visible) return;

    for (const network of data.networks) {
      // Get or create canvas icon for this network type + color
      const cacheKey = `${network.type}-${network.color}`;
      if (!canvasCacheRef.current.has(cacheKey)) {
        let canvas: HTMLCanvasElement;
        if (network.type === 'deep-ocean-pressure') {
          canvas = createDiamondCanvas(network.color);
        } else if (network.type === 'planned') {
          canvas = createCircleCanvas(network.color, true);
        } else {
          canvas = createCircleCanvas(network.color, false);
        }
        canvasCacheRef.current.set(cacheKey, canvas);
      }
      const markerCanvas = canvasCacheRef.current.get(cacheKey)!;

      for (const station of network.stations) {
        const position = Cartesian3.fromDegrees(station.lon, station.lat, 0);
        const cesiumColor = Color.fromCssColorString(network.color);

        const entity = viewer.entities.add({
          position,
          billboard: {
            image: markerCanvas,
            width: 28,
            height: 28,
            verticalOrigin: VerticalOrigin.CENTER,
            horizontalOrigin: HorizontalOrigin.CENTER,
            scaleByDistance: new NearFarScalar(1.0e5, 1.2, 8.0e6, 0.4),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          label: {
            text: station.name,
            font: '11px "DM Sans", sans-serif',
            fillColor: Color.fromCssColorString('#e2e8f0'),
            outlineColor: Color.fromCssColorString('#0f172a'),
            outlineWidth: 3,
            style: LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: VerticalOrigin.BOTTOM,
            horizontalOrigin: HorizontalOrigin.CENTER,
            pixelOffset: new Cartesian2(0, -18),
            scaleByDistance: new NearFarScalar(1.0e5, 1.0, 3.0e6, 0.0),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          point: {
            pixelSize: 6,
            color: cesiumColor,
            outlineColor: cesiumColor.withAlpha(0.5),
            outlineWidth: 2,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          show: visible,
        });

        entitiesRef.current.push(entity);
      }
    }

    return () => {
      for (const entity of entitiesRef.current) {
        viewer.entities.remove(entity);
      }
      entitiesRef.current = [];
    };
  }, [viewer, data, visible]);

  // Toggle visibility without recreating entities
  useEffect(() => {
    for (const entity of entitiesRef.current) {
      entity.show = visible;
    }
  }, [visible]);

  return null;
}
