import { useMemo, useCallback } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useSlabContours } from '../../hooks/useSlabData';
import { useEarthquakes } from '../../hooks/useEarthquakes';
import { computeCrossSection } from '../../lib/cross-section';
import { getDepthColor, getMagnitudeSize } from '../../lib/color-scales';

// --- Layout constants ---

const SVG_WIDTH = 720;
const SVG_HEIGHT = 440;
const MARGIN = { top: 40, right: 30, bottom: 62, left: 60 };
const PLOT_W = SVG_WIDTH - MARGIN.left - MARGIN.right;
const PLOT_H = SVG_HEIGHT - MARGIN.top - MARGIN.bottom;

// Slider
const LAT_MIN = 40;
const LAT_MAX = 51;
const LAT_STEP = 0.1;

// --- Scale factory ---

function makeXScale(lonMin: number, lonMax: number) {
  return (lon: number) => MARGIN.left + ((lon - lonMin) / (lonMax - lonMin)) * PLOT_W;
}

function makeYScale(depthMin: number, depthMax: number) {
  return (depth: number) => MARGIN.top + ((depth - depthMin) / (depthMax - depthMin)) * PLOT_H;
}

// --- Approximate surface topography ---
function surfaceDepth(lon: number): number {
  if (lon < -127) return -3;
  if (lon < -125) {
    const t = (lon - (-127)) / 2;
    return -3 + t * 3;
  }
  return 0;
}

// Round to a nice tick value
function niceStep(range: number, targetTicks: number): number {
  const raw = range / targetTicks;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const residual = raw / mag;
  if (residual <= 1.5) return mag;
  if (residual <= 3) return 2 * mag;
  if (residual <= 7) return 5 * mag;
  return 10 * mag;
}

function generateTicks(min: number, max: number, targetCount: number): number[] {
  const step = niceStep(max - min, targetCount);
  const ticks: number[] = [];
  const start = Math.ceil(min / step) * step;
  for (let v = start; v <= max; v += step) {
    ticks.push(Math.round(v * 1000) / 1000);
  }
  return ticks;
}

