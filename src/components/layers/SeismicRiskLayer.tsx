import { useEffect, useRef } from 'react';
import {
  Viewer,
  Cartesian3,
  Cartographic,
  Entity,
  Math as CesiumMath,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  VerticalOrigin,
  NearFarScalar,
} from 'cesium';
import { useEarthquakes } from '../../hooks/useEarthquakes';
import { useHazardData } from '../../hooks/useHazardData';
import { useAppStore } from '../../store/useAppStore';
import { computeRiskScore } from '../../lib/risk-model';
import type { FaultFeatureCollection } from '../../lib/risk-model';

interface SeismicRiskLayerProps {
  viewer: Viewer;
}

function createPulseCanvas(color: string): HTMLCanvasElement {
  const size = 48;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Outer ring
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Inner filled circle
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, 6, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  return canvas;
}

export default function SeismicRiskLayer({ viewer }: SeismicRiskLayerProps) {
  const visible = useAppStore((s) => s.layers.risk.visible);
  const riskScore = useAppStore((s) => s.riskScore);
  const setRiskScore = useAppStore((s) => s.setRiskScore);
  const { data: earthquakes } = useEarthquakes();
  const { data: hazardData } = useHazardData();

  const handlerRef = useRef<ScreenSpaceEventHandler | null>(null);
  const markerRef = useRef<Entity | null>(null);
  const faultDataRef = useRef<FaultFeatureCollection | null>(null);

  // Load fault data once for the risk model
  useEffect(() => {
    fetch('/data/faults/plate-boundaries.json')
      .then((r) => r.json())
      .then((data: FaultFeatureCollection) => {
        faultDataRef.current = data;
      })
      .catch(() => { /* fault data optional for risk scoring */ });
  }, []);

  // Click handler — compute risk on click when layer is visible
  useEffect(() => {
    if (!visible) {
      if (handlerRef.current) {
        handlerRef.current.destroy();
        handlerRef.current = null;
      }
      return;
    }

    const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);

    handler.setInputAction(
      (event: ScreenSpaceEventHandler.PositionedEvent) => {
        // Don't compute if we're clicking on an existing entity
        const picked = viewer.scene.pick(event.position);
        if (picked?.id || picked?.primitive) return;

        const cartesian = viewer.scene.pickPosition(event.position)
          ?? viewer.camera.pickEllipsoid(event.position, viewer.scene.globe.ellipsoid);
        if (!cartesian) return;

        const carto = Cartographic.fromCartesian(cartesian);
        const lat = CesiumMath.toDegrees(carto.latitude);
        const lon = CesiumMath.toDegrees(carto.longitude);

        // Bounds check — only compute within Cascadia region
        if (lat < 39 || lat > 52 || lon < -130 || lon > -118) return;

        if (!earthquakes || !hazardData?.grid || !faultDataRef.current) return;

        const score = computeRiskScore({
          latitude: lat,
          longitude: lon,
          earthquakes,
          hazardGrid: hazardData.grid,
          faultFeatures: faultDataRef.current,
        });

        setRiskScore(score);
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
  }, [viewer, visible, earthquakes, hazardData, setRiskScore]);

  // Show/update marker at risk location
  useEffect(() => {
    // Remove previous marker
    if (markerRef.current) {
      viewer.entities.remove(markerRef.current);
      markerRef.current = null;
    }

    if (!visible || !riskScore) return;

    const canvas = createPulseCanvas(riskScore.color);

    const entity = viewer.entities.add({
      position: Cartesian3.fromDegrees(riskScore.longitude, riskScore.latitude, 50),
      billboard: {
        image: canvas,
        width: 36,
        height: 36,
        verticalOrigin: VerticalOrigin.CENTER,
        scaleByDistance: new NearFarScalar(1e5, 1.2, 5e6, 0.5),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });

    markerRef.current = entity;

    return () => {
      if (markerRef.current) {
        viewer.entities.remove(markerRef.current);
        markerRef.current = null;
      }
    };
  }, [viewer, visible, riskScore]);

  return null;
}
