import { useAppStore } from '../../store/useAppStore';
import Toggle from '../ui/Toggle';
import DrawerOverlay from '../ui/DrawerOverlay';
import type { LayerId } from '../../types';

interface LayerRow {
  id: LayerId;
  label: string;
  badge?: string;
}

const LAYERS: LayerRow[] = [
  { id: 'earthquakes', label: 'Earthquakes', badge: 'LIVE' },
  { id: 'faults', label: 'Plate Boundaries', badge: 'PB2002' },
  { id: 'slab', label: 'Slab Geometry', badge: 'USGS' },
  { id: 'volcanoes', label: 'Volcanoes', badge: 'LIVE' },
  { id: 'risk', label: 'Seismic Risk', badge: 'ML' },
];

export default function LayerPanel() {
  const layers = useAppStore((s) => s.layers);
  const toggleLayer = useAppStore((s) => s.toggleLayer);
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
            <div key={layer.id} className="flex items-center justify-between h-10 px-1 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-300">{layer.label}</span>
                {layer.badge && (
                  <span className="text-[10px] font-medium text-slate-500 bg-white/[0.06] rounded px-1.5 py-0.5 leading-none">
                    {layer.badge}
                  </span>
                )}
                {state.error && (
                  <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" title={state.error} />
                )}
              </div>
              <Toggle
                checked={state.visible}
                onChange={() => toggleLayer(layer.id)}
                loading={state.loading}
              />
            </div>
          );
        })}
      </div>

      {/* Risk layer hint */}
      {layers.risk.visible && (
        <p className="text-[11px] text-slate-500 mt-3 px-1 leading-snug">
          Click anywhere on the map to compute a seismic risk score.
        </p>
      )}
    </>
  );

  if (isMobile) {
    return (
      <DrawerOverlay
        open={activeDrawer === 'layers'}
        side="left"
        onClose={() => setActiveDrawer(null)}
      >
        <div className="p-4 pt-5">
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
