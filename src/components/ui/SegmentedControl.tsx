interface SegmentedControlProps {
  options: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
}

export default function SegmentedControl({ options, value, onChange }: SegmentedControlProps) {
  return (
    <div className="flex items-center bg-white/[0.06] rounded-lg p-0.5 h-[36px]">
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`
              px-3 h-full text-[13px] rounded-md cursor-pointer
              transition-all duration-200
              ${
                isActive
                  ? 'bg-emerald-500/20 text-emerald-400 font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }
            `}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
