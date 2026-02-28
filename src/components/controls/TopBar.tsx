import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../../store/useAppStore';

interface TopBarProps {
  onAboutClick?: () => void;
}

export default function TopBar({ onAboutClick }: TopBarProps) {
  const topBarVisible = useAppStore((s) => s.topBarVisible);
  const setTopBarVisible = useAppStore((s) => s.setTopBarVisible);
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
  }, [setTopBarVisible, clearHideTimer, startHideTimer]);

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
        {/* About button */}
        <button
          type="button"
          onClick={onAboutClick}
          className="w-8 h-8 flex items-center justify-center rounded-md
                     text-slate-400 hover:text-white transition-colors cursor-pointer"
          aria-label="About"
        >
          <span className="text-sm font-medium">?</span>
        </button>

        {/* Fullscreen button */}
        <button
          type="button"
          onClick={toggleFullscreen}
          className="w-8 h-8 flex items-center justify-center rounded-md
                     text-slate-400 hover:text-white transition-colors cursor-pointer"
          aria-label="Toggle fullscreen"
        >
          <span className="text-sm">&#9974;</span>
        </button>
      </div>
    </header>
  );
}
