import { useState, useRef, useCallback, type RefObject } from "react";
import { Minus, Plus } from "lucide-react";

interface NumberEditorProps {
  value: number;
  onChange: (v: number) => void;
  onCommit?: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  stepUp?: (v: number) => number;
  stepDown?: (v: number) => number;
}

export function NumberEditor({
  value,
  onChange,
  onCommit,
  step = 10,
  min = 0,
  max,
  stepUp,
  stepDown,
}: NumberEditorProps) {
  const clamp = useCallback(
    (v: number) => {
      let r = Math.max(min, v);
      if (max !== undefined) r = Math.min(max, r);
      return r;
    },
    [min, max],
  );
  const valueRef = useRef(value) as RefObject<number>;
  valueRef.current = value;

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
        if (stepUp && stepDown) {
          let v = value;
          const fn = delta > 0 ? stepUp : stepDown;
          for (let i = 0; i < Math.abs(delta); i++) v = fn(v);
          onChange(clamp(v));
        } else {
          onChange(clamp(value + delta * step));
        }
      }
    },
    [value, step, clamp, stepUp, stepDown, onChange],
  );

  const handlePointerUp = useCallback(() => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setDragging(false);
    onCommit?.(valueRef.current);
  }, [onCommit]);

  return (
    <div
      className={`bg-stone-100 rounded-xl shadow-lg px-6 py-10 min-w-[260px] select-none ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
      style={{ touchAction: "none" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div className="flex items-center justify-between">
        <span
          data-stepper
          className="text-stone-400 cursor-pointer active:text-stone-600 p-2"
          onClick={() => {
            const v = clamp(stepDown ? stepDown(value) : value - step);
            onChange(v);
            onCommit?.(v);
          }}
        >
          <Minus size={18} className="pointer-events-none" />
        </span>
        <span className="text-3xl font-bold text-stone-800">{value}</span>
        <span
          data-stepper
          className="text-stone-400 cursor-pointer active:text-stone-600 p-2"
          onClick={() => {
            const v = clamp(stepUp ? stepUp(value) : value + step);
            onChange(v);
            onCommit?.(v);
          }}
        >
          <Plus size={18} className="pointer-events-none" />
        </span>
      </div>
      <p className="text-xs text-stone-400 text-center mt-4">
        drag to adjust
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
