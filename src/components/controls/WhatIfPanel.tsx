import { useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useScenarioData, useScenarioIndex } from '../../hooks/useScenarios';
import { calculateImpact } from '../../lib/impact-calculator';

function formatDuration(minSec: number, maxSec: number): string {
  const minMin = Math.floor(minSec / 60);
  const maxMin = Math.ceil(maxSec / 60);
  if (minMin === maxMin) return `~${minMin} min`;
  return `${minMin}\u2013${maxMin} min`;
}

function formatCoord(value: number, pos: string, neg: string): string {
  const dir = value >= 0 ? pos : neg;
  return `${Math.abs(value).toFixed(4)}\u00b0 ${dir}`;
}

export default function WhatIfPanel() {
  const isMobile = useAppStore((s) => s.isMobile);
  const whatIfLocation = useAppStore((s) => s.whatIfLocation);
  const setWhatIfLocation = useAppStore((s) => s.setWhatIfLocation);
  const selectedScenario = useAppStore((s) => s.selectedScenario);
  const scenariosVisible = useAppStore((s) => s.layers.scenarios.visible);

  const { data: scenarioData, isLoading: dataLoading } = useScenarioData(selectedScenario);
  const { data: scenarioIndex } = useScenarioIndex();

  const scenarioName = useMemo(() => {
    if (!selectedScenario || !scenarioIndex) return null;
    const meta = scenarioIndex.find((s) => s.id === selectedScenario);
    return meta?.name ?? selectedScenario;
  }, [selectedScenario, scenarioIndex]);

  const impact = useMemo(() => {
    if (!whatIfLocation || !scenarioData?.grid) return null;
    return calculateImpact(whatIfLocation.lat, whatIfLocation.lon, scenarioData.grid);
  }, [whatIfLocation, scenarioData]);

  // Only show when scenario layer is active, a scenario is selected, and a location is picked
  if (!scenariosVisible || !selectedScenario || !whatIfLocation) return null;

  return (
    <div className={`fixed z-50 max-h-[calc(100vh-160px)] overflow-y-auto bg-[#0c1222]/[0.92] backdrop-blur-xl border border-white/[0.18] rounded-2xl p-4 ${
      isMobile ? 'bottom-[60px] left-2 right-2' : 'right-4 bottom-20 w-80'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3
          className="text-slate-100"
          style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 600, fontSize: '14px' }}
        >
          What If Analysis
        </h3>
        <button
          type="button"
          onClick={() => setWhatIfLocation(null)}
          className="w-10 h-10 md:w-6 md:h-6 flex items-center justify-center text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
          aria-label="Close panel"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M4 4L12 12M12 4L4 12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {dataLoading ? (
        <p className="text-xs text-slate-500">Loading scenario data...</p>
      ) : !impact ? (
        <p className="text-xs text-slate-500">Unable to calculate impact.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Location */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">
              Location
            </div>
            <div className="text-xs text-slate-300">
              {formatCoord(whatIfLocation.lat, 'N', 'S')},{' '}
              {formatCoord(whatIfLocation.lon, 'E', 'W')}
            </div>
          </div>

          {/* Scenario */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">
              Scenario
            </div>
            <div className="text-xs text-slate-300">{scenarioName}</div>
          </div>

          {/* Divider */}
          <div className="border-t border-white/[0.06]" />

          {/* MMI */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">
              Shaking Intensity (MMI)
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white"
                style={{ backgroundColor: impact.mmiColor }}
              >
                {impact.mmi.toFixed(1)}
              </div>
              <div className="text-xs text-slate-300 leading-snug flex-1">
                {impact.description}
              </div>
            </div>
          </div>

          {/* PGA */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">
                Peak Ground Acceleration
              </div>
              <div className="text-xs text-slate-300">{impact.pga.toFixed(3)} g</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">
                Duration
              </div>
              <div className="text-xs text-slate-300">
                {formatDuration(
                  impact.shakingDuration.minSeconds,
                  impact.shakingDuration.maxSeconds,
                )}
              </div>
            </div>
          </div>

          {/* Tsunami risk */}
          {impact.tsunamiRisk.isCoastal && (
            <>
              <div className="border-t border-white/[0.06]" />
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  <div className="text-[10px] uppercase tracking-wider text-cyan-400">
                    Tsunami Risk
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-slate-500 text-[10px]">Est. Arrival</div>
                    <div className="text-slate-300">
                      ~{impact.tsunamiRisk.estimatedArrivalMinutes} min
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-[10px]">Est. Wave Height</div>
                    <div className="text-slate-300">
                      ~{impact.tsunamiRisk.estimatedHeightMeters} m
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Divider */}
          <div className="border-t border-white/[0.06]" />

          {/* Historical comparison */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">
              Historical Comparison
            </div>
            <div className="text-xs text-emerald-400/90 leading-snug">
              {impact.historicalComparison}
            </div>
          </div>

          {/* Grid distance note */}
          <div className="text-[10px] text-slate-600 mt-1">
            Nearest grid point: {impact.nearestDistanceKm} km away
          </div>
        </div>
      )}
    </div>
  );
}
