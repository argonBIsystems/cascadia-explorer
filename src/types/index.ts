export type TimeRange = '24h' | '7d' | '30d' | '1yr';

export type LayerId = 'slab' | 'earthquakes' | 'faults' | 'volcanoes' | 'risk';

export type ReferenceFrame = 'itrf' | 'nam14';

export interface LayerState {
  visible: boolean;
  loading: boolean;
  error: string | null;
}

export interface EarthquakeFeature {
  id: string;
  longitude: number;
  latitude: number;
  depth: number;       // km, positive downward
  magnitude: number;
  time: number;        // epoch ms
  place: string;
  url: string;         // USGS event page
  type: string;        // earthquake, quarry blast, etc.
}

export interface SelectedEarthquake extends EarthquakeFeature {}

export interface SelectedVolcano {
  vnum: string;
  name: string;
  latitude: number;
  longitude: number;
  elevation: number;
  alertLevel: string;
  threatScore: number;
}

export interface RiskFactor {
  label: string;
  score: number;         // 0–100
  weight: number;        // 0–1
  detail: string;
}

export interface RiskScore {
  composite: number;     // 0–100 weighted
  level: 'Low' | 'Moderate' | 'High' | 'Very High' | 'Extreme';
  color: string;
  factors: RiskFactor[];
  latitude: number;
  longitude: number;
}
