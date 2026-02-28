import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '../store/useAppStore';
import { fetchEarthquakes } from '../lib/earthquake-api';

export function useEarthquakes() {
  const timeRange = useAppStore((s) => s.timeRange);

  return useQuery({
    queryKey: ['earthquakes', timeRange],
    queryFn: () => fetchEarthquakes(timeRange),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  });
}
