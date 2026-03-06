import { useAppStore } from '../../store/useAppStore';
import { useAnnotationById } from '../layers/AnnotationLayer';
import DrawerOverlay from '../ui/DrawerOverlay';
import type { AnnotationCategory } from '../../types';

const CATEGORY_LABELS: Record<AnnotationCategory, string> = {
  'slab-tear': 'Slab Tear',
  'terrane': 'Terrane Boundary',
  'fluid-pathway': 'Fluid Pathway',
  'slow-slip': 'Slow Slip',
  'plate-deformation': 'Plate Deformation',
  'transform-fault': 'Transform Fault',
  'slab-fragment': 'Slab Fragment',
};

const CATEGORY_COLORS: Record<AnnotationCategory, string> = {
  'slab-tear': 'bg-violet-500/20 text-violet-300',
  'terrane': 'bg-amber-500/20 text-amber-300',
  'fluid-pathway': 'bg-cyan-500/20 text-cyan-300',
  'slow-slip': 'bg-emerald-500/20 text-emerald-300',
  'plate-deformation': 'bg-rose-500/20 text-rose-300',
  'transform-fault': 'bg-blue-500/20 text-blue-300',
  'slab-fragment': 'bg-teal-500/20 text-teal-300',
};

export default function AnnotationInfoCard() {
  const selectedAnnotation = useAppStore((s) => s.selectedAnnotation);
  const setSelectedAnnotation = useAppStore((s) => s.setSelectedAnnotation);
  const isMobile = useAppStore((s) => s.isMobile);
  const annotation = useAnnotationById(selectedAnnotation);

  if (!annotation) return null;

  const categoryLabel = CATEGORY_LABELS[annotation.category];
  const categoryColor = CATEGORY_COLORS[annotation.category];

  const cardContent = (
    <>
      {/* Close button */}
      <button
        onClick={() => setSelectedAnnotation(null)}
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

      {/* Category badge */}
      <div className="mb-3">
        <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-md ${categoryColor}`}>
          {categoryLabel}
        </span>
      </div>

      {/* Title + subtitle */}
      <h3
        className="text-slate-100 mb-1"
        style={{
          fontFamily: '"DM Sans", sans-serif',
          fontWeight: 600,
          fontSize: '17px',
          lineHeight: 1.3,
        }}
      >
        {annotation.title}
      </h3>
      <p className="text-slate-400 text-sm mb-3">{annotation.subtitle}</p>

      {/* Description */}
      <p className="text-slate-300 text-[13px] leading-relaxed mb-4">
        {annotation.description}
      </p>

      {/* Coordinates + depth */}
      <div className="flex items-center gap-3 mb-4">
        <span
          className="text-slate-500"
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '11px',
          }}
        >
          {annotation.latitude.toFixed(2)}N, {Math.abs(annotation.longitude).toFixed(2)}W
        </span>
        <span className="text-white/[0.08]">|</span>
        <span
          className="text-slate-500"
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '11px',
          }}
        >
          {annotation.depth} km depth
        </span>
      </div>

      {/* Paper reference */}
      <div className="pt-3 border-t border-white/[0.06]">
        <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1.5 font-medium">
          Reference
        </p>
        <p className="text-slate-300 text-[12px] leading-snug mb-1">
          {annotation.paper.title}
        </p>
        <p className="text-slate-500 text-[11px] mb-2">
          {annotation.paper.authors}
        </p>
        <a
          href={annotation.paper.url}
          target="_blank"
          rel="noopener noreferrer"
          className="
            text-emerald-400 hover:text-emerald-300
            text-sm transition-colors
          "
        >
          View paper &#x2197;
        </a>
      </div>

      {/* Pulse dot indicator — hidden on mobile (clipped by drawer overflow) */}
      {!isMobile && (
        <div className="absolute -top-1.5 -right-1.5">
          <span className="relative flex h-3 w-3">
            <span className="annotation-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
          </span>
        </div>
      )}

      {/* Animations */}
      <style>{`
        @keyframes annotation-card-enter {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .annotation-card-enter {
          animation: annotation-card-enter 300ms ease-out forwards;
        }
        @keyframes annotation-ping {
          75%, 100% {
            transform: scale(2);
            opacity: 0;
          }
        }
        .annotation-ping {
          animation: annotation-ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
      `}</style>
    </>
  );

  if (isMobile) {
    return (
      <DrawerOverlay open={true} side="right" onClose={() => setSelectedAnnotation(null)}>
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
        w-[320px] max-h-[calc(100vh-160px)] overflow-y-auto
        bg-[#0c1222]/[0.92] backdrop-blur-xl
        border border-white/[0.18] rounded-2xl
        p-5
        annotation-card-enter
      "
    >
      {cardContent}
    </div>
  );
}
