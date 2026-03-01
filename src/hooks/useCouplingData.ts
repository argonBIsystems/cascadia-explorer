import { useQuery } from '@tanstack/react-query';

export interface CouplingPoint {
  lat: number;
  lon: number;
  depth: number;
  coupling: number;
}

interface CouplingData {
  model: string;
  reference: string;
  grid: CouplingPoint[];
}

export function useCouplingData() {
  return useQuery({
    queryKey: ['coupling'],
    queryFn: async (): Promise<CouplingData> => {
      const res = await fetch('/data/coupling/interseismic-locking.json');
      if (!res.ok) throw new Error(`Failed to fetch coupling data: ${res.status}`);
      return res.json();
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
