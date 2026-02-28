import { useQuery } from '@tanstack/react-query';
import type { GPSStation, ReferenceFrame } from '../types';

async function fetchGPSData(frame: ReferenceFrame): Promise<GPSStation[]> {
  const file = frame === 'nam14' ? 'velocity-vectors-nam14.json' : 'velocity-vectors-itrf.json';
  const response = await fetch(`/data/gps/${file}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch GPS data: ${response.status}`);
  }
  return response.json() as Promise<GPSStation[]>;
}

export function useGPSData(frame: ReferenceFrame) {
  return useQuery({
    queryKey: ['gps-vectors', frame],
    queryFn: () => fetchGPSData(frame),
    staleTime: Infinity,
  });
}
