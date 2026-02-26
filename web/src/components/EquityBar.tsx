interface EquityBarProps {
  value?: number;
}

export function EquityBar({ value }: EquityBarProps) {
  const safeValue = typeof value === "number" ? Math.max(0, Math.min(100, value)) : null;

  return (
    <div>
      <div className="mb-0.5 flex justify-end">
        <span className="text-xs font-semibold text-slate-700">{safeValue === null ? "-" : `${safeValue.toFixed(1)}%`}</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-gradient-to-r from-accent-2 to-accent transition-all duration-500"
          style={{ width: `${safeValue ?? 0}%` }}
        />
      </div>
    </div>
  );
}
