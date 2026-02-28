import { useQuery } from '@tanstack/react-query';
import type { TsunamiFrame, CoastalArrival } from '../types';

interface PropagationData {
  metadata: {
    totalMinutes: number;
    frameIntervalMinutes: number;
    totalFrames: number;
  };
  frames: TsunamiFrame[];
}

async function fetchPropagation(): Promise<PropagationData> {
  const response = await fetch('/data/tsunami/cascadia-propagation.json');
  if (!response.ok) {
    throw new Error(`Failed to fetch tsunami propagation: ${response.status}`);
  }
  return response.json() as Promise<PropagationData>;
}

async function fetchArrivals(): Promise<CoastalArrival[]> {
  const response = await fetch('/data/tsunami/coastal-arrivals.json');
  if (!response.ok) {
    throw new Error(`Failed to fetch tsunami arrivals: ${response.status}`);
  }
  return response.json() as Promise<CoastalArrival[]>;
}

export function useTsunamiPropagation() {
  return useQuery({
    queryKey: ['tsunami-propagation'],
    queryFn: fetchPropagation,
    staleTime: Infinity,
  });
}

export function useTsunamiArrivals() {
  return useQuery({
    queryKey: ['tsunami-arrivals'],
    queryFn: fetchArrivals,
    staleTime: Infinity,
  });
}