export default function CrossSectionView() {
  const isMobile = useAppStore((s) => s.isMobile);
  const crossSectionOpen = useAppStore((s) => s.crossSectionOpen);
  const setCrossSectionOpen = useAppStore((s) => s.setCrossSectionOpen);
  const crossSectionLat = useAppStore((s) => s.crossSectionLat);
  const setCrossSectionLat = useAppStore((s) => s.setCrossSectionLat);

  const { data: contourData } = useSlabContours();
  const { data: quakeData } = useEarthquakes();

  const contours = contourData?.features;

  const section = useMemo(() => {
    if (!contours) return null;
    return computeCrossSection(crossSectionLat, contours, quakeData ?? []);
  }, [crossSectionLat, contours, quakeData]);

  // Dynamic domain — fit to actual data with sensible padding
  const domain = useMemo(() => {
    if (!section) return { lonMin: -128, lonMax: -121, depthMax: 150 };

    const allLons: number[] = [];
    const allDepths: number[] = [];

    for (const pt of section.slabProfile) {
      allLons.push(pt.lon);
      allDepths.push(pt.depth);
    }
    for (const q of section.projectedQuakes) {
      allLons.push(q.lon);
      allDepths.push(q.depth);
    }

    if (allLons.length === 0) return { lonMin: -128, lonMax: -121, depthMax: 150 };

    const dataLonMin = Math.min(...allLons);
    const dataLonMax = Math.max(...allLons);
    const dataDepthMax = Math.max(...allDepths);

    // Add padding: 1.5° west (ocean context), 0.5° east, 30% depth headroom (min 50km)
    const lonMin = Math.floor(dataLonMin - 1.5);
    const lonMax = Math.ceil(dataLonMax + 0.5);
    const depthMax = Math.max(
      Math.ceil((dataDepthMax * 1.3) / 10) * 10, // Round up to nearest 10
      50, // Minimum 50km so the chart isn't too squished
    );

    return { lonMin, lonMax, depthMax };
  }, [section]);

  const xs = useMemo(() => makeXScale(domain.lonMin, domain.lonMax), [domain]);
  const ys = useMemo(() => makeYScale(0, domain.depthMax), [domain]);

  const lonTicks = useMemo(
    () => generateTicks(domain.lonMin, domain.lonMax, 8),
    [domain],
  );
  const depthTicks = useMemo(
    () => generateTicks(0, domain.depthMax, 6),
    [domain],
  );

  const handleLatChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setCrossSectionLat(parseFloat(e.target.value));
    },
    [setCrossSectionLat],
  );

  if (!crossSectionOpen) return null;

  // --- Build SVG paths ---

  // Slab profile polyline
  const slabPath =
    section && section.slabProfile.length > 1
      ? section.slabProfile
          .map(
            (pt, i) =>
              `${i === 0 ? 'M' : 'L'}${xs(pt.lon).toFixed(1)},${ys(pt.depth).toFixed(1)}`,
          )
          .join(' ')
      : '';

  // Surface topography
  const surfacePoints: { x: number; y: number }[] = [];
  for (let lon = domain.lonMin; lon <= domain.lonMax; lon += 0.25) {
    const elev = surfaceDepth(lon);
    const depthVal = Math.max(0, -elev);
    surfacePoints.push({ x: xs(lon), y: ys(depthVal) });
  }

  const surfacePath = surfacePoints
    .map((pt, i) => `${i === 0 ? 'M' : 'L'}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`)
    .join(' ');

  // Sea level line
  const seaLevelY = ys(0);

  // Slab gradient segments for coloring by depth
  const slabSegments: { x1: number; y1: number; x2: number; y2: number; color: string }[] = [];
  if (section && section.slabProfile.length > 1) {
    for (let i = 0; i < section.slabProfile.length - 1; i++) {
      const a = section.slabProfile[i]!;
      const b = section.slabProfile[i + 1]!;
      const avgDepth = (a.depth + b.depth) / 2;
      slabSegments.push({
        x1: xs(a.lon),
        y1: ys(a.depth),
        x2: xs(b.lon),
        y2: ys(b.depth),
        color: getDepthColor(avgDepth).css,
      });
    }
  }

  // Geographic references — only show if within domain
  const geoRefs = [
    { lon: -128.5, label: 'Open Ocean' },
    { lon: -126, label: 'Trench' },
    { lon: -124.2, label: 'Coastline' },
    { lon: -122.2, label: 'Cascades' },
  ].filter((r) => r.lon >= domain.lonMin && r.lon <= domain.lonMax);

  const refLines = [
    { lon: -124.2, color: 'rgba(148,163,184,0.25)', label: 'coast' },
    { lon: -126, color: 'rgba(16,185,129,0.2)', label: 'trench' },
  ].filter((r) => r.lon >= domain.lonMin && r.lon <= domain.lonMax);

  return (
    <div
      className="
        fixed inset-x-0 bottom-0 z-50
        flex justify-center
        pointer-events-none
        animate-slide-up-cross
      "
    >
      <div
        className={`pointer-events-auto max-w-[95vw] bg-[#0b1120]/[0.95] backdrop-blur-xl border border-white/[0.20] rounded-t-2xl shadow-[0_-4px_40px_rgba(0,0,0,0.5)] ${
          isMobile ? 'w-full p-3' : 'w-[800px] p-4'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <div>
            <h2
              className="text-slate-100 font-medium"
              style={{ fontFamily: '"DM Sans", sans-serif', fontSize: '15px' }}
            >
              Cross-Section at {crossSectionLat.toFixed(1)}&deg;N
            </h2>
            {!isMobile && (
              <p className="text-slate-400" style={{ fontSize: '12px', marginTop: '2px' }}>
                Vertical slice through the Earth &mdash; showing the subducting Juan de Fuca plate beneath North America
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Stats */}
            {!isMobile && section && (
              <div className="text-right mr-2">
                <div className="text-slate-400" style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '11px' }}>
                  {section.projectedQuakes.length} quakes &middot; slab to {section.slabProfile.length > 0 ? Math.round(section.slabProfile[section.slabProfile.length - 1]!.depth) : '?'} km
                </div>
              </div>
            )}

            {/* Close button */}
            <button
              onClick={() => setCrossSectionOpen(false)}
              className="
                w-10 h-10 md:w-8 md:h-8 flex items-center justify-center
                text-slate-300 hover:text-white
                bg-white/[0.08] hover:bg-white/[0.15]
                rounded-lg transition-colors cursor-pointer
              "
              aria-label="Close cross-section"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M2 2l12 12M14 2L2 14" />
              </svg>
            </button>
          </div>
        </div>

        {/* Latitude slider */}
        <div className="flex items-center gap-3 mb-3">
          <span
            className="text-slate-400 shrink-0"
            style={{ fontFamily: '"DM Sans", sans-serif', fontSize: '13px' }}
          >
            Latitude
          </span>
          <input
            type="range"
            min={LAT_MIN}
            max={LAT_MAX}
            step={LAT_STEP}
            value={crossSectionLat}
            onChange={handleLatChange}
            className="flex-1 h-1 appearance-none bg-white/10 rounded-full
                       accent-emerald-400 cursor-pointer
                       [&::-webkit-slider-thumb]:appearance-none
                       [&::-webkit-slider-thumb]:w-5
                       [&::-webkit-slider-thumb]:h-5
                       [&::-webkit-slider-thumb]:rounded-full
                       [&::-webkit-slider-thumb]:bg-emerald-400
                       [&::-webkit-slider-thumb]:shadow-[0_0_6px_rgba(52,211,153,0.5)]"
          />
          <span
            className="text-slate-500 shrink-0 w-[60px] text-right"
            style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '12px' }}
          >
            {LAT_MIN}&deg;&ndash;{LAT_MAX}&deg;
          </span>
        </div>

        {/* SVG chart */}
        <svg
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          className="w-full"
          style={{ maxHeight: '380px' }}
        >
          {/* Dark background for the plot area */}
          <rect
            x={MARGIN.left}
            y={MARGIN.top}
            width={PLOT_W}
            height={PLOT_H}
            fill="rgba(6,10,18,0.97)"
            rx={4}
          />

          {/* Grid lines */}
          {depthTicks.map((d) => (
            <line
              key={`grid-h-${d}`}
              x1={MARGIN.left}
              y1={ys(d)}
              x2={SVG_WIDTH - MARGIN.right}
              y2={ys(d)}
              stroke="rgba(255,255,255,0.12)"
              strokeWidth={d === 0 ? 1 : 0.5}
            />
          ))}
          {lonTicks.map((lon) => (
            <line
              key={`grid-v-${lon}`}
              x1={xs(lon)}
              y1={MARGIN.top}
              x2={xs(lon)}
              y2={SVG_HEIGHT - MARGIN.bottom}
              stroke="rgba(255,255,255,0.12)"
              strokeWidth={0.5}
            />
          ))}

          {/* Geographic reference lines (vertical, subtle) */}
          {refLines.map((ref) => (
            <line
              key={`ref-line-${ref.label}`}
              x1={xs(ref.lon)}
              y1={MARGIN.top}
              x2={xs(ref.lon)}
              y2={SVG_HEIGHT - MARGIN.bottom}
              stroke={ref.color}
              strokeWidth={1}
              strokeDasharray="4 4"
            />
          ))}

          {/* Sea level line (emphasized) */}
          <line
            x1={MARGIN.left}
            y1={seaLevelY}
            x2={SVG_WIDTH - MARGIN.right}
            y2={seaLevelY}
            stroke="rgba(56,189,248,0.5)"
            strokeWidth={1.5}
          />
          <text
            x={MARGIN.left - 8}
            y={seaLevelY - 4}
            fill="rgba(56,189,248,0.7)"
            fontSize="10"
            textAnchor="end"
            fontFamily='"DM Sans", sans-serif'
          >
            Sea Level
          </text>

          {/* Ocean fill (west side, above surface profile) */}
          <path
            d={`
              M${xs(domain.lonMin).toFixed(1)},${seaLevelY.toFixed(1)}
              ${surfacePath.replace(/^M/, 'L')}
              L${surfacePoints[surfacePoints.length - 1]!.x.toFixed(1)},${seaLevelY.toFixed(1)}
              Z
            `}
            fill="rgba(56,189,248,0.12)"
          />

          {/* Surface topography line */}
          <path d={surfacePath} fill="none" stroke="rgba(148,163,184,0.6)" strokeWidth={1.5} />

          {/* Slab profile - outline for visibility */}
          {slabPath && (
            <path
              d={slabPath}
              fill="none"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth={6}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {/* Slab profile - gradient colored segments */}
          {slabSegments.map((seg, i) => (
            <line
              key={`slab-${i}`}
              x1={seg.x1}
              y1={seg.y1}
              x2={seg.x2}
              y2={seg.y2}
              stroke={seg.color}
              strokeWidth={3.5}
              strokeLinecap="round"
            />
          ))}

          {/* Depth labels on slab profile */}
          {section && section.slabProfile.length > 1 &&
            section.slabProfile
              .filter((_, i) => i % 2 === 0)
              .map((pt, i) => {
                const color = getDepthColor(pt.depth);
                return (
                  <text
                    key={`depth-label-${i}`}
                    x={xs(pt.lon) + 10}
                    y={ys(pt.depth) - 8}
                    fill={color.css}
                    fontSize="10"
                    fontFamily='"JetBrains Mono", monospace'
                    fontWeight={600}
                    opacity={0.95}
                  >
                    {Math.round(pt.depth)} km
                  </text>
                );
              })}

          {/* Sparse data message */}
          {section && section.slabProfile.length > 0 && section.slabProfile.length < 5 && (
            <text
              x={MARGIN.left + PLOT_W / 2}
              y={MARGIN.top + PLOT_H / 2}
              fill="rgba(148,163,184,0.6)"
              fontSize="12"
              textAnchor="middle"
              fontFamily='"DM Sans", sans-serif'
              fontWeight={500}
            >
              Limited slab data at this latitude. Try 44&deg;&ndash;48&deg;N.
            </text>
          )}

          {/* Earthquake dots */}
          {section?.projectedQuakes.map((q, i) => {
            const r = getMagnitudeSize(q.mag) / 2;
            const color = getDepthColor(q.depth);
            return (
              <g key={`eq-${i}`}>
                {/* Glow */}
                <circle
                  cx={xs(q.lon)}
                  cy={ys(q.depth)}
                  r={r + 3}
                  fill={color.css}
                  fillOpacity={0.2}
                />
                {/* Core */}
                <circle
                  cx={xs(q.lon)}
                  cy={ys(q.depth)}
                  r={r}
                  fill={color.css}
                  fillOpacity={0.85}
                  stroke="rgba(255,255,255,0.3)"
                  strokeWidth={0.7}
                />
              </g>
            );
          })}

          {/* Geological labels with background for readability */}
          {section?.labels
            .filter((l) => l.lon >= domain.lonMin && l.lon <= domain.lonMax && l.depth <= domain.depthMax)
            .map((label) => (
            <g key={label.text}>
              <rect
                x={xs(label.lon) - label.text.length * 3.2 - 4}
                y={ys(label.depth) - 11}
                width={label.text.length * 6.4 + 8}
                height={16}
                rx={4}
                fill="rgba(8,12,20,0.7)"
              />
              <text
                x={xs(label.lon)}
                y={ys(label.depth)}
                fill="rgba(203,213,225,0.85)"
                fontSize="11"
                textAnchor="middle"
                fontFamily='"DM Sans", sans-serif'
                fontWeight={600}
                fontStyle="italic"
              >
                {label.text}
              </text>
            </g>
          ))}

          {/* Surface feature markers */}
          {/* Trench marker */}
          {section && section.slabProfile.length > 0 && (() => {
            const trenchPt = section.slabProfile[0]!;
            if (trenchPt.lon < domain.lonMin || trenchPt.lon > domain.lonMax) return null;
            const tx = xs(trenchPt.lon);
            return (
              <g>
                <line x1={tx} y1={MARGIN.top} x2={tx} y2={MARGIN.top + 30} stroke="rgba(16,185,129,0.6)" strokeWidth={1} strokeDasharray="3 2" />
                <text x={tx} y={MARGIN.top + 42} fill="rgba(16,185,129,0.85)" fontSize="10" textAnchor="middle" fontFamily='"DM Sans", sans-serif' fontWeight={600}>
                  ▼ Trench
                </text>
              </g>
            );
          })()}

          {/* Volcanic Arc marker (~-122° for Cascades) */}
          {-122.2 >= domain.lonMin && -122.2 <= domain.lonMax && (() => {
            const vx = xs(-122.2);
            return (
              <g>
                <line x1={vx} y1={MARGIN.top} x2={vx} y2={MARGIN.top + 30} stroke="rgba(239,68,68,0.5)" strokeWidth={1} strokeDasharray="3 2" />
                <text x={vx} y={MARGIN.top + 42} fill="rgba(239,68,68,0.75)" fontSize="10" textAnchor="middle" fontFamily='"DM Sans", sans-serif' fontWeight={600}>
                  ▲ Volcanic Arc
                </text>
              </g>
            );
          })()}

          {/* Axis labels: Y (Depth) */}
          {depthTicks.map((d) => (
            <text
              key={`y-label-${d}`}
              x={MARGIN.left - 10}
              y={ys(d) + 4}
              fill="rgba(148,163,184,0.75)"
              fontSize="11"
              textAnchor="end"
              fontFamily='"JetBrains Mono", monospace'
            >
              {d}
            </text>
          ))}
          <text
            x={14}
            y={MARGIN.top + PLOT_H / 2}
            fill="rgba(148,163,184,0.85)"
            fontSize="12"
            textAnchor="middle"
            fontFamily='"DM Sans", sans-serif'
            fontWeight={500}
            transform={`rotate(-90, 14, ${MARGIN.top + PLOT_H / 2})`}
          >
            Depth (km)
          </text>

          {/* Axis labels: X (Longitude with geographic context) */}
          {lonTicks.map((lon) => (
            <text
              key={`x-label-${lon}`}
              x={xs(lon)}
              y={SVG_HEIGHT - MARGIN.bottom + 16}
              fill="rgba(148,163,184,0.6)"
              fontSize="10"
              textAnchor="middle"
              fontFamily='"JetBrains Mono", monospace'
            >
              {lon}&deg;
            </text>
          ))}

          {/* Geographic reference labels below axis */}
          {geoRefs.map((ref) => (
            <text
              key={`geo-${ref.label}`}
              x={xs(ref.lon)}
              y={SVG_HEIGHT - MARGIN.bottom + 32}
              fill="rgba(148,163,184,0.85)"
              fontSize="10"
              textAnchor="middle"
              fontFamily='"DM Sans", sans-serif'
              fontWeight={600}
            >
              {ref.label}
            </text>
          ))}

          <text
            x={MARGIN.left + PLOT_W / 2}
            y={SVG_HEIGHT - 2}
            fill="rgba(148,163,184,0.7)"
            fontSize="11"
            textAnchor="middle"
            fontFamily='"DM Sans", sans-serif'
            fontWeight={500}
          >
            ← West (Pacific Ocean) · Longitude · East (North America) →
          </text>

          {/* Direction indicators */}
          <text
            x={MARGIN.left + 4}
            y={MARGIN.top - 8}
            fill="rgba(56,189,248,0.9)"
            fontSize="12"
            fontFamily='"DM Sans", sans-serif'
            fontWeight={700}
          >
            &#x2190; Juan de Fuca Plate (oceanic)
          </text>
          <text
            x={SVG_WIDTH - MARGIN.right - 4}
            y={MARGIN.top - 8}
            fill="rgba(139,92,246,0.9)"
            fontSize="12"
            textAnchor="end"
            fontFamily='"DM Sans", sans-serif'
            fontWeight={700}
          >
            North American Plate (continental) &#x2192;
          </text>

          {/* Plot border */}
          <rect
            x={MARGIN.left}
            y={MARGIN.top}
            width={PLOT_W}
            height={PLOT_H}
            fill="none"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth={1}
          />
        </svg>

        {/* Legend row */}
        <div className="flex items-center gap-5 mt-2 px-1 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block w-8 h-1 rounded-full"
              style={{
                background: 'linear-gradient(to right, #ff4444, #ffd700, #00bfff, #4169e1, #8a2be2)',
              }}
            />
            <span
              className="text-slate-300"
              style={{ fontFamily: '"DM Sans", sans-serif', fontSize: '11px' }}
            >
              Subducting slab (top of Juan de Fuca plate)
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span
              className="text-slate-300"
              style={{ fontFamily: '"DM Sans", sans-serif', fontSize: '11px' }}
            >
              Earthquakes (size = magnitude, color = depth)
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-4 h-[3px] rounded-full bg-sky-400/50" />
            <span
              className="text-slate-300"
              style={{ fontFamily: '"DM Sans", sans-serif', fontSize: '11px' }}
            >
              Sea level
            </span>
          </div>
        </div>
      </div>

      {/* Slide-up animation */}
      <style>{`
        @keyframes slide-up-cross {
          from {
            opacity: 0;
            transform: translateY(40px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up-cross {
          animation: slide-up-cross 300ms ease-out forwards;
        }
      `}</style>
    </div>
  );
}
