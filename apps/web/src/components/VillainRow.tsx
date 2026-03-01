import { useState, useCallback, useMemo } from "react";
import { RangePicker } from "./RangePicker";
import { MiniCardPicker } from "./MiniCardPicker";
import {
  rangeSetToString,
  rangeStringToSet,
  classifyVillainValue,
  parseCards,
  SUIT_DISPLAY,
  type Suit,
} from "../lib/poker";

const SLOT_SUIT_COLOR: Record<string, string> = {
  s: "text-stone-800",
  c: "text-stone-800",
  h: "text-red-500",
  d: "text-red-500",
};

interface VillainRowProps {
  index: number;
  value: string;
  equity: number | null;
  isCalculating: boolean;
  disabledCards: string[];
  onChange: (value: string) => void;
  onRemove: () => void;
  canRemove: boolean;
}

export function VillainRow({
  index,
  value,
  equity,
  isCalculating,
  disabledCards,
  onChange,
  onRemove,
  canRemove,
}: VillainRowProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState<"range" | "cards">("range");
  const [slots, setSlots] = useState<(string | null)[]>([null, null]);
  const [activeSlot, setActiveSlot] = useState(0);

  const displayMode = classifyVillainValue(value);

  const handleOpen = () => {
    if (pickerOpen) {
      setPickerOpen(false);
      return;
    }

    if (displayMode === "exact") {
      setPickerMode("cards");
      const parsed = parseCards(value);
      const newSlots: (string | null)[] = [parsed[0] ?? null, parsed[1] ?? null];
      setSlots(newSlots);
      const firstEmpty = newSlots[0] === null ? 0 : newSlots[1] === null ? 1 : 0;
      setActiveSlot(firstEmpty);
    } else {
      setPickerMode("range");
    }

    setPickerOpen(true);
  };

  // --- Range mode ---
  const selectedRange = useMemo(() => rangeStringToSet(value), [value]);

  const handleRangeSelect = useCallback(
    (sel: Set<string>) => {
      onChange(rangeSetToString(sel));
    },
    [onChange],
  );

  // --- Cards mode ---
  const cardPickerDisabled = useMemo(() => {
    const otherSlotCard = slots[activeSlot === 0 ? 1 : 0];
    const otherCards = otherSlotCard ? [otherSlotCard] : [];
    return [...new Set([...disabledCards, ...otherCards])];
  }, [disabledCards, slots, activeSlot]);

  const handleCardSelect = useCallback(
    (card: string) => {
      const newSlots = [...slots];
      newSlots[activeSlot] = card;
      setSlots(newSlots);
      onChange(newSlots.filter(Boolean).join(""));

      if (activeSlot === 0 && newSlots[1] === null) {
        setActiveSlot(1);
      } else if (newSlots[0] !== null && newSlots[1] !== null) {
        setPickerOpen(false);
      }
    },
    [slots, activeSlot, onChange],
  );

  const handleCardDelete = useCallback(() => {
    const newSlots = [...slots];
    if (newSlots[activeSlot] !== null) {
      newSlots[activeSlot] = null;
      setSlots(newSlots);
      onChange(newSlots.filter(Boolean).join(""));
    } else if (activeSlot > 0) {
      const prev = activeSlot - 1;
      newSlots[prev] = null;
      setSlots(newSlots);
      setActiveSlot(prev);
      onChange(newSlots.filter(Boolean).join(""));
    }
  }, [slots, activeSlot, onChange]);

  const switchToCards = () => {
    onChange("");
    setPickerMode("cards");
    setSlots([null, null]);
    setActiveSlot(0);
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
        <VillainCardDisplay
          value={value}
          displayMode={displayMode}
          onClick={handleOpen}
          active={pickerOpen}
        />

        {pickerOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/20 z-10"
              onClick={() => setPickerOpen(false)}
            />
            <div className="absolute left-0 right-0 mt-2 z-20">
              <div className="bg-stone-100 rounded-xl shadow-lg p-3">
                {pickerMode === "range" ? (
                  <div className="max-h-[70vh] overflow-y-auto">
                    <RangePicker
                      selected={selectedRange}
                      onSelect={handleRangeSelect}
                    />
                    <div className="flex justify-between items-center mt-2">
                      <button
                        type="button"
                        className="text-xs font-medium text-stone-400 hover:text-stone-500 transition-colors duration-200"
                        onClick={() => onChange("")}
                      >
                        Clear
                      </button>
                      <button
                        type="button"
                        className="text-xs font-medium text-orange-500 hover:text-orange-600 transition-colors duration-200"
                        onClick={switchToCards}
                      >
                        Exact Cards →
                      </button>
                    </div>
                  </div>
                ) : (
                  <MiniCardPicker
                    currentCard={slots[activeSlot]}
                    disabledCards={cardPickerDisabled}
                    onSelect={handleCardSelect}
                    onDelete={handleCardDelete}
                  />
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// --- VillainCardDisplay ---

function VillainCardDisplay({
  value,
  displayMode,
  onClick,
  active,
}: {
  value: string;
  displayMode: "unknown" | "range" | "exact";
  onClick: () => void;
  active: boolean;
}) {
  if (displayMode === "unknown") {
    return (
      <button
        type="button"
        className={`relative h-14 w-20 cursor-pointer select-none ${active ? "opacity-80" : ""}`}
        onClick={onClick}
      >
        {/* Back card (offset right) */}
        <div className="absolute left-3 top-0 w-10 h-14 rounded-lg bg-gradient-to-br from-stone-400 to-stone-500 border border-stone-300 shadow-sm" />
        {/* Front card */}
        <div className="absolute left-0 top-0 w-10 h-14 rounded-lg bg-gradient-to-br from-stone-400 to-stone-500 border border-stone-300 shadow-sm flex items-center justify-center">
          <span className="text-white text-lg font-bold">?</span>
        </div>
      </button>
    );
  }

  if (displayMode === "range") {
    return (
      <button
        type="button"
        className={`relative h-14 w-20 cursor-pointer select-none ${active ? "opacity-80" : ""}`}
        onClick={onClick}
      >
        {/* Back card (offset right) */}
        <div className="absolute left-3 top-0 w-10 h-14 rounded-lg bg-gradient-to-br from-stone-400 to-stone-500 border border-stone-300 shadow-sm" />
        {/* Front card with range text */}
        <div className="absolute left-0 top-0 w-10 h-14 rounded-lg bg-gradient-to-br from-orange-400 to-orange-500 border border-orange-300 shadow-sm flex items-center justify-center p-0.5">
          <span className="text-white text-[9px] font-semibold leading-tight line-clamp-2 text-center break-all">
            {value}
          </span>
        </div>
      </button>
    );
  }

  // exact mode
  const cards = parseCards(value);
  return (
    <button
      type="button"
      className={`flex gap-1 cursor-pointer select-none ${active ? "opacity-80" : ""}`}
      onClick={onClick}
    >
      {[0, 1].map((i) => {
        const card = cards[i] ?? null;
        return <CardSlotMini key={i} card={card} />;
      })}
    </button>
  );
}

// --- CardSlotMini ---

function CardSlotMini({ card }: { card: string | null }) {
  const rank = card ? card[0] : null;
  const suit = card ? (card[1] as Suit) : null;
  const suitInfo = suit ? SUIT_DISPLAY[suit] : null;
  const color = suit ? SLOT_SUIT_COLOR[suit] : "";

  if (card && suitInfo) {
    return (
      <div className="w-10 h-14 rounded-lg bg-white border border-stone-200 flex flex-col items-center justify-center select-none">
        <span className={`text-lg font-bold leading-none ${color}`}>
          {rank}
        </span>
        <span className={`text-lg font-bold leading-none ${color}`}>
          {suitInfo.symbol}
        </span>
      </div>
    );
  }

  // Back of card (empty slot in exact mode)
  return (
    <div className="w-10 h-14 rounded-lg bg-gradient-to-br from-stone-400 to-stone-500 border border-stone-300 shadow-sm flex items-center justify-center select-none">
      <span className="text-white text-lg font-bold">?</span>
    </div>
  );
}
