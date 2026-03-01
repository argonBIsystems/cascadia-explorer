import type { ReactNode } from 'react';

interface DrawerOverlayProps {
  open: boolean;
  side: 'left' | 'right';
  onClose: () => void;
  children: ReactNode;
}

export default function DrawerOverlay({ open, side, onClose, children }: DrawerOverlayProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/40 transition-opacity duration-300
          ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={`
          fixed top-0 bottom-0 z-50 w-[85vw] max-w-[320px]
          bg-[#0c1222]/[0.96] backdrop-blur-xl
          border-white/[0.12] overflow-y-auto overscroll-contain
          transition-transform duration-300 ease-out
          pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]
          ${side === 'left'
            ? `left-0 border-r ${open ? 'translate-x-0' : '-translate-x-full'}`
            : `right-0 border-l ${open ? 'translate-x-0' : 'translate-x-full'}`
          }
        `}
      >
        {children}
      </div>
    </>
  );
}
