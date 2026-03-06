import { useCallback } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useEarthquakes } from '../../hooks/useEarthquakes';

type DrawerType = 'layers' | 'info' | 'timeline';

const TABS: { id: DrawerType; label: string; icon: string }[] = [
  { id: 'layers', label: 'Layers', icon: 'M3 6h18M3 12h18M3 18h18' },
  { id: 'info', label: 'Tools', icon: 'M12 8V4l8 8-8 8v-4H4V8h8z' },
  { id: 'timeline', label: 'Timeline', icon: 'M12 2a10 10 0 100 20 10 10 0 000-20zm0 4v6l4 2' },
];

export default function MobileTabBar() {
  const activeDrawer = useAppStore((s) => s.activeDrawer);
  const setActiveDrawer = useAppStore((s) => s.setActiveDrawer);
  const setTimelineOpen = useAppStore((s) => s.setTimelineOpen);
  const timelineOpen = useAppStore((s) => s.timelineOpen);
  const { data } = useEarthquakes();
  const eventCount = data?.length;

  const handleTabClick = useCallback((tabId: DrawerType) => {
    if (tabId === 'timeline') {
      setTimelineOpen(!timelineOpen);
      setActiveDrawer(null);
    } else {
      if (timelineOpen) setTimelineOpen(false);
      setActiveDrawer(tabId);
    }
  }, [setActiveDrawer, setTimelineOpen, timelineOpen]);

  return (
    <nav
      className="
        fixed bottom-0 left-0 right-0 z-40
        bg-[#0c1222]/[0.96] backdrop-blur-xl
        border-t border-white/[0.12]
        flex items-stretch
        pb-[env(safe-area-inset-bottom)]
      "
      style={{ fontFamily: '"DM Sans", sans-serif' }}
    >
      {TABS.map((tab) => {
        const isActive = tab.id === 'timeline' ? timelineOpen : activeDrawer === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleTabClick(tab.id)}
            className={`
              flex-1 flex flex-col items-center justify-center gap-0.5
              min-h-[56px] transition-colors cursor-pointer
              ${isActive ? 'text-emerald-400' : 'text-slate-500'}
            `}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill={tab.id === 'info' ? 'currentColor' : 'none'}
              stroke={tab.id === 'info' ? 'none' : 'currentColor'}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d={tab.icon} />
            </svg>
            <span style={{ fontSize: '10px', fontWeight: 500 }}>{tab.label}</span>
          </button>
        );
      })}

      {/* Live event count pill */}
      {eventCount != null && (
        <div className="absolute top-1 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10">
          <span className="relative flex w-1.5 h-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
            <span className="relative inline-flex rounded-full w-1.5 h-1.5 bg-emerald-400" />
          </span>
          <span className="text-emerald-400 font-mono" style={{ fontSize: '9px' }}>
            {eventCount.toLocaleString()}
          </span>
        </div>
      )}
    </nav>
  );
}
