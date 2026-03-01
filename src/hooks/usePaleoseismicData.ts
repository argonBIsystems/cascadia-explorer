import { useQuery } from '@tanstack/react-query';

export interface PaleoseismicEvent {
  id: string;
  name: string;
  age_cal_yr_bp: number;
  age_ce: number;
  uncertainty_yr: number;
  type: 'full-margin' | 'southern-only';
  rupture_length_km: number;
  estimated_magnitude: number;
  extent?: { north_lat: number; south_lat: number };
  notes?: string;
}

export interface PaleoseismicData {
  source: string;
  reference_url: string;
  statistics: {
    full_margin_count: number;
    full_margin_recurrence_yr: string;
    southern_only_count: number;
    oldest_event_cal_yr_bp: number;
    years_since_last: number;
  };
  events: PaleoseismicEvent[];
}

export function usePaleoseismicData() {
  return useQuery({
    queryKey: ['paleoseismic'],
    queryFn: async (): Promise<PaleoseismicData> => {
      const res = await fetch('/data/paleoseismic/rupture-history.json');
      if (!res.ok) throw new Error(`Failed to fetch paleoseismic data: ${res.status}`);
      return res.json();
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
