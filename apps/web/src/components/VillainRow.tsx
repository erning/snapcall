import { useState, useCallback } from "react";
import { MiniCardPicker } from "./MiniCardPicker";
import { SUIT_DISPLAY, type Suit } from "../lib/poker";

const SLOT_SUIT_COLOR: Record<string, string> = {
  s: "text-stone-800",
  c: "text-stone-800",
  h: "text-red-500",
  d: "text-red-500",
};

interface VillainRowProps {
  index: number;
  slots: (string | null)[];
  equity: number | null;
  isCalculating: boolean;
  disabledCards: string[];
  onChange: (slots: (string | null)[]) => void;
  onRemove: () => void;
  canRemove: boolean;
}

export function VillainRow({
  index,
  slots,
  equity,
  isCalculating,
  disabledCards,
  onChange,
  onRemove,
  canRemove,
}: VillainRowProps) {
  const [activeSlot, setActiveSlot] = useState<number | null>(null);

  const pickerDisabled = useCallback(
    (slotIndex: number) => {
      const otherSlotCard = slots[slotIndex === 0 ? 1 : 0];
      const otherCards = otherSlotCard ? [otherSlotCard] : [];
      return [...new Set([...disabledCards, ...otherCards])];
    },
    [disabledCards, slots],
  );

  const handleSelect = (slotIndex: number, card: string) => {
    const newSlots = [...slots];
    newSlots[slotIndex] = card;
    onChange(newSlots);
    setActiveSlot(null);
  };

  const handleDelete = (slotIndex: number) => {
    const newSlots = [...slots];
    newSlots[slotIndex] = null;
    onChange(newSlots);
    setActiveSlot(null);
  };

  const handleSlotClick = (index: number) => {
    setActiveSlot(activeSlot === index ? null : index);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-stone-900">
          Villain {index + 1}
        </h3>
        <div className="flex items-center gap-3">
          {isCalculating && (
            <span className="text-xs text-stone-400">...</span>
          )}
          {equity !== null && !isCalculating && (
            <span className="text-sm font-bold text-stone-600">
              {equity.toFixed(1)}%
            </span>
          )}
          {canRemove && (
            <button
              type="button"
              className="text-xs font-medium text-red-400 hover:text-red-500 transition-colors duration-200"
              onClick={onRemove}
            >
              Remove
            </button>
          )}
        </div>
      </div>

      <div className="relative">
        <div className="flex gap-1.5 justify-start">
          <CardSlot
            card={slots[0]}
            active={activeSlot === 0}
            onClick={() => handleSlotClick(0)}
          />
          <CardSlot
            card={slots[1]}
            active={activeSlot === 1}
            onClick={() => handleSlotClick(1)}
          />
        </div>

        {activeSlot !== null && (
          <>
            <div
              className="fixed inset-0 bg-black/20 z-10"
              onClick={() => setActiveSlot(null)}
            />
            <div className="absolute left-0 right-0 mt-2 z-20">
              <MiniCardPicker
                currentCard={slots[activeSlot]}
                disabledCards={pickerDisabled(activeSlot)}
                onSelect={(card) => handleSelect(activeSlot, card)}
                onDelete={() => handleDelete(activeSlot)}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function CardSlot({
  card,
  active,
  onClick,
}: {
  card: string | null;
  active: boolean;
  onClick: () => void;
}) {
  const rank = card ? card[0] : null;
  const suit = card ? (card[1] as Suit) : null;
  const suitInfo = suit ? SUIT_DISPLAY[suit] : null;
  const color = suit ? SLOT_SUIT_COLOR[suit] : "";

  let cls =
    "w-14 h-20 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all duration-150 select-none";

  if (card && suitInfo) {
    cls += " bg-white border border-stone-200";
  } else {
    cls += " border-2 border-dashed border-stone-300";
  }

  if (active) {
    cls += " ring-2 ring-orange-400";
  }

  return (
    <button type="button" className={cls} onClick={onClick}>
      {card && suitInfo ? (
        <>
          <span className={`text-2xl font-bold leading-none ${color}`}>
            {rank}
          </span>
          <span className={`text-2xl font-bold leading-none ${color}`}>
            {suitInfo.symbol}
          </span>
        </>
      ) : (
        <span className="text-stone-300 text-2xl leading-none">+</span>
      )}
    </button>
  );
}
