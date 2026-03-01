import { useCallback } from "react";
import { VillainRow } from "./VillainRow";

interface VillainsSectionProps {
  villains: (string | null)[][];
  equities: number[] | null;
  isCalculating: boolean;
  disabledCards: string[];
  onSetVillain: (index: number, value: (string | null)[]) => void;
  onRemoveVillain: (index: number) => void;
}

export function VillainsSection({
  villains,
  equities,
  isCalculating,
  disabledCards,
  onSetVillain,
  onRemoveVillain,
}: VillainsSectionProps) {
  const getVillainDisabled = useCallback(
    (index: number): string[] => {
      const otherCards = villains
        .filter((_, i) => i !== index)
        .flatMap((slots) => slots.filter((c): c is string => c !== null));
      return [...new Set([...disabledCards, ...otherCards])];
    },
    [disabledCards, villains],
  );

  return (
    <div className="space-y-3">
      {villains.map((slots, i) => (
        <VillainRow
          key={i}
          index={i}
          slots={slots}
          equity={equities ? equities[i + 1] ?? null : null}
          isCalculating={isCalculating}
          disabledCards={getVillainDisabled(i)}
          onChange={(v) => onSetVillain(i, v)}
          onRemove={() => onRemoveVillain(i)}
          canRemove={villains.length > 1}
        />
      ))}
    </div>
  );
}
