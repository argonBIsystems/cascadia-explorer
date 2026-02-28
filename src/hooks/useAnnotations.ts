import { useQuery } from '@tanstack/react-query';
import type { DiscoveryAnnotation } from '../types';

async function fetchAnnotations(): Promise<DiscoveryAnnotation[]> {
  const res = await fetch('/data/annotations/discoveries.json');
  if (!res.ok) throw new Error(`Failed to fetch annotations: ${res.status}`);
  return res.json();
}

export function useAnnotations() {
  return useQuery({
    queryKey: ['annotations'],
    queryFn: fetchAnnotations,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
