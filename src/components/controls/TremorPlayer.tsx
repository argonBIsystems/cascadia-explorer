import { useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useTremorEpisodes } from '../../hooks/useTremorData';

export default function TremorPlayer() {
  const visible = useAppStore((s) => s.layers.tremor.visible);
  const isMobile = useAppStore((s) => s.isMobile);
  const selectedEpisode = useAppStore((s) => s.selectedEtsEpisode);
  const setSelectedEpisode = useAppStore((s) => s.setSelectedEtsEpisode);
  const playing = useAppStore((s) => s.tremorAnimationPlaying);
  const setPlaying = useAppStore((s) => s.setTremorAnimationPlaying);
  const day = useAppStore((s) => s.tremorAnimationDay);
  const setDay = useAppStore((s) => s.setTremorAnimationDay);
  const { data } = useTremorEpisodes();

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const episode = data?.episodes.find((e) => e.id === selectedEpisode);
  const totalDays = episode?.totalDays ?? 20;

  // Auto-select first episode when layer becomes visible
  useEffect(() => {
    if (visible && !selectedEpisode && data?.episodes?.length) {
      setSelectedEpisode(data.episodes[0]!.id);
    }
  }, [visible, selectedEpisode, data, setSelectedEpisode]);

  // Playback loop
  useEffect(() => {
    if (playing && episode) {
      intervalRef.current = setInterval(() => {
        const currentDay = useAppStore.getState().tremorAnimationDay;
        setDay(currentDay + 1 >= totalDays ? 0 : currentDay + 1);
      }, 500); // 2 FPS for daily progression
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [playing, episode, totalDays, setDay]);

  if (!visible || !data) return null;

  const progress = (day / totalDays) * 100;

  return (
    <div className={`fixed z-40 bg-[#0c1222]/[0.92] backdrop-blur-xl border border-white/[0.18] rounded-2xl p-4 ${
      isMobile ? 'bottom-[60px] left-2 right-2' : 'bottom-24 left-[17.5rem] w-72'
    }`}>
      <h3
        className="text-slate-100 mb-1"
        style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 600, fontSize: '14px' }}
      >
        Episodic Tremor &amp; Slip
      </h3>
      <p className="text-slate-400 mb-3" style={{ fontSize: '11px', lineHeight: 1.4 }}>
        Silent earthquakes — slow slip on the megathrust every ~14 months.
      </p>

      {/* Episode selector */}
      <div className="mb-3">
        <select
          value={selectedEpisode ?? ''}
          onChange={(e) => {
            setSelectedEpisode(e.target.value || null);
            setDay(0);
            setPlaying(false);
          }}
          className="w-full bg-white/[0.06] border border-white/[0.10] rounded-lg px-2 py-1.5 text-xs text-slate-300 outline-none cursor-pointer"
          style={{ fontFamily: '"DM Sans", sans-serif' }}
        >
          {data.episodes.map((ep) => (
            <option key={ep.id} value={ep.id} className="bg-[#0c1222] text-slate-300">
              {ep.label} (M{ep.equivalentMagnitude})
            </option>
          ))}
        </select>
      </div>

      {/* Day display */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-400 font-mono">Day {day + 1} of {totalDays}</span>
        {episode && (
          <span className="text-xs text-violet-400 font-mono">~M{episode.equivalentMagnitude}</span>
        )}
      </div>

      {/* Progress bar */}
      <div className="relative h-1.5 bg-white/[0.06] rounded-full mb-3">
        <div
          className="absolute left-0 top-0 h-full bg-violet-400/60 rounded-full transition-[width] duration-200"
          style={{ width: `${progress}%` }}
        />
        <input
          type="range"
          min={0}
          max={totalDays - 1}
          step={1}
          value={day}
          onChange={(e) => setDay(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => { setDay(0); setPlaying(false); }}
          className={`${isMobile ? 'min-h-[44px] min-w-[44px]' : 'w-7 h-7'} flex items-center justify-center rounded-md text-slate-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] transition-colors cursor-pointer text-xs`}
          aria-label="Reset"
        >
          &#8634;
        </button>
        <button
          type="button"
          onClick={() => setPlaying(!playing)}
          className={`flex-1 ${isMobile ? 'min-h-[44px]' : 'h-7'} flex items-center justify-center rounded-md text-slate-300 hover:text-white bg-white/[0.06] hover:bg-white/[0.10] transition-colors cursor-pointer text-xs font-medium`}
        >
          {playing ? 'Pause' : 'Play'}
        </button>
      </div>
    </div>
  );
}
