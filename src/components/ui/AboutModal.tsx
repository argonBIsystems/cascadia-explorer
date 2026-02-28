interface AboutModalProps {
  onClose: () => void;
}

export default function AboutModal({ onClose }: AboutModalProps) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative bg-white/[0.06] backdrop-blur-xl border border-white/[0.10] rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/[0.06]"
        >
          ✕
        </button>

        {/* Content */}
        <h2 className="text-lg font-semibold text-slate-100 mb-1">
          Cascadia Explorer
        </h2>
        <p className="text-xs text-emerald-400 font-medium mb-4">
          Visualizing the seismic forces beneath the Pacific Northwest
        </p>

        <p className="text-sm text-slate-300 leading-relaxed mb-4">
          An interactive 3D visualization of the Cascadia Subduction Zone
          combining real-time USGS earthquake data, slab geometry from
          73,000+ earthquake relocations, and real plate tectonic boundaries.
        </p>

        <div className="text-sm text-slate-400 space-y-1.5 mb-4">
          <div className="flex items-start gap-2">
            <span className="text-emerald-500/60 shrink-0 w-14 text-xs font-medium">LIVE</span>
            <span>Earthquakes — USGS FDSNWS real-time feed</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-emerald-500/60 shrink-0 w-14 text-xs font-medium">USGS</span>
            <span>Slab — 73k+ earthquake relocations (Hayes et al., 2018)</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-emerald-500/60 shrink-0 w-14 text-xs font-medium">PB2002</span>
            <span>Boundaries — Bird (2003) plate boundary dataset</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-amber-500/60 shrink-0 w-14 text-xs font-medium">MODEL</span>
            <span>GPS, M9, Tsunami — physics-based simulations</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-slate-500 shrink-0 w-14 text-xs">Globe</span>
            <span>CesiumJS + Cesium Ion Terrain</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-slate-500 shrink-0 w-14 text-xs">Built by</span>
            <span>ArgonBI Systems Inc.</span>
          </div>
        </div>

        <div className="flex gap-3 text-xs">
          <a
            href="https://argonbi.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            argonbi.com ↗
          </a>
          <a
            href="https://earthquake.usgs.gov/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            USGS Earthquakes ↗
          </a>
        </div>
      </div>
    </div>
  );
}
