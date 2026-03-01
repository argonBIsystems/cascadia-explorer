export type TimeRange = '24h' | '7d' | '30d' | '1yr';

export type LayerId = 'slab' | 'earthquakes' | 'faults' | 'gps' | 'scenarios' | 'tsunami' | 'annotations' | 'volcanoes' | 'coupling' | 'pioneer' | 'paleoseismic' | 'sensors' | 'tremor' | 'hazard';

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

export interface GPSStation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  velocityEast: number;   // mm/yr
  velocityNorth: number;  // mm/yr
  velocityUp: number;     // mm/yr
  speed: number;          // mm/yr (horizontal magnitude)
}

export interface ScenarioMeta {
  id: string;
  name: string;
  description: string;
  magnitude: number;
  type: 'full-margin' | 'southern-segment' | 'northern-segment' | 'variable';
}

export interface ScenarioGridPoint {
  latitude: number;
  longitude: number;
  mmi: number;           // Modified Mercalli Intensity
  pga: number;           // Peak Ground Acceleration (g)
}

export interface TsunamiFrame {
  time: number;           // minutes after rupture
  points: {
    latitude: number;
    longitude: number;
    height: number;       // wave height in meters
  }[];
}

export interface CoastalArrival {
  name: string;
  latitude: number;
  longitude: number;
  arrivalMinutes: number;
  maxHeight: number;      // meters
}

export type AnnotationCategory =
  | 'slab-tear'
  | 'terrane'
  | 'fluid-pathway'
  | 'slow-slip'
  | 'plate-deformation'
  | 'transform-fault'
  | 'slab-fragment';

export interface AnnotationPaper {
  title: string;
  authors: string;
  url: string;
}

export interface DiscoveryAnnotation {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  latitude: number;
  longitude: number;
  depth: number;
  category: AnnotationCategory;
  paper: AnnotationPaper;
}
