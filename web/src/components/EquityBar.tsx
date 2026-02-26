interface EquityBarProps {
  value?: number;
}

export function EquityBar({ value }: EquityBarProps) {
  const safeValue = typeof value === "number" ? Math.max(0, Math.min(100, value)) : null;

  return (
    <div className="mt-2">
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-slate-500">Equity</span>
        <span className="font-semibold text-slate-700">{safeValue === null ? "-" : `${safeValue.toFixed(1)}%`}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-gradient-to-r from-accent-2 to-accent transition-all duration-500"
          style={{ width: `${safeValue ?? 0}%` }}
        />
      </div>
    </div>
  );
}
