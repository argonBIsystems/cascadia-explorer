import { useAppStore } from '../../store/useAppStore';
import { useEarthquakes } from '../../hooks/useEarthquakes';
import SegmentedControl from '../ui/SegmentedControl';
import type { TimeRange } from '../../types';

const TIME_OPTIONS: { label: string; value: TimeRange }[] = [
  { label: '24h', value: '24h' },
  { label: '7d', value: '7d' },
  { label: '30d', value: '30d' },
  { label: '1yr', value: '1yr' },
];

export default function BottomBar() {
  const isMobile = useAppStore((s) => s.isMobile);
  const timeRange = useAppStore((s) => s.timeRange);
  const setTimeRange = useAppStore((s) => s.setTimeRange);
  const crossSectionOpen = useAppStore((s) => s.crossSectionOpen);
  const setCrossSectionOpen = useAppStore((s) => s.setCrossSectionOpen);
  const { data } = useEarthquakes();
  const eventCount = data?.length;

  // On mobile the BottomBar is replaced by MobileTabBar
  if (isMobile) return null;
  // Hide when cross-section is open to avoid overlap
  if (crossSectionOpen) return null;

  return (
    <div
      className="
        fixed bottom-4 left-1/2 -translate-x-1/2 z-40
        max-w-[600px] w-auto h-12
        bg-[#0c1222]/[0.92] backdrop-blur-xl
        border border-white/[0.18] rounded-2xl
        flex items-center justify-between px-3 gap-4
      "
    >
      {/* Left: Time range selector */}
      <SegmentedControl
        options={TIME_OPTIONS}
        value={timeRange}
        onChange={(v) => setTimeRange(v as TimeRange)}
      />

      {/* Cross-section toggle */}
      <button
        type="button"
        onClick={() => setCrossSectionOpen(!crossSectionOpen)}
        className={`
          shrink-0 h-7 px-2.5 rounded-lg text-xs font-medium
          border transition-colors cursor-pointer
          ${crossSectionOpen
            ? 'bg-emerald-500/20 border-emerald-400/30 text-emerald-300'
            : 'bg-white/[0.04] border-white/[0.08] text-slate-400 hover:text-slate-200'
          }
        `}
        style={{ fontFamily: '"DM Sans", sans-serif' }}
        aria-label="Toggle cross-section view"
      >
        <span className="flex items-center gap-1.5">
          {/* Cross-section icon: horizontal slice */}
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
            <path d="M2 10L6 4L10 8L12 6" />
            <path d="M2 12h10" strokeOpacity="0.4" />
          </svg>
          X-Section
        </span>
      </button>

      {/* Right: Live indicator + event count */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Pulsing live dot */}
        <span className="relative flex items-center justify-center w-[6px] h-[6px]">
          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-live-ping" />
          <span className="relative inline-flex rounded-full w-[6px] h-[6px] bg-emerald-400" />
        </span>

        {/* Event count */}
        <span
          className="text-slate-300"
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '13px',
          }}
        >
          {eventCount != null ? `${eventCount.toLocaleString()} events` : '\u2014 events'}
        </span>
      </div>

      {/* Pulse animation - fires every 5s */}
      <style>{`
        @keyframes live-ping {
          0% {
            transform: scale(1);
            opacity: 0.75;
          }
          20% {
            transform: scale(2.5);
            opacity: 0;
          }
          100% {
            transform: scale(2.5);
            opacity: 0;
          }
        }
        .animate-live-ping {
          animation: live-ping 5s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
      `}</style>
    </div>
  );
}
