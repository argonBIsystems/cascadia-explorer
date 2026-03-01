import { create } from 'zustand';
import type { TimeRange, LayerId, LayerState, SelectedEarthquake, ReferenceFrame } from '../types';

interface AppState {
  // Layer visibility
  layers: Record<LayerId, LayerState>;
  toggleLayer: (id: LayerId) => void;
  setLayerLoading: (id: LayerId, loading: boolean) => void;
  setLayerError: (id: LayerId, error: string | null) => void;

  // Time range
  timeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;

  // Selected earthquake
  selectedEarthquake: SelectedEarthquake | null;
  setSelectedEarthquake: (eq: SelectedEarthquake | null) => void;

  // Globe ready state
  globeReady: boolean;
  setGlobeReady: (ready: boolean) => void;

  // Top bar visibility
  topBarVisible: boolean;
  setTopBarVisible: (visible: boolean) => void;

  // GPS reference frame
  referenceFrame: ReferenceFrame;
  setReferenceFrame: (frame: ReferenceFrame) => void;

  // Scenario selection
  selectedScenario: string | null;
  setSelectedScenario: (id: string | null) => void;

  // Tsunami animation
  animationPlaying: boolean;
  setAnimationPlaying: (playing: boolean) => void;
  animationTime: number;
  setAnimationTime: (time: number) => void;

  // Cross-section view
  crossSectionOpen: boolean;
  setCrossSectionOpen: (open: boolean) => void;
  crossSectionLat: number;
  setCrossSectionLat: (lat: number) => void;

  // Selected annotation
  selectedAnnotation: string | null;
  setSelectedAnnotation: (id: string | null) => void;

  // Historical timeline
  timelineOpen: boolean;
  setTimelineOpen: (open: boolean) => void;
  selectedTimelineEvent: string | null;
  setSelectedTimelineEvent: (id: string | null) => void;

  // What-If scenario builder
  whatIfLocation: { lat: number; lon: number } | null;
  setWhatIfLocation: (loc: { lat: number; lon: number } | null) => void;

  // ETS Tremor animation
  selectedEtsEpisode: string | null;
  setSelectedEtsEpisode: (id: string | null) => void;
  tremorAnimationPlaying: boolean;
  setTremorAnimationPlaying: (playing: boolean) => void;
  tremorAnimationDay: number;
  setTremorAnimationDay: (day: number) => void;

  // Mobile UI
  isMobile: boolean;
  setIsMobile: (mobile: boolean) => void;
  activeDrawer: 'layers' | 'scenarios' | 'info' | 'timeline' | null;
  setActiveDrawer: (drawer: 'layers' | 'scenarios' | 'info' | 'timeline' | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  layers: {
    slab: { visible: false, loading: false, error: null },
    earthquakes: { visible: false, loading: false, error: null },
    faults: { visible: true, loading: false, error: null },
    gps: { visible: false, loading: false, error: null },
    scenarios: { visible: false, loading: false, error: null },
    tsunami: { visible: false, loading: false, error: null },
    annotations: { visible: false, loading: false, error: null },
    volcanoes: { visible: false, loading: false, error: null },
    coupling: { visible: false, loading: false, error: null },
    pioneer: { visible: false, loading: false, error: null },
    paleoseismic: { visible: false, loading: false, error: null },
    sensors: { visible: false, loading: false, error: null },
    tremor: { visible: false, loading: false, error: null },
    hazard: { visible: false, loading: false, error: null },
  },
  toggleLayer: (id) =>
    set((state) => ({
      layers: {
        ...state.layers,
        [id]: { ...state.layers[id], visible: !state.layers[id].visible },
      },
    })),
  setLayerLoading: (id, loading) =>
    set((state) => ({
      layers: {
        ...state.layers,
        [id]: { ...state.layers[id], loading },
      },
    })),
  setLayerError: (id, error) =>
    set((state) => ({
      layers: {
        ...state.layers,
        [id]: { ...state.layers[id], error },
      },
    })),
  timeRange: '30d',
  setTimeRange: (range) => set({ timeRange: range }),
  selectedEarthquake: null,
  setSelectedEarthquake: (eq) => set({ selectedEarthquake: eq, selectedAnnotation: null }),
  globeReady: false,
  setGlobeReady: (ready) => set({ globeReady: ready }),
  topBarVisible: true,
  setTopBarVisible: (visible) => set({ topBarVisible: visible }),
  referenceFrame: 'nam14',
  setReferenceFrame: (frame) => set({ referenceFrame: frame }),
  selectedScenario: null,
  setSelectedScenario: (id) => set({ selectedScenario: id }),
  animationPlaying: false,
  setAnimationPlaying: (playing) => set({ animationPlaying: playing }),
  animationTime: 0,
  setAnimationTime: (time) => set({ animationTime: time }),
  crossSectionOpen: false,
  setCrossSectionOpen: (open) => set({ crossSectionOpen: open }),
  crossSectionLat: 46.0,
  setCrossSectionLat: (lat) => set({ crossSectionLat: lat }),
  selectedAnnotation: null,
  setSelectedAnnotation: (id) => set({ selectedAnnotation: id, selectedEarthquake: null }),
  timelineOpen: false,
  setTimelineOpen: (open) => set({ timelineOpen: open }),
  selectedTimelineEvent: null,
  setSelectedTimelineEvent: (id) => set({ selectedTimelineEvent: id }),
  whatIfLocation: null,
  setWhatIfLocation: (loc) => set({ whatIfLocation: loc }),
  selectedEtsEpisode: null,
  setSelectedEtsEpisode: (id) => set({ selectedEtsEpisode: id }),
  tremorAnimationPlaying: false,
  setTremorAnimationPlaying: (playing) => set({ tremorAnimationPlaying: playing }),
  tremorAnimationDay: 0,
  setTremorAnimationDay: (day) => set({ tremorAnimationDay: day }),
  isMobile: false,
  setIsMobile: (mobile) => set({ isMobile: mobile }),
  activeDrawer: null,
  setActiveDrawer: (drawer) => set((state) => ({
    activeDrawer: state.activeDrawer === drawer ? null : drawer,
  })),
}));
