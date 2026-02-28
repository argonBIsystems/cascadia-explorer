import { useEffect, useRef } from 'react';
import {
  Viewer,
  GeoJsonDataSource,
  Color,
  PolylineDashMaterialProperty,
  ConstantProperty,
  ColorMaterialProperty,
} from 'cesium';
import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '../../store/useAppStore';

interface FaultLayerProps {
  viewer: Viewer;
}

// Fault type styling configuration
const FAULT_STYLES: Record<
  string,
  { color: Color; width: number; dashed: boolean }
> = {
  megathrust: {
    color: Color.fromCssColorString('#10b981').withAlpha(0.8),
    width: 3,
    dashed: false,
  },
  ridge: {
    color: Color.fromCssColorString('#ff8c00').withAlpha(1.0),
    width: 2,
    dashed: true,
  },
  transform: {
    color: Color.fromCssColorString('#cbd5e1').withAlpha(0.6),
    width: 1.5,
    dashed: false,
  },
  fault: {
    color: Color.fromCssColorString('#ef4444').withAlpha(0.6),
    width: 2,
    dashed: false,
  },
};

const DEFAULT_STYLE = {
  color: Color.WHITE.withAlpha(0.5),
  width: 1,
  dashed: false,
};

function useFaultData() {
  return useQuery({
    queryKey: ['fault-boundaries'],
    queryFn: async () => {
      const response = await fetch('/data/faults/plate-boundaries.json');
      if (!response.ok) {
        throw new Error(`Failed to fetch fault data: ${response.status}`);
      }
      return response.json();
    },
    staleTime: Infinity,
  });
}

export default function FaultLayer({ viewer }: FaultLayerProps) {
  const { data: faultGeoJson } = useFaultData();
  const visible = useAppStore((s) => s.layers.faults.visible);

  const dataSourceRef = useRef<GeoJsonDataSource | null>(null);

  // Load and style the GeoJSON data source
  useEffect(() => {
    if (!faultGeoJson) return;

    let cancelled = false;

    async function loadFaults() {
      const dataSource = await GeoJsonDataSource.load(faultGeoJson, {
        clampToGround: true,
        strokeWidth: 2,
        stroke: Color.WHITE,
      });

      if (cancelled) return;

      // Style each entity based on its fault type
      for (const entity of dataSource.entities.values) {
        const faultType =
          (entity.properties?.type?.getValue(viewer.clock.currentTime) as string) ?? '';
        const style = FAULT_STYLES[faultType] ?? DEFAULT_STYLE;

        if (entity.polyline) {
          entity.polyline.width = new ConstantProperty(style.width);

          if (style.dashed) {
            entity.polyline.material = new PolylineDashMaterialProperty({
              color: style.color,
              dashLength: 16,
            });
          } else {
            entity.polyline.material = new ColorMaterialProperty(style.color);
          }
        }
      }

      viewer.dataSources.add(dataSource);
      dataSourceRef.current = dataSource;
    }

    void loadFaults();

    return () => {
      cancelled = true;
      if (dataSourceRef.current) {
        viewer.dataSources.remove(dataSourceRef.current, true);
        dataSourceRef.current = null;
      }
    };
  }, [viewer, faultGeoJson]);

  // Toggle visibility
  useEffect(() => {
    const ds = dataSourceRef.current;
    if (ds) {
      ds.show = visible;
    }
  }, [visible]);

  return null;
}
