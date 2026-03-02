import { useState, useCallback } from "react";
import { VillainRow } from "./VillainRow";
import type { VillainData } from "../types";

interface VillainsSectionProps {
  villains: VillainData[];
  equities: number[] | null;
  isCalculating: boolean;
  disabledCards: string[];
  onSetVillain: (index: number, value: (string | null)[]) => void;
  onSetVillainRange: (index: number, range: string) => void;
  onSetVillainMode: (index: number, mode: "cards" | "range") => void;
  onRemoveVillain: (index: number) => void;
}

export function VillainsSection({
  villains,
  equities,
  isCalculating,
  disabledCards,
  onSetVillain,
  onSetVillainRange,
  onSetVillainMode,
  onRemoveVillain,
}: VillainsSectionProps) {
  const [openSwipeIndex, setOpenSwipeIndex] = useState<number | null>(null);

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
  );
}
