import { useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useTsunamiPropagation, useTsunamiArrivals } from '../../hooks/useTsunamiData';

export default function TsunamiPlayer() {
  const visible = useAppStore((s) => s.layers.tsunami.visible);
  const playing = useAppStore((s) => s.animationPlaying);
  const setPlaying = useAppStore((s) => s.setAnimationPlaying);
  const animationTime = useAppStore((s) => s.animationTime);
  const setAnimationTime = useAppStore((s) => s.setAnimationTime);
  const { data: propagation } = useTsunamiPropagation();
  const { data: arrivals } = useTsunamiArrivals();

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalMinutes = propagation?.metadata.totalMinutes ?? 240;
  const frameInterval = propagation?.metadata.frameIntervalMinutes ?? 4;

  // Playback loop
  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        setAnimationTime(
          useAppStore.getState().animationTime + frameInterval >= totalMinutes
            ? 0
            : useAppStore.getState().animationTime + frameInterval,
        );
      }, 200); // 5 FPS playback
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [playing, frameInterval, totalMinutes, setAnimationTime]);

  if (!visible) return null;

  const hours = Math.floor(animationTime / 60);
  const mins = animationTime % 60;
  const timeLabel = `${hours}h ${mins.toString().padStart(2, '0')}m`;
  const progress = (animationTime / totalMinutes) * 100;

  // Find arrivals that have occurred by current time
  const triggeredArrivals = arrivals?.filter((a) => a.arrivalMinutes <= animationTime) ?? [];

  return (
    <div className="fixed bottom-24 right-4 z-40 w-72 bg-[#0c1222]/[0.92] backdrop-blur-xl border border-white/[0.18] rounded-2xl p-4">
      <h3
        className="text-slate-100 mb-1"
        style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 600, fontSize: '14px' }}
      >
        Tsunami Propagation
      </h3>
      <p
        className="text-slate-400 mb-3"
        style={{ fontSize: '11px', lineHeight: 1.4 }}
      >
        Simulated M9.0 full-margin Cascadia megathrust rupture.
        <span className="text-slate-500"> Based on Priest et al. 2010, Witter et al. 2013, Gonzalez et al. 2009.</span>
      </p>

      {/* Time display */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-400 font-mono">{timeLabel} after rupture</span>
        <span className="text-xs text-slate-500 font-mono">{totalMinutes / 60}h total</span>
      </div>

      {/* Progress bar */}
      <div className="relative h-1.5 bg-white/[0.06] rounded-full mb-3">
        <div
          className="absolute left-0 top-0 h-full bg-cyan-400/60 rounded-full transition-[width] duration-200"
          style={{ width: `${progress}%` }}
        />
        <input
          type="range"
          min={0}
          max={totalMinutes}
          step={frameInterval}
          value={animationTime}
          onChange={(e) => setAnimationTime(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 mb-3">
        <button
          type="button"
          onClick={() => setAnimationTime(0)}
          className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] transition-colors cursor-pointer text-xs"
          aria-label="Reset"
        >
          &#8634;
        </button>
        <button
          type="button"
          onClick={() => setPlaying(!playing)}
          className="flex-1 h-7 flex items-center justify-center rounded-md text-slate-300 hover:text-white bg-white/[0.06] hover:bg-white/[0.10] transition-colors cursor-pointer text-xs font-medium"
        >
          {playing ? 'Pause' : 'Play'}
        </button>
      </div>

      {/* Arrival markers */}
      {triggeredArrivals.length > 0 && (
        <div className="border-t border-white/[0.06] pt-2">
          <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-1.5">
            Wave Arrivals
          </div>
          <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
            {triggeredArrivals.map((a) => (
              <div key={a.name} className="flex items-center justify-between text-xs">
                <span className="text-slate-400 truncate mr-2">{a.name}</span>
                <span className="text-cyan-400 font-mono shrink-0">{a.maxHeight.toFixed(1)}m</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
