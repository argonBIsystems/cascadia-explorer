import { useEffect, useRef, useState } from 'react';
import {
  cascadiaFaultTrace,
  juanDeFucaPlate,
  pacificPlateEdge,
  northAmericanPlateEdge,
} from './loading-paths';

interface LoadingScreenProps {
  globeReady: boolean;
  onComplete: () => void;
}

/**
 * Progressive reveal loading screen.
 *
 * Phase 1 (0-1 s)   – Fault trace draws in via stroke-dashoffset animation.
 * Phase 2 (1-2.5 s) – Plate boundary paths draw in, labels fade in, dot markers appear.
 * Phase 3           – Once `globeReady` is true (and phase 2 is finished), SVG fades out (800 ms).
 * Phase 4           – After fade-out completes, `onComplete()` is called to unmount.
 */
export default function LoadingScreen({ globeReady, onComplete }: LoadingScreenProps) {
  const [phase, setPhase] = useState(1);
  const [fading, setFading] = useState(false);
  const mountTimeRef = useRef(Date.now());
  const phase2DoneRef = useRef(false);

  // Phase transitions driven by timers
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(2), 1000);
    const t2 = setTimeout(() => {
      phase2DoneRef.current = true;
      setPhase(3);
    }, 4000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  // Phase 3: begin fade-out when globe is ready AND phase 2 is done
  useEffect(() => {
    if (!globeReady || fading) return;

    const elapsed = Date.now() - mountTimeRef.current;
    const minWait = 5000; // don't fade before phase 2 finishes

    if (elapsed >= minWait) {
      setFading(true);
    } else {
      const delay = minWait - elapsed;
      const t = setTimeout(() => setFading(true), delay);
      return () => clearTimeout(t);
    }
  }, [globeReady, phase, fading]);

  // Phase 4: unmount after fade-out animation
  useEffect(() => {
    if (!fading) return;
    const t = setTimeout(() => onComplete(), 1200);
    return () => clearTimeout(t);
  }, [fading, onComplete]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: '#080c14',
        opacity: fading ? 0 : 1,
        transition: 'opacity 1200ms ease-out',
      }}
    >
      {/* Inline keyframe definitions */}
      <style>{`
        @keyframes draw-fault {
          from { stroke-dashoffset: var(--path-length); }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes draw-plate {
          from { stroke-dashoffset: var(--path-length); }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes pulse-dot {
          0%, 100% { r: 3; opacity: 0.8; }
          50%      { r: 5; opacity: 1; }
        }
      `}</style>

      <svg
        viewBox="0 0 800 600"
        className="w-full max-w-[800px] max-h-[600px]"
        style={{ overflow: 'visible' }}
      >
        {/* ── Phase 1: Cascadia fault trace ── */}
        <path
          d={cascadiaFaultTrace}
          fill="none"
          stroke="#10b981"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            filter: 'drop-shadow(0 0 6px #10b981)',
            '--path-length': '4000',
            strokeDasharray: 4000,
            strokeDashoffset: 4000,
            animation: 'draw-fault 1s ease-out forwards',
          } as React.CSSProperties}
        />

        {/* Fault label – fades in at 0.5 s */}
        <text
          x={457}
          y={375}
          fill="#94a3b8"
          style={{
            fontFamily: "'DM Sans', system-ui, sans-serif",
            fontSize: '14px',
            opacity: 0,
            animation: 'fade-in 500ms ease-out 500ms forwards',
          }}
        >
          Cascadia Subduction Zone
        </text>

        {/* ── Phase 2: Plate boundaries & labels ── */}
        {phase >= 2 && (
          <>
            {/* Juan de Fuca plate outline */}
            <path
              d={juanDeFucaPlate}
              fill="none"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth={1}
              strokeDasharray="6 4"
              style={{
                '--path-length': '6000',
                strokeDasharray: '6000',
                strokeDashoffset: 6000,
                animation: 'draw-plate 1.5s ease-out forwards',
              } as React.CSSProperties}
            />

            {/* Pacific plate edge */}
            <path
              d={pacificPlateEdge}
              fill="none"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth={1}
              strokeDasharray="6 4"
              style={{
                '--path-length': '4000',
                strokeDasharray: '4000',
                strokeDashoffset: 4000,
                animation: 'draw-plate 1.5s ease-out forwards',
              } as React.CSSProperties}
            />

            {/* North American plate edge */}
            <path
              d={northAmericanPlateEdge}
              fill="none"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth={1}
              strokeDasharray="6 4"
              style={{
                '--path-length': '4000',
                strokeDasharray: '4000',
                strokeDashoffset: 4000,
                animation: 'draw-plate 1.5s ease-out forwards',
              } as React.CSSProperties}
            />

            {/* ── Plate labels ── */}
            <text
              x={257}
              y={325}
              textAnchor="middle"
              fill="#64748b"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                opacity: 0,
                animation: 'fade-in 600ms ease-out 400ms forwards',
              }}
            >
              Juan de Fuca Plate
            </text>

            <text
              x={86}
              y={350}
              textAnchor="middle"
              fill="#64748b"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                opacity: 0,
                animation: 'fade-in 600ms ease-out 600ms forwards',
              }}
            >
              Pacific Plate
            </text>

            <text
              x={600}
              y={300}
              textAnchor="middle"
              fill="#64748b"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                opacity: 0,
                animation: 'fade-in 600ms ease-out 800ms forwards',
              }}
            >
              North American Plate
            </text>

            {/* ── Dot markers ── */}

            {/* Mendocino Triple Junction */}
            <circle
              cx={257.1}
              cy={585}
              r={3}
              fill="#10b981"
              style={{
                opacity: 0,
                animation:
                  'fade-in 400ms ease-out 300ms forwards, pulse-dot 2s ease-in-out 700ms infinite',
              }}
            />
            <text
              x={257.1}
              y={575}
              textAnchor="middle"
              fill="#64748b"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '9px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                opacity: 0,
                animation: 'fade-in 400ms ease-out 500ms forwards',
              }}
            >
              Mendocino Triple Jct.
            </text>

            {/* Explorer Ridge */}
            <circle
              cx={171.4}
              cy={100}
              r={3}
              fill="#10b981"
              style={{
                opacity: 0,
                animation:
                  'fade-in 400ms ease-out 300ms forwards, pulse-dot 2s ease-in-out 900ms infinite',
              }}
            />
            <text
              x={171.4}
              y={90}
              textAnchor="middle"
              fill="#64748b"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '9px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                opacity: 0,
                animation: 'fade-in 400ms ease-out 500ms forwards',
              }}
            >
              Explorer Ridge
            </text>
          </>
        )}
      </svg>
    </div>
  );
}
