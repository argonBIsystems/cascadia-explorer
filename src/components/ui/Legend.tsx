import { useAppStore } from '../../store/useAppStore';

const DEPTH_STOPS = [
  { depth: 0, color: '#ff4444', label: '0 km' },
  { depth: 10, color: '#ff4444', label: '' },
  { depth: 30, color: '#ff8c00', label: '' },
  { depth: 50, color: '#ffd700', label: '50 km' },
  { depth: 100, color: '#00bfff', label: '100 km' },
  { depth: 200, color: '#4169e1', label: '200 km' },
  { depth: 300, color: '#8a2be2', label: '300 km' },
];

const MAGNITUDE_CIRCLES = [
  { mag: 3, size: 6, label: 'M3' },
  { mag: 4, size: 10, label: 'M4' },
  { mag: 5, size: 16, label: 'M5' },
  { mag: 6, size: 24, label: 'M6+' },
];

const FAULT_TYPES = [
  { type: 'Megathrust', color: '#10b981', width: 3, dashed: false },
  { type: 'Ridge', color: '#ff8c00', width: 2, dashed: true },
  { type: 'Transform', color: '#cbd5e1', width: 1.5, dashed: false },
];

export default function Legend() {
  const layers = useAppStore((s) => s.layers);
  const isMobile = useAppStore((s) => s.isMobile);

  const showEarthquakes = layers.earthquakes.visible;
  const showSlab = layers.slab.visible;
  const showFaults = layers.faults.visible;
  const showGPS = layers.gps.visible;
  const showScenarios = layers.scenarios.visible;
  const showTsunami = layers.tsunami.visible;
  const showVolcanoes = layers.volcanoes.visible;
  const showCoupling = layers.coupling.visible;
  const showPioneer = layers.pioneer.visible;
  const showSensors = layers.sensors.visible;
  const showTremor = layers.tremor.visible;
  const showHazard = layers.hazard.visible;

  if (!showEarthquakes && !showSlab && !showFaults && !showGPS && !showScenarios && !showTsunami && !showVolcanoes && !showCoupling && !showPioneer && !showSensors && !showTremor && !showHazard) return null;

  return (
    <div className={`fixed z-30 flex max-h-[calc(100vh-200px)] overflow-y-auto ${
      isMobile
        ? 'bottom-[68px] left-2 right-2 flex-row gap-2 overflow-x-auto max-w-none'
        : 'bottom-4 left-[17.5rem] flex-col gap-3 max-w-[180px]'
    }`}>
      {/* Depth color scale — shown for earthquakes or slab */}
      {(showEarthquakes || showSlab) && (
        <div className="bg-[#0c1222]/[0.92] backdrop-blur-xl border border-white/[0.18] rounded-xl p-3 shrink-0">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-2">
            Depth
          </div>
          <div className="flex items-stretch gap-2">
            <div
              className="w-3 rounded-sm"
              style={{
                background: `linear-gradient(to bottom, ${DEPTH_STOPS.map((s) => s.color).join(', ')})`,
                minHeight: 80,
              }}
            />
            <div className="flex flex-col justify-between text-[10px] font-mono text-slate-400">
              {DEPTH_STOPS.filter((s) => s.label).map((s) => (
                <span key={s.depth}>{s.label}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Magnitude scale */}
      {showEarthquakes && (
        <div className="bg-[#0c1222]/[0.92] backdrop-blur-xl border border-white/[0.18] rounded-xl p-3 shrink-0">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-2">
            Magnitude
          </div>
          <div className="flex items-end gap-3">
            {MAGNITUDE_CIRCLES.map((m) => (
              <div key={m.mag} className="flex flex-col items-center gap-1">
                <div
                  className="rounded-full bg-white/60"
                  style={{ width: m.size, height: m.size }}
                />
                <span className="text-[10px] font-mono text-slate-400">
                  {m.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fault type legend */}
      {showFaults && (
        <div className="bg-[#0c1222]/[0.92] backdrop-blur-xl border border-white/[0.18] rounded-xl p-3 shrink-0">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-2">
            Boundaries
          </div>
          <div className="flex flex-col gap-1.5">
            {FAULT_TYPES.map((f) => (
              <div key={f.type} className="flex items-center gap-2">
                <svg width="24" height="4" className="shrink-0">
                  <line
                    x1="0" y1="2" x2="24" y2="2"
                    stroke={f.color}
                    strokeWidth={f.width}
                    strokeDasharray={f.dashed ? '4 3' : 'none'}
                  />
                </svg>
                <span className="text-[10px] text-slate-400">{f.type}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* GPS velocity legend */}
      {showGPS && (
        <div className="bg-[#0c1222]/[0.92] backdrop-blur-xl border border-white/[0.18] rounded-xl p-3 shrink-0">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-2">
            GPS Velocity
          </div>
          <div className="flex flex-col gap-1">
            {[
              { color: '#60a5fa', label: '< 5 mm/yr' },
              { color: '#34d399', label: '5–15 mm/yr' },
              { color: '#fbbf24', label: '15–30 mm/yr' },
              { color: '#f87171', label: '> 30 mm/yr' },
            ].map((v) => (
              <div key={v.label} className="flex items-center gap-2">
                <div className="w-4 h-0.5 rounded-full" style={{ backgroundColor: v.color }} />
                <span className="text-[10px] text-slate-400">{v.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MMI legend for scenarios */}
      {showScenarios && (
        <div className="bg-[#0c1222]/[0.92] backdrop-blur-xl border border-white/[0.18] rounded-xl p-3 shrink-0">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-2">
            Shaking (MMI)
          </div>
          <div className="flex flex-col gap-0.5">
            {[
              { color: '#80ffb4', label: 'IV Light' },
              { color: '#ffff00', label: 'V Moderate' },
              { color: '#ffc800', label: 'VI Strong' },
              { color: '#ff9100', label: 'VII Very Strong' },
              { color: '#ff0000', label: 'VIII Severe' },
              { color: '#c80000', label: 'IX+ Violent' },
            ].map((m) => (
              <div key={m.label} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: m.color, opacity: 0.7 }} />
                <span className="text-[10px] text-slate-400">{m.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Volcano alert legend */}
      {showVolcanoes && (
        <div className="bg-[#0c1222]/[0.92] backdrop-blur-xl border border-white/[0.18] rounded-xl p-3 shrink-0">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-2">
            Volcano Alert
          </div>
          <div className="flex flex-col gap-1">
            {[
              { color: '#22c55e', label: 'Normal' },
              { color: '#eab308', label: 'Advisory' },
              { color: '#f97316', label: 'Watch' },
              { color: '#ef4444', label: 'Warning' },
            ].map((v) => (
              <div key={v.label} className="flex items-center gap-2">
                <svg width="12" height="12" viewBox="0 0 12 12">
                  <polygon points="6,1 11,11 1,11" fill={v.color} />
                </svg>
                <span className="text-[10px] text-slate-400">{v.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Coupling legend */}
      {showCoupling && (
        <div className="bg-[#0c1222]/[0.92] backdrop-blur-xl border border-white/[0.18] rounded-xl p-3 shrink-0">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-2">
            Fault Locking
          </div>
          <div className="flex flex-col gap-0.5">
            {[
              { color: '#3b82f6', label: 'Creeping' },
              { color: '#a78bfa', label: 'Partial' },
              { color: '#f59e0b', label: 'Mostly Locked' },
              { color: '#ef4444', label: 'Fully Locked' },
            ].map((c) => (
              <div key={c.label} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: c.color, opacity: 0.7 }} />
                <span className="text-[10px] text-slate-400">{c.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pioneer Fragment legend */}
      {showPioneer && (
        <div className="bg-[#0c1222]/[0.92] backdrop-blur-xl border border-white/[0.18] rounded-xl p-3 shrink-0">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-2">
            Pioneer Fragment
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#14b8a6', opacity: 0.4 }} />
              <span className="text-[10px] text-slate-400">Fragment extent</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#5eead4' }} />
              <span className="text-[10px] text-slate-400">LFE events</span>
            </div>
          </div>
        </div>
      )}

      {/* Sensor network legend */}
      {showSensors && (
        <div className="bg-[#0c1222]/[0.92] backdrop-blur-xl border border-white/[0.18] rounded-xl p-3 shrink-0">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-2">
            Sensors
          </div>
          <div className="flex flex-col gap-1">
            {[
              { color: '#3b82f6', label: 'NEPTUNE' },
              { color: '#8b5cf6', label: 'OOI' },
              { color: '#f97316', label: 'DART Buoy' },
              { color: '#6b7280', label: 'Planned' },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-[10px] text-slate-400">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ETS Tremor legend */}
      {showTremor && (
        <div className="bg-[#0c1222]/[0.92] backdrop-blur-xl border border-white/[0.18] rounded-xl p-3 shrink-0">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-2">
            Tremor Depth
          </div>
          <div className="flex flex-col gap-1">
            {[
              { color: '#c084fc', label: '< 30 km' },
              { color: '#a855f7', label: '30–35 km' },
              { color: '#7c3aed', label: '35–40 km' },
              { color: '#6d28d9', label: '> 40 km' },
            ].map((t) => (
              <div key={t.label} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                <span className="text-[10px] text-slate-400">{t.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Seismic hazard legend */}
      {showHazard && (
        <div className="bg-[#0c1222]/[0.92] backdrop-blur-xl border border-white/[0.18] rounded-xl p-3 shrink-0">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-2">
            PGA (2% in 50yr)
          </div>
          <div className="flex flex-col gap-0.5">
            {[
              { color: '#22c55e', label: '< 0.1g' },
              { color: '#eab308', label: '0.1–0.2g' },
              { color: '#f97316', label: '0.2–0.4g' },
              { color: '#ef4444', label: '0.4–0.8g' },
              { color: '#7f1d1d', label: '> 0.8g' },
            ].map((h) => (
              <div key={h.label} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: h.color, opacity: 0.7 }} />
                <span className="text-[10px] text-slate-400">{h.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tsunami wave height legend */}
      {showTsunami && (
        <div className="bg-[#0c1222]/[0.92] backdrop-blur-xl border border-white/[0.18] rounded-xl p-3 shrink-0">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-2">
            Wave Height
          </div>
          <div className="flex flex-col gap-0.5">
            {[
              { color: '#60a5fa', label: '< 0.5m' },
              { color: '#22d3ee', label: '0.5–2m' },
              { color: '#fbbf24', label: '2–4m' },
              { color: '#f97316', label: '4–8m' },
              { color: '#ef4444', label: '> 8m' },
            ].map((w) => (
              <div key={w.label} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: w.color }} />
                <span className="text-[10px] text-slate-400">{w.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
