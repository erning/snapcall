import { useState, useRef, useCallback, useEffect } from "react";
import { MiniCardPicker } from "./MiniCardPicker";
import { SUIT_DISPLAY, type Suit } from "../lib/poker";

const SLOT_SUIT_COLOR: Record<string, string> = {
  s: "text-stone-800", // ♠ black
  c: "text-stone-800", // ♣ black
  h: "text-red-500",   // ♥ red
  d: "text-red-500",   // ♦ red
};

interface HeroSectionProps {
  slots: (string | null)[];
  equity: number | null;
  isCalculating: boolean;
  disabledCards: string[];
  onChange: (slots: (string | null)[]) => void;
}

export function HeroSection({
  slots,
  equity,
  isCalculating,
  disabledCards,
  onChange,
}: HeroSectionProps) {
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
    <section className="bg-white rounded-2xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-stone-900">Hero</h2>
        <div className="flex items-center gap-3">
          {isCalculating && (
            <span className="text-xs text-stone-400">Calculating...</span>
          )}
          {equity !== null && !isCalculating && (
            <span className="text-lg font-bold text-orange-500">
              {equity.toFixed(1)}%
            </span>
          )}
        </div>
      </div>

      <div ref={containerRef} className="relative">
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
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  return (
    <div ref={ref} className="absolute left-0 right-0 mt-2 z-20">
      <MiniCardPicker
        currentCard={currentCard}
        disabledCards={disabledCards}
        onSelect={onSelect}
        onDelete={onDelete}
      />
    </div>
  );
}
