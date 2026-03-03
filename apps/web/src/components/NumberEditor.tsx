import { useState, useRef, useCallback, useEffect, type RefObject } from "react";
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
  compact?: boolean;
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
  compact,
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
    lastX: number;
    lastY: number;
    fractional: number;
  } | null>(null);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if ((e.target as HTMLElement).hasAttribute("data-stepper")) return;
      e.preventDefault();
      dragRef.current = {
        lastX: e.clientX,
        lastY: e.clientY,
        fractional: 0,
      };
      setDragging(true);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current) return;
      const moveDx = e.clientX - dragRef.current.lastX;
      const moveDy = compact ? 0 : dragRef.current.lastY - e.clientY;
      dragRef.current.lastX = e.clientX;
      dragRef.current.lastY = e.clientY;

      const speed = Math.abs(moveDx) + Math.abs(moveDy);
      const multiplier = 1 + speed / 10;

      dragRef.current.fractional += ((moveDx + moveDy) / 10) * multiplier;

      const wholeSteps = Math.trunc(dragRef.current.fractional);
      if (wholeSteps !== 0) {
        dragRef.current.fractional -= wholeSteps;
        if (stepUp && stepDown) {
          let v = value;
          const fn = wholeSteps > 0 ? stepUp : stepDown;
          for (let i = 0; i < Math.abs(wholeSteps); i++) v = fn(v);
          onChange(clamp(v));
        } else {
          onChange(clamp(value + wholeSteps * step));
        }
      }
    },
    [value, step, compact, clamp, stepUp, stepDown, onChange],
  );

  const handlePointerUp = useCallback(() => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setDragging(false);
    onCommit?.(valueRef.current);
  }, [onCommit]);

  const repeatRef = useRef<{
    delayId: ReturnType<typeof setTimeout>;
    intervalId?: ReturnType<typeof setInterval>;
  } | null>(null);

  const startRepeat = useCallback(
    (direction: 1 | -1) => {
      const doStep = () => {
        const cur = valueRef.current;
        const next =
          direction > 0
            ? clamp(stepUp ? stepUp(cur) : cur + step)
            : clamp(stepDown ? stepDown(cur) : cur - step);
        onChange(next);
      };
      doStep();
      const delayId = setTimeout(() => {
        const intervalId = setInterval(doStep, 80);
        if (repeatRef.current) repeatRef.current.intervalId = intervalId;
      }, 400);
      repeatRef.current = { delayId };
    },
    [step, clamp, stepUp, stepDown, onChange],
  );

  const stopRepeat = useCallback(() => {
    if (!repeatRef.current) return;
    clearTimeout(repeatRef.current.delayId);
    if (repeatRef.current.intervalId) clearInterval(repeatRef.current.intervalId);
    repeatRef.current = null;
    onCommit?.(valueRef.current);
  }, [onCommit]);

  useEffect(() => {
    return () => {
      if (repeatRef.current) {
        clearTimeout(repeatRef.current.delayId);
        if (repeatRef.current.intervalId) clearInterval(repeatRef.current.intervalId);
      }
    };
  }, []);

  return (
    <div
      className={`bg-stone-100 rounded-xl select-none ${compact ? "px-4 py-3" : "shadow-lg px-6 py-10 min-w-[260px]"} ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
      style={{ touchAction: "none" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div className="flex items-center justify-between">
        <span
          data-stepper
          className="text-stone-400 cursor-pointer active:text-stone-600 p-2"
          onPointerDown={(e) => { e.preventDefault(); startRepeat(-1); }}
          onPointerUp={stopRepeat}
          onPointerCancel={stopRepeat}
          onPointerLeave={stopRepeat}
        >
          <Minus size={18} className="pointer-events-none" />
        </span>
        <span className={`font-bold text-stone-800 ${compact ? "text-xl" : "text-3xl"}`}>{value.toLocaleString()}</span>
        <span
          data-stepper
          className="text-stone-400 cursor-pointer active:text-stone-600 p-2"
          onPointerDown={(e) => { e.preventDefault(); startRepeat(1); }}
          onPointerUp={stopRepeat}
          onPointerCancel={stopRepeat}
          onPointerLeave={stopRepeat}
        >
          <Plus size={18} className="pointer-events-none" />
        </span>
      </div>
      {!compact && (
        <p className="text-xs text-stone-400 text-center mt-4">
          drag to adjust
        </p>
      )}
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
