import { useAppStore } from '../../store/useAppStore';
import DrawerOverlay from '../ui/DrawerOverlay';

const ALERT_COLORS: Record<string, string> = {
  Normal: '#22c55e',
  Advisory: '#eab308',
  Watch: '#f97316',
  Warning: '#ef4444',
  Unknown: '#6b7280',
};

export default function VolcanoInfoCard() {
  const selectedVolcano = useAppStore((s) => s.selectedVolcano);
  const setSelectedVolcano = useAppStore((s) => s.setSelectedVolcano);
  const isMobile = useAppStore((s) => s.isMobile);

  if (!selectedVolcano) return null;

  const alertColor = ALERT_COLORS[selectedVolcano.alertLevel] ?? ALERT_COLORS.Unknown;

  const cardContent = (
    <>
      {/* Close button */}
      <button
        onClick={() => setSelectedVolcano(null)}
        className="
          absolute top-3 right-3
          w-10 h-10 md:w-6 md:h-6 flex items-center justify-center
          text-slate-400 hover:text-white
          transition-colors cursor-pointer
        "
        aria-label="Close"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M1 1l12 12M13 1L1 13" />
        </svg>
      </button>

      {/* Header: volcano triangle + name */}
      <div className="flex items-center gap-3 mb-3">
        <svg width="24" height="24" viewBox="0 0 24 24">
          <polygon points="12,2 22,22 2,22" fill={alertColor} stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" />
        </svg>
        <h3
          className="text-slate-100"
          style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 600, fontSize: '17px', lineHeight: 1.3 }}
        >
          {selectedVolcano.name}
        </h3>
      </div>

      {/* Alert badge */}
      <div className="mb-4">
        <span
          className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-md"
          style={{ backgroundColor: `${alertColor}20`, color: alertColor }}
        >
          {selectedVolcano.alertLevel}
        </span>
      </div>

      {/* Details */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">Elevation</div>
            <div
              className="text-slate-300"
              style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '13px' }}
            >
              {selectedVolcano.elevation.toLocaleString()} m
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">Threat Score</div>
            <div
              className="text-slate-300"
              style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '13px' }}
            >
              {selectedVolcano.threatScore}
            </div>
          </div>
        </div>

        {/* Coordinates */}
        <div
          className="text-slate-500"
          style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '12px' }}
        >
          {selectedVolcano.latitude.toFixed(4)}, {selectedVolcano.longitude.toFixed(4)}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-white/[0.06]">
        <a
          href={`https://volcanoes.usgs.gov/vsc/api/volcanoApi/volcanoPage?volcanoId=${selectedVolcano.vnum}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-400 hover:text-emerald-300 text-sm transition-colors"
        >
          View on USGS &#x2197;
        </a>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <DrawerOverlay open={true} side="right" onClose={() => setSelectedVolcano(null)}>
        <div className="p-5 pt-6">
          {cardContent}
        </div>
      </DrawerOverlay>
    );
  }

  return (
    <div
      className="
        fixed right-4 top-[72px] z-50
        w-[280px]
        bg-[#0c1222]/[0.92] backdrop-blur-xl
        border border-white/[0.18] rounded-2xl
        p-5
        animate-slide-in-right
      "
    >
      {cardContent}
      <style>{`
        @keyframes slide-in-right {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slide-in-right 300ms ease-out forwards;
        }
      `}</style>
    </div>
  );
}
