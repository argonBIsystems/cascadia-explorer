interface ToggleProps {
  checked: boolean;
  onChange: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export default function Toggle({ checked, onChange, loading, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={`
        relative inline-flex shrink-0 cursor-pointer items-center
        rounded-full transition-colors duration-200 ease-out
        w-[36px] h-[20px]
        ${checked ? 'bg-emerald-500' : 'bg-slate-600'}
        ${loading ? 'animate-shimmer' : ''}
        ${disabled ? 'opacity-40 cursor-not-allowed' : ''}
      `}
      style={{
        // Inline shimmer keyframes for loading state
        ...(loading
          ? {
              backgroundImage: checked
                ? 'linear-gradient(90deg, rgb(16 185 129) 0%, rgb(52 211 153) 50%, rgb(16 185 129) 100%)'
                : undefined,
              backgroundSize: '200% 100%',
              animation: loading ? 'toggle-shimmer 1.5s ease-in-out infinite' : undefined,
            }
          : {}),
      }}
    >
      {/* Shimmer keyframes injected once */}
      {loading && (
        <style>{`
          @keyframes toggle-shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>
      )}

      {/* Thumb */}
      <span
        className={`
          pointer-events-none inline-block rounded-full bg-white shadow-sm
          w-[16px] h-[16px]
          transition-transform duration-200 ease-out
          ${checked ? 'translate-x-[18px]' : 'translate-x-[2px]'}
        `}
      />
    </button>
  );
}
