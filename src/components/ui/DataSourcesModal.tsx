interface DataSourcesModalProps {
  onClose: () => void;
}

export default function DataSourcesModal({ onClose }: DataSourcesModalProps) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative bg-[#0c1222]/[0.92] backdrop-blur-xl border border-white/[0.18] rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/[0.06]"
        >
          ✕
        </button>

        {/* Header */}
        <h2 className="text-lg font-semibold text-slate-100 mb-1">
          Data Sources
        </h2>
        <p className="text-xs text-emerald-400 font-medium mb-5">
          Scientific data & references powering this visualization
        </p>

        <div className="space-y-5">
          {/* Seismicity */}
          <section>
            <h3 className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-2">
              Seismicity
            </h3>
            <div className="space-y-2.5">
              <div>
                <div className="text-sm text-slate-300">USGS Earthquake Catalog (FDSNWS)</div>
                <div className="text-xs text-slate-500">
                  Real-time earthquake feed with magnitude, location, depth.{' '}
                  <a
                    href="https://earthquake.usgs.gov/fdsnws/event/1/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    earthquake.usgs.gov/fdsnws/event/1/ ↗
                  </a>
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-300">USGS Slab2 Model</div>
                <div className="text-xs text-slate-500">
                  Hayes et al. (2018). Global subduction zone geometry.{' '}
                  <a
                    href="https://doi.org/10.1126/science.aat4723"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    doi.org/10.1126/science.aat4723 ↗
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* Geodesy */}
          <section>
            <h3 className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-2">
              Geodesy
            </h3>
            <div className="space-y-2.5">
              <div>
                <div className="text-sm text-slate-300">EarthScope GNSS Velocities</div>
                <div className="text-xs text-slate-500">
                  GPS station velocities from PBO/NOTA network.{' '}
                  <a
                    href="https://www.unavco.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    www.unavco.org ↗
                  </a>
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-300">Reference Frames</div>
                <div className="text-xs text-slate-500">
                  ITRF2014 and NAM14 reference frames for velocity decomposition
                </div>
              </div>
            </div>
          </section>

          {/* Scenarios & Hazard */}
          <section>
            <h3 className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-2">
              Scenarios & Hazard
            </h3>
            <div className="space-y-2.5">
              <div>
                <div className="text-sm text-slate-300">USGS CSZM9 Scenario Catalog</div>
                <div className="text-xs text-slate-500">
                  30 M9.0 earthquake scenarios for the Cascadia Subduction Zone.{' '}
                  <a
                    href="https://earthquake.usgs.gov/scenarios/catalog/cszm9/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    earthquake.usgs.gov/scenarios/catalog/cszm9/ ↗
                  </a>
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-300">Tsunami Propagation Model</div>
                <div className="text-xs text-slate-500">
                  Based on Priest et al. (2010), Witter et al. (2013), Gonzalez et al. (2009)
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-300">USGS Volcano API</div>
                <div className="text-xs text-slate-500">
                  Real-time alert levels for Cascades volcanoes.{' '}
                  <a
                    href="https://volcanoes.usgs.gov"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    volcanoes.usgs.gov ↗
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* Plate Boundaries */}
          <section>
            <h3 className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-2">
              Plate Boundaries
            </h3>
            <div className="space-y-2.5">
              <div>
                <div className="text-sm text-slate-300">PB2002</div>
                <div className="text-xs text-slate-500">
                  Bird (2003) plate boundary dataset
                </div>
              </div>
            </div>
          </section>

          {/* Key Research Papers */}
          <section>
            <h3 className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-2">
              Key Research Papers
            </h3>
            <div className="space-y-2.5">
              <div>
                <div className="text-sm text-slate-300">Shelly (2026)</div>
                <div className="text-xs text-slate-500">
                  Pioneer Fragment LFE discovery. <span className="italic">Science</span> 391
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-300">Shuck et al. (2025)</div>
                <div className="text-xs text-slate-500">
                  Explorer slab tear, CASIE21. <span className="italic">Science Advances</span>
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-300">Furlong (2024)</div>
                <div className="text-xs text-slate-500">
                  Mendocino Triple Junction tomography. <span className="italic">Tectonics</span>
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-300">Rogers & Dragert (2003)</div>
                <div className="text-xs text-slate-500">
                  ETS discovery. <span className="italic">Science</span> 302
                </div>
              </div>
            </div>
          </section>

          {/* Visualization */}
          <section>
            <h3 className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-2">
              Visualization
            </h3>
            <div className="space-y-2.5">
              <div>
                <div className="text-sm text-slate-300">CesiumJS</div>
                <div className="text-xs text-slate-500">
                  3D globe rendering with Cesium Ion terrain
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-300">Built by ArgonBI Systems Inc.</div>
                <div className="text-xs text-slate-500">
                  <a
                    href="https://argonbi.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    argonbi.com ↗
                  </a>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
