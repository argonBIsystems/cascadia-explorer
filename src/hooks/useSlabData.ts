import { useQuery } from '@tanstack/react-query';

export interface SlabContourFeature {
  type: 'Feature';
  properties: {
    depth: number;
    [key: string]: unknown;
  };
  geometry: {
    type: 'LineString' | 'MultiLineString';
    coordinates: number[][] | number[][][];
  };
}

interface SlabContourCollection {
  type: 'FeatureCollection';
  features: SlabContourFeature[];
}

export interface SlabSurfaceData {
  lons: number[];
  lats: number[];
  depths: number[][];
  [key: string]: unknown;
}

async function fetchSlabContours(): Promise<SlabContourCollection> {
  const response = await fetch('/data/slab/cascadia-slab-contours.json');
  if (!response.ok) {
    throw new Error(`Failed to fetch slab contours: ${response.status}`);
  }
  return response.json() as Promise<SlabContourCollection>;
}

async function fetchSlabSurface(): Promise<SlabSurfaceData> {
  const response = await fetch('/data/slab/cascadia-slab-surface.json');
  if (!response.ok) {
    throw new Error(`Failed to fetch slab surface: ${response.status}`);
  }
  return response.json() as Promise<SlabSurfaceData>;
}

export function useSlabContours() {
  return useQuery({
    queryKey: ['slab-contours'],
    queryFn: fetchSlabContours,
    staleTime: Infinity,
  });
}

export function useSlabSurface() {
  return useQuery({
    queryKey: ['slab-surface'],
    queryFn: fetchSlabSurface,
    staleTime: Infinity,
  });
}

export function useSlabData() {
  const contours = useSlabContours();
  const surface = useSlabSurface();

  return {
    contours,
    surface,
    isLoading: contours.isLoading || surface.isLoading,
    isError: contours.isError || surface.isError,
  };
}
