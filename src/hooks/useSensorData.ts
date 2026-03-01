import { useQuery } from '@tanstack/react-query';

export interface SensorStation {
  id: string;
  name: string;
  lat: number;
  lon: number;
  depth_m: number;
  instruments: string[];
  status: 'active' | 'planned';
}

export interface SensorNetwork {
  id: string;
  name: string;
  operator: string;
  type: string;
  url: string;
  color: string;
  stations: SensorStation[];
}

export interface SensorData {
  networks: SensorNetwork[];
}

export function useSensorData() {
  return useQuery({
    queryKey: ['sensors'],
    queryFn: async (): Promise<SensorData> => {
      const res = await fetch('/data/sensors/offshore-network.json');
      if (!res.ok) throw new Error(`Failed to fetch sensor data: ${res.status}`);
      return res.json();
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
