import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Viewer, Cartesian3, Math as CesiumMath } from 'cesium';
import { useAppStore } from '../../store/useAppStore';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EventCategory = 'megathrust' | 'paleoseismic' | 'modern' | 'ets' | 'discovery';

interface TimelineEvent {
  id: string;
  year: number;
  title: string;
  description: string;
  category: EventCategory;
  latitude: number;
  longitude: number;
  cameraAltitude: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY_COLORS: Record<EventCategory, string> = {
  megathrust: '#ef4444',
  paleoseismic: '#f97316',
  modern: '#3b82f6',
  ets: '#8b5cf6',
  discovery: '#10b981',
};

const CATEGORY_LABELS: Record<EventCategory, string> = {
  megathrust: 'Megathrust',
  paleoseismic: 'Paleoseismic',
  modern: 'Modern',
  ets: 'ETS',
  discovery: 'Discovery',
};

// ---------------------------------------------------------------------------
// Non-linear time scale
// ---------------------------------------------------------------------------

/**
 * Maps a year to a 0–1 position on the timeline.
 *
 * We use a segmented approach:
 *   - Ancient (< 0 CE): occupies 0%–20% of the bar  (covers ~-8000 to 0)
 *   - Historical (0–1900): occupies 20%–40%          (covers 0 to 1900)
 *   - Modern (1900–2025): occupies 40%–100%          (covers 1900 to 2025)
 *
 * Within each segment the mapping is linear.
 */
function yearToPosition(year: number): number {
  if (year < 0) {
    // Ancient: -8000 → 0%, 0 → 20%
    const t = (year + 8000) / 8000; // 0..1
    return t * 0.2;
  }
  if (year < 1900) {
    // Historical: 0 → 20%, 1900 → 40%
    const t = year / 1900;
    return 0.2 + t * 0.2;
  }
  // Modern: 1900 → 40%, 2025 → 100%
  const t = (year - 1900) / 125;
  return 0.4 + t * 0.6;
}

/**
 * Formats a year for display, handling BCE dates.
 */
function formatYear(year: number): string {
  if (year < 0) return `${Math.abs(year).toLocaleString()} BCE`;
  if (year === 0) return '1 CE';
  return `${year} CE`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface TimelineProps {
  viewer: Viewer | null;
}

export default function Timeline({ viewer }: TimelineProps) {
  const isMobile = useAppStore((s) => s.isMobile);
  const timelineOpen = useAppStore((s) => s.timelineOpen);
  const setTimelineOpen = useAppStore((s) => s.setTimelineOpen);
  const selectedTimelineEvent = useAppStore((s) => s.selectedTimelineEvent);
  const setSelectedTimelineEvent = useAppStore((s) => s.setSelectedTimelineEvent);

  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [hoveredEvent, setHoveredEvent] = useState<string | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  // Fetch events data
  useEffect(() => {
    fetch('/data/timeline/events.json')
      .then((r) => r.json())
      .then((data: TimelineEvent[]) => setEvents(data))
      .catch(() => {
        /* silently ignore – timeline just stays empty */
      });
  }, []);

  // Currently selected event object
  const selectedEvent = useMemo(
    () => events.find((e) => e.id === selectedTimelineEvent) ?? null,
    [events, selectedTimelineEvent],
  );

  // Fly camera to an event location
  const flyToEvent = useCallback(
    (evt: TimelineEvent) => {
      if (!viewer || viewer.isDestroyed()) return;
      viewer.camera.flyTo({
        destination: Cartesian3.fromDegrees(
          evt.longitude,
          evt.latitude,
          evt.cameraAltitude,
        ),
        orientation: {
          heading: CesiumMath.toRadians(0),
          pitch: CesiumMath.toRadians(-45),
          roll: 0,
        },
        duration: 2,
      });
    },
    [viewer],
  );

  // Handle clicking an event marker
  const handleEventClick = useCallback(
    (id: string) => {
      setSelectedTimelineEvent(selectedTimelineEvent === id ? null : id);
    },
    [selectedTimelineEvent, setSelectedTimelineEvent],
  );

  // Era labels along the track
  const eraLabels = useMemo(
    () => [
      { label: '8000 BCE', position: 0 },
      { label: '1 CE', position: 0.2 },
      { label: '1700', position: 0.2 + (1700 / 1900) * 0.2 },
      { label: '1950', position: 0.4 + ((1950 - 1900) / 125) * 0.6 },
      { label: '2000', position: 0.4 + ((2000 - 1900) / 125) * 0.6 },
      { label: '2024', position: 0.4 + ((2024 - 1900) / 125) * 0.6 },
    ],
    [],
  );

  // -------------------------------------------------------------------------
  // Toggle button (always visible)
  // -------------------------------------------------------------------------
  // On mobile, MobileTabBar handles the timeline toggle — no separate button needed
  if (!timelineOpen) {
    if (isMobile) return null;
    return (
      <button
        type="button"
        onClick={() => setTimelineOpen(true)}
        className="
          fixed bottom-4 right-4 z-50
          bg-[#0c1222]/[0.92] backdrop-blur-xl
          border border-white/[0.18] rounded-xl
          px-3 py-2 flex items-center gap-2
          text-slate-400 hover:text-slate-200
          hover:bg-[#0c1222] transition-colors cursor-pointer
        "
        style={{ fontFamily: '"DM Sans", sans-serif', fontSize: '13px', fontWeight: 500 }}
      >
        {/* Clock icon */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        Timeline
      </button>
    );
  }

  // -------------------------------------------------------------------------
  // Full timeline panel
  // -------------------------------------------------------------------------
  return (
    <div
      className={`
        fixed bottom-0 left-0 right-0 z-50
        bg-[#0c1222]/[0.92] backdrop-blur-xl
        border-t border-white/[0.18]
        flex flex-col
      `}
      style={{
        fontFamily: '"DM Sans", sans-serif',
        ...(isMobile ? { paddingBottom: 'calc(60px + env(safe-area-inset-bottom, 0px))' } : {}),
      }}
    >
      {/* ---- Narrative panel (slides up when event selected) ---- */}
      {selectedEvent && (
        <div className={`${isMobile ? 'px-4 pt-3 pb-2' : 'px-6 pt-4 pb-3'} border-b border-white/[0.06]`}>
          <div className="max-w-3xl mx-auto">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: CATEGORY_COLORS[selectedEvent.category] }}
                  />
                  <span
                    className="text-slate-500 uppercase tracking-wide"
                    style={{ fontSize: '10px', fontWeight: 600 }}
                  >
                    {CATEGORY_LABELS[selectedEvent.category]}
                  </span>
                  <span
                    className="text-slate-600"
                    style={{
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: '11px',
                    }}
                  >
                    {formatYear(selectedEvent.year)}
                  </span>
                </div>

                <h3
                  className="text-slate-100 mb-1.5"
                  style={{ fontSize: '15px', fontWeight: 600 }}
                >
                  {selectedEvent.title}
                </h3>

                <p
                  className="text-slate-400 leading-relaxed"
                  style={{ fontSize: '13px', fontWeight: 400, maxWidth: '640px' }}
                >
                  {selectedEvent.description}
                </p>
              </div>

              {/* Fly-to button */}
              <button
                type="button"
                onClick={() => flyToEvent(selectedEvent)}
                className="
                  shrink-0 mt-1
                  bg-white/[0.06] hover:bg-white/[0.10]
                  border border-white/[0.08] rounded-lg
                  px-3 py-1.5
                  text-slate-300 hover:text-white
                  transition-colors cursor-pointer
                  flex items-center gap-1.5
                "
                style={{ fontSize: '12px', fontWeight: 500 }}
              >
                {/* Location pin icon */}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                Fly to
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Timeline track ---- */}
      <div className={`${isMobile ? 'px-3 py-2' : 'px-6 py-3'}`}>
        <div className="max-w-5xl mx-auto">
          {/* Header row */}
          <div className="flex items-center justify-between mb-2">
            <h4
              className="text-slate-300"
              style={{ fontSize: '13px', fontWeight: 600 }}
            >
              Historical Timeline
            </h4>

            {/* Category legend + close */}
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-3">
                {(Object.keys(CATEGORY_COLORS) as EventCategory[]).map((cat) => (
                  <div key={cat} className="flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: CATEGORY_COLORS[cat] }}
                    />
                    <span className="text-slate-500" style={{ fontSize: '10px', fontWeight: 500 }}>
                      {CATEGORY_LABELS[cat]}
                    </span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  setTimelineOpen(false);
                  setSelectedTimelineEvent(null);
                }}
                className="
                  text-slate-500 hover:text-slate-300 transition-colors cursor-pointer
                  w-10 h-10 md:w-6 md:h-6 flex items-center justify-center rounded-md
                  hover:bg-white/[0.06]
                "
                aria-label="Close timeline"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          {/* Track */}
          <div ref={trackRef} className="relative h-10 select-none">
            {/* Background line */}
            <div className="absolute top-1/2 left-0 right-0 h-px bg-white/[0.10] -translate-y-1/2" />

            {/* Segment dividers (thin vertical marks for era boundaries) */}
            {[0.2, 0.4].map((pos) => (
              <div
                key={pos}
                className="absolute top-1/2 -translate-y-1/2 w-px h-4 bg-white/[0.08]"
                style={{ left: `${pos * 100}%` }}
              />
            ))}

            {/* Era labels */}
            {eraLabels.map((era) => (
              <span
                key={era.label}
                className="absolute top-full mt-0.5 -translate-x-1/2 text-slate-600"
                style={{
                  left: `${era.position * 100}%`,
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '9px',
                  fontWeight: 400,
                }}
              >
                {era.label}
              </span>
            ))}

            {/* Event markers */}
            {events.map((evt) => {
              const pos = yearToPosition(evt.year);
              const isSelected = selectedTimelineEvent === evt.id;
              const isHovered = hoveredEvent === evt.id;

              return (
                <button
                  key={evt.id}
                  type="button"
                  onClick={() => handleEventClick(evt.id)}
                  onMouseEnter={() => setHoveredEvent(evt.id)}
                  onMouseLeave={() => setHoveredEvent(null)}
                  className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-pointer group flex items-center justify-center"
                  style={{
                    left: `${pos * 100}%`,
                    zIndex: isSelected || isHovered ? 20 : 10,
                    minWidth: '44px',
                    minHeight: '44px',
                  }}
                  aria-label={`${evt.title} (${formatYear(evt.year)})`}
                >
                  {/* Dot */}
                  <span
                    className="block rounded-full transition-all duration-200"
                    style={{
                      width: isSelected ? 14 : isHovered ? 12 : 9,
                      height: isSelected ? 14 : isHovered ? 12 : 9,
                      backgroundColor: CATEGORY_COLORS[evt.category],
                      boxShadow: isSelected
                        ? `0 0 12px ${CATEGORY_COLORS[evt.category]}80`
                        : isHovered
                          ? `0 0 8px ${CATEGORY_COLORS[evt.category]}60`
                          : 'none',
                      border: isSelected
                        ? '2px solid rgba(255,255,255,0.6)'
                        : 'none',
                    }}
                  />

                  {/* Hover tooltip */}
                  {isHovered && !isSelected && (
                    <span
                      className="
                        absolute bottom-full mb-2 left-1/2 -translate-x-1/2
                        bg-base/90 backdrop-blur-sm
                        border border-white/[0.10] rounded-lg
                        px-2.5 py-1.5 whitespace-nowrap
                        pointer-events-none
                      "
                    >
                      <span className="block text-slate-200" style={{ fontSize: '11px', fontWeight: 500 }}>
                        {evt.title}
                      </span>
                      <span
                        className="block text-slate-500"
                        style={{
                          fontFamily: '"JetBrains Mono", monospace',
                          fontSize: '10px',
                          fontWeight: 400,
                        }}
                      >
                        {formatYear(evt.year)}
                      </span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
