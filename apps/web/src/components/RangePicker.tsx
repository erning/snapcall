import { useRef, useCallback, type PointerEvent as ReactPointerEvent } from "react";
import { RANKS, getRangeLabel, getRangeCategory } from "../lib/poker";

interface RangePickerProps {
  selected: Set<string>;
  onSelect: (selected: Set<string>) => void;
}

const PRESETS: { label: string; combos: string[] }[] = [
  { label: "AA", combos: ["AA"] },
  { label: "KK+", combos: ["AA", "KK"] },
  { label: "QQ+", combos: ["AA", "KK", "QQ"] },
  { label: "JJ+", combos: ["AA", "KK", "QQ", "JJ"] },
  { label: "TT+", combos: ["AA", "KK", "QQ", "JJ", "TT"] },
  { label: "AKs", combos: ["AKs"] },
  { label: "AQs+", combos: ["AKs", "AQs"] },
  { label: "AJs+", combos: ["AKs", "AQs", "AJs"] },
  { label: "ATs+", combos: ["AKs", "AQs", "AJs", "ATs"] },
];

function getCellStyle(
  category: "pair" | "suited" | "offsuit",
  isSelected: boolean,
): string {
  const base =
    "aspect-square flex items-center justify-center text-[10px] font-medium rounded-sm transition-colors duration-100 select-none cursor-pointer";

  if (!isSelected) {
    return `${base} bg-stone-50 text-stone-600 hover:bg-stone-100`;
  }

  switch (category) {
    case "pair":
      return `${base} bg-orange-400 text-white`;
    case "suited":
      return `${base} bg-orange-500 text-white`;
    case "offsuit":
      return `${base} bg-orange-300 text-stone-800`;
  }
}

export function RangePicker({ selected, onSelect }: RangePickerProps) {
  const dragging = useRef(false);
  const dragMode = useRef<"select" | "deselect">("select");

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
    toggle(combo);
  }

  function handlePointerEnter(combo: string, e: ReactPointerEvent) {
    if (!dragging.current || e.buttons === 0) {
      dragging.current = false;
      return;
    }
    setCell(combo, dragMode.current === "select");
  }

  function handlePointerUp() {
    dragging.current = false;
  }

  function applyPreset(combos: string[]) {
    const allSelected = combos.every((c) => selected.has(c));
    const next = new Set(selected);
    for (const c of combos) {
      if (allSelected) {
        next.delete(c);
      } else {
        next.add(c);
      }
    }
    onSelect(next);
  }

  return (
    <div onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}>
      {/* Matrix grid */}
      <div className="grid grid-cols-[auto_repeat(13,1fr)] gap-px">
        {/* Top-left empty cell */}
        <div />
        {/* Column headers */}
        {RANKS.map((r) => (
          <div
            key={r}
            className="text-center text-[10px] font-semibold text-stone-400 pb-0.5"
          >
            {r}
          </div>
        ))}

        {/* Rows */}
        {RANKS.map((_, row) => (
          <>
            {/* Row header */}
            <div
              key={`row-${row}`}
              className="text-center text-[10px] font-semibold text-stone-400 pr-0.5 flex items-center justify-center"
            >
              {RANKS[row]}
            </div>
            {/* Cells */}
            {RANKS.map((_, col) => {
              const combo = getRangeLabel(row, col);
              const category = getRangeCategory(row, col);
              const isSelected = selected.has(combo);

              return (
                <button
                  key={combo}
                  type="button"
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

      {/* Presets */}
      <div className="flex flex-wrap gap-1.5 mt-3">
        {PRESETS.map((preset) => {
          const allActive = preset.combos.every((c) => selected.has(c));
          return (
            <button
              key={preset.label}
              type="button"
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors duration-150 ${
                allActive
                  ? "bg-orange-500 text-white"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
              onClick={() => applyPreset(preset.combos)}
            >
              {preset.label}
            </button>
          );
        })}
        <button
          type="button"
          className="px-2.5 py-1 text-xs font-medium rounded-lg bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors duration-150"
          onClick={() => onSelect(new Set())}
        >
          Clear
        </button>
      </div>
    </div>
  );
}
