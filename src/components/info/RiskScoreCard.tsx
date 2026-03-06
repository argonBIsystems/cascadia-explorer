import { useAppStore } from '../../store/useAppStore';
import DrawerOverlay from '../ui/DrawerOverlay';

export default function RiskScoreCard() {
  const riskScore = useAppStore((s) => s.riskScore);
  const setRiskScore = useAppStore((s) => s.setRiskScore);
  const isMobile = useAppStore((s) => s.isMobile);

  if (!riskScore) return null;

  const cardContent = (
    <>
      {/* Close */}
      <button
        onClick={() => setRiskScore(null)}
        className="absolute top-3 right-3 w-10 h-10 md:w-6 md:h-6 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
        aria-label="Close"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M1 1l12 12M13 1L1 13" />
        </svg>
      </button>

      {/* Header: Score + Level */}
      <div className="flex items-center gap-4 mb-4">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-white"
          style={{
            backgroundColor: riskScore.color,
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '24px',
            fontWeight: 700,
          }}
        >
          {riskScore.composite}
        </div>
        <div>
          <div
            className="text-slate-100 mb-0.5"
            style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 600, fontSize: '15px' }}
          >
            Seismic Risk Score
          </div>
          <span
            className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-md"
            style={{ backgroundColor: `${riskScore.color}20`, color: riskScore.color }}
          >
            {riskScore.level}
          </span>
        </div>
      </div>

      {/* Factor breakdown */}
      <div className="space-y-3 mb-4">
        {riskScore.factors.map((factor) => (
          <div key={factor.label}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-300">{factor.label}</span>
              <span
                className="text-xs text-slate-400"
                style={{ fontFamily: '"JetBrains Mono", monospace' }}
              >
                {factor.score}
                <span className="text-slate-600 text-[10px] ml-1">
                  &times;{(factor.weight * 100).toFixed(0)}%
                </span>
              </span>
            </div>
            {/* Bar */}
            <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${factor.score}%`,
                  backgroundColor:
                    factor.score < 30 ? '#22c55e'
                    : factor.score < 60 ? '#eab308'
                    : factor.score < 80 ? '#f97316'
                    : '#ef4444',
                }}
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
              {factor.detail}
            </p>
          </div>
        ))}
      </div>

      {/* Coordinates */}
      <div className="pt-3 border-t border-white/[0.06]">
        <div
          className="text-slate-500 mb-2"
          style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '11px' }}
        >
          {riskScore.latitude.toFixed(4)}, {riskScore.longitude.toFixed(4)}
        </div>
        <p className="text-[10px] text-slate-600 leading-snug">
          Composite score from live seismicity, USGS NSHM 2023, plate boundary geometry, and Cascadia recurrence statistics. Click elsewhere to analyze a new location.
        </p>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <DrawerOverlay open={true} side="right" onClose={() => setRiskScore(null)}>
        <div className="p-5 pt-6">{cardContent}</div>
      </DrawerOverlay>
    );
  }

  return (
    <div className="fixed right-4 top-[72px] z-50 w-[300px] max-h-[calc(100vh-160px)] overflow-y-auto bg-[#0c1222]/[0.92] backdrop-blur-xl border border-white/[0.18] rounded-2xl p-5 animate-slide-in-right">
      {cardContent}
      <style>{`
        @keyframes slide-in-right {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-slide-in-right { animation: slide-in-right 300ms ease-out forwards; }
      `}</style>
    </div>
  );
}
