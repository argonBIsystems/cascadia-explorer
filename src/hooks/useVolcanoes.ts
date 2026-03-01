import { useQuery } from '@tanstack/react-query';

interface VolcanoProperties {
  vnum: string;
  name: string;
  elev_m: number;
  country: string;
  region: string;
  subregion: string;
  alert_level: 'Normal' | 'Advisory' | 'Watch' | 'Warning' | null;
  color_code: 'Green' | 'Yellow' | 'Orange' | 'Red' | null;
  threat_score: number;
}

export interface VolcanoFeature {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: VolcanoProperties;
}

export function useVolcanoes() {
  return useQuery({
    queryKey: ['volcanoes'],
    queryFn: async (): Promise<VolcanoFeature[]> => {
      const res = await fetch('https://volcanoes.usgs.gov/vsc/api/volcanoApi/geojson');
      if (!res.ok) throw new Error(`Volcano API error: ${res.status}`);
      const data = await res.json();
      // Filter to Cascade Range volcanoes (lat 40-52, lon -128 to -119)
      return data.features.filter((f: VolcanoFeature) => {
        const [lon, lat] = f.geometry.coordinates;
        return lat >= 40 && lat <= 52 && lon >= -128 && lon <= -119;
      });
    },
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
  });
}
