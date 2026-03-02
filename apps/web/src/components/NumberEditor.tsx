import { useState, useRef, useCallback } from "react";

interface NumberEditorProps {
  value: number;
  onChange: (v: number) => void;
  step?: number;
}

export function NumberEditor({
  value,
  onChange,
  step = 10,
}: NumberEditorProps) {
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    accumulated: number;
  } | null>(null);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if ((e.target as HTMLElement).hasAttribute("data-stepper")) return;
      e.preventDefault();
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        accumulated: 0,
      };
      setDragging(true);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = dragRef.current.startY - e.clientY;
      const totalSteps = Math.trunc((dx + dy) / 10);
      const prevSteps = dragRef.current.accumulated;
      if (totalSteps !== prevSteps) {
        const delta = totalSteps - prevSteps;
        dragRef.current.accumulated = totalSteps;
        onChange(Math.max(0, value + delta * step));
      }
    },
    [value, step, onChange],
  );

  const handlePointerUp = useCallback(() => {
    dragRef.current = null;
    setDragging(false);
  }, []);

  return (
    <div
      className={`bg-stone-100 rounded-xl shadow-lg p-4 py-5 min-w-[200px] select-none ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
      style={{ touchAction: "none" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div className="flex items-center justify-between">
        <span
          data-stepper
          className="text-[11px] text-stone-400 font-medium cursor-pointer active:text-stone-600"
          onClick={() => onChange(Math.max(0, value - step))}
        >
          -{step}
        </span>
        <span className="text-2xl font-bold text-stone-800">{value}</span>
        <span
          data-stepper
          className="text-[11px] text-stone-400 font-medium cursor-pointer active:text-stone-600"
          onClick={() => onChange(value + step)}
        >
          +{step}
        </span>
      </div>
      <p className="text-[10px] text-stone-400 text-center mt-2">
        ↕↔ drag to adjust
      </p>
    </div>
  );
}

export function Badge({
  label,
  value,
  active,
  onClick,
}: {
  label: string;
  value: number;
  active: boolean;
  onClick: () => void;
}) {
  const cls = active
    ? "ring-2 ring-orange-400 bg-orange-50 text-orange-700"
    : "bg-stone-100 text-stone-600";

  return (
    <button
      type="button"
      className={`text-xs font-medium px-2.5 py-1 rounded-lg transition-all duration-150 ${cls}`}
      onClick={onClick}
    >
      {label} {value > 0 ? value : ""}
    </button>
  );
}
