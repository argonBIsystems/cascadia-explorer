import { useAppStore } from '../../store/useAppStore';
import { getDepthColor } from '../../lib/color-scales';
import DrawerOverlay from '../ui/DrawerOverlay';

function formatRelativeTime(epochMs: number): string {
  const diff = Date.now() - epochMs;
  const seconds = Math.floor(diff / 1000);

  if (seconds < 60) return 'just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;

  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? '' : 's'} ago`;
}

export default function InfoCard() {
  const selectedEarthquake = useAppStore((s) => s.selectedEarthquake);
  const setSelectedEarthquake = useAppStore((s) => s.setSelectedEarthquake);
  const isMobile = useAppStore((s) => s.isMobile);

  if (!selectedEarthquake) return null;

  const { magnitude, depth, time, place, longitude, latitude, url } =
    selectedEarthquake;

  const magColor = getDepthColor(depth);

  const cardContent = (
    <>
      {/* Close button */}
      <button
        onClick={() => setSelectedEarthquake(null)}
        className="
          absolute top-3 right-3
          w-10 h-10 md:w-6 md:h-6 flex items-center justify-center
          text-slate-400 hover:text-white
          transition-colors cursor-pointer
        "
        aria-label="Close"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        >
          <path d="M1 1l12 12M13 1L1 13" />
        </svg>
      </button>

      {/* Header: magnitude + depth */}
      <div className="flex items-baseline gap-3 mb-4">
        <span
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '24px',
            fontWeight: 700,
            color: magColor.css,
            lineHeight: 1,
          }}
        >
          M{magnitude.toFixed(1)}
        </span>
        <span
          className="text-slate-400"
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '13px',
          }}
        >
          {depth.toFixed(1)} km deep
        </span>
      </div>

      {/* Body */}
      <div className="space-y-2.5">
        {/* Relative time */}
        <div className="text-slate-300 text-sm">
          {formatRelativeTime(time)}
        </div>

        {/* Location */}
        <div className="text-slate-200 text-sm leading-snug">{place}</div>

        {/* Coordinates */}
        <div
          className="text-slate-500"
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '12px',
          }}
        >
          {latitude.toFixed(4)}, {longitude.toFixed(4)}
        </div>
      </div>

      {/* Footer: USGS link */}
      <div className="mt-4 pt-3 border-t border-white/[0.06]">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="
            text-emerald-400 hover:text-emerald-300
            text-sm transition-colors
          "
        >
          View on USGS &#x2197;
        </a>
      </div>

      {/* Slide-in animation */}
      <style>{`
        @keyframes slide-in-right {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 300ms ease-out forwards;
        }
      `}</style>
    </>
  );

  if (isMobile) {
    return (
      <DrawerOverlay open={true} side="right" onClose={() => setSelectedEarthquake(null)}>
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
        w-[280px] max-h-[calc(100vh-160px)] overflow-y-auto
        bg-[#0c1222]/[0.92] backdrop-blur-xl
        border border-white/[0.18] rounded-2xl
        p-5
        animate-slide-in-right
      "
    >
      {cardContent}
    </div>
  );
}
