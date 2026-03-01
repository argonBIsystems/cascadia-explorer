import { useQuery } from '@tanstack/react-query';

export interface TremorEvent {
  lat: number;
  lon: number;
  depth: number;
  amplitude: number;
}

export interface TremorFrame {
  day: number;
  events: TremorEvent[];
}

export interface ETSEpisode {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  region: string;
  equivalentMagnitude: number;
  totalDays: number;
  frames: TremorFrame[];
}

export interface TremorData {
  source: string;
  reference: string;
  episodes: ETSEpisode[];
}

export function useTremorEpisodes() {
  return useQuery({
    queryKey: ['tremor-episodes'],
    queryFn: async (): Promise<TremorData> => {
      const res = await fetch('/data/tremor/ets-episodes.json');
      if (!res.ok) throw new Error(`Failed to fetch tremor data: ${res.status}`);
      return res.json();
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
