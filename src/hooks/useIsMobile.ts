import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';

const MOBILE_BREAKPOINT = 767;

export function useIsMobile() {
  const setIsMobile = useAppStore((s) => s.setIsMobile);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    setIsMobile(mql.matches);

    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [setIsMobile]);
}
