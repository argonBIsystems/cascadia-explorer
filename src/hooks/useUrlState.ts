import { useEffect, useRef } from 'react';
import { Viewer, Cartesian3, Math as CesiumMath } from 'cesium';
import { useAppStore } from '../store/useAppStore';
import type { LayerId, TimeRange } from '../types';

const VALID_LAYERS: LayerId[] = ['slab', 'earthquakes', 'faults', 'gps', 'scenarios', 'tsunami', 'annotations', 'volcanoes', 'coupling', 'pioneer', 'paleoseismic', 'sensors', 'tremor', 'hazard'];
const VALID_TIME_RANGES: TimeRange[] = ['24h', '7d', '30d', '1yr'];

function parseHash(): Record<string, string> {
  const hash = window.location.hash.slice(1); // Remove #
  const params: Record<string, string> = {};
  for (const part of hash.split('&')) {
    const [key, val] = part.split('=');
    if (key && val) params[key] = decodeURIComponent(val);
  }
  return params;
}

function buildHash(params: Record<string, string>): string {
  return Object.entries(params)
    .filter(([, v]) => v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');
}

export function useUrlState(viewer: Viewer | null) {
  const initializedRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Apply URL state on mount (once)
  useEffect(() => {
    if (initializedRef.current || !viewer || viewer.isDestroyed()) return;

    const params = parseHash();
    if (Object.keys(params).length === 0) return;

    initializedRef.current = true;
    const store = useAppStore.getState();

    // Apply layers
    if (params.layers) {
      const requestedLayers = params.layers.split(',') as LayerId[];
      for (const layerId of VALID_LAYERS) {
        const shouldBeVisible = requestedLayers.includes(layerId);
        if (store.layers[layerId]?.visible !== shouldBeVisible) {
          store.toggleLayer(layerId);
        }
      }
    }

    // Apply time range
    if (params.time && VALID_TIME_RANGES.includes(params.time as TimeRange)) {
      store.setTimeRange(params.time as TimeRange);
    }

    // Apply scenario
    if (params.scenario) {
      store.setSelectedScenario(params.scenario);
    }

    // Apply camera position
    const lat = parseFloat(params.lat ?? '');
    const lon = parseFloat(params.lon ?? '');
    const h = parseFloat(params.h ?? '');
    if (!isNaN(lat) && !isNaN(lon) && !isNaN(h)) {
      const heading = parseFloat(params.heading ?? '') || 0;
      const pitch = parseFloat(params.pitch ?? '') || -45;
      viewer.camera.flyTo({
        destination: Cartesian3.fromDegrees(lon, lat, h),
        orientation: {
          heading: CesiumMath.toRadians(heading),
          pitch: CesiumMath.toRadians(pitch),
          roll: 0,
        },
        duration: 0,
      });
    }
  }, [viewer]);

  // Sync store changes to URL (debounced)
  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return;

    const unsubscribe = useAppStore.subscribe((state) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(() => {
        const visibleLayers = VALID_LAYERS.filter(
          (id) => state.layers[id]?.visible
        );

        const params: Record<string, string> = {};

        if (visibleLayers.length > 0) {
          params.layers = visibleLayers.join(',');
        }
        if (state.timeRange !== '30d') {
          params.time = state.timeRange;
        }
        if (state.selectedScenario) {
          params.scenario = state.selectedScenario;
        }

        // Get camera position
        try {
          const carto = viewer.camera.positionCartographic;
          if (carto) {
            params.lat = CesiumMath.toDegrees(carto.latitude).toFixed(2);
            params.lon = CesiumMath.toDegrees(carto.longitude).toFixed(2);
            params.h = Math.round(carto.height).toString();
          }
        } catch {
          // Camera may not be ready
        }

        const hash = buildHash(params);
        if (hash) {
          window.history.replaceState(null, '', `#${hash}`);
        } else {
          window.history.replaceState(null, '', window.location.pathname);
        }
      }, 1000); // 1s debounce
    });

    return () => {
      unsubscribe();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [viewer]);
}
