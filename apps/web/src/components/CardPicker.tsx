import { RANKS, SUITS, SUIT_DISPLAY } from "../lib/poker";

interface CardPickerProps {
  selected: string[];
  disabled: string[];
  maxSelect?: number;
  onSelect: (cards: string[]) => void;
}

export function CardPicker({
  selected,
  disabled,
  maxSelect,
  onSelect,
}: CardPickerProps) {
  function handleTap(card: string) {
    if (disabled.includes(card)) return;

    if (selected.includes(card)) {
      onSelect(selected.filter((c) => c !== card));
    } else if (maxSelect && selected.length >= maxSelect) {
      // Replace oldest
      onSelect([...selected.slice(1), card]);
    } else {
      onSelect([...selected, card]);
    }
  }

  return (
    <div className="space-y-1">
      {/* Column headers */}
      <div className="grid grid-cols-13 gap-1">
        {RANKS.map((rank) => (
          <div
            key={rank}
            className="text-center text-[10px] font-semibold text-stone-400"
          >
            {rank}
          </div>
        ))}
      </div>

      {/* Card grid: 4 rows (suits) x 13 cols (ranks) */}
      {SUITS.map((suit) => (
        <div key={suit} className="grid grid-cols-13 gap-1">
          {RANKS.map((rank) => {
            const card = `${rank}${suit}`;
            const isSelected = selected.includes(card);
            const isDisabled = disabled.includes(card);
            const suitInfo = SUIT_DISPLAY[suit];

            let cellClass =
              "aspect-square flex items-center justify-center rounded-lg text-xs font-bold cursor-pointer transition-all duration-150 select-none";

            if (isDisabled) {
              cellClass += " bg-stone-100 text-stone-300 cursor-not-allowed";
            } else if (isSelected) {
              cellClass +=
                " bg-orange-500 text-white ring-2 ring-orange-300";
            } else {
              cellClass += ` bg-white hover:bg-stone-50 ${suitInfo.color}`;
            }

            return (
              <button
                key={card}
                type="button"
                className={cellClass}
                onClick={() => handleTap(card)}
                disabled={isDisabled}
              >
                <span className="leading-none">
                  {rank}
                  <span className="text-[8px]">{suitInfo.symbol}</span>
                </span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
