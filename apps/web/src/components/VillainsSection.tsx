import { useState, useCallback } from "react";
import { VillainRow } from "./VillainRow";
import { NumberEditor } from "./NumberEditor";
import type { VillainData } from "../types";

interface VillainsSectionProps {
  villains: VillainData[];
  equities: number[] | null;
  isCalculating: boolean;
  disabledCards: string[];
  error: string | null;
  mode: string | null;
  samples: number | null;
  onSetVillain: (index: number, value: (string | null)[]) => void;
  onSetVillainRange: (index: number, range: string) => void;
  onSetVillainMode: (index: number, mode: "cards" | "range") => void;
  onRemoveVillain: (index: number) => void;
  onSetVillainCount: (count: number) => void;
}

export function VillainsSection({
  villains,
  equities,
  isCalculating,
  disabledCards,
  error,
  mode,
  samples,
  onSetVillain,
  onSetVillainRange,
  onSetVillainMode,
  onRemoveVillain,
  onSetVillainCount,
}: VillainsSectionProps) {
  const [openSwipeIndex, setOpenSwipeIndex] = useState<number | null>(null);
  const [villainEditorOpen, setVillainEditorOpen] = useState(false);
  const [editVillainCount, setEditVillainCount] = useState(1);

  const getVillainDisabled = useCallback(
    (index: number): string[] => {
      const otherCards = villains
        .filter((_, i) => i !== index)
        .flatMap((v) =>
          v.mode === "cards"
            ? v.slots.filter((c): c is string => c !== null)
            : [],
        );
      return [...new Set([...disabledCards, ...otherCards])];
    },
    [disabledCards, villains],
  );

  return (
    <>
      <div className="space-y-1">
        <div className="px-1 min-h-[20px]">
          {error ? (
            <p className="text-sm text-red-500">{error}</p>
          ) : mode && samples !== null ? (
            <p className="text-xs text-stone-400">
              {mode} &middot; {samples.toLocaleString()} samples
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-between px-1 relative">
          <h2 className="text-sm font-semibold text-stone-900">
            Villains ({villains.length})
          </h2>
          <div className="relative">
            <button
              type="button"
              className="text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-600 px-3 py-1.5 rounded-lg transition-colors duration-200"
              onClick={() => {
                setEditVillainCount(villains.length);
                setVillainEditorOpen(true);
              }}
            >
              + Add villain
            </button>
            {villainEditorOpen && (
              <>
                <div
                  className="fixed inset-0 bg-black/20 z-10"
                  onClick={() => setVillainEditorOpen(false)}
                  onPointerDown={(e) => e.stopPropagation()}
                />
                <div className="absolute right-0 top-full mt-1 z-20">
                  <NumberEditor
                    value={editVillainCount}
                    onChange={setEditVillainCount}
                    onCommit={(v) => onSetVillainCount(v)}
                    step={1}
                    min={1}
                    max={21}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3 relative">
        {openSwipeIndex !== null && (
          <div
            className="fixed inset-0 z-[5]"
            onClick={() => setOpenSwipeIndex(null)}
          />
        )}
        {villains.map((villain, i) => (
          <VillainRow
            key={i}
            index={i}
            villain={villain}
            equity={equities ? equities[i + 1] ?? null : null}
            isCalculating={isCalculating}
            disabledCards={getVillainDisabled(i)}
            onChangeSlots={(v) => onSetVillain(i, v)}
            onChangeRange={(range) => onSetVillainRange(i, range)}
            onChangeMode={(mode) => onSetVillainMode(i, mode)}
            onRemove={() => onRemoveVillain(i)}
            canRemove={villains.length > 1}
            isSwipeOpen={openSwipeIndex === i}
            onSwipeOpen={() => setOpenSwipeIndex(i)}
            onSwipeClose={() => setOpenSwipeIndex(null)}
          />
        ))}
      </div>
    </>
  );
}
