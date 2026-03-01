import { useQuery } from '@tanstack/react-query';

export interface LFEEvent {
  lat: number;
  lon: number;
  depth: number;
  magnitude: number;
}

export interface PioneerData {
  name: string;
  description: string;
  reference: string;
  outline: {
    type: string;
    coordinates: [number, number][];
  };
  depth_range_km: [number, number];
  motion: {
    direction_deg: number;
    rate_mm_yr: number;
    description: string;
  };
  lfe_events: LFEEvent[];
  connection_to_cascadia: {
    start: { lat: number; lon: number };
    end: { lat: number; lon: number };
    description: string;
  };
}

export function usePioneerData() {
  return useQuery({
    queryKey: ['pioneer'],
    queryFn: async (): Promise<PioneerData> => {
      const res = await fetch('/data/pioneer/fragment-geometry.json');
      if (!res.ok) throw new Error(`Failed to fetch Pioneer data: ${res.status}`);
      return res.json();
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
