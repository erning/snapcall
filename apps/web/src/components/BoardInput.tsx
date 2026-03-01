import { useState, useCallback } from "react";
import { CardPicker } from "./CardPicker";
import { BottomSheet } from "./BottomSheet";
import { parseCards } from "../lib/poker";

interface BoardInputProps {
  value: string;
  disabledCards: string[];
  onChange: (value: string) => void;
}

export function BoardInput({ value, disabledCards, onChange }: BoardInputProps) {
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
        <h2 className="text-sm font-semibold text-stone-900">Board</h2>
        <button
          type="button"
          className="text-xs font-medium text-orange-500 hover:text-orange-600 transition-colors duration-200"
          onClick={() => setPickerOpen(!pickerOpen)}
        >
          {pickerOpen ? "Close" : "Pick cards"}
        </button>
      </div>

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. AsKc5d"
        className="w-full text-base py-2.5 px-3 bg-stone-50 rounded-xl border-none outline-none text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-orange-300 transition-all duration-200"
      />

      <BottomSheet open={pickerOpen} onClose={() => setPickerOpen(false)}>
        <CardPicker
          selected={selectedCards}
          disabled={disabledCards}
          maxSelect={5}
          onSelect={handlePickerSelect}
        />
      </BottomSheet>
    </section>
  );
}
