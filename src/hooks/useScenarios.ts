import { useQuery } from '@tanstack/react-query';
import type { ScenarioMeta, ScenarioGridPoint } from '../types';

interface ScenarioData {
  id: string;
  grid: ScenarioGridPoint[];
  cities: {
    name: string;
    latitude: number;
    longitude: number;
    mmi: number;
    pga: number;
  }[];
}

async function fetchScenarioIndex(): Promise<ScenarioMeta[]> {
  const response = await fetch('/data/scenarios/index.json');
  if (!response.ok) {
    throw new Error(`Failed to fetch scenario index: ${response.status}`);
  }
  return response.json() as Promise<ScenarioMeta[]>;
}

async function fetchScenarioData(id: string): Promise<ScenarioData> {
  const response = await fetch(`/data/scenarios/${id}.json`);
  if (!response.ok) {
    throw new Error(`Failed to fetch scenario ${id}: ${response.status}`);
  }
  return response.json() as Promise<ScenarioData>;
}

export function useScenarioIndex() {
  return useQuery({
    queryKey: ['scenario-index'],
    queryFn: fetchScenarioIndex,
    staleTime: Infinity,
  });
}

export function useScenarioData(id: string | null) {
  return useQuery({
    queryKey: ['scenario-data', id],
    queryFn: () => fetchScenarioData(id!),
    enabled: !!id,
    staleTime: Infinity,
  });
}
