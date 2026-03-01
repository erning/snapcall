import { useState, useRef, useCallback } from "react";
import { MiniCardPicker } from "./MiniCardPicker";
import { SUIT_DISPLAY, type Suit } from "../lib/poker";

const SLOT_SUIT_COLOR: Record<string, string> = {
  s: "text-stone-800", // ♠ black
  c: "text-stone-800", // ♣ black
  h: "text-red-500",   // ♥ red
  d: "text-red-500",   // ♦ red
};

interface BoardSectionProps {
  slots: (string | null)[];
  disabledCards: string[];
  onChange: (slots: (string | null)[]) => void;
}

export function BoardSection({ slots, disabledCards, onChange }: BoardSectionProps) {
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Compute disabled cards for picker: external disabledCards + other board slots
  const pickerDisabled = useCallback(
    (slotIndex: number) => {
      const otherBoardCards = slots
        .filter((_, i) => i !== slotIndex)
        .filter((c): c is string => c !== null);
      return [...new Set([...disabledCards, ...otherBoardCards])];
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
    <section className="bg-white rounded-2xl shadow-sm p-5">
      <h2 className="text-sm font-semibold text-stone-900 mb-3">Board</h2>

      <div ref={containerRef} className="relative">
        {/* Card slots: Flop | Turn | River */}
        <div className="flex gap-4 justify-start items-center">
          {/* Flop */}
          <div className="flex gap-1.5">
            {slots.slice(0, 3).map((card, i) => (
              <CardSlot
                key={i}
                card={card}
                active={activeSlot === i}
                onClick={() => handleSlotClick(i)}
              />
            ))}
          </div>
          {/* Turn */}
          <div className="flex">
            <CardSlot
              card={slots[3]}
              active={activeSlot === 3}
              onClick={() => handleSlotClick(3)}
            />
          </div>
          {/* River */}
          <div className="flex">
            <CardSlot
              card={slots[4]}
              active={activeSlot === 4}
              onClick={() => handleSlotClick(4)}
            />
          </div>
        </div>

        {/* Overlay + Popover picker */}
        {activeSlot !== null && (
          <>
            <div
              className="fixed inset-0 bg-black/20 z-10"
              onClick={() => setActiveSlot(null)}
            />
            <PopoverPicker
              currentCard={slots[activeSlot]}
              disabledCards={pickerDisabled(activeSlot)}
              onSelect={(card) => handleSelect(activeSlot, card)}
              onDelete={() => handleDelete(activeSlot)}
            />
          </>
        )}
      </div>
    </section>
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

function PopoverPicker({
  currentCard,
  disabledCards,
  onSelect,
  onDelete,
}: {
  currentCard: string | null;
  disabledCards: string[];
  onSelect: (card: string) => void;
  onDelete: () => void;
}) {
  return (
    <div className="absolute left-0 right-0 mt-2 z-20">
      <MiniCardPicker
        currentCard={currentCard}
        disabledCards={disabledCards}
        onSelect={onSelect}
        onDelete={onDelete}
      />
    </div>
  );
}
