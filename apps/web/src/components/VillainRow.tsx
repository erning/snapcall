import { useState, useCallback, useMemo } from "react";
import { RangePicker } from "./RangePicker";
import { BottomSheet } from "./BottomSheet";
import { rangeSetToString, rangeStringToSet } from "../lib/poker";

interface VillainRowProps {
  index: number;
  value: string;
  equity: number | null;
  isCalculating: boolean;
  onChange: (value: string) => void;
  onRemove: () => void;
  canRemove: boolean;
}

export function VillainRow({
  index,
  value,
  equity,
  isCalculating,
  onChange,
  onRemove,
  canRemove,
}: VillainRowProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [inputMode, setInputMode] = useState<"range" | "text">("range");

  const selectedRange = useMemo(() => rangeStringToSet(value), [value]);

  const handleRangeSelect = useCallback(
    (sel: Set<string>) => {
      onChange(rangeSetToString(sel));
    },
    [onChange],
  );

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
          <button
            type="button"
            className={`text-xs font-medium transition-colors duration-200 ${
              inputMode === "range"
                ? "text-orange-500"
                : "text-stone-400 hover:text-stone-600"
            }`}
            onClick={() => setInputMode("range")}
          >
            Range
          </button>
          <button
            type="button"
            className={`text-xs font-medium transition-colors duration-200 ${
              inputMode === "text"
                ? "text-orange-500"
                : "text-stone-400 hover:text-stone-600"
            }`}
            onClick={() => setInputMode("text")}
          >
            Text
          </button>
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

      {inputMode === "text" ? (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder='e.g. KQs, TT+, AhKd, or "" for random'
          className="w-full text-base py-2.5 px-3 bg-stone-50 rounded-xl border-none outline-none text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-orange-300 transition-all duration-200"
        />
      ) : (
        <>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder='Select range or type e.g. TT+,AKs'
            className="w-full text-base py-2.5 px-3 bg-stone-50 rounded-xl border-none outline-none text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-orange-300 transition-all duration-200 mb-2"
          />

          <div className="flex items-center justify-end mb-2">
            <button
              type="button"
              className="text-xs font-medium text-orange-500 hover:text-orange-600 transition-colors duration-200"
              onClick={() => setPickerOpen(!pickerOpen)}
            >
              {pickerOpen ? "Close picker" : "Open picker"}
            </button>
          </div>

          <BottomSheet open={pickerOpen} onClose={() => setPickerOpen(false)}>
            <RangePicker
              selected={selectedRange}
              onSelect={handleRangeSelect}
            />
          </BottomSheet>
        </>
      )}
    </div>
  );
}
