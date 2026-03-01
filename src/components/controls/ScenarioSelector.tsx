import { useAppStore } from '../../store/useAppStore';
import { useScenarioIndex } from '../../hooks/useScenarios';
import DrawerOverlay from '../ui/DrawerOverlay';

export default function ScenarioSelector() {
  const visible = useAppStore((s) => s.layers.scenarios.visible);
  const selectedScenario = useAppStore((s) => s.selectedScenario);
  const setSelectedScenario = useAppStore((s) => s.setSelectedScenario);
  const selectedEarthquake = useAppStore((s) => s.selectedEarthquake);
  const selectedAnnotation = useAppStore((s) => s.selectedAnnotation);
  const isMobile = useAppStore((s) => s.isMobile);
  const activeDrawer = useAppStore((s) => s.activeDrawer);
  const setActiveDrawer = useAppStore((s) => s.setActiveDrawer);
  const { data: scenarios, isLoading } = useScenarioIndex();

  const hasInfoCard = selectedEarthquake != null || selectedAnnotation != null;

  const content = (
    <>
      <h3
        className="text-slate-100 mb-3"
        style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 600, fontSize: '14px' }}
      >
        M9.0 Scenarios
      </h3>

      {isLoading ? (
        <p className="text-xs text-slate-500">Loading scenarios...</p>
      ) : (
        <div className="flex flex-col gap-1 max-h-[60vh] overflow-y-auto pr-1 scrollbar-thin">
          {scenarios?.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelectedScenario(selectedScenario === s.id ? null : s.id)}
              className={`
                text-left px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer
                ${selectedScenario === s.id
                  ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
                  : 'bg-white/[0.02] border border-transparent text-slate-400 hover:bg-white/[0.06] hover:text-slate-300'
                }
              `}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
                  style={{
                    backgroundColor:
                      s.type === 'full-margin' ? '#10b981'
                      : s.type === 'southern-segment' ? '#f97316'
                      : s.type === 'northern-segment' ? '#3b82f6'
                      : '#a855f7',
                  }}
                />
                <span className="font-medium text-[13px]">{s.name}</span>
              </div>
              <div className="text-slate-300 leading-snug" style={{ fontSize: '11px' }}>
                {s.description}
              </div>
            </button>
          ))}
        </div>
      )}
    </>
  );

  if (isMobile) {
    return (
      <DrawerOverlay
        open={activeDrawer === 'scenarios'}
        side="right"
        onClose={() => setActiveDrawer(null)}
      >
        <div className="p-4 pt-14">
          {!visible ? (
            <p className="text-sm text-slate-500">Enable the &quot;M9 Scenarios&quot; layer to view scenarios.</p>
          ) : (
            content
          )}
        </div>
      </DrawerOverlay>
    );
  }

  if (!visible) return null;

  return (
    <div className={`fixed right-4 ${hasInfoCard ? 'top-[360px]' : 'top-[72px]'} z-40 w-72 max-h-[calc(100vh-160px)] overflow-y-auto bg-[#0c1222]/[0.92] backdrop-blur-xl border border-white/[0.18] rounded-2xl p-4 transition-[top] duration-300`}>
      {content}
    </div>
  );
}
