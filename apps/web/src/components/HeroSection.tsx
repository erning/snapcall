import { useState, useCallback } from "react";
import { CardPicker } from "./CardPicker";
import { BottomSheet } from "./BottomSheet";
import { parseCards } from "../lib/poker";

interface HeroSectionProps {
  value: string;
  equity: number | null;
  isCalculating: boolean;
  disabledCards: string[];
  onChange: (value: string) => void;
}

export function HeroSection({
  value,
  equity,
  isCalculating,
  disabledCards,
  onChange,
}: HeroSectionProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const selectedCards = parseCards(value);

  const handlePickerSelect = useCallback(
    (cards: string[]) => {
      onChange(cards.join(""));
    },
    [onChange],
  );

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
          <button
            type="button"
            className="text-xs font-medium text-orange-500 hover:text-orange-600 transition-colors duration-200"
            onClick={() => setPickerOpen(!pickerOpen)}
          >
            {pickerOpen ? "Close" : "Pick cards"}
          </button>
        </div>
      </div>

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. AhKd"
        className="w-full text-base py-2.5 px-3 bg-stone-50 rounded-xl border-none outline-none text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-orange-300 transition-all duration-200"
      />

      <BottomSheet open={pickerOpen} onClose={() => setPickerOpen(false)}>
        <CardPicker
          selected={selectedCards}
          disabled={disabledCards}
          maxSelect={2}
          onSelect={handlePickerSelect}
        />
      </BottomSheet>
    </section>
  );
}
