import { useEffect, useRef, useCallback } from 'react';
import {
  Viewer,
  Cartesian3,
  Cartesian2,
  Color,
  Entity,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  defined,
  VerticalOrigin,
  HorizontalOrigin,
  NearFarScalar,
  LabelStyle,
} from 'cesium';
import { useAnnotations } from '../../hooks/useAnnotations';
import { useAppStore } from '../../store/useAppStore';
import type { DiscoveryAnnotation } from '../../types';

const MARKER_COLOR = Color.fromCssColorString('#34d399'); // emerald-400
const MARKER_OUTLINE = Color.fromCssColorString('#059669'); // emerald-600
const MARKER_SIZE = 12;

interface AnnotationLayerProps {
  viewer: Viewer;
}

/**
 * Create a billboard image canvas with an emerald dot and radial glow.
 */
function createMarkerCanvas(): HTMLCanvasElement {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Outer glow ring
  const gradient = ctx.createRadialGradient(
    size / 2, size / 2, size * 0.15,
    size / 2, size / 2, size * 0.45,
  );
  gradient.addColorStop(0, 'rgba(52, 211, 153, 0.4)');
  gradient.addColorStop(1, 'rgba(52, 211, 153, 0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.45, 0, Math.PI * 2);
  ctx.fill();

  // Inner solid dot
  ctx.fillStyle = '#34d399';
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.15, 0, Math.PI * 2);
  ctx.fill();

  // White center highlight
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.beginPath();
  ctx.arc(size / 2 - 1, size / 2 - 1, size * 0.05, 0, Math.PI * 2);
  ctx.fill();

  return canvas;
}

export default function AnnotationLayer({ viewer }: AnnotationLayerProps) {
  const { data: annotations } = useAnnotations();
  const visible = useAppStore((s) => s.layers.annotations.visible);
  const setSelectedAnnotation = useAppStore((s) => s.setSelectedAnnotation);
  const setLayerLoading = useAppStore((s) => s.setLayerLoading);
  const setLayerError = useAppStore((s) => s.setLayerError);

  const entitiesRef = useRef<Entity[]>([]);
  const handlerRef = useRef<ScreenSpaceEventHandler | null>(null);
  const markerCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const annotationMapRef = useRef<Map<string, DiscoveryAnnotation>>(new Map());

  // Stable click handler for picking annotation entities
  const handleClick = useCallback(
    (event: ScreenSpaceEventHandler.PositionedEvent) => {
      const picked = viewer.scene.pick(event.position);

      if (defined(picked) && picked.id instanceof Entity) {
        const entityId = picked.id.id;
        if (entityId && annotationMapRef.current.has(entityId)) {
          setSelectedAnnotation(entityId);
        }
      }
    },
    [viewer, setSelectedAnnotation],
  );

  // Set up event handler once
  useEffect(() => {
    const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction(handleClick, ScreenSpaceEventType.LEFT_CLICK);
    handlerRef.current = handler;

    return () => {
      if (handlerRef.current) {
        handlerRef.current.destroy();
        handlerRef.current = null;
      }
    };
  }, [viewer, handleClick]);

  // Track loading state
  useEffect(() => {
    setLayerLoading('annotations', !annotations);
  }, [annotations, setLayerLoading]);

  // Create entities when annotation data arrives
  useEffect(() => {
    // Clean up previous entities
    for (const entity of entitiesRef.current) {
      viewer.entities.remove(entity);
    }
    entitiesRef.current = [];
    annotationMapRef.current.clear();

    if (!annotations) return;

    if (!markerCanvasRef.current) {
      markerCanvasRef.current = createMarkerCanvas();
    }

    try {
      for (const annotation of annotations) {
        const position = Cartesian3.fromDegrees(
          annotation.longitude,
          annotation.latitude,
          0,
        );

        const entity = viewer.entities.add({
          id: annotation.id,
          position,
          billboard: {
            image: markerCanvasRef.current,
            width: MARKER_SIZE * 4,
            height: MARKER_SIZE * 4,
            verticalOrigin: VerticalOrigin.CENTER,
            horizontalOrigin: HorizontalOrigin.CENTER,
            scaleByDistance: new NearFarScalar(1.0e5, 1.0, 8.0e6, 0.4),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          point: {
            pixelSize: MARKER_SIZE,
            color: MARKER_COLOR,
            outlineColor: MARKER_OUTLINE,
            outlineWidth: 2,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          label: {
            text: annotation.title,
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
        annotationMapRef.current.set(annotation.id, annotation);
      }

      setLayerError('annotations', null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create annotation entities';
      setLayerError('annotations', msg);
    }
  }, [viewer, annotations, setLayerError, visible]);

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
      annotationMapRef.current.clear();
    };
  }, [viewer]);

  return null;
}

/**
 * Retrieve an annotation by ID from the static data.
 * Used by AnnotationInfoCard to display details.
 */
export function useAnnotationById(id: string | null): DiscoveryAnnotation | null {
  const { data: annotations } = useAnnotations();
  if (!id || !annotations) return null;
  return annotations.find((a) => a.id === id) ?? null;
}
