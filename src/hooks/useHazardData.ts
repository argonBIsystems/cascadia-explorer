import { useQuery } from '@tanstack/react-query';

export interface HazardPoint {
  lat: number;
  lon: number;
  pga: number;
}

export interface HazardData {
  model: string;
  reference: string;
  parameters: {
    probability: string;
    site_class: string;
    spectral_period: string;
  };
  grid: HazardPoint[];
}

export function useHazardData() {
  return useQuery({
    queryKey: ['hazard'],
    queryFn: async (): Promise<HazardData> => {
      const res = await fetch('/data/hazard/nshm2023-pga.json');
      if (!res.ok) throw new Error(`Failed to fetch hazard data: ${res.status}`);
      return res.json();
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
