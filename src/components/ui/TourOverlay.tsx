import { useCallback, useEffect, useRef, useState } from 'react';
import { Viewer, Cartesian3, Math as CesiumMath } from 'cesium';
import { useAppStore } from '../../store/useAppStore';
import type { LayerId } from '../../types';

interface TourStop {
  id: string;
  title: string;
  narration: string;
  camera: { lat: number; lon: number; height: number; heading: number; pitch: number };
  layers: string[];
  duration: number;
}

interface TourData {
  title: string;
  stops: TourStop[];
}

interface TourOverlayProps {
  viewer: Viewer | null;
  onClose: () => void;
}

const ALL_LAYER_IDS: LayerId[] = ['slab', 'earthquakes', 'faults', 'volcanoes', 'risk'];

export default function TourOverlay({ viewer, onClose }: TourOverlayProps) {
  const [tourData, setTourData] = useState<TourData | null>(null);
  const [currentStop, setCurrentStop] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const layers = useAppStore((s) => s.layers);
  const isMobile = useAppStore((s) => s.isMobile);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedLayersRef = useRef<Record<string, boolean>>({});

  // Fetch tour data
  useEffect(() => {
    fetch('/data/tour/cascadia-story.json')
      .then((r) => r.json())
      .then((data: TourData) => setTourData(data))
      .catch(() => {});
  }, []);

  // Save current layer state on mount, restore on close
  useEffect(() => {
    const saved: Record<string, boolean> = {};
    for (const id of ALL_LAYER_IDS) {
      saved[id] = layers[id].visible;
    }
    savedLayersRef.current = saved;

    return () => {
      // Restore layers on unmount
      const current = useAppStore.getState().layers;
      for (const id of ALL_LAYER_IDS) {
        const shouldBeVisible = savedLayersRef.current[id] ?? false;
        if (current[id].visible !== shouldBeVisible) {
          useAppStore.getState().toggleLayer(id);
        }
      }
    };
  }, []);

  // Apply tour stop (camera + layers)
  const applyStop = useCallback((stop: TourStop) => {
    if (!viewer || viewer.isDestroyed()) return;

    // Fly camera
    viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(stop.camera.lon, stop.camera.lat, stop.camera.height),
      orientation: {
        heading: CesiumMath.toRadians(stop.camera.heading),
        pitch: CesiumMath.toRadians(stop.camera.pitch),
        roll: 0,
      },
      duration: 2,
    });

    // Toggle layers
    const current = useAppStore.getState().layers;
    for (const id of ALL_LAYER_IDS) {
      const shouldBeVisible = stop.layers.includes(id);
      if (current[id].visible !== shouldBeVisible) {
        useAppStore.getState().toggleLayer(id);
      }
    }
  }, [viewer]);

  // Apply current stop and schedule next
  useEffect(() => {
    if (!tourData || !isPlaying) return;

    const stop = tourData.stops[currentStop];
    if (!stop) return;

    applyStop(stop);

    timerRef.current = setTimeout(() => {
      if (currentStop < tourData.stops.length - 1) {
        setCurrentStop((s) => s + 1);
      } else {
        setIsPlaying(false);
      }
    }, stop.duration);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [tourData, currentStop, isPlaying, applyStop]);

  if (!tourData) return null;

  const stop = tourData.stops[currentStop];
  if (!stop) return null;

  const totalStops = tourData.stops.length;

  return (
    <div className="fixed inset-0 z-[55] pointer-events-none" style={{ fontFamily: '"DM Sans", sans-serif' }}>
      {/* Narration panel at bottom */}
      <div className={`absolute ${isMobile ? 'bottom-[60px] left-2 right-2' : 'bottom-8 left-1/2 -translate-x-1/2 w-[600px] max-w-[90vw]'} pointer-events-auto`}>
        <div className="bg-[#0c1222]/[0.95] backdrop-blur-xl border border-white/[0.18] rounded-2xl p-5 shadow-2xl">
          {/* Progress bar */}
          <div className="flex gap-1 mb-4">
            {tourData.stops.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => { setCurrentStop(i); setIsPlaying(true); }}
                className={`h-1 rounded-full flex-1 transition-all cursor-pointer ${
                  i === currentStop ? 'bg-emerald-400' : i < currentStop ? 'bg-emerald-400/30' : 'bg-white/[0.08]'
                }`}
              />
            ))}
          </div>

          {/* Stop counter */}
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-2">
            {currentStop + 1} of {totalStops}
          </div>

          {/* Title */}
          <h2 className="text-slate-100 text-lg font-semibold mb-2">{stop.title}</h2>

          {/* Narration */}
          <p className="text-slate-300 text-sm leading-relaxed mb-4">{stop.narration}</p>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { if (currentStop > 0) { setCurrentStop(currentStop - 1); setIsPlaying(true); } }}
              disabled={currentStop === 0}
              className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-30 transition-colors cursor-pointer"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-4 py-1.5 rounded-lg text-xs text-slate-300 hover:text-white bg-white/[0.06] hover:bg-white/[0.10] transition-colors cursor-pointer font-medium"
            >
              {isPlaying ? 'Pause' : 'Resume'}
            </button>
            <button
              type="button"
              onClick={() => { if (currentStop < totalStops - 1) { setCurrentStop(currentStop + 1); setIsPlaying(true); } }}
              disabled={currentStop === totalStops - 1}
              className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-30 transition-colors cursor-pointer"
            >
              Next
            </button>
            <div className="flex-1" />
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-300 bg-white/[0.04] hover:bg-white/[0.08] transition-colors cursor-pointer"
            >
              Exit Tour
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
