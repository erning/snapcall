import { useState } from "react";
import { ChevronLeft, Monitor, Sun, Moon } from "lucide-react";
import type { Settings, Theme } from "../hooks/useSettings";
import { defaultSettings } from "../hooks/useSettings";
import { NumberEditor } from "./NumberEditor";

interface SettingsPageProps {
  settings: Settings;
  onSave: (next: Partial<Settings>) => void;
  onRestart: (bb: number, sb: number) => void;
  onBack: () => void;
}

const THEME_OPTIONS: { value: Theme; label: string; icon: typeof Monitor }[] = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

export function SettingsPage({
  settings,
  onSave,
  onRestart,
  onBack,
}: SettingsPageProps) {
  const [draft, setDraft] = useState<Settings>({ ...settings });

  const blindsChanged =
    draft.bigBlind !== settings.bigBlind ||
    draft.smallBlind !== settings.smallBlind;

  function handleSave() {
    onSave(draft);
    if (blindsChanged) {
      onRestart(draft.bigBlind, draft.smallBlind);
    }
    onBack();
  }

  return (
    <main className="h-screen flex flex-col bg-stone-50 dark:bg-stone-950">
      <div className="shrink-0 max-w-lg w-full mx-auto px-4 pt-3 pb-2">
        <header className="px-1 flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors duration-200 -ml-1 p-1"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100">Settings</h1>
        </header>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-lg mx-auto px-4 pb-24 space-y-4">
          {/* Appearance */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl p-4 space-y-2 border border-stone-100 dark:border-stone-800">
            <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
              Appearance
            </h2>
            <div className="flex gap-2">
              {THEME_OPTIONS.map(({ value, label, icon: Icon }) => {
                const active = settings.theme === value;
                return (
                  <button
                    key={value}
                    type="button"
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors duration-150 ${
                      active
                        ? "bg-orange-500 text-white"
                        : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700"
                    }`}
                    onClick={() => onSave({ theme: value })}
                  >
                    <Icon size={14} />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Calculation */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl p-4 space-y-2 border border-stone-100 dark:border-stone-800">
            <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
              Calculation
            </h2>
            <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 px-1">
              Monte Carlo iterations
            </label>
            <NumberEditor
              value={draft.iterations}
              onChange={(v) => setDraft((d) => ({ ...d, iterations: v }))}
              step={1000}
              min={1000}
              compact
            />
          </div>

          {/* Game Defaults */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl p-4 space-y-2 border border-stone-100 dark:border-stone-800">
            <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
              Game Defaults
            </h2>
            <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 px-1">
              Big Blind
            </label>
            <NumberEditor
              value={draft.bigBlind}
              onChange={(v) => setDraft((d) => ({ ...d, bigBlind: v }))}
              step={1}
              min={1}
              compact
            />
            <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 px-1 pt-2">
              Small Blind
            </label>
            <NumberEditor
              value={draft.smallBlind}
              onChange={(v) => setDraft((d) => ({ ...d, smallBlind: v }))}
              step={1}
              min={1}
              compact
            />
          </div>

          {/* Cancel / Save */}
          <div className="flex gap-3 px-1">
            <button
              type="button"
              onClick={onBack}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium text-stone-600 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 transition-colors duration-200"
            >
              {blindsChanged ? "Save and Restart Game" : "Save"}
            </button>
          </div>

          {/* Reset to Defaults */}
          <div className="border-t border-stone-200 dark:border-stone-700 pt-4 px-1">
            <button
              type="button"
              onClick={() => setDraft({ ...defaultSettings, theme: settings.theme })}
              className="text-xs text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 transition-colors duration-200"
            >
              Reset to Defaults
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
