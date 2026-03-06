import { useEffect, useRef } from 'react';
import {
  Viewer,
  Cartesian3,
  Cartesian2,
  Color,
  Entity,
  VerticalOrigin,
  HorizontalOrigin,
  NearFarScalar,
  LabelStyle,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  defined,
} from 'cesium';
import { useVolcanoes, type VolcanoFeature } from '../../hooks/useVolcanoes';
import { useAppStore } from '../../store/useAppStore';

interface VolcanoLayerProps {
  viewer: Viewer;
}

/**
 * Map alert level to a triangle marker color.
 */
function alertColor(alert: VolcanoFeature['properties']['alert_level']): string {
  switch (alert) {
    case 'Warning':
      return '#ef4444';
    case 'Watch':
      return '#f97316';
    case 'Advisory':
      return '#eab308';
    case 'Normal':
    default:
      return '#22c55e';
  }
}

/**
 * Create a canvas with an upward-pointing triangle marker.
 */
function createTriangleCanvas(color: string): HTMLCanvasElement {
  const size = 48;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Draw triangle pointing up
  ctx.beginPath();
  ctx.moveTo(size / 2, 4);
  ctx.lineTo(size - 4, size - 4);
  ctx.lineTo(4, size - 4);
  ctx.closePath();

  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 2;
  ctx.stroke();

  return canvas;
}

export default function VolcanoLayer({ viewer }: VolcanoLayerProps) {
  const { data: volcanoes } = useVolcanoes();
  const visible = useAppStore((s) => s.layers.volcanoes.visible);
  const setLayerLoading = useAppStore((s) => s.setLayerLoading);
  const setLayerError = useAppStore((s) => s.setLayerError);
  const setSelectedVolcano = useAppStore((s) => s.setSelectedVolcano);

  const entitiesRef = useRef<Entity[]>([]);
  const canvasCacheRef = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const volcanoDataRef = useRef<Map<string, VolcanoFeature>>(new Map());
  const handlerRef = useRef<ScreenSpaceEventHandler | null>(null);

  // Track loading state
  useEffect(() => {
    setLayerLoading('volcanoes', !volcanoes);
  }, [volcanoes, setLayerLoading]);

  // Set up click handler
  useEffect(() => {
    const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);

    handler.setInputAction(
      (event: ScreenSpaceEventHandler.PositionedEvent) => {
        const picked = viewer.scene.pick(event.position);

        if (defined(picked) && picked.id instanceof Entity) {
          const entityId = picked.id.id;
          if (typeof entityId === 'string' && entityId.startsWith('volcano-')) {
            // Prevent Cesium from auto-tracking/flying to the entity
            viewer.selectedEntity = undefined;
            viewer.trackedEntity = undefined;

            const volcanoFeature = volcanoDataRef.current.get(entityId);
            if (volcanoFeature) {
              const [lon, lat] = volcanoFeature.geometry.coordinates;
              setSelectedVolcano({
                name: volcanoFeature.properties.name,
                latitude: lat,
                longitude: lon,
                elevation: volcanoFeature.properties.elev_m,
                alertLevel: volcanoFeature.properties.alert_level ?? 'Unknown',
                threatScore: volcanoFeature.properties.threat_score,
              });
            }
          }
        }
      },
      ScreenSpaceEventType.LEFT_CLICK,
    );

    handlerRef.current = handler;

    return () => {
      if (handlerRef.current) {
        handlerRef.current.destroy();
        handlerRef.current = null;
      }
    };
  }, [viewer, setSelectedVolcano]);

  // Create entities when volcano data arrives
  useEffect(() => {
    // Clean up previous entities
    for (const entity of entitiesRef.current) {
      viewer.entities.remove(entity);
    }
    entitiesRef.current = [];
    volcanoDataRef.current.clear();

    if (!volcanoes) return;

    try {
      for (const v of volcanoes) {
        const [lon, lat] = v.geometry.coordinates;
        const color = alertColor(v.properties.alert_level);

        // Cache canvas by color to avoid recreating identical canvases
        if (!canvasCacheRef.current.has(color)) {
          canvasCacheRef.current.set(color, createTriangleCanvas(color));
        }

        const position = Cartesian3.fromDegrees(lon, lat, 0);
        const entityId = `volcano-${v.properties.vnum}`;

        // Store volcano data for click handler lookup
        volcanoDataRef.current.set(entityId, v);

        const entity = viewer.entities.add({
          id: entityId,
          name: v.properties.name,
          position,
          billboard: {
            image: canvasCacheRef.current.get(color)!,
            width: 32,
            height: 32,
            verticalOrigin: VerticalOrigin.CENTER,
            horizontalOrigin: HorizontalOrigin.CENTER,
            scaleByDistance: new NearFarScalar(1.0e5, 1.0, 8.0e6, 0.4),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          point: {
            pixelSize: 8,
            color: Color.fromCssColorString(color),
            outlineColor: Color.fromCssColorString('rgba(255,255,255,0.6)'),
            outlineWidth: 1,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          label: {
            text: v.properties.name,
            font: '13px "DM Sans", sans-serif',
            fillColor: Color.fromCssColorString('#e2e8f0'),
            outlineColor: Color.fromCssColorString('#0f172a'),
            outlineWidth: 3,
            style: LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: VerticalOrigin.BOTTOM,
            horizontalOrigin: HorizontalOrigin.CENTER,
            pixelOffset: new Cartesian2(0, -22),
            scaleByDistance: new NearFarScalar(1.0e5, 1.0, 5.0e6, 0.0),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          show: visible,
        });

        entitiesRef.current.push(entity);
      }

      setLayerError('volcanoes', null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create volcano entities';
      setLayerError('volcanoes', msg);
    }
  }, [viewer, volcanoes, setLayerError, visible]);

  // Toggle visibility when layer state changes
  useEffect(() => {
    for (const entity of entitiesRef.current) {
      entity.show = visible;
    }
  }, [visible]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      for (const entity of entitiesRef.current) {
        viewer.entities.remove(entity);
      }
      entitiesRef.current = [];
    };
  }, [viewer]);

  return null;
}
