import { useState, useEffect } from "react";
import { RANKS, SUITS, SUIT_DISPLAY } from "../lib/poker";

interface MiniCardPickerProps {
  currentCard: string | null;
  disabledCards: string[];
  onSelect: (card: string) => void;
  onDelete: () => void;
}

const RANK_ROW1 = RANKS.slice(0, 7); // A K Q J T 9 8
const RANK_ROW2 = RANKS.slice(7);    // 7 6 5 4 3 2

export function MiniCardPicker({
  currentCard,
  disabledCards,
  onSelect,
  onDelete,
}: MiniCardPickerProps) {
  const [selectedRank, setSelectedRank] = useState<string | null>(
    currentCard ? currentCard[0] : null,
  );

  // Reset selectedRank when currentCard changes
  useEffect(() => {
    setSelectedRank(currentCard ? currentCard[0] : null);
  }, [currentCard]);

  const isRankFullyDisabled = (rank: string) =>
    SUITS.every((suit) => disabledCards.includes(`${rank}${suit}`));

  const isSuitDisabled = (suit: string) => {
    if (!selectedRank) return true;
    return disabledCards.includes(`${selectedRank}${suit}`);
  };

  const handleRankClick = (rank: string) => {
    if (isRankFullyDisabled(rank)) return;
    setSelectedRank(rank === selectedRank ? null : rank);
  };

  const handleSuitClick = (suit: string) => {
    if (!selectedRank || isSuitDisabled(suit)) return;
    onSelect(`${selectedRank}${suit}`);
  };

  const renderRankButton = (rank: string) => {
    const disabled = isRankFullyDisabled(rank);
    const active = rank === selectedRank;

    let cls =
      "w-9 h-9 rounded-lg text-sm font-bold transition-colors duration-100 select-none";
    if (disabled) {
      cls += " opacity-30 cursor-not-allowed bg-white border border-stone-200 text-stone-400";
    } else if (active) {
      cls += " bg-orange-500 text-white border border-orange-500 shadow-sm";
    } else {
      cls += " bg-white shadow-sm border border-stone-200 text-stone-800 active:bg-stone-100";
    }

    return (
      <button
        key={rank}
        type="button"
        className={cls}
        onClick={() => handleRankClick(rank)}
        disabled={disabled}
      >
        {rank}
      </button>
    );
  };

  return (
    <div className="bg-stone-100 rounded-xl shadow-lg p-3 w-fit mx-auto">
      {/* Rank row 1: A-8 */}
      <div className="flex gap-1 mb-1 justify-center">
        {RANK_ROW1.map(renderRankButton)}
      </div>

      {/* Rank row 2: 7-2, offset left to mimic QWERTY stagger */}
      <div className="flex gap-1 mb-1 justify-center">
        {RANK_ROW2.map(renderRankButton)}
      </div>

      {/* Suit + backspace row */}
      <div className="flex gap-1 justify-center">
        {SUITS.map((suit) => {
          const info = SUIT_DISPLAY[suit];
          const disabled = isSuitDisabled(suit);

          let cls =
            "w-9 h-9 rounded-lg text-lg font-bold transition-colors duration-100 select-none";
          if (disabled) {
            cls += " opacity-30 cursor-not-allowed bg-white border border-stone-200 text-stone-700";
          } else {
            cls += " bg-white shadow-sm border border-stone-200 text-stone-700 active:bg-stone-100";
          }

          return (
            <button
              key={suit}
              type="button"
              className={cls}
              onClick={() => handleSuitClick(suit)}
              disabled={disabled}
            >
              {info.symbol}
            </button>
          );
        })}
        {/* Backspace */}
        <button
          type="button"
          className="w-9 h-9 rounded-lg text-base font-bold bg-white shadow-sm border border-stone-200 text-stone-500 active:bg-stone-100 transition-colors duration-100 select-none"
          onClick={onDelete}
        >
          ⌫
        </button>
      </div>
    </div>
  );
}
