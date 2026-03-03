import { ChevronLeft } from "lucide-react";
import type { Settings } from "../hooks/useSettings";

interface SettingsNumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  step?: number;
  description?: string;
}

function SettingsNumberField({
  label,
  value,
  onChange,
  min = 1,
  step = 1,
  description,
}: SettingsNumberFieldProps) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-stone-700">
        {label}
      </label>
      <input
        type="number"
        value={value}
        min={min}
        step={step}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10);
          if (!isNaN(n) && n >= min) onChange(n);
        }}
        className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
      />
      {description && (
        <p className="text-xs text-stone-400">{description}</p>
      )}
    </div>
  );
}

interface SettingsPageProps {
  settings: Settings;
  onUpdate: (partial: Partial<Settings>) => void;
  onReset: () => void;
  onResetGame: () => void;
  onBack: () => void;
}

export function SettingsPage({
  settings,
  onUpdate,
  onReset,
  onResetGame,
  onBack,
}: SettingsPageProps) {
  return (
    <main className="h-screen flex flex-col bg-stone-50">
      <div className="shrink-0 max-w-lg w-full mx-auto px-4 pt-3 pb-2">
        <header className="px-1 flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="text-stone-500 hover:text-stone-700 transition-colors duration-200 -ml-1 p-1"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-xl font-bold text-stone-900">Settings</h1>
        </header>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-lg mx-auto px-4 pb-24 space-y-4">
          {/* Calculation */}
          <div className="bg-white rounded-2xl p-4 space-y-4 border border-stone-100">
            <h2 className="text-sm font-semibold text-stone-900">
              Calculation
            </h2>
            <SettingsNumberField
              label="Monte Carlo iterations"
              value={settings.iterations}
              onChange={(v) => onUpdate({ iterations: v })}
              min={100}
              step={1000}
              description="Higher values give more accurate equity but take longer to compute."
            />
          </div>

          {/* Game Defaults */}
          <div className="bg-white rounded-2xl p-4 space-y-4 border border-stone-100">
            <h2 className="text-sm font-semibold text-stone-900">
              Game Defaults
            </h2>
            <SettingsNumberField
              label="Big Blind"
              value={settings.bigBlind}
              onChange={(v) => onUpdate({ bigBlind: v })}
              min={1}
            />
            <SettingsNumberField
              label="Small Blind"
              value={settings.smallBlind}
              onChange={(v) => onUpdate({ smallBlind: v })}
              min={1}
            />
          </div>

          {/* Actions */}
          <div className="bg-white rounded-2xl p-4 space-y-3 border border-stone-100">
            <button
              type="button"
              onClick={onResetGame}
              className="w-full rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium py-2.5 transition-colors duration-200"
            >
              Reset Game
            </button>
            <button
              type="button"
              onClick={onReset}
              className="w-full text-center text-xs text-stone-400 hover:text-stone-600 transition-colors duration-200"
            >
              Reset Settings to Defaults
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
