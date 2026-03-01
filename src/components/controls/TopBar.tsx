import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../../store/useAppStore';

interface TopBarProps {
  onAboutClick?: () => void;
  onDataSourcesClick?: () => void;
  onTourClick?: () => void;
}

export default function TopBar({ onAboutClick, onDataSourcesClick, onTourClick }: TopBarProps) {
  const topBarVisible = useAppStore((s) => s.topBarVisible);
  const setTopBarVisible = useAppStore((s) => s.setTopBarVisible);
  const isMobile = useAppStore((s) => s.isMobile);
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHideTimer = useCallback(() => {
    if (hideTimeout.current) {
      clearTimeout(hideTimeout.current);
      hideTimeout.current = null;
    }
  }, []);

  const startHideTimer = useCallback(() => {
    clearHideTimer();
    hideTimeout.current = setTimeout(() => {
      setTopBarVisible(false);
    }, 3000);
  }, [clearHideTimer, setTopBarVisible]);

  useEffect(() => {
    if (isMobile) {
      setTopBarVisible(true);
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (e.clientY < 60) {
        setTopBarVisible(true);
        clearHideTimer();
        startHideTimer();
      } else {
        startHideTimer();
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    // Start the initial hide timer
    startHideTimer();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearHideTimer();
    };
  }, [isMobile, setTopBarVisible, clearHideTimer, startHideTimer]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  return (
    <header
      className={`
        fixed top-0 left-0 right-0 z-50 h-12
        bg-[#080c14]/80 backdrop-blur-md
        border-b border-white/[0.06]
        flex items-center justify-between px-4
        transition-all
        ${topBarVisible
          ? 'opacity-100 translate-y-0 duration-300'
          : 'opacity-0 -translate-y-full duration-500 pointer-events-none'
        }
      `}
    >
      {/* Left: Branding */}
      <div className="flex items-center gap-2">
        <span className="text-emerald-500 text-base">&#9670;</span>
        <span className="text-white text-sm font-medium">ArgonBI</span>
      </div>

      {/* Center: Title */}
      <div
        className="absolute left-1/2 -translate-x-1/2 text-slate-300 tracking-wide"
        style={{
          fontFamily: '"DM Sans", sans-serif',
          fontWeight: 500,
          fontSize: '15px',
        }}
      >
        Cascadia Explorer
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        {/* Tour button */}
        <button
          type="button"
          onClick={onTourClick}
          className="w-10 h-10 md:w-8 md:h-8 flex items-center justify-center rounded-md
                     text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
          aria-label="Take Tour"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polygon points="10,8 16,12 10,16" fill="currentColor" stroke="none" />
          </svg>
        </button>

        {/* Data Sources button */}
        <button
          type="button"
          onClick={onDataSourcesClick}
          className="w-10 h-10 md:w-8 md:h-8 flex items-center justify-center rounded-md
                     text-slate-400 hover:text-white transition-colors cursor-pointer"
          aria-label="Data Sources"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
        </button>

        {/* About button */}
        <button
          type="button"
          onClick={onAboutClick}
          className="w-10 h-10 md:w-8 md:h-8 flex items-center justify-center rounded-md
                     text-slate-400 hover:text-white transition-colors cursor-pointer"
          aria-label="About"
        >
          <span className="text-sm font-medium">?</span>
        </button>

        {/* Fullscreen button */}
        <button
          type="button"
          onClick={toggleFullscreen}
          className="w-10 h-10 md:w-8 md:h-8 flex items-center justify-center rounded-md
                     text-slate-400 hover:text-white transition-colors cursor-pointer"
          aria-label="Toggle fullscreen"
        >
          <span className="text-sm">&#9974;</span>
        </button>
      </div>
    </header>
  );
}
