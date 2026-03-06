import { create } from 'zustand';
import type { TimeRange, LayerId, LayerState, SelectedEarthquake, SelectedVolcano, RiskScore } from '../types';

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

  // Cross-section view
  crossSectionOpen: boolean;
  setCrossSectionOpen: (open: boolean) => void;
  crossSectionLat: number;
  setCrossSectionLat: (lat: number) => void;

  // Selected volcano
  selectedVolcano: SelectedVolcano | null;
  setSelectedVolcano: (v: SelectedVolcano | null) => void;

  // Seismic Risk Analysis (ML)
  riskScore: RiskScore | null;
  setRiskScore: (score: RiskScore | null) => void;

  // Historical timeline
  timelineOpen: boolean;
  setTimelineOpen: (open: boolean) => void;
  selectedTimelineEvent: string | null;
  setSelectedTimelineEvent: (id: string | null) => void;

  // Mobile UI
  isMobile: boolean;
  setIsMobile: (mobile: boolean) => void;
  activeDrawer: 'layers' | 'info' | 'timeline' | null;
  setActiveDrawer: (drawer: 'layers' | 'info' | 'timeline' | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  layers: {
    slab: { visible: false, loading: false, error: null },
    earthquakes: { visible: false, loading: false, error: null },
    faults: { visible: true, loading: false, error: null },
    volcanoes: { visible: false, loading: false, error: null },
    risk: { visible: false, loading: false, error: null },
  },
  toggleLayer: (id) =>
    set((state) => {
      const wasVisible = state.layers[id].visible;
      const nowVisible = !wasVisible;
      const cleared: Partial<AppState> = {};
      if (wasVisible && !nowVisible) {
        if (id === 'earthquakes') cleared.selectedEarthquake = null;
        if (id === 'volcanoes') cleared.selectedVolcano = null;
        if (id === 'risk') cleared.riskScore = null;
      }
      return {
        ...cleared,
        layers: {
          ...state.layers,
          [id]: { ...state.layers[id], visible: nowVisible },
        },
      };
    }),
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
  setSelectedEarthquake: (eq) => set({
    selectedEarthquake: eq,
    selectedVolcano: null,
    riskScore: null,
    ...(eq != null ? { activeDrawer: null } : {}),
  }),
  globeReady: false,
  setGlobeReady: (ready) => set({ globeReady: ready }),
  topBarVisible: true,
  setTopBarVisible: (visible) => set({ topBarVisible: visible }),
  crossSectionOpen: false,
  setCrossSectionOpen: (open) => set({ crossSectionOpen: open }),
  crossSectionLat: 46.0,
  setCrossSectionLat: (lat) => set({ crossSectionLat: lat }),
  selectedVolcano: null,
  setSelectedVolcano: (v) => set({
    selectedVolcano: v,
    selectedEarthquake: null,
    riskScore: null,
    ...(v != null ? { activeDrawer: null } : {}),
  }),
  riskScore: null,
  setRiskScore: (score) => set({
    riskScore: score,
    selectedEarthquake: null,
    selectedVolcano: null,
    ...(score != null ? { activeDrawer: null } : {}),
  }),
  timelineOpen: false,
  setTimelineOpen: (open) => set({ timelineOpen: open }),
  selectedTimelineEvent: null,
  setSelectedTimelineEvent: (id) => set({ selectedTimelineEvent: id }),
  isMobile: false,
  setIsMobile: (mobile) => set({ isMobile: mobile }),
  activeDrawer: null,
  setActiveDrawer: (drawer) => set((state) => ({
    activeDrawer: state.activeDrawer === drawer ? null : drawer,
    ...(drawer != null && state.activeDrawer !== drawer
      ? { selectedEarthquake: null, selectedVolcano: null, riskScore: null }
      : {}),
  })),
}));
