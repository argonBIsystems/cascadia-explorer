import { useAppStore } from '../../store/useAppStore';
import Toggle from '../ui/Toggle';
import DrawerOverlay from '../ui/DrawerOverlay';
import type { LayerId, ReferenceFrame } from '../../types';

interface LayerRow {
  id: LayerId;
  label: string;
  disabled?: boolean;
  badge?: string;
}

const LAYERS: LayerRow[] = [
  { id: 'slab', label: 'Slab Geometry', badge: 'USGS' },
  { id: 'earthquakes', label: 'Earthquakes', badge: 'LIVE' },
  { id: 'faults', label: 'Plate Boundaries', badge: 'PB2002' },
  { id: 'gps', label: 'GPS Vectors', badge: 'MODEL' },
  { id: 'scenarios', label: 'M9 Scenarios', badge: 'MODEL' },
  { id: 'tsunami', label: 'Tsunami', badge: 'MODEL' },
  { id: 'annotations', label: 'Discoveries' },
  { id: 'volcanoes', label: 'Volcanoes', badge: 'LIVE' },
  { id: 'coupling', label: 'Fault Locking', badge: 'MODEL' },
  { id: 'pioneer', label: 'Pioneer Fragment', badge: 'NEW' },
  { id: 'paleoseismic', label: 'Paleoseismic', badge: 'DATA' },
  { id: 'sensors', label: 'Offshore Sensors' },
  { id: 'tremor', label: 'ETS Tremor', badge: 'MODEL' },
  { id: 'hazard', label: 'Seismic Hazard', badge: 'NSHM' },
];

export default function LayerPanel() {
  const layers = useAppStore((s) => s.layers);
  const toggleLayer = useAppStore((s) => s.toggleLayer);
  const referenceFrame = useAppStore((s) => s.referenceFrame);
  const setReferenceFrame = useAppStore((s) => s.setReferenceFrame);
  const isMobile = useAppStore((s) => s.isMobile);
  const activeDrawer = useAppStore((s) => s.activeDrawer);
  const setActiveDrawer = useAppStore((s) => s.setActiveDrawer);

  const content = (
    <>
      {/* Header */}
      <h2
        className="text-slate-100 mb-3"
        style={{
          fontFamily: '"DM Sans", sans-serif',
          fontWeight: 600,
          fontSize: '15px',
        }}
      >
        Layers
      </h2>

      {/* Layer rows */}
      <div className="flex flex-col gap-0.5">
        {LAYERS.map((layer) => {
          const state = layers[layer.id];
          return (
            <div key={layer.id}>
              <div className="flex items-center justify-between h-10 px-1 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-300">{layer.label}</span>
                  {layer.badge && (
                    <span className="text-[10px] font-medium text-slate-500 bg-white/[0.06] rounded px-1.5 py-0.5 leading-none">
                      {layer.badge}
                    </span>
                  )}
                </div>
                <Toggle
                  checked={state.visible}
                  onChange={() => toggleLayer(layer.id)}
                  loading={state.loading}
                  disabled={layer.disabled}
                />
              </div>
              {/* GPS reference frame toggle */}
              {layer.id === 'gps' && state.visible && (
                <div className="flex items-center gap-1 px-1 pb-2">
                  {(['nam14', 'itrf'] as ReferenceFrame[]).map((frame) => (
                    <button
                      key={frame}
                      type="button"
                      onClick={() => setReferenceFrame(frame)}
                      className={`
                        text-[10px] px-2 py-1 rounded-md transition-colors cursor-pointer
                        ${referenceFrame === frame
                          ? 'bg-emerald-500/20 text-emerald-400 font-medium'
                          : 'text-slate-500 hover:text-slate-400 bg-white/[0.02]'
                        }
                      `}
                    >
                      {frame === 'nam14' ? 'Rel. to NA' : 'Absolute'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );

  if (isMobile) {
    return (
      <DrawerOverlay
        open={activeDrawer === 'layers'}
        side="left"
        onClose={() => setActiveDrawer(null)}
      >
        <div className="p-4 pt-14">
          {content}
        </div>
      </DrawerOverlay>
    );
  }

  return (
    <aside
      className="
        fixed left-4 top-[72px] bottom-[80px] w-60 z-40
        bg-[#0c1222]/[0.92] backdrop-blur-xl
        border border-white/[0.18] rounded-2xl
        p-4 flex flex-col
      "
    >
      {content}
    </aside>
  );
}
