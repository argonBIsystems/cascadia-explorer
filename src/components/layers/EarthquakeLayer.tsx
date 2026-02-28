import { useEffect, useRef } from 'react';
import {
  Viewer,
  Cartesian3,
  PointPrimitiveCollection,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  defined,
} from 'cesium';
import { useEarthquakes } from '../../hooks/useEarthquakes';
import { useAppStore } from '../../store/useAppStore';
import { getMagnitudeSize, depthColorToCesium } from '../../lib/color-scales';
import type { EarthquakeFeature } from '../../types';

// Render on the surface — depth is encoded in color, magnitude in size.
// The cross-section view shows true depth profiles.
const SURFACE_OFFSET = 100; // meters above ground to avoid z-fighting

interface EarthquakeLayerProps {
  viewer: Viewer;
}

export default function EarthquakeLayer({ viewer }: EarthquakeLayerProps) {
  const { data: earthquakes } = useEarthquakes();
  const visible = useAppStore((s) => s.layers.earthquakes.visible);
  const setSelectedEarthquake = useAppStore((s) => s.setSelectedEarthquake);

  const collectionRef = useRef<PointPrimitiveCollection | null>(null);
  const handlerRef = useRef<ScreenSpaceEventHandler | null>(null);
  const quakeIndexRef = useRef<EarthquakeFeature[]>([]);

  // Create the point collection and event handler once
  useEffect(() => {
    const collection = new PointPrimitiveCollection();
    viewer.scene.primitives.add(collection);
    collectionRef.current = collection;

    const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);

    handler.setInputAction(
      (event: ScreenSpaceEventHandler.PositionedEvent) => {
        const picked = viewer.scene.pick(event.position);

        if (defined(picked) && picked.collection === collectionRef.current) {
          // Find the index of the picked point in the collection
          const col = collectionRef.current;
          if (!col) return;

          const len = col.length;
          for (let i = 0; i < len; i++) {
            if (col.get(i) === picked.primitive) {
              const eq = quakeIndexRef.current[i];
              if (eq) {
                setSelectedEarthquake(eq);
              }
              return;
            }
          }
        } else {
          // Clicked on empty space
          setSelectedEarthquake(null);
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
      if (collectionRef.current) {
        viewer.scene.primitives.remove(collectionRef.current);
        collectionRef.current = null;
      }
    };
  }, [viewer, setSelectedEarthquake]);

  // Rebuild points when earthquake data changes
  useEffect(() => {
    const collection = collectionRef.current;
    if (!collection) return;

    collection.removeAll();
    quakeIndexRef.current = [];

    if (!earthquakes) return;

    const filtered = earthquakes.filter((eq) => eq.type === 'earthquake');

    for (const eq of filtered) {
      const position = Cartesian3.fromDegrees(
        eq.longitude,
        eq.latitude,
        SURFACE_OFFSET,
      );

      collection.add({
        position,
        pixelSize: getMagnitudeSize(eq.magnitude),
        color: depthColorToCesium(eq.depth, eq.magnitude),
      });

      quakeIndexRef.current.push(eq);
    }
  }, [earthquakes]);

  // Toggle visibility when layer state changes
  useEffect(() => {
    const collection = collectionRef.current;
    if (collection) {
      collection.show = visible;
    }
  }, [visible]);

  // This component renders nothing to the DOM
  return null;
}
