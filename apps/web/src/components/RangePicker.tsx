import { useRef, useCallback, type PointerEvent as ReactPointerEvent } from "react";
import { RANKS, getRangeLabel, getRangeCategory } from "../lib/poker";

interface RangePickerProps {
  selected: Set<string>;
  onSelect: (selected: Set<string>) => void;
}

function getCellStyle(
  category: "pair" | "suited" | "offsuit",
  isSelected: boolean,
): string {
  const base =
    "aspect-square flex items-center justify-center text-[10px] font-medium rounded transition-colors duration-100 select-none cursor-pointer";

  if (!isSelected) {
    switch (category) {
      case "pair":
        return `${base} bg-amber-50 dark:bg-amber-500/10 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300`;
      case "suited":
        return `${base} bg-sky-50 dark:bg-sky-500/10 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300`;
      case "offsuit":
        return `${base} bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400`;
    }
  }

  switch (category) {
    case "pair":
      return `${base} bg-orange-400 text-white border border-orange-400`;
    case "suited":
      return `${base} bg-orange-500 text-white border border-orange-500`;
    case "offsuit":
      return `${base} bg-orange-300 text-stone-800 border border-orange-300`;
  }
}

export function RangePicker({ selected, onSelect }: RangePickerProps) {
  const dragging = useRef(false);
  const dragMode = useRef<"select" | "deselect">("select");
  const lastCombo = useRef<string | null>(null);

  const toggle = useCallback(
    (combo: string) => {
      const next = new Set(selected);
      if (next.has(combo)) {
        next.delete(combo);
      } else {
        next.add(combo);
      }
      onSelect(next);
    },
    [selected, onSelect],
  );

  const setCell = useCallback(
    (combo: string, value: boolean) => {
      const next = new Set(selected);
      if (value) {
        next.add(combo);
      } else {
        next.delete(combo);
      }
      onSelect(next);
    },
    [selected, onSelect],
  );

  function handlePointerDown(combo: string) {
    dragging.current = true;
    dragMode.current = selected.has(combo) ? "deselect" : "select";
    lastCombo.current = combo;
    toggle(combo);
  }

  function handlePointerEnter(combo: string, e: ReactPointerEvent) {
    if (!dragging.current || e.buttons === 0) {
      dragging.current = false;
      return;
    }
    setCell(combo, dragMode.current === "select");
  }

  function handleGridPointerMove(e: ReactPointerEvent) {
    if (!dragging.current) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el) return;
    const cell = (el as HTMLElement).closest<HTMLElement>("[data-combo]");
    if (!cell) return;
    const combo = cell.dataset.combo!;
    if (combo === lastCombo.current) return;
    lastCombo.current = combo;
    setCell(combo, dragMode.current === "select");
  }

  function handlePointerUp() {
    dragging.current = false;
    lastCombo.current = null;
  }

  return (
    <div onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}>
      <div
        className="grid grid-cols-13 gap-px touch-none"
        onPointerMove={handleGridPointerMove}
      >
        {RANKS.map((_, row) => (
          <>
            {RANKS.map((_, col) => {
              const combo = getRangeLabel(row, col);
              const category = getRangeCategory(row, col);
              const isSelected = selected.has(combo);

              return (
                <button
                  key={combo}
                  type="button"
                  data-combo={combo}
                  className={getCellStyle(category, isSelected)}
                  onPointerDown={() => handlePointerDown(combo)}
                  onPointerEnter={(e) => handlePointerEnter(combo, e)}
                >
                  {combo}
                </button>
              );
            })}
          </>
        ))}
      </div>
    </div>
  );
}
