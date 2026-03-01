import { VillainRow } from "./VillainRow";

interface VillainsSectionProps {
  villains: string[];
  equities: number[] | null;
  isCalculating: boolean;
  onSetVillain: (index: number, value: string) => void;
  onAddVillain: () => void;
  onRemoveVillain: (index: number) => void;
}

export function VillainsSection({
  villains,
  equities,
  isCalculating,
  onSetVillain,
  onAddVillain,
  onRemoveVillain,
}: VillainsSectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold text-stone-900">
          Villains ({villains.length})
        </h2>
        <button
          type="button"
          className="text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-600 px-3 py-1.5 rounded-lg transition-colors duration-200"
          onClick={onAddVillain}
        >
          + Add villain
        </button>
      </div>

      {villains.map((villain, i) => (
        <VillainRow
          key={i}
          index={i}
          value={villain}
          equity={equities ? equities[i + 1] ?? null : null}
          isCalculating={isCalculating}
          onChange={(v) => onSetVillain(i, v)}
          onRemove={() => onRemoveVillain(i)}
          canRemove={villains.length > 1}
        />
      ))}
    </div>
  );
}
