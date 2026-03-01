import { useAppStore } from '../../store/useAppStore';
import { useEarthquakes } from '../../hooks/useEarthquakes';
import DrawerOverlay from '../ui/DrawerOverlay';
import SegmentedControl from '../ui/SegmentedControl';
import type { TimeRange } from '../../types';

const TIME_OPTIONS: { label: string; value: TimeRange }[] = [
  { label: '24h', value: '24h' },
  { label: '7d', value: '7d' },
  { label: '30d', value: '30d' },
  { label: '1yr', value: '1yr' },
];

export default function MobileToolsDrawer() {
  const activeDrawer = useAppStore((s) => s.activeDrawer);
  const setActiveDrawer = useAppStore((s) => s.setActiveDrawer);
  const timeRange = useAppStore((s) => s.timeRange);
  const setTimeRange = useAppStore((s) => s.setTimeRange);
  const crossSectionOpen = useAppStore((s) => s.crossSectionOpen);
  const setCrossSectionOpen = useAppStore((s) => s.setCrossSectionOpen);
  const { data } = useEarthquakes();
  const eventCount = data?.length;

  return (
    <DrawerOverlay
      open={activeDrawer === 'info'}
      side="right"
      onClose={() => setActiveDrawer(null)}
    >
      <div className="p-4 pt-14">
        <h2
          className="text-slate-100 mb-4"
          style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 600, fontSize: '15px' }}
        >
          Tools
        </h2>

        {/* Time Range */}
        <div className="mb-5">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-2">
            Earthquake Time Range
          </div>
          <SegmentedControl
            options={TIME_OPTIONS}
            value={timeRange}
            onChange={(v) => setTimeRange(v as TimeRange)}
          />
          {eventCount != null && (
            <div className="mt-2 flex items-center gap-2">
              <span className="relative flex w-1.5 h-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full w-1.5 h-1.5 bg-emerald-400" />
              </span>
              <span className="text-slate-400 font-mono" style={{ fontSize: '12px' }}>
                {eventCount.toLocaleString()} events
              </span>
            </div>
          )}
        </div>

        {/* Cross-Section Toggle */}
        <div className="mb-5">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-2">
            Cross-Section View
          </div>
          <button
            type="button"
            onClick={() => {
              setCrossSectionOpen(!crossSectionOpen);
              setActiveDrawer(null);
            }}
            className={`
              w-full h-10 px-3 rounded-lg text-sm font-medium
              border transition-colors cursor-pointer flex items-center gap-2
              ${crossSectionOpen
                ? 'bg-emerald-500/20 border-emerald-400/30 text-emerald-300'
                : 'bg-white/[0.04] border-white/[0.08] text-slate-400'
              }
            `}
            style={{ fontFamily: '"DM Sans", sans-serif' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
              <path d="M2 10L6 4L10 8L12 6" />
              <path d="M2 12h10" strokeOpacity="0.4" />
            </svg>
            {crossSectionOpen ? 'Close X-Section' : 'Open X-Section'}
          </button>
        </div>
      </div>
    </DrawerOverlay>
  );
}
